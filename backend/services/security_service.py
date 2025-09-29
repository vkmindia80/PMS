"""
Enterprise Security Service
Phase 4.3: Comprehensive Security Operations
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import secrets
import hashlib
import logging
import json
from passlib.totp import TOTP

from models.security import (
    MFAConfiguration, AuditEvent, SecurityEventType, RiskLevel,
    SecurityPolicy, DataRetentionPolicy, ZeroTrustPolicy,
    SecurityEventQuery
)

logger = logging.getLogger(__name__)

class SecurityService:
    """Enterprise security operations service"""
    
    def __init__(self):
        self.verification_codes = {}  # In production, use Redis or similar
        self.backup_codes_used = set()
    
    # =============================================================================
    # MFA OPERATIONS
    # =============================================================================
    
    async def get_mfa_config(self, db: AsyncIOMotorDatabase, user_id: str) -> Optional[MFAConfiguration]:
        """Get MFA configuration for user"""
        try:
            config_doc = await db.mfa_configurations.find_one({"user_id": user_id})
            if config_doc:
                return MFAConfiguration(**config_doc)
            return None
        except Exception as e:
            logger.error(f"Failed to get MFA config: {e}")
            return None
    
    async def save_mfa_config(self, db: AsyncIOMotorDatabase, config: MFAConfiguration) -> bool:
        """Save MFA configuration"""
        try:
            config_dict = config.model_dump()
            result = await db.mfa_configurations.update_one(
                {"user_id": config.user_id},
                {"$set": config_dict},
                upsert=True
            )
            return result.acknowledged
        except Exception as e:
            logger.error(f"Failed to save MFA config: {e}")
            return False
    
    def generate_verification_code(self, length: int = 6) -> str:
        """Generate numeric verification code"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(length)])
    
    def generate_backup_code(self, length: int = 8) -> str:
        """Generate backup code"""
        return secrets.token_hex(length)
    
    async def send_sms_code(self, phone: str, code: str) -> bool:
        """Send SMS verification code (mock implementation)"""
        # In production, integrate with SMS provider (Twilio, AWS SNS, etc.)
        self.verification_codes[phone] = {
            "code": code,
            "expires": datetime.utcnow() + timedelta(minutes=5),
            "attempts": 0
        }
        logger.info(f"SMS code sent to {phone}: {code}")
        return True
    
    async def send_email_code(self, email: str, code: str) -> bool:
        """Send email verification code (mock implementation)"""
        # In production, integrate with email provider (SendGrid, AWS SES, etc.)
        self.verification_codes[email] = {
            "code": code,
            "expires": datetime.utcnow() + timedelta(minutes=5),
            "attempts": 0
        }
        logger.info(f"Email code sent to {email}: {code}")
        return True
    
    async def verify_sms_code(self, phone: str, code: str) -> bool:
        """Verify SMS code"""
        stored = self.verification_codes.get(phone)
        if not stored:
            return False
        
        if datetime.utcnow() > stored["expires"]:
            del self.verification_codes[phone]
            return False
        
        stored["attempts"] += 1
        if stored["attempts"] > 3:
            del self.verification_codes[phone]
            return False
        
        if stored["code"] == code:
            del self.verification_codes[phone]
            return True
        
        return False
    
    async def verify_email_code(self, email: str, code: str) -> bool:
        """Verify email code"""
        return await self.verify_sms_code(email, code)  # Same logic
    
    # =============================================================================
    # AUDIT TRAIL OPERATIONS
    # =============================================================================
    
    async def log_security_event(
        self,
        db: AsyncIOMotorDatabase,
        event_type: SecurityEventType,
        user_id: Optional[str],
        organization_id: str,
        description: str,
        risk_level: RiskLevel = RiskLevel.LOW,
        **kwargs
    ) -> bool:
        """Log security event to audit trail"""
        try:
            # Create audit event
            audit_event = AuditEvent(
                organization_id=organization_id,
                user_id=user_id,
                event_type=event_type,
                action=kwargs.get("action", "unknown"),
                outcome=kwargs.get("outcome", "success"),
                description=description,
                risk_level=risk_level,
                ip_address=kwargs.get("ip_address"),
                user_agent=kwargs.get("user_agent"),
                details=kwargs.get("details", {}),
                metadata=kwargs.get("metadata", {})
            )
            
            # Create blockchain-style hash chain for immutability
            await self._create_hash_chain(db, audit_event)
            
            # Insert audit event
            result = await db.audit_events.insert_one(audit_event.model_dump())
            return result.acknowledged
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
            return False
    
    async def _create_hash_chain(self, db: AsyncIOMotorDatabase, event: AuditEvent):
        """Create blockchain-style hash chain for audit immutability"""
        try:
            # Get the last event's hash
            last_event = await db.audit_events.find_one(
                {"organization_id": event.organization_id},
                sort=[("timestamp", -1)]
            )
            
            previous_hash = last_event.get("hash_chain", "genesis") if last_event else "genesis"
            
            # Create hash of current event
            event_data = f"{event.organization_id}{event.timestamp.isoformat()}{event.description}{previous_hash}"
            current_hash = hashlib.sha256(event_data.encode()).hexdigest()
            
            event.previous_hash = previous_hash
            event.hash_chain = current_hash
            
        except Exception as e:
            logger.error(f"Failed to create hash chain: {e}")
            # Continue without hash chain if it fails
    
    async def get_security_events(
        self,
        db: AsyncIOMotorDatabase,
        query: SecurityEventQuery
    ) -> List[AuditEvent]:
        """Get security events with filtering"""
        try:
            # Build MongoDB query
            filter_query = {}
            
            if query.start_date and query.end_date:
                filter_query["timestamp"] = {
                    "$gte": query.start_date,
                    "$lte": query.end_date
                }
            
            if query.event_types:
                filter_query["event_type"] = {"$in": query.event_types}
            
            if query.user_id:
                filter_query["user_id"] = query.user_id
            
            if query.risk_level:
                filter_query["risk_level"] = query.risk_level
            
            # Execute query
            cursor = db.audit_events.find(filter_query)\
                .sort("timestamp", -1)\
                .limit(query.limit)\
                .skip(query.offset)
            
            events = []
            async for doc in cursor:
                events.append(AuditEvent(**doc))
            
            return events
            
        except Exception as e:
            logger.error(f"Failed to get security events: {e}")
            return []
    
    async def export_audit_trail(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str,
        start_date: datetime,
        end_date: datetime,
        format: str = "json"
    ) -> Dict[str, Any]:
        """Export audit trail for compliance"""
        try:
            # Get events in date range
            query = SecurityEventQuery(
                start_date=start_date,
                end_date=end_date,
                limit=10000  # Large limit for export
            )
            events = await self.get_security_events(db, query)
            
            export_data = {
                "organization_id": organization_id,
                "export_date": datetime.utcnow(),
                "period_start": start_date,
                "period_end": end_date,
                "total_events": len(events),
                "events": [event.model_dump() for event in events],
                "format": format,
                "integrity_verified": await self._verify_hash_chain(db, events)
            }
            
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export audit trail: {e}")
            return {"error": str(e)}
    
    async def _verify_hash_chain(self, db: AsyncIOMotorDatabase, events: List[AuditEvent]) -> bool:
        """Verify blockchain-style hash chain integrity"""
        try:
            for i, event in enumerate(events):
                if i == 0:
                    continue  # Skip first event
                
                # Verify hash chain
                previous_event = events[i-1]
                expected_previous_hash = previous_event.hash_chain
                
                if event.previous_hash != expected_previous_hash:
                    logger.warning(f"Hash chain integrity violation detected in event {event.id}")
                    return False
            
            return True
            
        except Exception as e:
            logger.error(f"Hash chain verification failed: {e}")
            return False
    
    # =============================================================================
    # SECURITY POLICY OPERATIONS
    # =============================================================================
    
    async def get_security_policies(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> List[SecurityPolicy]:
        """Get security policies for organization"""
        try:
            cursor = db.security_policies.find({"organization_id": organization_id})
            policies = []
            async for doc in cursor:
                policies.append(SecurityPolicy(**doc))
            return policies
        except Exception as e:
            logger.error(f"Failed to get security policies: {e}")
            return []
    
    async def enable_zero_trust(
        self,
        db: AsyncIOMotorDatabase,
        policy: ZeroTrustPolicy
    ) -> Dict[str, Any]:
        """Enable zero-trust security architecture"""
        try:
            # Save zero-trust policy
            result = await db.zero_trust_policies.update_one(
                {"organization_id": policy.organization_id},
                {"$set": policy.model_dump()},
                upsert=True
            )
            
            # Initialize default security policies
            await self._create_default_security_policies(db, policy.organization_id, policy.created_by)
            
            return {
                "success": True,
                "message": "Zero-trust architecture enabled",
                "policy_id": policy.id,
                "enforcement_mode": policy.enforcement_mode
            }
            
        except Exception as e:
            logger.error(f"Failed to enable zero-trust: {e}")
            return {"success": False, "error": str(e)}
    
    async def _create_default_security_policies(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str,
        created_by: str
    ):
        """Create default security policies for zero-trust"""
        try:
            default_policies = [
                SecurityPolicy(
                    organization_id=organization_id,
                    name="Strong Password Policy",
                    description="Enforce strong password requirements",
                    category="authentication",
                    password_min_length=12,
                    password_require_uppercase=True,
                    password_require_lowercase=True,
                    password_require_numbers=True,
                    password_require_symbols=True,
                    password_expiry_days=90,
                    effective_date=datetime.utcnow(),
                    created_by=created_by
                ),
                SecurityPolicy(
                    organization_id=organization_id,
                    name="Session Security Policy",
                    description="Secure session management",
                    category="authorization",
                    session_timeout_minutes=480,
                    concurrent_sessions_limit=3,
                    idle_timeout_minutes=30,
                    effective_date=datetime.utcnow(),
                    created_by=created_by
                ),
                SecurityPolicy(
                    organization_id=organization_id,
                    name="MFA Requirement Policy",
                    description="Mandatory multi-factor authentication",
                    category="authentication",
                    require_mfa=True,
                    effective_date=datetime.utcnow(),
                    created_by=created_by
                )
            ]
            
            for policy in default_policies:
                await db.security_policies.update_one(
                    {"organization_id": organization_id, "name": policy.name},
                    {"$set": policy.model_dump()},
                    upsert=True
                )
                
        except Exception as e:
            logger.error(f"Failed to create default security policies: {e}")
    
    # =============================================================================
    # DATA RETENTION OPERATIONS
    # =============================================================================
    
    async def get_data_retention_policies(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> List[DataRetentionPolicy]:
        """Get data retention policies"""
        try:
            # Create default retention policies if none exist
            await self._ensure_default_retention_policies(db, organization_id)
            
            cursor = db.data_retention_policies.find({"organization_id": organization_id})
            policies = []
            async for doc in cursor:
                policies.append(DataRetentionPolicy(**doc))
            return policies
        except Exception as e:
            logger.error(f"Failed to get data retention policies: {e}")
            return []
    
    async def _ensure_default_retention_policies(self, db: AsyncIOMotorDatabase, organization_id: str):
        """Ensure default data retention policies exist"""
        try:
            existing_count = await db.data_retention_policies.count_documents(
                {"organization_id": organization_id}
            )
            
            if existing_count == 0:
                default_policies = [
                    DataRetentionPolicy(
                        organization_id=organization_id,
                        name="Audit Log Retention",
                        description="Retain audit logs for compliance",
                        data_category="audit_logs",
                        retention_period_days=2555,  # 7 years
                        retention_basis="legal_requirement",
                        data_types=["audit_events", "login_logs", "access_logs"],
                        collection_names=["audit_events"],
                        created_by="system"
                    ),
                    DataRetentionPolicy(
                        organization_id=organization_id,
                        name="User Data Retention",
                        description="Retain user data per privacy regulations",
                        data_category="personal_data",
                        retention_period_days=1095,  # 3 years
                        retention_basis="user_consent",
                        data_types=["user_profiles", "user_preferences"],
                        collection_names=["users"],
                        legal_hold_exempt=False,
                        created_by="system"
                    ),
                    DataRetentionPolicy(
                        organization_id=organization_id,
                        name="Business Data Retention",
                        description="Retain business data for operational needs",
                        data_category="business_data",
                        retention_period_days=2190,  # 6 years
                        retention_basis="business_need",
                        data_types=["projects", "tasks", "comments"],
                        collection_names=["projects", "tasks", "comments"],
                        created_by="system"
                    )
                ]
                
                for policy in default_policies:
                    await db.data_retention_policies.insert_one(policy.model_dump())
                    
        except Exception as e:
            logger.error(f"Failed to create default retention policies: {e}")
    
    async def run_data_cleanup(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str,
        initiated_by: str
    ):
        """Run automated data cleanup based on retention policies"""
        try:
            policies = await self.get_data_retention_policies(db, organization_id)
            cleanup_results = []
            
            for policy in policies:
                if not policy.auto_cleanup_enabled:
                    continue
                
                cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_period_days)
                
                for collection_name in policy.collection_names:
                    if collection_name in ["audit_events", "users", "projects", "tasks", "comments"]:
                        result = await self._cleanup_collection(
                            db, collection_name, cutoff_date, policy.cleanup_method
                        )
                        cleanup_results.append({
                            "collection": collection_name,
                            "policy": policy.name,
                            "items_processed": result
                        })
            
            # Log cleanup completion
            await self.log_security_event(
                db,
                event_type=SecurityEventType.DATA_ACCESS,
                user_id=initiated_by,
                organization_id=organization_id,
                description=f"Data cleanup completed. Results: {cleanup_results}",
                risk_level=RiskLevel.LOW
            )
            
            return cleanup_results
            
        except Exception as e:
            logger.error(f"Data cleanup failed: {e}")
            return []
    
    async def _cleanup_collection(
        self,
        db: AsyncIOMotorDatabase,
        collection_name: str,
        cutoff_date: datetime,
        cleanup_method: str
    ) -> int:
        """Clean up specific collection"""
        try:
            collection = getattr(db, collection_name)
            
            if cleanup_method == "soft_delete":
                # Mark as deleted instead of removing
                result = await collection.update_many(
                    {"created_at": {"$lt": cutoff_date}, "deleted": {"$ne": True}},
                    {"$set": {"deleted": True, "deleted_at": datetime.utcnow()}}
                )
                return result.modified_count
            elif cleanup_method == "hard_delete":
                # Actually delete the documents
                result = await collection.delete_many(
                    {"created_at": {"$lt": cutoff_date}}
                )
                return result.deleted_count
            else:
                return 0
                
        except Exception as e:
            logger.error(f"Collection cleanup failed for {collection_name}: {e}")
            return 0
    
    # =============================================================================
    # DASHBOARD & METRICS
    # =============================================================================
    
    async def get_dashboard_metrics(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> Dict[str, Any]:
        """Get security dashboard metrics"""
        try:
            # Get metrics for the last 30 days
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            # Security events by type
            events_pipeline = [
                {"$match": {
                    "organization_id": organization_id,
                    "timestamp": {"$gte": thirty_days_ago}
                }},
                {"$group": {
                    "_id": "$event_type",
                    "count": {"$sum": 1}
                }}
            ]
            
            event_counts = {}
            async for doc in db.audit_events.aggregate(events_pipeline):
                event_counts[doc["_id"]] = doc["count"]
            
            # MFA adoption rate
            total_users = await db.users.count_documents({"organization_id": organization_id})
            mfa_enabled_users = await db.mfa_configurations.count_documents({
                "organization_id": organization_id,
                "is_enabled": True
            })
            
            mfa_adoption_rate = (mfa_enabled_users / total_users * 100) if total_users > 0 else 0
            
            # Active threats
            active_threats = await db.threat_detections.count_documents({
                "organization_id": organization_id,
                "investigation_status": "open"
            })
            
            # Compliance status
            compliance_reports = await db.compliance_reports.count_documents({
                "organization_id": organization_id,
                "is_certified": True,
                "certification_valid_until": {"$gte": datetime.utcnow()}
            })
            
            return {
                "security_events": {
                    "total_last_30_days": sum(event_counts.values()),
                    "by_type": event_counts,
                    "high_risk_events": event_counts.get(SecurityEventType.SUSPICIOUS_ACTIVITY.value, 0)
                },
                "mfa_status": {
                    "adoption_rate": round(mfa_adoption_rate, 2),
                    "enabled_users": mfa_enabled_users,
                    "total_users": total_users
                },
                "threat_detection": {
                    "active_threats": active_threats,
                    "status": "healthy" if active_threats == 0 else "attention_needed"
                },
                "compliance": {
                    "active_certifications": compliance_reports,
                    "status": "compliant" if compliance_reports > 0 else "needs_assessment"
                },
                "system_health": {
                    "overall_status": "secure",
                    "last_updated": datetime.utcnow(),
                    "zero_trust_enabled": await self._is_zero_trust_enabled(db, organization_id)
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get dashboard metrics: {e}")
            return {"error": str(e)}
    
    async def _is_zero_trust_enabled(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> bool:
        """Check if zero-trust is enabled"""
        try:
            policy = await db.zero_trust_policies.find_one({
                "organization_id": organization_id,
                "is_enabled": True
            })
            return policy is not None
        except Exception as e:
            logger.error(f"Failed to check zero-trust status: {e}")
            return False
