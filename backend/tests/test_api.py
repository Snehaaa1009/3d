from pathlib import Path
import sys

from fastapi.testclient import TestClient

sys.path.append(str(Path(__file__).resolve().parent.parent))

from app.main import app


client = TestClient(app)


def login(username: str) -> dict[str, str]:
  resp = client.post("/auth/login", json={"username": username})
  assert resp.status_code == 200
  token = resp.json()["access_token"]
  return {"Authorization": f"Bearer {token}"}


def test_product_crud_and_ownership():
  owner_headers = login("pytest-owner")
  other_headers = login("pytest-other")

  model_fixture = Path(__file__).resolve().parent.parent / "app" / "static" / "thumbnails" / "duck.svg"
  with model_fixture.open("rb") as fh:
    create = client.post(
      "/products",
      headers=owner_headers,
      files={"file": ("sample.glb", fh.read(), "application/octet-stream")},
      data={"name": "Pytest Product", "category": "QA", "description": "created by tests"},
    )
  assert create.status_code == 201, create.text
  product = create.json()
  pid = product["id"]

  # Owner can update metadata.
  update = client.put(
    f"/products/{pid}",
    headers=owner_headers,
    json={"description": "updated description"},
  )
  assert update.status_code == 200
  assert update.json()["description"] == "updated description"

  # Other users are blocked.
  forbidden = client.delete(f"/products/{pid}", headers=other_headers)
  assert forbidden.status_code == 403

  # Owner delete succeeds.
  deleted = client.delete(f"/products/{pid}", headers=owner_headers)
  assert deleted.status_code == 204

  missing = client.get(f"/products/{pid}")
  assert missing.status_code == 404


def test_list_products_pagination_and_filters():
  resp = client.get("/products", params={"limit": 2, "offset": 0, "sort_by": "name", "sort_order": "asc"})
  assert resp.status_code == 200
  body = resp.json()
  assert "items" in body
  assert body["limit"] == 2
  assert body["offset"] == 0
