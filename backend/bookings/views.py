from datetime import datetime, timedelta

from rest_framework import status, viewsets
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from django.contrib.auth import authenticate
from django.db import models
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from rest_framework.permissions import BasePermission, SAFE_METHODS, AllowAny, IsAuthenticated
from rest_framework.authentication import SessionAuthentication
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.tokens import RefreshToken

from .models import Room, Booking, Resource, RoomResource
from .serializers import (
    RegisterSerializer, LoginSerializer, BookingSerializer,
    RoomSerializer, ResourceSerializer, RoomResourceSerializer,
    UserProfileSerializer, ChangePasswordSerializer,
)
from .permissions import IsBookingOwner


def _is_fully_booked(bookings_qs, window_start, window_end):
    """
    Өгөгдсөн цагийн мужид (window_start–window_end) дор хаяж 1 минутын
    сул цаг үлдсэн эсэхийг шалгана. Захиалгууд цаг хугацааны дарааллаар
    ирсэн гэж үзэн, мужийг бүрэн дүүргэж байгаа эсэхийг тооцоолно.
    Бүрэн дүүрсэн бол True, сул цаг үлдсэн бол False буцаана.
    """
    cursor = window_start
    for booking in bookings_qs:
        b_start = max(booking.start_time, window_start)
        b_end = min(booking.end_time, window_end)
        if b_start > cursor:
            # cursor-ээс b_start хүртэл сул цаг үлдсэн
            return False
        cursor = max(cursor, b_end)
        if cursor >= window_end:
            return True
    return cursor >= window_end


class IsAdminOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(request.user and request.user.is_authenticated and request.user.is_staff)


class RegisterUserView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"message": "Registration successful"}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginUserView(APIView):
    permission_classes = [AllowAny]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = authenticate(
                username=serializer.validated_data['username'],
                password=serializer.validated_data['password']
            )
            if user:
                refresh = RefreshToken.for_user(user)
                return Response({
                    "access": str(refresh.access_token),
                    "refresh": str(refresh),
                    "user": {"id": user.id, "username": user.username, "email": user.email}
                }, status=status.HTTP_200_OK)
            return Response({"detail": "Нэвтрэх нэр эсвэл нууц үг буруу байна."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class RoomViewSet(viewsets.ModelViewSet):
    queryset = Room.objects.all()
    serializer_class = RoomSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAdminOrReadOnly]

    def get_queryset(self):
        """
        Шүүлтүүрийг хэрэгжүүлнэ:
        - ?resource=Monitor,Wifi  → сонгосон бүх тоног төхөөрөмжтэй өрөөнүүд
        - ?capacity=10            → дурдсан тооноос дээш суудалтай өрөөнүүд
        - ?availability=available_now | today_available | week_available
        """
        qs = Room.objects.all().distinct()
        params = self.request.query_params

        # Тоног төхөөрөмжөөр шүүх — сонгосон бүх resource-той өрөөг олно
        resource_param = params.get('resource')
        if resource_param:
            resource_names = [r.strip() for r in resource_param.split(',') if r.strip()]
            for name in resource_names:
                qs = qs.filter(room_resources__resource__resource_name=name)

        # Багтаамжаар шүүх — min/max муж
        capacity_min = params.get('capacity_min') or params.get('capacity')
        capacity_max = params.get('capacity_max')
        if capacity_min:
            try:
                qs = qs.filter(capacity__gte=int(capacity_min))
            except (TypeError, ValueError):
                pass
        if capacity_max:
            try:
                qs = qs.filter(capacity__lte=int(capacity_max))
            except (TypeError, ValueError):
                pass

        # Боломжтой байдлаар шүүх
        availability = params.get('availability')
        if availability in ('available_now', 'today_available', 'week_available'):
            now = timezone.now()
            active_statuses = ["Confirmed", "Priority", "Complicated"]

            if availability == 'available_now':
                # Яг одоо захиалгатай давхцаж буй өрөөнүүдийг хасна
                busy_room_ids = Booking.objects.filter(
                    status__in=active_statuses,
                    start_time__lte=now,
                    end_time__gt=now,
                ).values_list('room_id', flat=True)
                qs = qs.exclude(id__in=busy_room_ids)

            elif availability == 'today_available':
                # Өнөөдөр ажиллах цагийн дотор (08:00-20:00) сул цаг үлдсэн өрөөнүүд
                day_start = timezone.make_aware(
                    datetime.combine(now.date(), datetime.min.time())
                )
                work_start = max(now, day_start.replace(hour=8, minute=0))
                work_end = day_start.replace(hour=20, minute=0)

                if work_start >= work_end:
                    # Ажлын цаг аль хэдийн дууссан бол өнөөдөр сул цаг алга
                    qs = qs.none()
                else:
                    fully_booked_ids = []
                    today_bookings = Booking.objects.filter(
                        status__in=active_statuses,
                        start_time__lt=work_end,
                        end_time__gt=work_start,
                    )
                    for room in qs:
                        room_bookings = today_bookings.filter(room_id=room.id).order_by('start_time')
                        if not _is_fully_booked(room_bookings, work_start, work_end):
                            continue
                        fully_booked_ids.append(room.id)
                    qs = qs.exclude(id__in=fully_booked_ids)

            elif availability == 'week_available':
                # Энэ долоо хоногт (өнөөдрөөс хойш 7 хоног) сул цаг үлдсэн өрөөнүүд
                week_start = now
                week_end = now + timedelta(days=7)
                fully_booked_ids = []
                week_bookings = Booking.objects.filter(
                    status__in=active_statuses,
                    start_time__lt=week_end,
                    end_time__gt=week_start,
                )
                for room in qs:
                    room_bookings = week_bookings.filter(room_id=room.id).order_by('start_time')
                    if not _is_fully_booked(room_bookings, week_start, week_end):
                        continue
                    fully_booked_ids.append(room.id)
                qs = qs.exclude(id__in=fully_booked_ids)

        return qs


class ResourceViewSet(viewsets.ModelViewSet):
    queryset = Resource.objects.all()
    serializer_class = ResourceSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAdminOrReadOnly]


class RoomResourceViewSet(viewsets.ModelViewSet):
    queryset = RoomResource.objects.all()
    serializer_class = RoomResourceSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsAdminOrReadOnly]


class BookingViewSet(viewsets.ModelViewSet):
    queryset = Booking.objects.all()
    serializer_class = BookingSerializer
    authentication_classes = [JWTAuthentication, SessionAuthentication]
    permission_classes = [IsBookingOwner]

    def get_queryset(self):
        qs = Booking.objects.all()
        now = timezone.now()
        qs.filter(status="Confirmed", end_time__lt=now).update(status="Meeting Done")

        if not (self.request.user and self.request.user.is_authenticated):
            return qs.none()

        # Өөрийн захиалгуудыг авна
        qs = qs.filter(user=self.request.user)

        # ?room=<id> шүүлтүүр — тухайн өрөөний бүх захиалга (availability шалгах)
        # ?date=YYYY-MM-DD шүүлтүүр — тухайн өдрийн захиалгууд
        # Хоёр параметрийг хамт ашиглана — room + date
        room_id = self.request.query_params.get('room')
        date_str = self.request.query_params.get('date')

        if room_id:
            qs = Booking.objects.filter(room_id=room_id)

        if date_str:
            # Тухайн өдрийн эхлэл/төгсгөлийг локал цагийн бүсээр (Asia/Ulaanbaatar)
            # тодорхой datetime муж болгож шүүнэ. __date lookup-оос илүү найдвартай,
            # учир нь өөр өдрийн захиалга алдаагүйгээр холигдохгүй.
            try:
                day = datetime.strptime(date_str, "%Y-%m-%d").date()
            except (ValueError, TypeError):
                return qs.none()
            day_start = timezone.make_aware(datetime.combine(day, datetime.min.time()))
            day_end = day_start + timedelta(days=1)
            qs = qs.filter(start_time__gte=day_start, start_time__lt=day_end)

        return qs

    def create(self, request, *args, **kwargs):
        if not request.user or not request.user.is_authenticated:
            return Response({"detail": "Authentication required."}, status=status.HTTP_401_UNAUTHORIZED)

        room_id = request.data.get('room')
        start = request.data.get('start_time')
        end = request.data.get('end_time')

        if not room_id or not start or not end:
            return Response({"error": "room, start_time, end_time шаардлагатай."}, status=status.HTTP_400_BAD_REQUEST)

        start_dt = parse_datetime(start) if isinstance(start, str) else start
        end_dt = parse_datetime(end) if isinstance(end, str) else end
        if not start_dt or not end_dt:
            return Response({"error": "start_time, end_time формат буруу байна."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.is_naive(start_dt):
            start_dt = timezone.make_aware(start_dt)
        if timezone.is_naive(end_dt):
            end_dt = timezone.make_aware(end_dt)

        if start_dt >= end_dt:
            return Response({"error": "end_time нь start_time-аас хойш байх ёстой."}, status=status.HTTP_400_BAD_REQUEST)
        if start_dt < timezone.now():
            return Response({"error": "Өнгөрсөн цагт захиалга үүсгэх боломжгүй."}, status=status.HTTP_400_BAD_REQUEST)

        overlapping = Booking.objects.filter(
            room_id=room_id, start_time__lt=end, end_time__gt=start
        ).exclude(status__in=["Canceled", "Cancelled", "Meeting Done"])

        if not overlapping.exists():
            booking = Booking.objects.create(
                room_id=room_id, user=request.user,
                start_time=start, end_time=end, status="Confirmed"
            )
            return Response(BookingSerializer(booking).data, status=status.HTTP_201_CREATED)

        has_priority = overlapping.filter(
            models.Q(status="Priority") | models.Q(user_id=1)
        ).exists()

        if has_priority:
            booking = Booking.objects.create(
                room_id=room_id, user=request.user,
                start_time=start, end_time=end, status="Complicated"
            )
            return Response({
                "message": "Томоохон уулзалттай давхцаж байна.",
                "booking_id": booking.id, "status": "Complicated"
            }, status=status.HTTP_202_ACCEPTED)

        return Response({"error": "Сонгосон цаг аль хэдийн захиалагдсан байна."}, status=status.HTTP_400_BAD_REQUEST)

    def partial_update(self, request, *args, **kwargs):
        booking = self.get_object()
        self.check_object_permissions(request, booking)
        new_status = request.data.get('status')
        if new_status in ['Cancelled', 'Canceled']:
            booking.status = 'Canceled'
            booking.save()
            return Response({"message": "Захиалга цуцлагдлаа."}, status=status.HTTP_200_OK)
        return Response({"error": "Зөвхөн цуцлах үйлдэл зөвшөөрөгдөнө."}, status=status.HTTP_400_BAD_REQUEST)

    def destroy(self, request, *args, **kwargs):
        booking = self.get_object()
        self.check_object_permissions(request, booking)
        booking.status = "Canceled"
        booking.save()
        return Response({"message": "Захиалга цуцлагдлаа."}, status=status.HTTP_200_OK)


class ProfileView(APIView):
    """
    Нэвтэрсэн хэрэглэгчийн профайл мэдээллийг авах/засах.
    GET   -> хэрэглэгчийн нэр, имэйл, нийт захиалгын статистик
    PATCH -> нэр, имэйл, овог, нэрийг шинэчлэх
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]

    def get(self, request):
        user = request.user
        bookings = Booking.objects.filter(user=user)
        now = timezone.now()
        data = UserProfileSerializer(user).data
        data['stats'] = {
            'total_bookings': bookings.count(),
            'upcoming_bookings': bookings.filter(status='Confirmed', start_time__gt=now).count(),
            'cancelled_bookings': bookings.filter(status__in=['Cancelled', 'Canceled']).count(),
        }
        return Response(data, status=status.HTTP_200_OK)

    def patch(self, request):
        serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    """
    Нэвтэрсэн хэрэглэгчийн нууц үгийг солих.
    Одоогийн нууц үгийг шалгаж, шинэ нууц үгийг хадгална.
    """
    permission_classes = [IsAuthenticated]
    authentication_classes = [JWTAuthentication, SessionAuthentication]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({"message": "Нууц үг амжилттай солигдлоо."}, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)