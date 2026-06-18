from datetime import datetime, timedelta

from rest_framework import serializers
from django.contrib.auth.models import User
from django.utils import timezone
from .models import Room, Booking, Resource, RoomResource


# 1. User Registration
class RegisterSerializer(serializers.ModelSerializer):
    email = serializers.EmailField(required=True)
    # phone_number optional болгов — Django-ийн стандарт User model-д энэ талбар байдаггүй
    phone_number = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'phone_number']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        phone_number = validated_data.pop('phone_number', None)
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        if phone_number:
            print(f"Phone number {phone_number} for user {user.username}")
        return user


# 2. User Login
class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)


# 3. Resource
class ResourceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Resource
        fields = '__all__'


# 4. RoomResource
class RoomResourceSerializer(serializers.ModelSerializer):
    resource_name = serializers.ReadOnlyField(source='resource.resource_name')

    class Meta:
        model = RoomResource
        fields = ['id', 'room', 'resource', 'resource_name', 'quantity']


# 5. Room
class RoomSerializer(serializers.ModelSerializer):
    room_resources = RoomResourceSerializer(many=True, read_only=True)
    is_available_today = serializers.SerializerMethodField()

    class Meta:
        model = Room
        fields = ['id', 'room_name', 'capacity', 'room_resources', 'is_available_today']

    def get_is_available_today(self, room):
        """
        Өнөөдрийн ажлын цагт (08:00-20:00, одоогийн цагаас хойш) тухайн
        өрөөнд дор хаяж 1 минутын сул цаг үлдсэн эсэхийг шалгана.
        Бүх цаг захиалагдсан бол False (UI дээр улаан/боломжгүй гэж харагдана).
        """
        # Локал импорт — views.py-той хоорондын circular import-оос сэргийлнэ
        from .views import _is_fully_booked

        now = timezone.now()
        day_start = timezone.make_aware(datetime.combine(now.date(), datetime.min.time()))
        work_start = max(now, day_start.replace(hour=8, minute=0))
        work_end = day_start.replace(hour=20, minute=0)

        if work_start >= work_end:
            # Ажлын цаг аль хэдийн дууссан тул өнөөдрийн хувьд боломжгүй
            return False

        active_statuses = ["Confirmed", "Priority", "Complicated"]
        bookings = Booking.objects.filter(
            room_id=room.id,
            status__in=active_statuses,
            start_time__lt=work_end,
            end_time__gt=work_start,
        ).order_by('start_time')

        return not _is_fully_booked(bookings, work_start, work_end)


# 6. Booking
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'


# 7. User Profile (харах/засах)
class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'date_joined']
        read_only_fields = ['id', 'username', 'date_joined']
        extra_kwargs = {
            'username': {'read_only': True},
        }

    def validate_email(self, value):
        user = self.instance
        if value and User.objects.exclude(pk=getattr(user, 'pk', None)).filter(email=value).exists():
            raise serializers.ValidationError("Энэ имэйл хаяг бүртгэлтэй байна.")
        return value


# 8. Нууц үг солих
class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True)

    def validate(self, data):
        request = self.context.get('request')
        if not request.user.check_password(data['current_password']):
            raise serializers.ValidationError({"current_password": "Одоогийн нууц үг буруу байна."})
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({"confirm_password": "Нууц үг таарахгүй байна."})
        return data
