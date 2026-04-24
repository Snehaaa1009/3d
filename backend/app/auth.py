"""Minimal JWT-like auth for demo ownership flows (HMAC-signed bearer token)."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import time
from dataclasses import dataclass

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

TOKEN_TTL_SECONDS = 60 * 60 * 12
_bearer_required = HTTPBearer(auto_error=True)
_bearer_optional = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
  username: str


def _secret() -> str:
  return os.getenv("APP_AUTH_SECRET", "local-dev-secret-change-me")


def _b64url_encode(value: bytes) -> str:
  return base64.urlsafe_b64encode(value).decode("utf-8").rstrip("=")


def _b64url_decode(value: str) -> bytes:
  padding = "=" * ((4 - len(value) % 4) % 4)
  return base64.urlsafe_b64decode(value + padding)


def create_access_token(username: str) -> str:
  now = int(time.time())
  payload = {"sub": username, "iat": now, "exp": now + TOKEN_TTL_SECONDS}
  encoded_payload = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
  signature = hmac.new(
    _secret().encode("utf-8"),
    encoded_payload.encode("utf-8"),
    hashlib.sha256,
  ).digest()
  return f"{encoded_payload}.{_b64url_encode(signature)}"


def _decode_and_validate(token: str) -> CurrentUser:
  try:
    payload_raw, sig_raw = token.split(".", 1)
  except ValueError as e:
    raise HTTPException(status_code=401, detail="Invalid token format") from e

  expected = hmac.new(
    _secret().encode("utf-8"),
    payload_raw.encode("utf-8"),
    hashlib.sha256,
  ).digest()
  provided = _b64url_decode(sig_raw)
  if not hmac.compare_digest(expected, provided):
    raise HTTPException(status_code=401, detail="Invalid token signature")

  try:
    payload = json.loads(_b64url_decode(payload_raw).decode("utf-8"))
  except Exception as e:  # pragma: no cover
    raise HTTPException(status_code=401, detail="Invalid token payload") from e

  if int(payload.get("exp", 0)) <= int(time.time()):
    raise HTTPException(status_code=401, detail="Token expired")
  sub = str(payload.get("sub", "")).strip()
  if not sub:
    raise HTTPException(status_code=401, detail="Token missing subject")
  return CurrentUser(username=sub)


def get_current_user(
  credentials: HTTPAuthorizationCredentials = Depends(_bearer_required),
) -> CurrentUser:
  return _decode_and_validate(credentials.credentials)


def get_optional_current_user(
  credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_optional),
) -> CurrentUser | None:
  if credentials is None:
    return None
  return _decode_and_validate(credentials.credentials)
