"""Storage abstraction to support local now and cloud later."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import uuid


@dataclass
class SavedObject:
  public_path: str
  absolute_path: Path


class StorageService:
  def save_model(self, filename: str, content: bytes) -> SavedObject:
    raise NotImplementedError

  def save_thumbnail(self, filename: str, content: bytes) -> SavedObject:
    raise NotImplementedError

  def delete_by_public_url(self, url: str) -> None:
    raise NotImplementedError


class LocalStorageService(StorageService):
  MODEL_EXTS = {"glb", "gltf"}
  THUMB_EXTS = {"png", "jpg", "jpeg", "webp"}

  def __init__(self, upload_dir: Path):
    self.upload_dir = upload_dir
    self.upload_dir.mkdir(parents=True, exist_ok=True)

  def _save(self, filename: str, content: bytes, allowed: set[str]) -> SavedObject:
    parts = filename.lower().rsplit(".", 1)
    if len(parts) < 2 or parts[1] not in allowed:
      raise ValueError("Unsupported file extension")
    generated = f"{uuid.uuid4().hex}.{parts[1]}"
    target = self.upload_dir / generated
    target.write_bytes(content)
    return SavedObject(public_path=f"/uploads/{generated}", absolute_path=target)

  def save_model(self, filename: str, content: bytes) -> SavedObject:
    return self._save(filename, content, self.MODEL_EXTS)

  def save_thumbnail(self, filename: str, content: bytes) -> SavedObject:
    return self._save(filename, content, self.THUMB_EXTS)

  def delete_by_public_url(self, url: str) -> None:
    if not url:
      return
    rel = ""
    if url.startswith("/uploads/"):
      rel = url[len("/uploads/"):]
    elif "/uploads/" in url:
      rel = url.split("/uploads/", 1)[1]
    if not rel:
      return
    rel = rel.split("?", 1)[0].split("#", 1)[0]
    candidate = (self.upload_dir / rel).resolve()
    try:
      candidate.relative_to(self.upload_dir.resolve())
    except ValueError:
      return
    if candidate.exists() and candidate.is_file():
      candidate.unlink()
