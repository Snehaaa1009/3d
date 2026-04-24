"""
FastAPI app: CORS, static uploads, product CRUD, and configuration endpoints.
"""
import json
import mimetypes
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from . import crud, schemas
from .auth import CurrentUser, create_access_token, get_current_user
from .database import get_db, init_db
from .models import Product
from .storage import LocalStorageService

# Uploads directory on disk (served as static /uploads)
UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
# Baked-in gallery thumbnails (SVG) — avoids third-party placeholder hosts (often ad-blocked)
STATIC_DIR = Path(__file__).resolve().parent / "static"
STATIC_DIR.mkdir(parents=True, exist_ok=True)
storage = LocalStorageService(UPLOAD_DIR)
MAX_MODEL_BYTES = 40 * 1024 * 1024
MAX_THUMB_BYTES = 8 * 1024 * 1024

# Public GLB samples (Khronos + community mirrors). Swap for local files in ./uploads if needed.
SEED_PRODUCTS: list[dict] = [
  {
    "name": "Duck (glTF sample)",
    "category": "Collectibles",
    "description": "Classic Khronos glTF sample — great for materials and lighting tests.",
    "model_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb",
    "thumbnail_url": "/static/thumbnails/duck.svg",
  },
  {
    "name": "Avocado (PBR sample)",
    "category": "Food",
    "description": "Detailed scanned produce model from the Khronos glTF sample repository.",
    "model_url": "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb",
    "thumbnail_url": "/static/thumbnails/avocado.svg",
  },
]


def seed_if_empty(db: Session) -> None:
  """Load demo products once, so the gallery is never empty on first run."""
  total = db.scalar(select(func.count()).select_from(Product))
  if total and total > 0:
    return
  for row in SEED_PRODUCTS:
    crud.create_product_row(
      db,
      name=row["name"],
      category=row["category"],
      description=row["description"],
      model_url=row["model_url"],
      thumbnail_url=row["thumbnail_url"],
      owner="demo",
    )


def ensure_schema_columns(db: Session) -> None:
  """Simple SQLite migration helper for local development."""
  cols = db.execute(text("PRAGMA table_info(products)")).fetchall()
  names = {str(c[1]) for c in cols}
  if "owner" not in names:
    db.execute(text("ALTER TABLE products ADD COLUMN owner VARCHAR(120) DEFAULT 'demo'"))
    db.commit()


def backfill_broken_thumbnails(db: Session) -> None:
  """
  Old seeds used placehold.co (often blocked by ad blockers and privacy tools). Rewrite in DB.
  """
  for name_prefix, sub in (("Duck", "duck"), ("Avocado", "avocado")):
    db.execute(
      update(Product)
      .where(
        Product.name.like(f"{name_prefix}%"),
        Product.thumbnail_url.like("%placehold.co%"),
      )
      .values(thumbnail_url=f"/static/thumbnails/{sub}.svg")
    )
  db.commit()


def backfill_broken_model_urls(db: Session) -> None:
  """
  Old seed links had the raw GitHub path segments in the wrong order (.../2.0/master/...).
  Rewrite existing seed rows to working URLs (.../main/2.0/...).
  """
  replacements = {
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/2.0/master/Duck/glTF-Binary/Duck.glb":
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Duck/glTF-Binary/Duck.glb",
    "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/2.0/master/Avocado/glTF-Binary/Avocado.glb":
      "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/main/2.0/Avocado/glTF-Binary/Avocado.glb",
  }
  for old, new in replacements.items():
    db.execute(
      update(Product)
      .where(Product.model_url == old)
      .values(model_url=new)
    )
  db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
  init_db()
  from .database import SessionLocal

  db = SessionLocal()
  try:
    ensure_schema_columns(db)
    seed_if_empty(db)
    backfill_broken_thumbnails(db)
    backfill_broken_model_urls(db)
  finally:
    db.close()
  yield


app = FastAPI(
  title="Interactive 3D Product Platform API",
  version="0.1.0",
  lifespan=lifespan,
)

