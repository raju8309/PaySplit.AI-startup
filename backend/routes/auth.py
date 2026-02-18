from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import get_db
from models.user import User
from config import settings
from datetime import timedelta
import jwt
from argon2 import PasswordHasher  # Use argon2 instead of bcrypt

router = APIRouter(prefix="/api/auth", tags=["Auth"])

# Password hashing with argon2
pwd_hasher = PasswordHasher()

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