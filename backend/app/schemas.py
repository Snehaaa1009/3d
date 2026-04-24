"""Pydantic request/response schemas (API contracts)."""
from datetime import datetime

from pydantic import BaseModel, Field, ConfigDict


class ProductBase(BaseModel):
  name: str = Field(min_length=1, max_length=200)
  category: str = Field(min_length=1, max_length=120)
  description: str = ""
  model_url: str = Field(min_length=1, max_length=1024)
  thumbnail_url: str = ""


class ProductCreate(ProductBase):
  pass


class ProductUpdate(BaseModel):
  name: str | None = Field(default=None, min_length=1, max_length=200)
  category: str | None = Field(default=None, min_length=1, max_length=120)
  description: str | None = None
  model_url: str | None = Field(default=None, min_length=1, max_length=1024)
  thumbnail_url: str | None = None


class ProductOut(ProductBase):
  model_config = ConfigDict(from_attributes=True)

  id: int
  owner: str
  created_at: datetime


class ProductListResponse(BaseModel):
  items: list[ProductOut]
  total: int
  limit: int
  offset: int


class LoginRequest(BaseModel):
  username: str = Field(min_length=2, max_length=120)


class LoginResponse(BaseModel):
  access_token: str
  token_type: str = "bearer"
  username: str


class ConfigurationCreate(BaseModel):
  color: str = Field(min_length=1, max_length=32)
  material: str = Field(min_length=1, max_length=32)


class ConfigurationOut(ConfigurationCreate):
  model_config = ConfigDict(from_attributes=True)

  id: int
  product_id: int
  created_at: datetime
