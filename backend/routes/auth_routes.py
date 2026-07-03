from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr, Field
from backend.database import get_db
from backend.models import User
from backend.auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

def _user_out(u: User): return {"id": u.id, "email": u.email, "full_name": u.full_name, "role": u.role}

@router.post("/signup")
def signup(data: SignupRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == data.email).first():
        raise HTTPException(400, "Email already registered")
    is_first = db.query(User).count() == 0
    user = User(email=data.email, full_name=data.full_name,
                hashed_password=hash_password(data.password),
                role="admin" if is_first else "user")
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token": create_access_token({"sub": str(user.id)}),
            "token_type": "bearer", "user": _user_out(user)}

@router.post("/login")
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email or password")
    return {"access_token": create_access_token({"sub": str(user.id)}),
            "token_type": "bearer", "user": _user_out(user)}

@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    return _user_out(current_user)
