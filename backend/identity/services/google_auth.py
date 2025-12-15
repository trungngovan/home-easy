import os
from typing import Dict, Iterable, Optional, Tuple

from google.auth.transport import requests
from google.oauth2 import id_token


class GoogleAuthError(Exception):
    """Raised when Google token verification fails."""


def _get_audiences() -> Tuple[str, ...]:
    """
    Collect configured client IDs for Google OAuth.

    Supports separate IDs for web, Android, and iOS; ignores empty values.
    """
    ids = [
        os.getenv("GOOGLE_CLIENT_ID_WEB", ""),
        os.getenv("GOOGLE_CLIENT_ID_ANDROID", ""),
        os.getenv("GOOGLE_CLIENT_ID_IOS", ""),
    ]
    return tuple(filter(bool, ids))


def verify_google_id_token(raw_token: str, audiences: Optional[Iterable[str]] = None) -> Dict:
    """
    Verify a Google ID token and return its payload.

    - Tries provided audiences first; falls back to env-based audiences.
    - Ensures email exists and is verified.
    """
    if not raw_token:
        raise GoogleAuthError("Thiếu id_token từ Google")

    candidates = tuple(audiences) if audiences else _get_audiences()
    if not candidates:
        raise GoogleAuthError("Chưa cấu hình GOOGLE_CLIENT_ID_* để xác thực Google")

    last_error: Optional[Exception] = None
    for audience in candidates:
        try:
            payload = id_token.verify_oauth2_token(
                raw_token, requests.Request(), audience=audience
            )
            email_verified = payload.get("email_verified")
            if email_verified is False:
                raise GoogleAuthError("Email Google chưa được xác minh")
            if not payload.get("email"):
                raise GoogleAuthError("Google token không chứa email")
            return payload
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            continue

    raise GoogleAuthError(f"Không thể xác thực token Google: {last_error}")  # type: ignore[arg-type]
