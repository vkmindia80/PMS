"""
Enhanced Security Middleware
Phase 4.3: Zero-Trust Security Architecture
"""

from fastapi import HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging
import secrets
import hashlib
from functools import wraps

from database import get_database
from models.user import User, UserRole
from models.security import SecurityEventType, RiskLevel, MFAConfiguration
from auth.utils import verify_token, TokenData
from auth.middleware import get_current_user
from services.security_service import SecurityService

logger = logging.getLogger(__name__)
security = HTTPBearer()
security_service = SecurityService()

class EnhancedSecurityMiddleware:
    """Enhanced security middleware with zero-trust principles"""
    
    def __init__(self):
        self.suspicious_activities = {}
        self.failed_attempts = {}
        self.rate_limits = {}
        self.trusted_devices = {}
    
    async def verify_zero_trust_access(
        self,
        request: Request,
        current_user: User,
        required_permissions: Optional[List[str]] = None,
        risk_assessment: bool = True
    ) -> Dict[str, Any]:
        """Verify access based on zero-trust principles"""
        try:
            db = await get_database()
            
            # 1. Identity Verification (already done by JWT)
            identity_verified = True
            
            # 2. Device Trust Assessment
            device_trusted = await self._assess_device_trust(request, current_user.id)
            
            # 3. Context Assessment
            context_score = await self._assess_context(request, current_user)
            
            # 4. Risk Scoring
            risk_score = 0
            if risk_assessment:
                risk_score = await self._calculate_risk_score(
                    request, current_user, context_score
                )
            
            # 5. MFA Check for high-risk activities
            mfa_required = await self._check_mfa_requirement(
                db, current_user, risk_score, required_permissions
            )
            
            # 6. Permission Verification
            permissions_granted = await self._verify_permissions(
                current_user, required_permissions or []
            )
            
            access_result = {
                "access_granted": True,
                "identity_verified": identity_verified,
                "device_trusted": device_trusted,
                "context_score": context_score,
                "risk_score": risk_score,
                "mfa_required": mfa_required,
                "permissions_granted": permissions_granted,
                "additional_verification_needed": False
            }
            
            # Determine if access should be blocked or require additional verification
            if risk_score > 70:  # High risk threshold
                if not mfa_required or not device_trusted:
                    access_result["access_granted"] = False
                    access_result["additional_verification_needed"] = True
                    
                    # Log high-risk access attempt
                    await security_service.log_security_event(
                        db,
                        event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
                        user_id=current_user.id,
                        organization_id=current_user.organization_id,
                        description=f"High-risk access attempt (score: {risk_score})",
                        risk_level=RiskLevel.HIGH,
                        ip_address=self._get_client_ip(request),
                        user_agent=request.headers.get("user-agent")
                    )
            
            return access_result
            
        except Exception as e:
            logger.error(f"Zero-trust verification failed: {e}")
            return {
                "access_granted": False,
                "error": str(e)
            }
    
    async def _assess_device_trust(self, request: Request, user_id: str) -> bool:
        """Assess device trustworthiness"""
        try:
            # Generate device fingerprint
            device_fingerprint = self._generate_device_fingerprint(request)
            
            # Check if device is in trusted devices list
            trusted_devices = self.trusted_devices.get(user_id, set())
            
            if device_fingerprint in trusted_devices:
                return True
            
            # New device - requires additional verification
            return False
            
        except Exception as e:
            logger.error(f"Device trust assessment failed: {e}")
            return False
    
    def _generate_device_fingerprint(self, request: Request) -> str:
        """Generate unique device fingerprint"""
        try:
            # Combine various request headers to create fingerprint
            fingerprint_data = "|".join([
                request.headers.get("user-agent", ""),
                request.headers.get("accept-language", ""),
                request.headers.get("accept-encoding", ""),
                self._get_client_ip(request)
            ])
            
            return hashlib.sha256(fingerprint_data.encode()).hexdigest()[:32]
            
        except Exception:
            return "unknown"
    
    async def _assess_context(self, request: Request, user: User) -> float:
        """Assess access context for risk scoring"""
        try:
            context_score = 0
            
            # Time-based assessment
            current_hour = datetime.utcnow().hour
            if 9 <= current_hour <= 17:  # Business hours
                context_score += 20
            elif 6 <= current_hour <= 21:  # Extended hours
                context_score += 10
            else:  # After hours
                context_score -= 10
            
            # Location-based assessment (mock implementation)
            client_ip = self._get_client_ip(request)
            if self._is_known_location(client_ip, user.id):
                context_score += 15
            else:
                context_score -= 15
            
            # User behavior assessment
            if user.last_login:
                days_since_last_login = (datetime.utcnow() - user.last_login).days
                if days_since_last_login <= 1:
                    context_score += 10
                elif days_since_last_login > 30:
                    context_score -= 10
            
            # Normalize to 0-100 scale
            return max(0, min(100, context_score + 50))
            
        except Exception as e:
            logger.error(f"Context assessment failed: {e}")
            return 50  # Neutral score
    
    async def _calculate_risk_score(
        self,
        request: Request,
        user: User,
        context_score: float
    ) -> float:
        """Calculate comprehensive risk score"""
        try:
            risk_score = 0
            
            # Base risk from context
            risk_score += (100 - context_score) * 0.3
            
            # Failed attempts penalty
            client_ip = self._get_client_ip(request)
            failed_attempts = self.failed_attempts.get(client_ip, 0)
            risk_score += failed_attempts * 5
            
            # Suspicious activity penalty
            if client_ip in self.suspicious_activities:
                risk_score += 20
            
            # User role adjustment (higher privilege = higher risk)
            role_risk = {
                UserRole.VIEWER: 0,
                UserRole.MEMBER: 5,
                UserRole.TEAM_LEAD: 10,
                UserRole.MANAGER: 15,
                UserRole.ADMIN: 20,
                UserRole.SUPER_ADMIN: 25
            }
            risk_score += role_risk.get(user.role, 0)
            
            # Rate limiting check
            if self._is_rate_limited(client_ip):
                risk_score += 30
            
            return min(100, max(0, risk_score))
            
        except Exception as e:
            logger.error(f"Risk calculation failed: {e}")
            return 50  # Neutral risk
    
    async def _check_mfa_requirement(
        self,
        db,
        user: User,
        risk_score: float,
        required_permissions: Optional[List[str]] = None
    ) -> bool:
        """Check if MFA is required for this access"""
        try:
            # Get MFA configuration
            mfa_config = await security_service.get_mfa_config(db, user.id)
            
            if not mfa_config:
                return risk_score > 60  # Require MFA for high-risk activities
            
            # Always required if configured as required
            if mfa_config.is_required:
                return True
            
            # Risk-based MFA requirement
            if risk_score > 50:
                return True
            
            # Permission-based MFA requirement
            high_privilege_permissions = [
                "admin_access", "user_management", "security_configuration",
                "data_export", "system_configuration"
            ]
            
            if required_permissions:
                for permission in required_permissions:
                    if permission in high_privilege_permissions:
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"MFA requirement check failed: {e}")
            return True  # Fail safe - require MFA on error
    
    async def _verify_permissions(
        self,
        user: User,
        required_permissions: List[str]
    ) -> bool:
        """Verify user has required permissions"""
        try:
            # Role-based permissions mapping
            role_permissions = {
                UserRole.VIEWER: ["read"],
                UserRole.MEMBER: ["read", "create", "update_own"],
                UserRole.TEAM_LEAD: ["read", "create", "update", "delete_own", "manage_team"],
                UserRole.MANAGER: ["read", "create", "update", "delete", "manage_team", "manage_project"],
                UserRole.ADMIN: ["*"],  # All permissions except super admin
                UserRole.SUPER_ADMIN: ["**"]  # All permissions including system
            }
            
            user_permissions = role_permissions.get(user.role, [])
            
            # Super admin has all permissions
            if "**" in user_permissions:
                return True
            
            # Admin has most permissions
            if "*" in user_permissions and not any(
                perm.startswith("system_") for perm in required_permissions
            ):
                return True
            
            # Check specific permissions
            for required_perm in required_permissions:
                if required_perm not in user_permissions:
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Permission verification failed: {e}")
            return False
    
    def _get_client_ip(self, request: Request) -> str:
        """Extract client IP address"""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        # Fallback to client host
        return getattr(request.client, "host", "unknown")
    
    def _is_known_location(self, ip_address: str, user_id: str) -> bool:
        """Check if IP is from known location (mock implementation)"""
        # In production, integrate with IP geolocation service
        known_ips = self.trusted_devices.get(f"location_{user_id}", set())
        return ip_address in known_ips
    
    def _is_rate_limited(self, identifier: str) -> bool:
        """Check if identifier is rate limited"""
        try:
            current_time = datetime.utcnow()
            
            if identifier not in self.rate_limits:
                self.rate_limits[identifier] = {"count": 1, "window_start": current_time}
                return False
            
            rate_data = self.rate_limits[identifier]
            
            # Reset window if expired (5 minute window)
            if current_time - rate_data["window_start"] > timedelta(minutes=5):
                self.rate_limits[identifier] = {"count": 1, "window_start": current_time}
                return False
            
            # Increment counter
            rate_data["count"] += 1
            
            # Check if rate limit exceeded (100 requests per 5 minutes)
            return rate_data["count"] > 100
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False
    
    async def record_failed_attempt(self, request: Request):
        """Record failed authentication attempt"""
        try:
            client_ip = self._get_client_ip(request)
            self.failed_attempts[client_ip] = self.failed_attempts.get(client_ip, 0) + 1
            
            # Clean up old records
            if self.failed_attempts[client_ip] > 10:
                self.suspicious_activities[client_ip] = datetime.utcnow()
        except Exception as e:
            logger.error(f"Failed to record failed attempt: {e}")
    
    async def record_successful_access(self, request: Request, user_id: str):
        """Record successful access for learning"""
        try:
            client_ip = self._get_client_ip(request)
            
            # Reset failed attempts on successful login
            if client_ip in self.failed_attempts:
                del self.failed_attempts[client_ip]
            
            # Add to known locations
            if user_id not in self.trusted_devices:
                self.trusted_devices[f"location_{user_id}"] = set()
            self.trusted_devices[f"location_{user_id}"].add(client_ip)
            
        except Exception as e:
            logger.error(f"Failed to record successful access: {e}")

