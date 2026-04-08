from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse
from db import get_db
from models.user import User
from config import settings
import jwt
import uuid
from datetime import datetime, timedelta
from argon2 import PasswordHasher
from authlib.integrations.starlette_client import OAuth
from typing import Optional

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Password hashing with argon2
pwd_hasher = PasswordHasher()

# In-memory reset token store (use Redis in production)
reset_tokens: dict = {}

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name="google",
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={"scope": "openid email profile"},
)

# ── Schemas ───────────────────────────────────────────────────────────────
class SignupRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class UserResponse(BaseModel):
    id: str
    name: str
    email: str

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserResponse


# ── Helpers ───────────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_hasher.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_hasher.verify(hashed, plain)
        return True
    except Exception:
        return False


def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "access",
        "exp": datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "type": "refresh",
        "exp": datetime.utcnow() + timedelta(days=30),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


def get_current_user(
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db),
) -> User:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    payload = decode_token(token)
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Existing: Signup ──────────────────────────────────────────────────────
@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserResponse(id=str(user.id), name=user.name, email=user.email),
    )


# ── Existing: Login ───────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return TokenResponse(
        access_token=create_access_token(str(user.id)),
        refresh_token=create_refresh_token(str(user.id)),
        user=UserResponse(id=str(user.id), name=user.name, email=user.email),
    )


# ── Existing: Profile ─────────────────────────────────────────────────────
@router.get("/profile", response_model=UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    return UserResponse(id=str(current_user.id), name=current_user.name, email=current_user.email)


# ── NEW: Token Refresh ────────────────────────────────────────────────────
class RefreshRequest(BaseModel):
    refresh_token: str


@router.post("/refresh")
def refresh_token(req: RefreshRequest, db: Session = Depends(get_db)):
    """Get a new access token using refresh token"""
    payload = decode_token(req.refresh_token)

    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return {
        "access_token": create_access_token(str(user.id)),
        "refresh_token": create_refresh_token(str(user.id)),
    }


# ── NEW: Forgot Password ──────────────────────────────────────────────────
@router.post("/forgot-password")
def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a password reset token (in production: send via email)"""
    user = db.query(User).filter(User.email == req.email).first()

    # Always return success to prevent email enumeration attacks
    if not user:
        return {"message": "If that email exists, a reset link has been sent."}

    # Generate reset token (valid for 15 minutes)
    token = str(uuid.uuid4())
    reset_tokens[token] = {
        "user_id": str(user.id),
        "expires": datetime.utcnow() + timedelta(minutes=15),
    }

    # TODO: Send reset link via email (e.g. SendGrid / SES):
    #   send_email(user.email, subject="Reset your password",
    #              body=f"Use this link: {FRONTEND_URL}/reset-password?token={token}")
    # The token is intentionally NOT returned in the response to prevent exposure.
    return {"message": "If that email exists, a reset link has been sent."}


# ── NEW: Reset Password ───────────────────────────────────────────────────
@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Reset password using token from forgot-password"""
    token_data = reset_tokens.get(req.token)

    if not token_data:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

    if datetime.utcnow() > token_data["expires"]:
        del reset_tokens[req.token]
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if len(req.new_password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")

    user = db.query(User).filter(User.id == token_data["user_id"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.password_hash = hash_password(req.new_password)
    db.commit()

    # Invalidate token after use
    del reset_tokens[req.token]

    return {"message": "Password reset successfully. Please log in with your new password."}


# ── NEW: Change Password ──────────────────────────────────────────────────
@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Change password for logged-in user"""
    if not verify_password(req.current_password, current_user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")

    if len(req.new_password) < 10:
        raise HTTPException(status_code=400, detail="Password must be at least 10 characters")

    current_user.password_hash = hash_password(req.new_password)
    db.commit()

    return {"message": "Password changed successfully."}


# ── Google OAuth ──────────────────────────────────────────────────────────
@router.get("/google")
async def google_login(request: Request):
    """
    Starts Google OAuth.
    NOTE: This requires SessionMiddleware to be installed in main.py,
    and itsdangerous installed in backend venv.
    """
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)


@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """
    Completes Google OAuth and redirects to frontend callback route:
      http://localhost:5173/oauth/callback?access_token=...
    """
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get("userinfo")
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")

        email = user_info.get("email")
        name = user_info.get("name")
        google_id = user_info.get("sub")

        if not email:
            raise HTTPException(status_code=400, detail="Google did not return an email address")

        user = db.query(User).filter(User.email == email).first()

        if not user:
            user = User(
                name=name or "Google User",
                email=email,
                google_id=google_id,
                password_hash="",  # OAuth user; no local password
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        jwt_token = create_access_token(str(user.id))

        frontend_base = getattr(settings, "FRONTEND_BASE_URL", "http://localhost:5173")
        frontend_url = f"{frontend_base}/oauth/callback?access_token={jwt_token}"

        return RedirectResponse(url=frontend_url)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google login failed: {str(e)}")