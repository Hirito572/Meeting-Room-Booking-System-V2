from django.urls import path
from rest_framework.routers import DefaultRouter
from .views import (
    RegisterUserView,
    LoginUserView,
    BookingViewSet,
    RoomViewSet,
    ResourceViewSet,
    RoomResourceViewSet,
    ProfileView,
    ChangePasswordView,
)

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
# Frontend /api/bookings/ гэж хандаж байгаа тул 'bookings' болгов
router.register(r'bookings', BookingViewSet, basename='booking')
# Хуучин 'reservations' URL-ийг ч хадгалав (backwards compatibility)
router.register(r'reservations', BookingViewSet, basename='reservation')
router.register(r'resources', ResourceViewSet, basename='resource')
router.register(r'room-assets', RoomResourceViewSet, basename='room-asset')

urlpatterns = [
    path('register/', RegisterUserView.as_view(), name='api-register'),
    path('login/', LoginUserView.as_view(), name='api-login'),
    path('profile/', ProfileView.as_view(), name='api-profile'),
    path('profile/change-password/', ChangePasswordView.as_view(), name='api-change-password'),
] + router.urls
