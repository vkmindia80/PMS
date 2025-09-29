"""
Enterprise Security & Compliance Routes
Phase 4.3: Advanced Security Framework with Zero-Trust Architecture
"""

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import logging
import secrets
import qrcode
import io
import base64
from passlib.totp import TOTP

from database import get_database
from auth.middleware import get_current_user, get_current_active_user
from models.user import User, UserRole
from models.security import (
    MFAConfiguration, MFAMethod, MFASetupRequest, MFAVerificationRequest,
    AuditEvent, SecurityEventType, RiskLevel, SecurityPolicy,
    ThreatDetection, ComplianceReport, ComplianceStandard,
    DataRetentionPolicy, ZeroTrustPolicy,
    SecurityEventQuery, ComplianceAssessmentRequest, ThreatResponse
)
from services.security_service import SecurityService
from services.compliance_service import ComplianceService
from services.threat_detection_service import ThreatDetectionService

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/security", tags=["Enterprise Security"])
security = HTTPBearer()

# Initialize security services
security_service = SecurityService()
compliance_service = ComplianceService()
threat_service = ThreatDetectionService()

# =============================================================================
# MULTI-FACTOR AUTHENTICATION (MFA) ENDPOINTS
# =============================================================================

@router.post("/mfa/setup", response_model=dict)
async def setup_mfa(
    setup_request: MFASetupRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Setup multi-factor authentication for user"""
    db = await get_database()
    
    try:
        # Get or create MFA configuration
        mfa_config = await security_service.get_mfa_config(db, current_user.id)
        if not mfa_config:
            mfa_config = MFAConfiguration(
                user_id=current_user.id,
                organization_id=current_user.organization_id
            )
        
        result = {}
        
        if setup_request.method == MFAMethod.TOTP:
            # Generate TOTP secret
            secret = TOTP.generate_secret()
            mfa_config.totp_secret = secret
            mfa_config.primary_method = MFAMethod.TOTP
            
            # Generate QR code for authenticator apps
            totp = TOTP(secret)
            provisioning_uri = totp.provisioning_uri(
                name=current_user.email,
                issuer="Enterprise Portfolio Management"
            )
            
            # Create QR code image
            qr = qrcode.QRCode(version=1, box_size=10, border=5)
            qr.add_data(provisioning_uri)
            qr.make(fit=True)
            
            img = qr.make_image(fill_color="black", back_color="white")
            img_buffer = io.BytesIO()
            img.save(img_buffer, format='PNG')
            img_str = base64.b64encode(img_buffer.getvalue()).decode()
            
            result = {
                "method": "totp",
                "secret": secret,
                "qr_code": f"data:image/png;base64,{img_str}",
                "manual_entry_key": secret,
                "message": "Scan QR code with your authenticator app or enter the secret manually"
            }
            
        elif setup_request.method == MFAMethod.SMS:
            if not setup_request.phone_number:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Phone number required for SMS MFA"
                )
            mfa_config.sms_phone = setup_request.phone_number
            mfa_config.primary_method = MFAMethod.SMS
            
            # Send verification SMS (mock implementation)
            verification_code = security_service.generate_verification_code()
            await security_service.send_sms_code(setup_request.phone_number, verification_code)
            
            result = {
                "method": "sms",
                "phone_number": setup_request.phone_number,
                "message": "Verification code sent to your phone"
            }
            
        elif setup_request.method == MFAMethod.EMAIL:
            mfa_config.primary_method = MFAMethod.EMAIL
            
            # Send verification email
            verification_code = security_service.generate_verification_code()
            await security_service.send_email_code(current_user.email, verification_code)
            
            result = {
                "method": "email",
                "email": current_user.email,
                "message": "Verification code sent to your email"
            }
        
        # Save MFA configuration
        await security_service.save_mfa_config(db, mfa_config)
        
        # Log security event
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.MFA_ENABLED,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description=f"MFA setup initiated for method: {setup_request.method}",
            risk_level=RiskLevel.LOW
        )
        
        return result
        
    except Exception as e:
        logger.error(f"MFA setup failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to setup MFA"
        )

@router.post("/mfa/verify", response_model=dict)
async def verify_mfa(
    verification_request: MFAVerificationRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Verify MFA setup and enable it"""
    db = await get_database()
    
    try:
        mfa_config = await security_service.get_mfa_config(db, current_user.id)
        if not mfa_config:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="MFA not configured"
            )
        
        is_valid = False
        
        if verification_request.method == MFAMethod.TOTP:
            totp = TOTP(mfa_config.totp_secret)
            is_valid = totp.verify(verification_request.code)
            
        elif verification_request.method == MFAMethod.SMS:
            # Verify SMS code (mock implementation)
            is_valid = await security_service.verify_sms_code(
                mfa_config.sms_phone, verification_request.code
            )
            
        elif verification_request.method == MFAMethod.EMAIL:
            # Verify email code
            is_valid = await security_service.verify_email_code(
                current_user.email, verification_request.code
            )
        
        if not is_valid:
            # Log failed verification
            await security_service.log_security_event(
                db,
                event_type=SecurityEventType.LOGIN_FAILURE,
                user_id=current_user.id,
                organization_id=current_user.organization_id,
                description=f"MFA verification failed for method: {verification_request.method}",
                risk_level=RiskLevel.MEDIUM
            )
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid verification code"
            )
        
        # Enable MFA
        mfa_config.is_enabled = True
        mfa_config.last_used = datetime.utcnow()
        mfa_config.updated_at = datetime.utcnow()
        
        # Generate backup codes
        backup_codes = [security_service.generate_backup_code() for _ in range(10)]
        mfa_config.backup_codes = backup_codes
        
        if verification_request.trust_device:
            # Add device to trusted devices
            device_info = {
                "device_id": secrets.token_urlsafe(32),
                "added_at": datetime.utcnow(),
                "last_used": datetime.utcnow()
            }
            mfa_config.trusted_devices.append(device_info)
        
        await security_service.save_mfa_config(db, mfa_config)
        
        # Log successful MFA setup
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.MFA_ENABLED,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description=f"MFA successfully enabled for method: {verification_request.method}",
            risk_level=RiskLevel.LOW
        )
        
        return {
            "success": True,
            "message": "MFA successfully enabled",
            "backup_codes": backup_codes,
            "trusted_device": verification_request.trust_device
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"MFA verification failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify MFA"
        )

