# backend/auth.py
"""
Authentication core: password hashing, JWT creation/validation,
and the two dependencies every protected route uses:
  get_current_user   -> any logged-in user
  get_current_admin  -> only users with role="admin"
"""

import jwt
from datetime import datetime, timedelta
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from backend.config import settings
from backend.database import get_db
from backend.models import User

# pbkdf2_sha256 is pure Python (uses the stdlib hashlib under the hood).
# Unlike bcrypt, it has zero compiled dependencies — no version conflicts,
# no Windows build issues. Just as secure for this use case.
pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")

# tokenUrl is only metadata for FastAPI's /docs UI. Our actual /auth/login
# endpoint accepts plain JSON {email, password}, not OAuth2 form fields —
# this scheme is only used here to extract "Authorization: Bearer <token>".
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # tokens last 7 days


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication token.")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
) -> User:
    """
    Reads the Bearer token from the Authorization header, validates it,
    and returns the matching User row. Raises 401 if anything is wrong.
    Every protected endpoint depends on this.
    """
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_access_token(token)
    user_id = payload.get("sub")

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise HTTPException(status_code=401, detail="User no longer exists")

    return user


def get_current_admin(current_user: User = Depends(get_current_user)) -> User:
    """
    Same as get_current_user, but additionally requires role == 'admin'.
    Used on every /admin/* route.
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required for this resource"
        )
    return current_user
