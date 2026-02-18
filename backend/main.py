from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
from config import settings
from routes.health import router as health_router
from routes.auth import router as auth_router
from routes.settlements import router as settlements_router

logger = logging.getLogger(__name__)

app = FastAPI(title=settings.APP_NAME, version="1.0.0")

# ✅ CORS Configuration - MUST BE FIRST MIDDLEWARE
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(auth_router)
app.include_router(settlements_router)

@app.on_event("startup")
def on_startup():
    try:
        from db import engine
        from models import Base
        from models.user import User
        from models.group import Group
        from models.expense import Expense
        
        Base.metadata.create_all(bind=engine)
        logger.info("DB tables ensured (create_all).")
    except Exception as e:
        logger.warning(f"DB not ready yet. Skipping create_all. Error: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )