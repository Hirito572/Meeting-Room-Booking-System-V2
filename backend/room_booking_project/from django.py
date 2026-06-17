from django.contrib import admin
from .models import Room, Booking, Resource, RoomResource


class RoomResourceInline(admin.TabularInline):
    model = RoomResource
    extra = 1  # нэг хоосон мөр нэмэлтээр харуулна


@admin.register(Room)
class RoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'room_name', 'capacity']
    search_fields = ['room_name']
    inlines = [RoomResourceInline]  # өрөө дотор resource шууд нэмнэ


@admin.register(Resource)
class ResourceAdmin(admin.ModelAdmin):
    list_display = ['resource_id', 'resource_name']
    search_fields = ['resource_name']


@admin.register(RoomResource)
class RoomResourceAdmin(admin.ModelAdmin):
    list_display = ['room', 'resource', 'quantity']
    list_filter = ['room', 'resource']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['id', 'room', 'user', 'start_time', 'end_time', 'status']
    list_filter = ['status', 'room']
    search_fields = ['user__username', 'room__room_name']