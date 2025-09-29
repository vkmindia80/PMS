"""
Enterprise Security & Compliance Models
Phase 4.3: Zero-Trust Security Architecture
"""

from pydantic import BaseModel, Field, validator
from typing import List, Dict, Any, Optional, Union
from datetime import datetime, timedelta
from enum import Enum
import uuid

class SecurityEventType(str, Enum):
    """Security event types for monitoring"""
    LOGIN_ATTEMPT = "login_attempt"
    LOGIN_SUCCESS = "login_success"
    LOGIN_FAILURE = "login_failure"
    PASSWORD_CHANGE = "password_change"
    MFA_ENABLED = "mfa_enabled"
    MFA_DISABLED = "mfa_disabled"
    PERMISSION_CHANGE = "permission_change"
    DATA_ACCESS = "data_access"
    DATA_EXPORT = "data_export"
    API_ACCESS = "api_access"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    ACCOUNT_LOCKED = "account_locked"
    ACCOUNT_UNLOCKED = "account_unlocked"
    SESSION_TIMEOUT = "session_timeout"
    UNAUTHORIZED_ACCESS = "unauthorized_access"

class ComplianceStandard(str, Enum):
    """Supported compliance standards"""
    SOC2_TYPE2 = "soc2_type2"
    GDPR = "gdpr"
    CCPA = "ccpa"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    ISO_27001 = "iso_27001"
    SOX = "sox"

class RiskLevel(str, Enum):
    """Risk assessment levels"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"

class AuditEvent(BaseModel):
    """Comprehensive audit trail model"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    event_type: SecurityEventType
    resource_type: Optional[str] = None  # project, task, user, etc.
    resource_id: Optional[str] = None
    action: str  # create, read, update, delete, login, logout, etc.
    outcome: str  # success, failure, blocked, etc.
    
    # Security Context
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    location: Optional[Dict[str, Any]] = None  # geo-location data
    device_fingerprint: Optional[str] = None
    
    # Risk Assessment
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = Field(default=0.0, ge=0, le=100)
    risk_factors: List[str] = Field(default_factory=list)
    
    # Compliance
    compliance_flags: List[ComplianceStandard] = Field(default_factory=list)
    data_classification: Optional[str] = None  # public, internal, confidential, restricted
    
    # Event Details
    description: str
    details: Dict[str, Any] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)
    
    # Timestamps
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Blockchain/Immutable Trail
    hash_chain: Optional[str] = None
    previous_hash: Optional[str] = None
    verification_signature: Optional[str] = None

class MFAMethod(str, Enum):
    """Multi-factor authentication methods"""
    SMS = "sms"
    EMAIL = "email"
    TOTP = "totp"  # Time-based OTP (Google Authenticator, etc.)
    PUSH = "push"  # Push notifications
    BIOMETRIC = "biometric"  # Fingerprint, Face ID
    HARDWARE_KEY = "hardware_key"  # YubiKey, etc.
    BACKUP_CODES = "backup_codes"

