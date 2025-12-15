# Home Easy Backend (Django + DRF)

## Prereqs
- Python 3.13+

## Setup
```bash
cd /Users/trungngovan/Repositories/personal-repo/home-easy/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # if needed
python manage.py runserver 0.0.0.0:8000
```

### OAuth env
Set Google client IDs (at least one) so `/auth/google/` verification works:
```
GOOGLE_CLIENT_ID_WEB=<OAuth client ID for web>
GOOGLE_CLIENT_ID_ANDROID=<OAuth client ID for Android>
GOOGLE_CLIENT_ID_IOS=<OAuth client ID for iOS>
```

## API
- OpenAPI JSON: `/api/schema/`
- Swagger UI: `/api/docs/`

## Smoke test Google OAuth
1. Set the three `GOOGLE_CLIENT_ID_*` vars and restart the server.
2. Hit `POST /api/auth/google/` with `{"id_token": "<google token>", "role": "tenant"}` and expect access/refresh + user payload.
3. Hit `POST /api/auth/google/web/` with a landlord Google account; tenants should receive `web_access_denied`.
4. Call `GET /api/auth/me/` with the returned Bearer token to verify JWT works.

## Apps
- identity (custom User)
- properties, tenancies, pricing, metering
- billing, payments
- maintenance
- files, invites, notifications

