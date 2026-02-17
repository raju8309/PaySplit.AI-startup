from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from backend.config import settings
from backend.routes.health import router as health_router
from backend.routes.auth import router as auth_router
from backend.routes.settlements import router as settlements_router
from backend.config import settings


logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS if settings.CORS_ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(settlements_router)

# OPTIONAL: only try DB setup on startup (does NOT crash server if DB isn't ready)
@app.on_event("startup")
def on_startup():
    try:
        from backend.db import engine
        from backend.models import Base
        from backend.models.user import User  # noqa: F401
        from backend.models.group import Group  # noqa: F401
        from backend.models.expense import Expense  # noqa: F401

        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all).")
    except Exception as e:
        logger.warning(f"DB not ready yet. Skipping create_all. Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )