"""
Authentication routes for user registration, login, and account management
"""
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime, timedelta
from typing import Optional
import logging

from database import get_database
from models.user import (
    User, UserCreate, UserUpdate, UserResponse, UserLogin,
    PasswordReset, PasswordResetConfirm, UserRole, UserStatus
)
from .utils import (
    hash_password, verify_password, create_token_pair, verify_token,
    generate_verification_token, generate_reset_token, Token, TokenData
)
from .middleware import get_current_user, get_current_active_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
security = HTTPBearer()

@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate):
    """Register a new user account"""
    db = await get_database()
    
    # Validate password confirmation
    if user_data.password != user_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    # Check if user already exists
    existing_user = await db.users.find_one({
        "$or": [
            {"email": user_data.email},
            {"username": user_data.username}
        ]
    })
    
    if existing_user:
        field = "email" if existing_user.get("email") == user_data.email else "username"
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with this {field} already exists"
        )
    
    # Check if organization exists
    organization = await db.organizations.find_one({"id": user_data.organization_id})
    if not organization:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization not found"
        )
    
    # Create user
    hashed_password = hash_password(user_data.password)
    verification_token = generate_verification_token()
    
    user = User(
        email=user_data.email,
        username=user_data.username,
        password_hash=hashed_password,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        phone=user_data.phone,
        bio=user_data.bio,
        role=user_data.role,
        organization_id=user_data.organization_id,
        timezone=user_data.timezone or "UTC",
        language=user_data.language or "en",
        email_verification_token=verification_token,
        status=UserStatus.PENDING
    )
    
    # Insert user into database
    user_dict = user.model_dump()
    result = await db.users.insert_one(user_dict)
    
    if result.inserted_id:
        logger.info(f"New user registered: {user.email}")
        
        # TODO: Send verification email in background
        # send_verification_email(user.email, verification_token)
        
        return {
            "message": "User registered successfully",
            "user_id": user.id,
            "email": user.email,
            "verification_required": True
        }
    
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to create user"
    )

@router.post("/login", response_model=dict)
async def login_user(user_credentials: UserLogin):
    """Authenticate user and return access tokens"""
    db = await get_database()
    
    # Find user by email
    user_doc = await db.users.find_one({"email": user_credentials.email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    user = User(**user_doc)
    
    # Verify password
    if not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    # Check if user is active
    if not user.is_active or user.status == UserStatus.SUSPENDED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive or suspended"
        )
    
    # Create token data
    token_data = {
        "sub": user.id,
        "email": user.email,
        "role": user.role.value,
        "organization_id": user.organization_id
    }
    
    # Generate tokens
    tokens = create_token_pair(token_data)
    
    # Update login tracking
    await db.users.update_one(
        {"id": user.id},
        {
            "$set": {
                "last_login": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            "$inc": {"login_count": 1}
        }
    )
    
    logger.info(f"User logged in: {user.email}")
    
    return {
        "message": "Login successful",
        "tokens": tokens.model_dump(),
        "user": UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            phone=user.phone,
            bio=user.bio,
            avatar_url=user.avatar_url,
            role=user.role,
            organization_id=user.organization_id,
            is_active=user.is_active,
            status=user.status,
            email_verified=user.email_verified,
            last_login=user.last_login,
            timezone=user.timezone,
            language=user.language,
            theme=user.theme,
            notifications_enabled=user.notifications_enabled,
            profile_completed=user.profile_completed,
            onboarding_completed=user.onboarding_completed,
            created_at=user.created_at,
            updated_at=user.updated_at
        ).model_dump()
    }

@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Refresh access token using refresh token"""
    # Verify refresh token
    token_data = verify_token(credentials.credentials, "refresh")
    
    # Create new token data
    new_token_data = {
        "sub": token_data.user_id,
        "email": token_data.email,
        "role": token_data.role,
        "organization_id": token_data.organization_id
    }
    
    # Generate new tokens
    tokens = create_token_pair(new_token_data)
    
    logger.info(f"Token refreshed for user: {token_data.email}")
    
    return tokens

@router.post("/logout")
async def logout_user(current_user: User = Depends(get_current_active_user)):
    """Logout current user"""
    # In a production environment, you might want to:
    # 1. Blacklist the current token
    # 2. Clear refresh tokens from database
    # 3. Log the logout event
    
    logger.info(f"User logged out: {current_user.email}")
    
    return {"message": "Logout successful"}

@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(current_user: User = Depends(get_current_active_user)):
    """Get current user profile information"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        first_name=current_user.first_name,
        last_name=current_user.last_name,
        phone=current_user.phone,
        bio=current_user.bio,
        avatar_url=current_user.avatar_url,
        role=current_user.role,
        organization_id=current_user.organization_id,
        is_active=current_user.is_active,
        status=current_user.status,
        email_verified=current_user.email_verified,
        last_login=current_user.last_login,
        timezone=current_user.timezone,
        language=current_user.language,
        theme=current_user.theme,
        notifications_enabled=current_user.notifications_enabled,
        profile_completed=current_user.profile_completed,
        onboarding_completed=current_user.onboarding_completed,
        created_at=current_user.created_at,
        updated_at=current_user.updated_at
    )