# Allow the Vite dev server (or any local preview) to call the API during development
app.add_middleware(
  CORSMiddleware,
  allow_origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:4173",
    "http://127.0.0.1:4173",
  ],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)

# Expose /uploads so the browser can fetch saved .glb/.gltf files
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
# Baked-in SVG thumbnails and other static assets
app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


def resolve_public_url(request: Request, url: str) -> str:
  """
  Turn relative paths (/uploads/..., /static/...) into absolute API URLs the browser can request.
  External http(s) links are left unchanged.
  """
  if url.startswith("http://") or url.startswith("https://"):
    return url
  base = str(request.base_url).rstrip("/")
  if not url.startswith("/"):
    return f"{base}/{url}"
  return f"{base}{url}"


def to_product_out(request: Request, p: Product) -> schemas.ProductOut:
  """Map ORM product row to API DTO, resolving public URLs the SPA can load cross-origin from Vite."""
  out = schemas.ProductOut.model_validate(p)
  u = {"model_url": resolve_public_url(request, p.model_url)}
  if p.thumbnail_url and p.thumbnail_url.strip():
    u["thumbnail_url"] = resolve_public_url(request, p.thumbnail_url)
  return out.model_copy(update=u)


@app.get("/health")
def health():
  return {"ok": True}


@app.post("/auth/login", response_model=schemas.LoginResponse)
def login(payload: schemas.LoginRequest):
  username = payload.username.strip().lower()
  if not username:
    raise HTTPException(status_code=400, detail="username is required")
  token = create_access_token(username)
  return schemas.LoginResponse(access_token=token, username=username)


@app.get("/products", response_model=schemas.ProductListResponse)
def get_products(
  request: Request,
  q: str | None = None,
  category: str | None = None,
  owner: str | None = None,
  limit: int = 20,
  offset: int = 0,
  sort_by: str = "created_at",
  sort_order: str = "desc",
  db: Session = Depends(get_db),
):
  rows, total = crud.list_products(
    db,
    q=q,
    category=category,
    owner=owner,
    limit=limit,
    offset=offset,
    sort_by=sort_by,
    sort_order=sort_order,
  )
  out: list[schemas.ProductOut] = [to_product_out(request, p) for p in rows]
  return schemas.ProductListResponse(items=out, total=total, limit=limit, offset=offset)


@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(product_id: int, request: Request, db: Session = Depends(get_db)):
  p = crud.get_product(db, product_id)
  if not p:
    raise HTTPException(status_code=404, detail="Product not found")
  return to_product_out(request, p)


@app.put("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
  product_id: int,
  payload: schemas.ProductUpdate,
  request: Request,
  db: Session = Depends(get_db),
  current_user: CurrentUser = Depends(get_current_user),
):
  p = crud.get_product(db, product_id)
  if not p:
    raise HTTPException(status_code=404, detail="Product not found")
  if p.owner != current_user.username:
    raise HTTPException(status_code=403, detail="Not allowed to update this product")
  row = crud.update_product(db, p, payload)
  return to_product_out(request, row)


