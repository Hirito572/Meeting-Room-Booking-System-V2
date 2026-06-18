#!/usr/bin/env bash
set -o errexit

pip install -r requirements.txt

python manage.py collectstatic --no-input
python manage.py migrate

python manage.py shell <<EOF
from django.contrib.auth import get_user_model

User = get_user_model()

user, created = User.objects.get_or_create(
    username="postgres",
    defaults={
        "email": "munkhluu0608@gmail.com"
    }
)

user.is_staff = True
user.is_superuser = True
user.set_password("Admin123456!")
user.save()

print("Admin user ready")
EOF