@router.put("/me", response_model=UserResponse)
async def update_user_profile(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_active_user)
):
    """Update current user profile"""
    db = await get_database()
    
    # Prepare update data
    update_data = {k: v for k, v in user_update.model_dump(exclude_unset=True).items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    # Update user in database
    result = await db.users.update_one(
        {"id": current_user.id},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No changes were made"
        )
    
    # Get updated user
    updated_user_doc = await db.users.find_one({"id": current_user.id})
    updated_user = User(**updated_user_doc)
    
    logger.info(f"User profile updated: {updated_user.email}")
    
    return UserResponse(
        id=updated_user.id,
        email=updated_user.email,
        username=updated_user.username,
        first_name=updated_user.first_name,
        last_name=updated_user.last_name,
        phone=updated_user.phone,
        bio=updated_user.bio,
        avatar_url=updated_user.avatar_url,
        role=updated_user.role,
        organization_id=updated_user.organization_id,
        is_active=updated_user.is_active,
        status=updated_user.status,
        email_verified=updated_user.email_verified,
        last_login=updated_user.last_login,
        timezone=updated_user.timezone,
        language=updated_user.language,
        theme=updated_user.theme,
        notifications_enabled=updated_user.notifications_enabled,
        profile_completed=updated_user.profile_completed,
        onboarding_completed=updated_user.onboarding_completed,
        created_at=updated_user.created_at,
        updated_at=updated_user.updated_at
    )

@router.post("/request-password-reset")
async def request_password_reset(reset_request: PasswordReset):
    """Request password reset"""
    db = await get_database()
    
    # Find user by email
    user_doc = await db.users.find_one({"email": reset_request.email})
    if not user_doc:
        # Don't reveal whether email exists
        return {"message": "If the email exists, a password reset link has been sent"}
    
    user = User(**user_doc)
    
    # Generate reset token
    reset_token = generate_reset_token()
    reset_expires = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
    
    # Update user with reset token
    await db.users.update_one(
        {"id": user.id},
        {
            "$set": {
                "password_reset_token": reset_token,
                "password_reset_expires": reset_expires,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    # TODO: Send password reset email in background
    # send_password_reset_email(user.email, reset_token)
    
    logger.info(f"Password reset requested for user: {user.email}")
    
    return {"message": "If the email exists, a password reset link has been sent"}

@router.post("/reset-password")
async def reset_password(reset_data: PasswordResetConfirm):
    """Reset password with token"""
    if reset_data.new_password != reset_data.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )
    
    db = await get_database()
    
    # Find user with valid reset token
    user_doc = await db.users.find_one({
        "password_reset_token": reset_data.token,
        "password_reset_expires": {"$gt": datetime.utcnow()}
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    user = User(**user_doc)
    
    # Hash new password
    new_password_hash = hash_password(reset_data.new_password)
    
    # Update password and clear reset token
    await db.users.update_one(
        {"id": user.id},
        {
            "$set": {
                "password_hash": new_password_hash,
                "updated_at": datetime.utcnow()
            },
            "$unset": {
                "password_reset_token": "",
                "password_reset_expires": ""
            }
        }
    )
    
    logger.info(f"Password reset completed for user: {user.email}")
    
    return {"message": "Password reset successful"}

@router.post("/verify-email/{token}")
async def verify_email(token: str):
    """Verify user email address"""
    db = await get_database()
    
    # Find user with verification token
    user_doc = await db.users.find_one({"email_verification_token": token})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    user = User(**user_doc)
    
    # Update user as verified and active
    await db.users.update_one(
        {"id": user.id},
        {
            "$set": {
                "email_verified": True,
                "is_active": True,
                "status": UserStatus.ACTIVE,
                "updated_at": datetime.utcnow()
            },
            "$unset": {
                "email_verification_token": ""
            }
        }
    )
    
    logger.info(f"Email verified for user: {user.email}")
    
    return {"message": "Email verified successfully"}