@app.post("/products", response_model=schemas.ProductOut, status_code=201)
async def create_product(
  request: Request,
  db: Session = Depends(get_db),
  current_user: CurrentUser = Depends(get_current_user),
):
  """
  Create a product. Supports:
  - application/json: provide metadata + optional remote model_url
  - multipart/form-data: upload a .glb/.gltf and metadata (used by the upload page)
  """
  content_type = request.headers.get("content-type", "")

  if "application/json" in content_type:
    try:
      body = await request.json()
    except json.JSONDecodeError as e:
      raise HTTPException(status_code=400, detail="Invalid JSON body") from e
    data = schemas.ProductCreate.model_validate(body)
    row = crud.create_product_from_schema(db, data, owner=current_user.username)
  elif "multipart/form-data" in content_type:
    form = await request.form()
    name = str(form.get("name", "")).strip()
    category = str(form.get("category", "")).strip()
    description = str(form.get("description", "")).strip()
    upload = form.get("file")
    thumbnail = form.get("thumbnail")
    if not name or not category:
      raise HTTPException(status_code=400, detail="name and category are required")
    if upload is None or not getattr(upload, "filename", None):
      raise HTTPException(
        status_code=400, detail="file is required for multipart /products create"
      )
    filename = str(upload.filename)
    try:
      content = await upload.read()
    except Exception as e:  # pragma: no cover
      raise HTTPException(status_code=400, detail="Failed to read file") from e
    if len(content) > MAX_MODEL_BYTES:
      raise HTTPException(status_code=400, detail="Model file too large (max 40MB)")
    guessed = (upload.content_type or "").lower()
    if guessed and guessed not in {
      "model/gltf-binary",
      "model/gltf+json",
      "application/octet-stream",
      "application/json",
    }:
      raise HTTPException(status_code=400, detail="Invalid model content type")
    try:
      model_path = storage.save_model(filename, content).public_path
    except ValueError as e:
      raise HTTPException(status_code=400, detail="Only .glb or .gltf files are allowed") from e

    thumbnail_path = ""
    if thumbnail is not None and getattr(thumbnail, "filename", None):
      thumb_filename = str(thumbnail.filename)
      try:
        thumb_content = await thumbnail.read()
      except Exception as e:  # pragma: no cover
        raise HTTPException(status_code=400, detail="Failed to read thumbnail file") from e
      if len(thumb_content) > MAX_THUMB_BYTES:
        raise HTTPException(status_code=400, detail="Thumbnail too large (max 8MB)")
      thumb_type = (thumbnail.content_type or "").lower() or mimetypes.guess_type(thumb_filename)[0]
      if thumb_type and thumb_type not in {"image/png", "image/jpeg", "image/webp"}:
        raise HTTPException(status_code=400, detail="Invalid thumbnail content type")
      try:
        thumbnail_path = storage.save_thumbnail(thumb_filename, thumb_content).public_path
      except ValueError as e:
        raise HTTPException(
          status_code=400,
          detail="Thumbnail must be .png, .jpg, .jpeg, or .webp",
        ) from e

    row = crud.create_product_row(
      db,
      name=name,
      category=category,
      description=description,
      model_url=model_path,
      thumbnail_url=thumbnail_path,
      owner=current_user.username,
    )
  else:
    raise HTTPException(
      status_code=415,
      detail="Unsupported media type. Use application/json or multipart/form-data",
    )

  return to_product_out(request, row)


@app.get("/products/{product_id}/configurations", response_model=list[schemas.ConfigurationOut])
def get_configurations(product_id: int, db: Session = Depends(get_db)):
  p = crud.get_product(db, product_id)
  if not p:
    raise HTTPException(status_code=404, detail="Product not found")
  return crud.list_configurations_for_product(db, product_id)


@app.post(
  "/products/{product_id}/configurations",
  response_model=schemas.ConfigurationOut,
  status_code=201,
)
def post_configuration(
  product_id: int,
  payload: schemas.ConfigurationCreate,
  db: Session = Depends(get_db),
  current_user: CurrentUser = Depends(get_current_user),
):
  p = crud.get_product(db, product_id)
  if not p:
    raise HTTPException(status_code=404, detail="Product not found")
  if p.owner != current_user.username:
    raise HTTPException(status_code=403, detail="Not allowed to configure this product")
  row = crud.add_configuration(db, product_id, payload)
  return row


@app.delete("/products/{product_id}", status_code=204)
def delete_product(
  product_id: int,
  db: Session = Depends(get_db),
  current_user: CurrentUser = Depends(get_current_user),
):
  p = crud.get_product(db, product_id)
  if not p:
    raise HTTPException(status_code=404, detail="Product not found")
  if p.owner != current_user.username:
    raise HTTPException(status_code=403, detail="Not allowed to delete this product")

  # Capture URLs before deleting DB row.
  model_url = p.model_url
  thumbnail_url = p.thumbnail_url
  crud.delete_product(db, p)

  # Clean local assets (if product used /uploads). Ignore failures on purpose.
  storage.delete_by_public_url(model_url)
  storage.delete_by_public_url(thumbnail_url)
