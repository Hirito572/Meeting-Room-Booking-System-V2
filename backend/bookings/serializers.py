from rest_framework import serializers
from django.contrib.auth.models import User
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

    class Meta:
        model = Room
        fields = ['id', 'room_name', 'capacity', 'room_resources']


# 6. Booking
class BookingSerializer(serializers.ModelSerializer):
    class Meta:
        model = Booking
        fields = '__all__'
