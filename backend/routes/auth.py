from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from starlette.requests import Request
from starlette.responses import RedirectResponse
from db import get_db
from models.user import User
from config import settings
import jwt
from argon2 import PasswordHasher
from authlib.integrations.starlette_client import OAuth

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Password hashing with argon2
pwd_hasher = PasswordHasher()

# Initialize OAuth
oauth = OAuth()
oauth.register(
    name='google',
    client_id=settings.GOOGLE_CLIENT_ID,
    client_secret=settings.GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={'scope': 'openid email profile'}
)

class SignupRequest(BaseModel):
    name: str
    email: str
    password: str

class LoginRequest(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    
    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    user: UserResponse

def hash_password(password: str) -> str:
    return pwd_hasher.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    try:
        pwd_hasher.verify(hashed, plain)
        return True
    except:
        return False

def create_token(user_id: str) -> str:
    payload = {"sub": user_id}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm="HS256")
    return token

@router.post("/signup", response_model=TokenResponse)
def signup(req: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        name=req.name,
        email=req.email,
        password_hash=hash_password(req.password)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=str(user.id), name=user.name, email=user.email)
    )

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(str(user.id))
    return TokenResponse(
        access_token=token,
        user=UserResponse(id=str(user.id), name=user.name, email=user.email)
    )

@router.get("/profile", response_model=UserResponse)
def get_profile(db: Session = Depends(get_db)):
    user = db.query(User).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(id=str(user.id), name=user.name, email=user.email)

# ============== GOOGLE OAUTH ENDPOINTS ==============

@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth"""
    redirect_uri = settings.GOOGLE_REDIRECT_URI
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_db)):
    """Handle Google OAuth callback"""
    try:
        # Get access token from Google
        token = await oauth.google.authorize_access_token(request)
        
        # Get user info from Google
        user_info = token.get('userinfo')
        if not user_info:
            raise HTTPException(status_code=400, detail="Failed to get user info")
        
        email = user_info.get('email')
        name = user_info.get('name')
        google_id = user_info.get('sub')
        
        # Check if user exists
        user = db.query(User).filter(User.email == email).first()
        
        if not user:
            # Create new user
            user = User(
                name=name,
                email=email,
                google_id=google_id,
                password_hash=""  # No password for Google users
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        # Create JWT token
        jwt_token = create_token(str(user.id))
        
        # Redirect to frontend with token
        frontend_url = f"http://localhost:5173/auth/callback?token={jwt_token}"
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Google login failed: {str(e)}")