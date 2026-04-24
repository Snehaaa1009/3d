"""CRUD helpers — keeps SQL and transaction rules out of route handlers."""
from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session

from . import models, schemas


def list_products(
  db: Session,
  *,
  q: str | None = None,
  category: str | None = None,
  owner: str | None = None,
  limit: int = 20,
  offset: int = 0,
  sort_by: str = "created_at",
  sort_order: str = "desc",
) -> tuple[list[models.Product], int]:
  """Filter, paginate, and sort products."""
  statement = select(models.Product)
  if q:
    like = f"%{q.lower()}%"
    statement = statement.where(
      or_(
        func.lower(models.Product.name).like(like),
        func.lower(models.Product.description).like(like),
        func.lower(models.Product.category).like(like),
      )
    )
  if category:
    statement = statement.where(func.lower(models.Product.category) == category.lower())
  if owner:
    statement = statement.where(models.Product.owner == owner)

  total_stmt = select(func.count()).select_from(statement.subquery())
  total = int(db.scalar(total_stmt) or 0)

  sort_column = {
    "created_at": models.Product.created_at,
    "name": models.Product.name,
    "category": models.Product.category,
  }.get(sort_by, models.Product.created_at)
  statement = statement.order_by(sort_column.desc() if sort_order == "desc" else sort_column.asc())
  statement = statement.offset(max(offset, 0)).limit(max(min(limit, 100), 1))
  products = list(db.execute(statement).scalars().all())
  return products, total


def get_product(db: Session, product_id: int) -> models.Product | None:
  return db.get(models.Product, product_id)


def create_product_from_schema(
  db: Session, data: schemas.ProductCreate, *, owner: str
) -> models.Product:
  row = models.Product(
    name=data.name,
    category=data.category,
    description=data.description,
    owner=owner,
    model_url=data.model_url,
    thumbnail_url=data.thumbnail_url,
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  return row


def create_product_row(
  db: Session,
  *,
  name: str,
  category: str,
  description: str,
  model_url: str,
  thumbnail_url: str,
  owner: str,
) -> models.Product:
  row = models.Product(
    name=name,
    category=category,
    description=description,
    owner=owner,
    model_url=model_url,
    thumbnail_url=thumbnail_url,
  )
  db.add(row)
  db.commit()
  db.refresh(row)
  return row


def add_configuration(
  db: Session, product_id: int, payload: schemas.ConfigurationCreate
) -> models.Configuration:
  conf = models.Configuration(
    product_id=product_id,
    color=payload.color,
    material=payload.material,
  )
  db.add(conf)
  db.commit()
  db.refresh(conf)
  return conf


def list_configurations_for_product(db: Session, product_id: int) -> list[models.Configuration]:
  stmt = (
    select(models.Configuration)
    .where(models.Configuration.product_id == product_id)
    .order_by(models.Configuration.id.desc())
  )
  return list(db.execute(stmt).scalars().all())


def delete_product(db: Session, product: models.Product) -> None:
  """Delete a product row (configurations cascade by ORM relationship)."""
  db.delete(product)
  db.commit()


def update_product(db: Session, product: models.Product, payload: schemas.ProductUpdate) -> models.Product:
  updates = payload.model_dump(exclude_unset=True)
  for key, value in updates.items():
    setattr(product, key, value)
  db.add(product)
  db.commit()
  db.refresh(product)
  return product