# Global instance
enhanced_security = EnhancedSecurityMiddleware()

# Enhanced dependency functions

async def get_current_user_with_zero_trust(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    request: Request = None
):
    """Get current user with zero-trust verification"""
    # First get the user using standard JWT verification
    current_user = await get_current_user(credentials)
    
    # Then apply zero-trust verification
    if request:
        zero_trust_result = await enhanced_security.verify_zero_trust_access(
            request, current_user
        )
        
        if not zero_trust_result["access_granted"]:
            if zero_trust_result.get("additional_verification_needed"):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={
                        "message": "Additional verification required",
                        "mfa_required": zero_trust_result.get("mfa_required", False),
                        "device_verification_required": not zero_trust_result.get("device_trusted", True),
                        "risk_score": zero_trust_result.get("risk_score", 0)
                    }
                )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Access denied by security policy"
                )
    
    return current_user

def require_permissions(permissions: List[str]):
    """Decorator to require specific permissions"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract current_user from kwargs if present
            current_user = kwargs.get("current_user")
            if current_user:
                permission_granted = await enhanced_security._verify_permissions(
                    current_user, permissions
                )
                if not permission_granted:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"Required permissions: {', '.join(permissions)}"
                    )
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def require_mfa():
    """Decorator to require MFA for sensitive operations"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # This would integrate with MFA verification
            # For now, we'll just log the requirement
            logger.info(f"MFA required for operation: {func.__name__}")
            return await func(*args, **kwargs)
        return wrapper
    return decorator
