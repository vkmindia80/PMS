#!/usr/bin/env python3
"""
Security Demo Data Generator
Creates comprehensive demo data for the Enterprise Security & Compliance system
"""

import asyncio
import os
import sys
from datetime import datetime, timedelta
import random
import secrets
from motor.motor_asyncio import AsyncIOMotorClient
import base64

# Add the backend directory to Python path
sys.path.append('/app/backend')

from models.security import (
    AuditEvent, SecurityEventType, RiskLevel, MFAConfiguration, MFAMethod,
    ThreatDetection, ComplianceReport, ComplianceStandard, SecurityPolicy,
    DataRetentionPolicy, ZeroTrustPolicy
)

class SecurityDemoDataGenerator:
    def __init__(self):
        self.mongo_client = None
        self.db = None
        self.organization_id = "demo-org-001"
        self.admin_user_id = "demo-user-001"
        
    async def connect_to_database(self):
        """Connect to MongoDB"""
        mongo_url = os.getenv("MONGO_URL", "mongodb://localhost:27017")
        database_name = os.getenv("DATABASE_NAME", "enterprise_portfolio_db")
        
        self.mongo_client = AsyncIOMotorClient(mongo_url)
        self.db = self.mongo_client[database_name]
        
        # Test connection
        await self.mongo_client.admin.command('ping')
        print("✅ Connected to MongoDB successfully")
        
    async def cleanup_existing_data(self):
        """Clean up existing security demo data"""
        collections = [
            'audit_events', 'mfa_configurations', 'threat_detections',
            'compliance_reports', 'security_policies', 'data_retention_policies',
            'zero_trust_policies'
        ]
        
        for collection in collections:
            result = await self.db[collection].delete_many({
                "organization_id": self.organization_id
            })
            print(f"🧹 Cleaned {result.deleted_count} records from {collection}")
    
    async def create_audit_events(self):
        """Create realistic audit events"""
        print("📊 Creating audit events...")
        
        # Define realistic events for the past 30 days
        event_types = [
            (SecurityEventType.LOGIN_SUCCESS, RiskLevel.LOW, "User login successful"),
            (SecurityEventType.LOGIN_FAILURE, RiskLevel.MEDIUM, "Failed login attempt"),
            (SecurityEventType.PASSWORD_CHANGE, RiskLevel.LOW, "User changed password"),
            (SecurityEventType.MFA_ENABLED, RiskLevel.LOW, "Multi-factor authentication enabled"),
            (SecurityEventType.DATA_ACCESS, RiskLevel.LOW, "User accessed project data"),
            (SecurityEventType.API_ACCESS, RiskLevel.LOW, "API endpoint accessed"),
            (SecurityEventType.PERMISSION_CHANGE, RiskLevel.MEDIUM, "User permissions updated"),
            (SecurityEventType.DATA_EXPORT, RiskLevel.MEDIUM, "Data exported by user"),
            (SecurityEventType.SUSPICIOUS_ACTIVITY, RiskLevel.HIGH, "Unusual access pattern detected"),
            (SecurityEventType.SESSION_TIMEOUT, RiskLevel.LOW, "User session timed out")
        ]
        
        audit_events = []
        now = datetime.utcnow()
        
        # Create events over the past 30 days
        for i in range(150):  # 150 events over 30 days
            days_back = random.randint(0, 30)
            event_time = now - timedelta(days=days_back, 
                                       hours=random.randint(0, 23),
                                       minutes=random.randint(0, 59))
            
            event_type, risk_level, base_description = random.choice(event_types)
            
            # Create realistic IP addresses and user agents
            ip_addresses = [
                "192.168.1.100", "10.0.0.50", "172.16.0.25", "203.0.113.45",
                "198.51.100.78", "192.0.2.123"
            ]
            
            user_agents = [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
            ]
            
            audit_event = AuditEvent(
                organization_id=self.organization_id,
                user_id=self.admin_user_id if random.random() > 0.3 else f"user-{random.randint(1, 10)}",
                event_type=event_type,
                action=event_type.value.replace('_', ' ').title(),
                outcome="success" if risk_level != RiskLevel.HIGH else random.choice(["success", "failure"]),
                description=base_description,
                risk_level=risk_level,
                timestamp=event_time,
                ip_address=random.choice(ip_addresses),
                user_agent=random.choice(user_agents),
                details={
                    "browser": "Chrome" if "Chrome" in random.choice(user_agents) else "Firefox",
                    "os": random.choice(["Windows", "macOS", "Linux"]),
                    "location": random.choice(["New York", "London", "Tokyo", "San Francisco"])
                },
                metadata={
                    "session_duration": random.randint(300, 7200),
                    "pages_visited": random.randint(1, 20)
                }
            )
            
            audit_events.append(audit_event.model_dump())
        
        # Insert audit events
        await self.db.audit_events.insert_many(audit_events)
        print(f"✅ Created {len(audit_events)} audit events")
    
    async def create_mfa_configurations(self):
        """Create MFA configurations for demo users"""
        print("🔐 Creating MFA configurations...")
        
        # Get existing users
        users = await self.db.users.find({"organization_id": self.organization_id}).to_list(None)
        
        mfa_configs = []
        for i, user in enumerate(users[:3]):  # Enable MFA for first 3 users
            # Generate TOTP secret
            totp_secret = TOTP.generate_secret()
            
            mfa_config = MFAConfiguration(
                user_id=user["id"],
                organization_id=self.organization_id,
                is_enabled=True,
                is_required=i == 0,  # Make it required for admin
                primary_method=random.choice([MFAMethod.TOTP, MFAMethod.EMAIL]),
                backup_methods=[MFAMethod.EMAIL] if random.random() > 0.5 else [],
                totp_secret=totp_secret,
                backup_codes=[secrets.token_hex(8) for _ in range(10)],
                trusted_devices=[
                    {
                        "device_id": secrets.token_urlsafe(32),
                        "name": f"Device {i+1}",
                        "added_at": datetime.utcnow() - timedelta(days=random.randint(1, 30)),
                        "last_used": datetime.utcnow() - timedelta(days=random.randint(0, 7))
                    }
                ] if random.random() > 0.3 else [],
                last_used=datetime.utcnow() - timedelta(hours=random.randint(1, 48))
            )
            
            mfa_configs.append(mfa_config.model_dump())
        
        if mfa_configs:
            await self.db.mfa_configurations.insert_many(mfa_configs)
            print(f"✅ Created {len(mfa_configs)} MFA configurations")
    
    async def create_threat_detections(self):
        """Create threat detection records"""
        print("🚨 Creating threat detections...")
        
        threat_types = [
            "Brute Force Attack", "SQL Injection Attempt", "XSS Attack", 
            "Unusual Access Pattern", "Suspicious File Upload", "API Rate Limit Exceeded",
            "Privilege Escalation Attempt", "Data Exfiltration Pattern"
        ]
        
        severities = ["low", "medium", "high", "critical"]
        statuses = ["detected", "investigating", "contained", "resolved"]
        
        threats = []
        now = datetime.utcnow()
        
        # Create 8 threat detections (mix of resolved and active)
        for i in range(8):
            days_back = random.randint(0, 15)
            detected_time = now - timedelta(days=days_back,
                                          hours=random.randint(0, 23),
                                          minutes=random.randint(0, 59))
            
            threat_type = random.choice(threat_types)
            severity = random.choice(severities)
            status = random.choice(statuses)
            
            threat = ThreatDetection(
                organization_id=self.organization_id,
                threat_type=threat_type,
                severity=severity,
                status=status,
                description=f"Detected {threat_type.lower()} targeting our system",
                source_ip="203.0.113." + str(random.randint(1, 255)),
                target_resource=random.choice([
                    "/api/auth/login", "/api/projects", "/api/users", 
                    "/api/files/upload", "/api/data/export"
                ]),
                detection_method=random.choice([
                    "Anomaly Detection", "Signature Matching", "Behavioral Analysis",
                    "Rate Limiting", "Pattern Recognition"
                ]),
                confidence_score=random.randint(60, 95),
                detected_at=detected_time,
                investigation_status="closed" if status == "resolved" else "open",
                investigation_notes=f"Threat analysis completed. Risk level: {severity}",
                mitigation_actions=[
                    "IP address blocked",
                    "User account secured",
                    "Security policies updated"
                ] if status in ["contained", "resolved"] else [],
                false_positive=False,
                related_events=[f"event-{random.randint(1000, 9999)}" for _ in range(random.randint(1, 3))],
                remediation_status="completed" if status == "resolved" else "in_progress",
                assigned_to=self.admin_user_id if status in ["investigating", "contained"] else None
            )
            
            threats.append(threat.model_dump())
        
        await self.db.threat_detections.insert_many(threats)
        print(f"✅ Created {len(threats)} threat detections")
    
    async def create_compliance_reports(self):
        """Create compliance reports"""
        print("📋 Creating compliance reports...")
        
        standards = [
            ComplianceStandard.SOC2_TYPE2,
            ComplianceStandard.GDPR,
            ComplianceStandard.ISO_27001,
            ComplianceStandard.HIPAA
        ]
        
        reports = []
        now = datetime.utcnow()
        
        for i, standard in enumerate(standards):
            report_date = now - timedelta(days=random.randint(30, 180))
            
            # Generate realistic compliance scores
            total_controls = random.randint(50, 150)
            passed_controls = int(total_controls * random.uniform(0.75, 0.95))
            failed_controls = total_controls - passed_controls
            
            report = ComplianceReport(
                organization_id=self.organization_id,
                compliance_standard=standard,
                assessment_date=report_date,
                assessor_name=f"Compliance Assessor {i+1}",
                assessment_scope=f"{standard.value.upper()} compliance assessment for enterprise operations",
                total_controls_assessed=total_controls,
                controls_passed=passed_controls,
                controls_failed=failed_controls,
                compliance_score=round((passed_controls / total_controls) * 100, 2),
                is_certified=passed_controls >= int(total_controls * 0.8),
                certification_valid_until=report_date + timedelta(days=365) if passed_controls >= int(total_controls * 0.8) else None,
                findings=[
                    f"Control gap identified in {random.choice(['access management', 'data encryption', 'audit logging', 'incident response'])}",
                    f"Improvement needed in {random.choice(['security training', 'vulnerability management', 'backup procedures', 'network security'])}"
                ][:failed_controls] if failed_controls > 0 else [],
                recommendations=[
                    "Implement automated compliance monitoring",
                    "Enhance security awareness training program",
                    "Strengthen incident response procedures",
                    "Improve data classification and handling"
                ],
                remediation_plan={
                    "priority_actions": [
                        "Address critical control gaps",
                        "Update security policies",
                        "Conduct staff training"
                    ],
                    "timeline": "6 months",
                    "responsible_team": "Security & Compliance Team"
                },
                next_assessment_date=report_date + timedelta(days=365),
                created_by=self.admin_user_id
            )
            
            reports.append(report.model_dump())
        
        await self.db.compliance_reports.insert_many(reports)
        print(f"✅ Created {len(reports)} compliance reports")
    
    async def create_security_policies(self):
        """Create security policies"""
        print("🛡️ Creating security policies...")
        
        policies = [
            {
                "name": "Password Security Policy",
                "description": "Defines password requirements and management standards",
                "category": "authentication",
                "password_min_length": 12,
                "password_require_uppercase": True,
                "password_require_lowercase": True,
                "password_require_numbers": True,
                "password_require_symbols": True,
                "password_expiry_days": 90
            },
            {
                "name": "Multi-Factor Authentication Policy",
                "description": "Mandatory MFA for all system access",
                "category": "authentication",
                "require_mfa": True,
                "mfa_methods_allowed": ["totp", "sms", "email"]
            },
            {
                "name": "Session Management Policy",
                "description": "Controls user session security and timeouts",
                "category": "authorization",
                "session_timeout_minutes": 480,
                "idle_timeout_minutes": 30,
                "concurrent_sessions_limit": 3
            },
            {
                "name": "Data Access Control Policy",
                "description": "Defines data access controls and audit requirements",
                "category": "data_protection",
                "data_classification_required": True,
                "access_logging_enabled": True,
                "encryption_at_rest": True,
                "encryption_in_transit": True
            }
        ]
        
        security_policies = []
        for policy_data in policies:
            policy = SecurityPolicy(
                organization_id=self.organization_id,
                **policy_data,
                is_active=True,
                effective_date=datetime.utcnow() - timedelta(days=random.randint(30, 180)),
                review_date=datetime.utcnow() + timedelta(days=365),
                created_by=self.admin_user_id
            )
            security_policies.append(policy.model_dump())
        
        await self.db.security_policies.insert_many(security_policies)
        print(f"✅ Created {len(security_policies)} security policies")
    
    async def create_data_retention_policies(self):
        """Create data retention policies"""
        print("📁 Creating data retention policies...")
        
        retention_policies = [
            {
                "name": "Audit Log Retention",
                "description": "Retain audit logs for legal compliance",
                "data_category": "audit_logs",
                "retention_period_days": 2555,  # 7 years
                "retention_basis": "legal_requirement",
                "data_types": ["audit_events", "security_events", "access_logs"],
                "collection_names": ["audit_events"],
                "auto_cleanup_enabled": False,
                "legal_hold_exempt": False
            },
            {
                "name": "Personal Data Retention",
                "description": "User data retention per GDPR requirements",
                "data_category": "personal_data",
                "retention_period_days": 1095,  # 3 years
                "retention_basis": "user_consent",
                "data_types": ["user_profiles", "personal_information"],
                "collection_names": ["users"],
                "auto_cleanup_enabled": True,
                "cleanup_method": "soft_delete"
            },
            {
                "name": "Business Data Retention",
                "description": "Project and task data retention",
                "data_category": "business_data",
                "retention_period_days": 2190,  # 6 years
                "retention_basis": "business_need",
                "data_types": ["projects", "tasks", "files"],
                "collection_names": ["projects", "tasks", "files"],
                "auto_cleanup_enabled": True,
                "cleanup_method": "soft_delete"
            }
        ]
        
        policies = []
        for policy_data in retention_policies:
            policy = DataRetentionPolicy(
                organization_id=self.organization_id,
                **policy_data,
                created_by=self.admin_user_id
            )
            policies.append(policy.model_dump())
        
        await self.db.data_retention_policies.insert_many(policies)
        print(f"✅ Created {len(policies)} data retention policies")
    
    async def generate_all_security_data(self):
        """Generate all security demo data"""
        print("🚀 Starting Security Demo Data Generation...")
        print("=" * 60)
        
        try:
            await self.connect_to_database()
            await self.cleanup_existing_data()
            
            # Generate all security data
            await self.create_audit_events()
            await self.create_mfa_configurations()
            await self.create_threat_detections()
            await self.create_compliance_reports()
            await self.create_security_policies()
            await self.create_data_retention_policies()
            
            print("=" * 60)
            print("✅ Security demo data generation completed successfully!")
            print("\n🎯 Security Dashboard should now display:")
            print("   • 150 audit events over the past 30 days")
            print("   • 3 MFA configurations")
            print("   • 8 threat detections (mix of active and resolved)")
            print("   • 4 compliance reports (SOC2, GDPR, ISO27001, HIPAA)")
            print("   • 4 security policies")
            print("   • 3 data retention policies")
            
        except Exception as e:
            print(f"❌ Error generating security demo data: {e}")
            raise
        finally:
            if self.mongo_client:
                self.mongo_client.close()

async def main():
    generator = SecurityDemoDataGenerator()
    await generator.generate_all_security_data()

if __name__ == "__main__":
    asyncio.run(main())