class MFAConfiguration(BaseModel):
    """Multi-factor authentication configuration"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: str
    
    # MFA Settings
    is_enabled: bool = False
    is_required: bool = False
    primary_method: Optional[MFAMethod] = None
    backup_methods: List[MFAMethod] = Field(default_factory=list)
    
    # Method-specific configurations
    totp_secret: Optional[str] = None
    sms_phone: Optional[str] = None
    push_device_tokens: List[str] = Field(default_factory=list)
    backup_codes: List[str] = Field(default_factory=list)
    hardware_keys: List[Dict[str, str]] = Field(default_factory=list)
    
    # Security Settings
    trust_devices: bool = False
    trusted_devices: List[Dict[str, Any]] = Field(default_factory=list)
    session_timeout_minutes: int = 480  # 8 hours default
    
    # Recovery
    recovery_email: Optional[str] = None
    recovery_phone: Optional[str] = None
    
    # Audit
    last_used: Optional[datetime] = None
    failed_attempts: int = 0
    locked_until: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class SecurityPolicy(BaseModel):
    """Organization security policy"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    
    # Policy Details
    name: str
    description: str
    version: str = "1.0.0"
    category: str  # authentication, authorization, data_handling, etc.
    
    # Policy Rules
    rules: List[Dict[str, Any]] = Field(default_factory=list)
    enforcement_level: str = "strict"  # strict, moderate, lenient
    
    # Password Policy
    password_min_length: int = 12
    password_require_uppercase: bool = True
    password_require_lowercase: bool = True
    password_require_numbers: bool = True
    password_require_symbols: bool = True
    password_expiry_days: int = 90
    password_history_count: int = 5
    
    # Session Policy
    session_timeout_minutes: int = 480
    concurrent_sessions_limit: int = 3
    idle_timeout_minutes: int = 30
    
    # Access Policy
    require_mfa: bool = True
    allowed_ip_ranges: List[str] = Field(default_factory=list)
    blocked_countries: List[str] = Field(default_factory=list)
    working_hours_only: bool = False
    working_hours: Dict[str, Any] = Field(default_factory=dict)
    
    # Data Policy
    data_retention_days: int = 2555  # 7 years default
    automatic_backup: bool = True
    encryption_at_rest: bool = True
    encryption_in_transit: bool = True
    
    # Compliance Requirements
    compliance_standards: List[ComplianceStandard] = Field(default_factory=list)
    audit_log_retention_days: int = 2555  # 7 years
    
    # Status
    is_active: bool = True
    effective_date: datetime
    expiry_date: Optional[datetime] = None
    
    # Audit
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ComplianceReport(BaseModel):
    """Compliance assessment and reporting"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    
    # Report Details
    report_type: str  # assessment, audit, certification
    compliance_standard: ComplianceStandard
    report_period_start: datetime
    report_period_end: datetime
    
    # Assessment Results
    overall_score: float = Field(ge=0, le=100)
    compliance_percentage: float = Field(ge=0, le=100)
    
    # Control Areas
    control_assessments: List[Dict[str, Any]] = Field(default_factory=list)
    passed_controls: int = 0
    failed_controls: int = 0
    not_applicable_controls: int = 0
    
    # Findings
    critical_findings: List[Dict[str, Any]] = Field(default_factory=list)
    high_findings: List[Dict[str, Any]] = Field(default_factory=list)
    medium_findings: List[Dict[str, Any]] = Field(default_factory=list)
    low_findings: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Recommendations
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    remediation_plan: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Evidence
    evidence_collected: List[Dict[str, Any]] = Field(default_factory=list)
    supporting_documents: List[str] = Field(default_factory=list)
    
    # Certification
    is_certified: bool = False
    certification_valid_until: Optional[datetime] = None
    auditor_name: Optional[str] = None
    auditor_signature: Optional[str] = None
    
    # Status
    status: str = "draft"  # draft, in_review, approved, published
    generated_by: str
    reviewed_by: Optional[str] = None
    approved_by: Optional[str] = None
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ThreatDetection(BaseModel):
    """Real-time threat detection and response"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    
    # Threat Details
    threat_type: str  # brute_force, data_exfiltration, privilege_escalation, etc.
    severity: RiskLevel
    confidence: float = Field(ge=0, le=1)  # AI confidence score
    
    # Detection
    detection_method: str  # ai_ml, rule_based, anomaly_detection, etc.
    detection_rules: List[str] = Field(default_factory=list)
    indicators: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Affected Resources
    affected_users: List[str] = Field(default_factory=list)
    affected_resources: List[Dict[str, str]] = Field(default_factory=list)
    attack_vector: Optional[str] = None
    
    # Response
    auto_response_taken: bool = False
    response_actions: List[Dict[str, Any]] = Field(default_factory=list)
    is_blocked: bool = False
    is_quarantined: bool = False
    
    # Investigation
    investigation_status: str = "open"  # open, investigating, resolved, false_positive
    assigned_to: Optional[str] = None
    investigation_notes: List[Dict[str, Any]] = Field(default_factory=list)
    
    # Timeline
    first_detected: datetime = Field(default_factory=datetime.utcnow)
    last_detected: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = None
    
    # Context
    source_ip: Optional[str] = None
    user_agent: Optional[str] = None
    session_ids: List[str] = Field(default_factory=list)
    related_events: List[str] = Field(default_factory=list)
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DataRetentionPolicy(BaseModel):
    """Data retention and cleanup policies"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    
    # Policy Details
    name: str
    description: str
    data_category: str  # personal_data, audit_logs, business_data, etc.
    
    # Retention Rules
    retention_period_days: int
    retention_basis: str  # legal_requirement, business_need, user_consent, etc.
    
    # Data Types Covered
    data_types: List[str] = Field(default_factory=list)
    collection_names: List[str] = Field(default_factory=list)
    
    # Cleanup Rules
    auto_cleanup_enabled: bool = True
    cleanup_method: str = "soft_delete"  # soft_delete, hard_delete, archive
    archive_location: Optional[str] = None
    
    # Compliance
    legal_basis: List[str] = Field(default_factory=list)
    compliance_requirements: List[ComplianceStandard] = Field(default_factory=list)
    
    # Exceptions
    exceptions: List[Dict[str, Any]] = Field(default_factory=list)
    legal_hold_exempt: bool = True
    
    # Monitoring
    last_cleanup_run: Optional[datetime] = None
    next_cleanup_scheduled: Optional[datetime] = None
    items_cleaned: int = 0
    items_archived: int = 0
    
    # Status
    is_active: bool = True
    created_by: str
    approved_by: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ZeroTrustPolicy(BaseModel):
    """Zero-trust security architecture policy"""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    organization_id: str
    
    # Policy Configuration
    name: str = "Zero-Trust Security Policy"
    description: str
    version: str = "1.0.0"
    
    # Trust Principles
    verify_explicitly: bool = True  # Always authenticate and authorize
    least_privilege_access: bool = True  # Minimal access rights
    assume_breach: bool = True  # Assume network is compromised
    
    # Identity Verification
    continuous_verification: bool = True
    context_aware_access: bool = True
    device_compliance_required: bool = True
    location_based_controls: bool = True
    
    # Network Security
    micro_segmentation: bool = True
    encrypted_communications: bool = True
    inspect_all_traffic: bool = True
    
    # Device Security
    device_registration_required: bool = True
    device_encryption_required: bool = True
    managed_devices_only: bool = False
    
    # Access Controls
    just_in_time_access: bool = True
    privileged_access_management: bool = True
    conditional_access: bool = True
    
    # Monitoring
    continuous_monitoring: bool = True
    behavioral_analytics: bool = True
    real_time_threat_detection: bool = True
    
    # Configuration
    risk_threshold: float = Field(default=0.7, ge=0, le=1)
    auto_block_high_risk: bool = True
    
    # Status
    is_enabled: bool = True
    enforcement_mode: str = "strict"  # strict, moderate, learning
    
    created_by: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

# Request/Response Models for API endpoints

class MFASetupRequest(BaseModel):
    method: MFAMethod
    phone_number: Optional[str] = None
    device_token: Optional[str] = None

class MFAVerificationRequest(BaseModel):
    method: MFAMethod
    code: str
    trust_device: bool = False

class SecurityEventQuery(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    event_types: Optional[List[SecurityEventType]] = None
    user_id: Optional[str] = None
    risk_level: Optional[RiskLevel] = None
    limit: int = Field(default=100, le=1000)
    offset: int = 0

class ComplianceAssessmentRequest(BaseModel):
    compliance_standard: ComplianceStandard
    assessment_scope: List[str] = Field(default_factory=list)
    include_evidence: bool = True

class ThreatResponse(BaseModel):
    threat_id: str
    action: str  # block, quarantine, monitor, ignore
    notes: Optional[str] = None
    auto_resolve: bool = False