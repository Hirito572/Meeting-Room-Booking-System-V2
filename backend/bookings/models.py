from django.db import models
from django.contrib.auth.models import User

class Room(models.Model):
    room_name = models.CharField(max_length=100)
    capacity = models.IntegerField()

    @classmethod
    def check_availability(cls, room_id, start, end):
        overlapping = Booking.objects.filter(
            room_id=room_id,
            status="Confirmed",
            start_time__lt=end,
            end_time__gt=start
        )
        return not overlapping.exists()

class Booking(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    room = models.ForeignKey(Room, on_delete=models.CASCADE)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    status = models.CharField(max_length=20, default="Confirmed")

class Resource(models.Model):
    resource_id = models.AutoField(primary_key=True)
    resource_name = models.CharField(max_length=255, unique=True)

    def __str__(self):
        return self.resource_name


class RoomResource(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name="room_resources")
    resource = models.ForeignKey(Resource, on_delete=models.CASCADE, related_name="resource_rooms")
    quantity = models.IntegerField(default=1)

    class Meta:
        unique_together = ('room', 'resource')

    def __str__(self):
        return f"{self.quantity}x {self.resource.resource_name} in {self.room.room_name}"