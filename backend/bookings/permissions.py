from rest_framework import permissions


class IsBookingOwner(permissions.BasePermission):
    """
    Зөвхөн нэвтэрсэн хэрэглэгч өөрийн booking-уудыг харах/цуцлах боломжтой.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        # Admin бүгдийг харах боломжтой
        if request.user.is_staff or request.user.is_superuser:
            return True
        # Booking эзэмшигч мөн эсэхийг шалгана
        booking_owner_id = getattr(obj, 'user_id', None)
        return booking_owner_id == request.user.id