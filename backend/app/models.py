"""SQLAlchemy ORM models for products and saved configurations."""
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Product(Base):
  __tablename__ = "products"

  id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
  category: Mapped[str] = mapped_column(String(120), index=True, nullable=False)
  description: Mapped[str] = mapped_column(Text, default="")
  owner: Mapped[str] = mapped_column(String(120), index=True, default="demo")
  # Where the GLB/GLTF can be loaded from (public URL or /uploads/... path served by this API)
  model_url: Mapped[str] = mapped_column(String(1024), nullable=False)
  thumbnail_url: Mapped[str] = mapped_column(String(1024), default="")
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )

  configurations: Mapped[list["Configuration"]] = relationship(
    "Configuration", back_populates="product", cascade="all, delete-orphan"
  )


class Configuration(Base):
  __tablename__ = "configurations"

  id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
  product_id: Mapped[int] = mapped_column(ForeignKey("products.id"), index=True, nullable=False)
  color: Mapped[str] = mapped_column(String(32), nullable=False)
  material: Mapped[str] = mapped_column(String(32), nullable=False)
  created_at: Mapped[datetime] = mapped_column(
    DateTime(timezone=True), server_default=func.now()
  )

  product: Mapped[Product] = relationship("Product", back_populates="configurations")
