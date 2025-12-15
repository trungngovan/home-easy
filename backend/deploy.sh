#!/usr/bin/env bash
set -euo pipefail

# Run from repo root or any path
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> Running migrations"
python manage.py migrate

SUPERUSER_USERNAME="${DJANGO_SUPERUSER_USERNAME:-}"
SUPERUSER_EMAIL="${DJANGO_SUPERUSER_EMAIL:-}"
SUPERUSER_PASSWORD="${DJANGO_SUPERUSER_PASSWORD:-}"

if [[ -n "$SUPERUSER_USERNAME" && -n "$SUPERUSER_PASSWORD" ]]; then
  echo "==> Ensuring superuser ${SUPERUSER_USERNAME}"
  python manage.py shell <<'PY'
import os
from django.contrib.auth import get_user_model

username = os.environ["DJANGO_SUPERUSER_USERNAME"]
email = os.environ.get("DJANGO_SUPERUSER_EMAIL", "")
password = os.environ["DJANGO_SUPERUSER_PASSWORD"]

User = get_user_model()
user, created = User.objects.get_or_create(
    username=username,
    defaults={"email": email, "is_staff": True, "is_superuser": True},
)

if created:
    user.set_password(password)
    user.save()
    print(f"Created superuser '{username}'")
else:
    print(f"Superuser '{username}' already exists; leaving password unchanged")
PY
else
  echo "==> Skipping superuser creation (DJANGO_SUPERUSER_USERNAME/PASSWORD not set)"
fi

echo "==> Collecting static files"
python manage.py collectstatic --noinput

echo "==> Done"
