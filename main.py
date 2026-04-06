"""
ASGI entry at repository root.

Deploy tools and `fastapi dev` discover `main.py` here; the real app lives in
`backend.main`.
"""
from backend.main import app

__all__ = ["app"]