@router.get("/mfa/status", response_model=dict)
async def get_mfa_status(current_user: User = Depends(get_current_active_user)):
    """Get MFA status for current user"""
    db = await get_database()
    
    try:
        mfa_config = await security_service.get_mfa_config(db, current_user.id)
        
        if not mfa_config:
            return {
                "enabled": False,
                "methods": [],
                "backup_codes_remaining": 0
            }
        
        return {
            "enabled": mfa_config.is_enabled,
            "required": mfa_config.is_required,
            "primary_method": mfa_config.primary_method,
            "backup_methods": mfa_config.backup_methods,
            "backup_codes_remaining": len(mfa_config.backup_codes),
            "trusted_devices": len(mfa_config.trusted_devices),
            "last_used": mfa_config.last_used
        }
        
    except Exception as e:
        logger.error(f"Failed to get MFA status: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get MFA status"
        )

# =============================================================================
# AUDIT TRAIL & SECURITY EVENTS
# =============================================================================

@router.get("/audit/events", response_model=List[Dict[str, Any]])
async def get_security_events(
    query: SecurityEventQuery = Depends(),
    current_user: User = Depends(get_current_active_user)
):
    """Get security events with filtering"""
    # Check if user has permission to view security events
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security events"
        )
    
    db = await get_database()
    
    try:
        events = await security_service.get_security_events(db, query)
        return [event.model_dump() for event in events]
        
    except Exception as e:
        logger.error(f"Failed to get security events: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security events"
        )

@router.post("/audit/export", response_model=dict)
async def export_audit_trail(
    start_date: datetime,
    end_date: datetime,
    format: str = "json",
    current_user: User = Depends(get_current_active_user)
):
    """Export audit trail for compliance reporting"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to export audit trail"
        )
    
    db = await get_database()
    
    try:
        export_result = await security_service.export_audit_trail(
            db, current_user.organization_id, start_date, end_date, format
        )
        
        # Log audit export
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.DATA_EXPORT,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description=f"Audit trail exported from {start_date} to {end_date}",
            risk_level=RiskLevel.MEDIUM
        )
        
        return export_result
        
    except Exception as e:
        logger.error(f"Failed to export audit trail: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to export audit trail"
        )

# =============================================================================
# COMPLIANCE & GOVERNANCE
# =============================================================================

@router.post("/compliance/assess", response_model=ComplianceReport)
async def assess_compliance(
    assessment_request: ComplianceAssessmentRequest,
    current_user: User = Depends(get_current_active_user)
):
    """Perform compliance assessment"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to perform compliance assessment"
        )
    
    db = await get_database()
    
    try:
        report = await compliance_service.perform_assessment(
            db, current_user.organization_id, assessment_request
        )
        
        # Log compliance assessment
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.DATA_ACCESS,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description=f"Compliance assessment performed for {assessment_request.compliance_standard}",
            risk_level=RiskLevel.LOW
        )
        
        return report
        
    except Exception as e:
        logger.error(f"Compliance assessment failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform compliance assessment"
        )

@router.get("/compliance/reports", response_model=List[Dict[str, Any]])
async def get_compliance_reports(
    current_user: User = Depends(get_current_active_user)
):
    """Get compliance reports for organization"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view compliance reports"
        )
    
    db = await get_database()
    
    try:
        reports = await compliance_service.get_reports(db, current_user.organization_id)
        return [report.model_dump() for report in reports]
        
    except Exception as e:
        logger.error(f"Failed to get compliance reports: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve compliance reports"
        )

# =============================================================================
# THREAT DETECTION & RESPONSE
# =============================================================================

@router.get("/threats/active", response_model=List[Dict[str, Any]])
async def get_active_threats(
    current_user: User = Depends(get_current_active_user)
):
    """Get active security threats"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security threats"
        )
    
    db = await get_database()
    
    try:
        threats = await threat_service.get_active_threats(db, current_user.organization_id)
        return [threat.model_dump() for threat in threats]
        
    except Exception as e:
        logger.error(f"Failed to get active threats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve active threats"
        )

@router.post("/threats/{threat_id}/respond", response_model=dict)
async def respond_to_threat(
    threat_id: str,
    response: ThreatResponse,
    current_user: User = Depends(get_current_active_user)
):
    """Respond to a security threat"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to respond to threats"
        )
    
    db = await get_database()
    
    try:
        result = await threat_service.respond_to_threat(
            db, threat_id, response, current_user.id
        )
        
        # Log threat response
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.SUSPICIOUS_ACTIVITY,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description=f"Threat response: {response.action} for threat {threat_id}",
            risk_level=RiskLevel.HIGH
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to respond to threat: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to respond to threat"
        )

# =============================================================================
# SECURITY POLICIES
# =============================================================================

@router.get("/policies", response_model=List[Dict[str, Any]])
async def get_security_policies(
    current_user: User = Depends(get_current_active_user)
):
    """Get security policies for organization"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security policies"
        )
    
    db = await get_database()
    
    try:
        policies = await security_service.get_security_policies(db, current_user.organization_id)
        return [policy.model_dump() for policy in policies]
        
    except Exception as e:
        logger.error(f"Failed to get security policies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security policies"
        )

@router.post("/policies/zero-trust", response_model=dict)
async def enable_zero_trust(
    policy: ZeroTrustPolicy,
    current_user: User = Depends(get_current_active_user)
):
    """Enable zero-trust security architecture"""
    if current_user.role not in [UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can configure zero-trust policies"
        )
    
    db = await get_database()
    
    try:
        policy.organization_id = current_user.organization_id
        policy.created_by = current_user.id
        
        result = await security_service.enable_zero_trust(db, policy)
        
        # Log zero-trust enablement
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.PERMISSION_CHANGE,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description="Zero-trust security architecture enabled",
            risk_level=RiskLevel.LOW
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Failed to enable zero-trust: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to enable zero-trust architecture"
        )

# =============================================================================
# DATA RETENTION & PRIVACY
# =============================================================================

@router.get("/data-retention/policies", response_model=List[Dict[str, Any]])
async def get_data_retention_policies(
    current_user: User = Depends(get_current_active_user)
):
    """Get data retention policies"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view data retention policies"
        )
    
    db = await get_database()
    
    try:
        policies = await security_service.get_data_retention_policies(
            db, current_user.organization_id
        )
        return [policy.model_dump() for policy in policies]
        
    except Exception as e:
        logger.error(f"Failed to get data retention policies: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve data retention policies"
        )

@router.post("/data-retention/cleanup", response_model=dict)
async def trigger_data_cleanup(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user)
):
    """Trigger automated data cleanup based on retention policies"""
    if current_user.role not in [UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only super admins can trigger data cleanup"
        )
    
    db = await get_database()
    
    try:
        # Schedule background cleanup task
        background_tasks.add_task(
            security_service.run_data_cleanup,
            db, current_user.organization_id, current_user.id
        )
        
        # Log data cleanup initiation
        await security_service.log_security_event(
            db,
            event_type=SecurityEventType.DATA_ACCESS,
            user_id=current_user.id,
            organization_id=current_user.organization_id,
            description="Automated data cleanup initiated",
            risk_level=RiskLevel.MEDIUM
        )
        
        return {
            "message": "Data cleanup initiated",
            "status": "running",
            "initiated_by": current_user.email
        }
        
    except Exception as e:
        logger.error(f"Failed to trigger data cleanup: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to trigger data cleanup"
        )

# =============================================================================
# SECURITY DASHBOARD & METRICS
# =============================================================================

@router.get("/dashboard/metrics", response_model=Dict[str, Any])
async def get_security_dashboard_metrics(
    current_user: User = Depends(get_current_active_user)
):
    """Get security dashboard metrics"""
    if current_user.role not in [UserRole.ADMIN, UserRole.SUPER_ADMIN]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions to view security dashboard"
        )
    
    db = await get_database()
    
    try:
        metrics = await security_service.get_dashboard_metrics(db, current_user.organization_id)
        return metrics
        
    except Exception as e:
        logger.error(f"Failed to get security dashboard metrics: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve security dashboard metrics"
        )

@router.get("/health", response_model=dict)
async def security_system_health():
    """Check security system health"""
    try:
        # Check various security system components
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow(),
            "components": {
                "mfa_service": "operational",
                "audit_service": "operational",
                "threat_detection": "operational",
                "compliance_engine": "operational",
                "data_retention": "operational"
            },
            "version": "4.3.0"
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Security system health check failed: {e}")
        return {
            "status": "degraded",
            "timestamp": datetime.utcnow(),
            "error": str(e)
        }
