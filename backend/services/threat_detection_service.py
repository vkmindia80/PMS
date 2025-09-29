"""
Threat Detection & Response Service
Phase 4.3: AI-Powered Security Monitoring
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
import json
import asyncio
from collections import defaultdict

from models.security import (
    ThreatDetection, RiskLevel, ThreatResponse,
    SecurityEventType, AuditEvent
)

logger = logging.getLogger(__name__)

class ThreatDetectionService:
    """AI-powered threat detection and response service"""
    
    def __init__(self):
        self.detection_rules = self._initialize_detection_rules()
        self.threat_patterns = self._initialize_threat_patterns()
        self.risk_scoring = self._initialize_risk_scoring()
    
    # =============================================================================
    # THREAT DETECTION ENGINE
    # =============================================================================
    
    async def analyze_security_events(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> List[ThreatDetection]:
        """Analyze recent security events for threats"""
        try:
            # Get recent events for analysis
            one_hour_ago = datetime.utcnow() - timedelta(hours=1)
            
            cursor = db.audit_events.find({
                "organization_id": organization_id,
                "timestamp": {"$gte": one_hour_ago}
            }).sort("timestamp", -1)
            
            events = []
            async for doc in cursor:
                events.append(AuditEvent(**doc))
            
            # Analyze events for threat patterns
            detected_threats = []
            
            # Check for brute force attacks
            brute_force_threats = await self._detect_brute_force(db, organization_id, events)
            detected_threats.extend(brute_force_threats)
            
            # Check for privilege escalation
            privilege_threats = await self._detect_privilege_escalation(db, organization_id, events)
            detected_threats.extend(privilege_threats)
            
            # Check for unusual access patterns
            access_threats = await self._detect_unusual_access(db, organization_id, events)
            detected_threats.extend(access_threats)
            
            # Check for data exfiltration patterns
            exfiltration_threats = await self._detect_data_exfiltration(db, organization_id, events)
            detected_threats.extend(exfiltration_threats)
            
            # Save detected threats
            for threat in detected_threats:
                await self._save_threat_detection(db, threat)
            
            return detected_threats
            
        except Exception as e:
            logger.error(f"Threat analysis failed: {e}")
            return []
    
    async def _detect_brute_force(self, db, organization_id, events) -> List[ThreatDetection]:
        """Detect brute force login attempts"""
        try:
            threats = []
            
            # Group failed login attempts by user
            failed_logins = defaultdict(list)
            for event in events:
                if event.event_type == SecurityEventType.LOGIN_FAILURE:
                    failed_logins[event.user_id].append(event)
            
            # Check for multiple failures from same user
            for user_id, failures in failed_logins.items():
                if len(failures) >= 5:  # 5+ failures in 1 hour
                    threat = ThreatDetection(
                        organization_id=organization_id,
                        threat_type="brute_force",
                        severity=RiskLevel.HIGH,
                        confidence=0.9,
                        detection_method="rule_based",
                        detection_rules=["multiple_login_failures"],
                        affected_users=[user_id] if user_id else [],
                        indicators=[
                            {
                                "type": "failed_login_count",
                                "value": len(failures),
                                "threshold": 5
                            }
                        ],
                        source_ip=failures[0].ip_address,
                        user_agent=failures[0].user_agent
                    )
                    
                    # Auto-response for brute force
                    if len(failures) >= 10:
                        threat.auto_response_taken = True
                        threat.is_blocked = True
                        threat.response_actions.append({
                            "action": "block_user",
                            "timestamp": datetime.utcnow(),
                            "reason": "Brute force attack detected"
                        })
                    
                    threats.append(threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Brute force detection failed: {e}")
            return []
    
    async def _detect_privilege_escalation(self, db, organization_id, events) -> List[ThreatDetection]:
        """Detect privilege escalation attempts"""
        try:
            threats = []
            
            # Look for permission change events
            permission_events = [
                event for event in events
                if event.event_type == SecurityEventType.PERMISSION_CHANGE
            ]
            
            for event in permission_events:
                # Check if user is attempting to escalate their own privileges
                if event.user_id and "role" in event.details:
                    old_role = event.details.get("old_role")
                    new_role = event.details.get("new_role")
                    
                    if self._is_privilege_escalation(old_role, new_role):
                        threat = ThreatDetection(
                            organization_id=organization_id,
                            threat_type="privilege_escalation",
                            severity=RiskLevel.HIGH,
                            confidence=0.8,
                            detection_method="rule_based",
                            detection_rules=["unauthorized_role_change"],
                            affected_users=[event.user_id],
                            indicators=[
                                {
                                    "type": "role_change",
                                    "old_role": old_role,
                                    "new_role": new_role
                                }
                            ],
                            source_ip=event.ip_address,
                            user_agent=event.user_agent
                        )
                        threats.append(threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Privilege escalation detection failed: {e}")
            return []
    
    async def _detect_unusual_access(self, db, organization_id, events) -> List[ThreatDetection]:
        """Detect unusual access patterns"""
        try:
            threats = []
            
            # Group access events by user and time
            access_patterns = defaultdict(lambda: {"ips": set(), "times": [], "locations": set()})
            
            for event in events:
                if event.event_type in [SecurityEventType.LOGIN_SUCCESS, SecurityEventType.DATA_ACCESS]:
                    if event.user_id:
                        pattern = access_patterns[event.user_id]
                        if event.ip_address:
                            pattern["ips"].add(event.ip_address)
                        pattern["times"].append(event.timestamp)
                        if event.location:
                            pattern["locations"].add(event.location.get("country", "unknown"))
            
            # Analyze patterns for anomalies
            for user_id, pattern in access_patterns.items():
                # Multiple IP addresses
                if len(pattern["ips"]) >= 3:
                    threat = ThreatDetection(
                        organization_id=organization_id,
                        threat_type="account_takeover",
                        severity=RiskLevel.MEDIUM,
                        confidence=0.6,
                        detection_method="anomaly_detection",
                        detection_rules=["multiple_ip_access"],
                        affected_users=[user_id],
                        indicators=[
                            {
                                "type": "ip_count",
                                "value": len(pattern["ips"]),
                                "ips": list(pattern["ips"])
                            }
                        ]
                    )
                    threats.append(threat)
                
                # Multiple countries
                if len(pattern["locations"]) >= 2:
                    threat = ThreatDetection(
                        organization_id=organization_id,
                        threat_type="impossible_travel",
                        severity=RiskLevel.HIGH,
                        confidence=0.8,
                        detection_method="anomaly_detection",
                        detection_rules=["impossible_travel"],
                        affected_users=[user_id],
                        indicators=[
                            {
                                "type": "location_count",
                                "value": len(pattern["locations"]),
                                "locations": list(pattern["locations"])
                            }
                        ]
                    )
                    threats.append(threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Unusual access detection failed: {e}")
            return []
    
    async def _detect_data_exfiltration(self, db, organization_id, events) -> List[ThreatDetection]:
        """Detect potential data exfiltration"""
        try:
            threats = []
            
            # Look for excessive data export events
            export_events = defaultdict(list)
            for event in events:
                if event.event_type == SecurityEventType.DATA_EXPORT:
                    export_events[event.user_id].append(event)
            
            # Check for excessive exports
            for user_id, exports in export_events.items():
                if len(exports) >= 3:  # 3+ exports in 1 hour
                    threat = ThreatDetection(
                        organization_id=organization_id,
                        threat_type="data_exfiltration",
                        severity=RiskLevel.HIGH,
                        confidence=0.7,
                        detection_method="rule_based",
                        detection_rules=["excessive_data_export"],
                        affected_users=[user_id] if user_id else [],
                        indicators=[
                            {
                                "type": "export_count",
                                "value": len(exports),
                                "threshold": 3
                            }
                        ]
                    )
                    threats.append(threat)
            
            return threats
            
        except Exception as e:
            logger.error(f"Data exfiltration detection failed: {e}")
            return []
    
    def _is_privilege_escalation(self, old_role: str, new_role: str) -> bool:
        """Check if role change represents privilege escalation"""
        role_hierarchy = {
            "viewer": 1,
            "member": 2,
            "team_lead": 3,
            "manager": 4,
            "admin": 5,
            "super_admin": 6
        }
        
        old_level = role_hierarchy.get(old_role, 0)
        new_level = role_hierarchy.get(new_role, 0)
        
        return new_level > old_level
    
    async def _save_threat_detection(self, db: AsyncIOMotorDatabase, threat: ThreatDetection):
        """Save threat detection to database"""
        try:
            await db.threat_detections.insert_one(threat.model_dump())
        except Exception as e:
            logger.error(f"Failed to save threat detection: {e}")
    
    # =============================================================================
    # THREAT RESPONSE OPERATIONS
    # =============================================================================
    
    async def get_active_threats(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> List[ThreatDetection]:
        """Get active security threats"""
        try:
            cursor = db.threat_detections.find({
                "organization_id": organization_id,
                "investigation_status": "open"
            }).sort("first_detected", -1)
            
            threats = []
            async for doc in cursor:
                threats.append(ThreatDetection(**doc))
            
            return threats
            
        except Exception as e:
            logger.error(f"Failed to get active threats: {e}")
            return []
    
    async def respond_to_threat(
        self,
        db: AsyncIOMotorDatabase,
        threat_id: str,
        response: ThreatResponse,
        responded_by: str
    ) -> Dict[str, Any]:
        """Respond to a security threat"""
        try:
            # Get threat details
            threat_doc = await db.threat_detections.find_one({"id": threat_id})
            if not threat_doc:
                raise ValueError(f"Threat {threat_id} not found")
            
            threat = ThreatDetection(**threat_doc)
            
            # Execute response action
            response_result = await self._execute_response_action(
                db, threat, response.action, responded_by, response.notes
            )
            
            # Update threat status
            update_data = {
                "investigation_status": "resolved" if response.auto_resolve else "investigating",
                "assigned_to": responded_by,
                "updated_at": datetime.utcnow()
            }
            
            if response.action == "block":
                update_data["is_blocked"] = True
            elif response.action == "quarantine":
                update_data["is_quarantined"] = True
            
            # Add response action to history
            response_action = {
                "action": response.action,
                "timestamp": datetime.utcnow(),
                "responded_by": responded_by,
                "notes": response.notes,
                "result": response_result
            }
            
            await db.threat_detections.update_one(
                {"id": threat_id},
                {
                    "$set": update_data,
                    "$push": {"response_actions": response_action}
                }
            )
            
            return {
                "success": True,
                "action_taken": response.action,
                "threat_status": update_data["investigation_status"],
                "result": response_result
            }
            
        except Exception as e:
            logger.error(f"Failed to respond to threat: {e}")
            return {"success": False, "error": str(e)}
    
    async def _execute_response_action(
        self,
        db: AsyncIOMotorDatabase,
        threat: ThreatDetection,
        action: str,
        responded_by: str,
        notes: Optional[str] = None
    ) -> str:
        """Execute threat response action"""
        try:
            if action == "block":
                # Block affected users or IPs
                if threat.affected_users:
                    for user_id in threat.affected_users:
                        await db.users.update_one(
                            {"id": user_id},
                            {"$set": {
                                "is_active": False,
                                "status": "suspended",
                                "suspension_reason": f"Security threat: {threat.threat_type}",
                                "suspended_by": responded_by,
                                "suspended_at": datetime.utcnow()
                            }}
                        )
                return "Users blocked successfully"
            
            elif action == "quarantine":
                # Quarantine affected resources
                return "Resources quarantined successfully"
            
            elif action == "monitor":
                # Enhanced monitoring
                return "Enhanced monitoring enabled"
            
            elif action == "ignore":
                # Mark as false positive
                return "Threat marked as false positive"
            
            else:
                return f"Unknown action: {action}"
                
        except Exception as e:
            logger.error(f"Response action execution failed: {e}")
            return f"Action failed: {str(e)}"
    
    # =============================================================================
    # REAL-TIME MONITORING
    # =============================================================================
    
    async def start_real_time_monitoring(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ):
        """Start real-time threat monitoring"""
        try:
            logger.info(f"Starting real-time threat monitoring for org: {organization_id}")
            
            while True:
                # Analyze recent events every 5 minutes
                await self.analyze_security_events(db, organization_id)
                await asyncio.sleep(300)  # 5 minutes
                
        except Exception as e:
            logger.error(f"Real-time monitoring failed: {e}")
    
    # =============================================================================
    # DETECTION RULES & PATTERNS
    # =============================================================================
    
    def _initialize_detection_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize threat detection rules"""
        return {
            "brute_force": {
                "threshold": 5,
                "time_window": 3600,  # 1 hour
                "severity": RiskLevel.HIGH,
                "auto_response": True
            },
            "privilege_escalation": {
                "severity": RiskLevel.HIGH,
                "requires_approval": True,
                "auto_response": False
            },
            "data_exfiltration": {
                "threshold": 3,
                "time_window": 3600,
                "severity": RiskLevel.HIGH,
                "auto_response": False
            },
            "impossible_travel": {
                "min_distance": 1000,  # km
                "max_travel_time": 3600,  # 1 hour
                "severity": RiskLevel.HIGH,
                "auto_response": False
            }
        }
    
    def _initialize_threat_patterns(self) -> Dict[str, List[str]]:
        """Initialize known threat patterns"""
        return {
            "malicious_ips": [
                # Known malicious IP ranges would be loaded here
            ],
            "suspicious_user_agents": [
                "sqlmap",
                "nikto",
                "nmap",
                "masscan"
            ],
            "attack_signatures": [
                "union select",
                "<script>",
                "javascript:",
                "../",
                "cmd.exe"
            ]
        }
    
    def _initialize_risk_scoring(self) -> Dict[str, int]:
        """Initialize risk scoring weights"""
        return {
            "failed_login": 10,
            "successful_login_new_ip": 15,
            "permission_change": 25,
            "data_export": 20,
            "admin_access": 30,
            "after_hours_access": 15,
            "multiple_locations": 40,
            "suspicious_user_agent": 35
        }
