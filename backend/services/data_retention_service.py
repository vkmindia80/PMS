"""
Data Retention & Privacy Management Service
Phase 4.3: GDPR Compliance & Automated Cleanup
"""

import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging

from models.security import DataRetentionPolicy, AuditEvent, SecurityEventType, RiskLevel
from services.security_service import SecurityService

logger = logging.getLogger(__name__)

class DataRetentionService:
    """GDPR-compliant data retention and privacy management"""
    
    def __init__(self):
        self.security_service = SecurityService()
    
    async def process_data_subject_request(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str,
        request_type: str,  # "access", "rectification", "erasure", "portability"
        user_email: str,
        requested_by: str
    ) -> Dict[str, Any]:
        """Process GDPR data subject rights requests"""
        try:
            # Find the user
            user = await db.users.find_one({
                "email": user_email,
                "organization_id": organization_id
            })
            
            if not user:
                return {
                    "success": False,
                    "error": "User not found"
                }
            
            user_id = user["id"]
            result = {"success": True, "request_type": request_type, "user_email": user_email}
            
            if request_type == "access":
                # Right to Access - provide all user data
                result["data"] = await self._collect_user_data(db, user_id, organization_id)
                
            elif request_type == "erasure":
                # Right to be Forgotten - delete user data
                deletion_result = await self._delete_user_data(db, user_id, organization_id, requested_by)
                result.update(deletion_result)
                
            elif request_type == "rectification":
                # Right to Rectification - flag for manual review
                result["message"] = "Rectification request logged for manual processing"
                
            elif request_type == "portability":
                # Right to Data Portability - export in structured format
                export_data = await self._export_user_data(db, user_id, organization_id)
                result["export_data"] = export_data
                
            # Log the data subject request
            await self.security_service.log_security_event(
                db,
                event_type=SecurityEventType.DATA_ACCESS,
                user_id=requested_by,
                organization_id=organization_id,
                description=f"GDPR data subject request: {request_type} for {user_email}",
                risk_level=RiskLevel.MEDIUM,
                details={
                    "request_type": request_type,
                    "subject_user": user_email,
                    "processing_status": "completed"
                }
            )
            
            return result
            
        except Exception as e:
            logger.error(f"Data subject request processing failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def _collect_user_data(self, db: AsyncIOMotorDatabase, user_id: str, organization_id: str) -> Dict[str, Any]:
        """Collect all data related to a user for GDPR access request"""
        try:
            user_data = {}
            
            # User profile data
            user = await db.users.find_one({"id": user_id})
            if user:
                # Remove sensitive fields
                user.pop("password_hash", None)
                user_data["profile"] = user
            
            # User's tasks
            tasks = []
            async for task in db.tasks.find({"assignee_id": user_id}):
                tasks.append(task)
            user_data["tasks"] = tasks
            
            # User's comments
            comments = []
            async for comment in db.comments.find({"author_id": user_id}):
                comments.append(comment)
            user_data["comments"] = comments
            
            # User's files
            files = []
            async for file in db.files.find({"uploaded_by": user_id}):
                files.append(file)
            user_data["files"] = files
            
            # User's audit events
            audit_events = []
            async for event in db.audit_events.find(
                {"user_id": user_id, "organization_id": organization_id}
            ).limit(100):  # Last 100 events
                audit_events.append(event)
            user_data["audit_events"] = audit_events
            
            # User's MFA configuration
            mfa_config = await db.mfa_configurations.find_one({"user_id": user_id})
            if mfa_config:
                # Remove sensitive MFA data
                mfa_config.pop("totp_secret", None)
                mfa_config.pop("backup_codes", None)
                user_data["mfa_configuration"] = mfa_config
            
            return user_data
            
        except Exception as e:
            logger.error(f"User data collection failed: {e}")
            return {}
    
    async def _delete_user_data(self, db: AsyncIOMotorDatabase, user_id: str, organization_id: str, requested_by: str) -> Dict[str, Any]:
        """Delete user data for GDPR erasure request (Right to be Forgotten)"""
        try:
            deletion_summary = {
                "deleted_records": {},
                "anonymized_records": {},
                "retained_records": {}  # For legal/compliance reasons
            }
            
            # 1. Delete/anonymize user profile (soft delete)
            user_result = await db.users.update_one(
                {"id": user_id},
                {
                    "$set": {
                        "email": f"deleted_{user_id}@anonymized.local",
                        "first_name": "[DELETED]",
                        "last_name": "[USER]",
                        "phone": None,
                        "bio": None,
                        "avatar_url": None,
                        "is_active": False,
                        "status": "deleted",
                        "gdpr_deleted": True,
                        "gdpr_deleted_at": datetime.utcnow(),
                        "gdpr_deleted_by": requested_by
                    }
                }
            )
            deletion_summary["anonymized_records"]["users"] = user_result.modified_count
            
            # 2. Delete MFA configuration
            mfa_result = await db.mfa_configurations.delete_one({"user_id": user_id})
            deletion_summary["deleted_records"]["mfa_configurations"] = mfa_result.deleted_count
            
            # 3. Anonymize comments (preserve for context but remove PII)
            comment_result = await db.comments.update_many(
                {"author_id": user_id},
                {
                    "$set": {
                        "author_id": None,
                        "author_name": "[DELETED USER]",
                        "gdpr_anonymized": True
                    }
                }
            )
            deletion_summary["anonymized_records"]["comments"] = comment_result.modified_count
            
            # 4. Handle tasks - reassign or anonymize based on business rules
            task_result = await db.tasks.update_many(
                {"assignee_id": user_id},
                {
                    "$set": {
                        "assignee_id": None,
                        "assignee_name": "[DELETED USER]",
                        "gdpr_anonymized": True
                    }
                }
            )
            deletion_summary["anonymized_records"]["tasks"] = task_result.modified_count
            
            # 5. Delete personal files
            file_result = await db.files.delete_many({"uploaded_by": user_id})
            deletion_summary["deleted_records"]["files"] = file_result.deleted_count
            
            # 6. Handle audit events - retain for compliance but anonymize
            audit_result = await db.audit_events.update_many(
                {"user_id": user_id, "organization_id": organization_id},
                {
                    "$set": {
                        "user_id": None,
                        "gdpr_anonymized": True
                    }
                }
            )
            deletion_summary["anonymized_records"]["audit_events"] = audit_result.modified_count
            
            # 7. Legal/compliance records that must be retained
            # Keep financial records, security incidents, etc. but anonymized
            
            return {
                "deletion_completed": True,
                "summary": deletion_summary,
                "retention_notice": "Some records retained for legal compliance but anonymized"
            }
            
        except Exception as e:
            logger.error(f"User data deletion failed: {e}")
            return {"deletion_completed": False, "error": str(e)}
    
    async def _export_user_data(self, db: AsyncIOMotorDatabase, user_id: str, organization_id: str) -> Dict[str, Any]:
        """Export user data in structured format for portability"""
        try:
            # Collect user data
            user_data = await self._collect_user_data(db, user_id, organization_id)
            
            # Structure for portability (JSON format)
            export_package = {
                "export_metadata": {
                    "export_date": datetime.utcnow(),
                    "export_format": "json",
                    "gdpr_article": "Article 20 - Right to data portability",
                    "organization_id": organization_id
                },
                "user_data": user_data
            }
            
            return export_package
            
        except Exception as e:
            logger.error(f"User data export failed: {e}")
            return {}
    
    async def run_automated_cleanup(
        self,
        db: AsyncIOMotorDatabase,
        organization_id: str
    ) -> Dict[str, Any]:
        """Run automated data cleanup based on retention policies"""
        try:
            cleanup_results = {
                "started_at": datetime.utcnow(),
                "organization_id": organization_id,
                "policies_processed": 0,
                "records_cleaned": 0,
                "errors": []
            }
            
            # Get active retention policies
            policies = []
            async for policy_doc in db.data_retention_policies.find({
                "organization_id": organization_id,
                "is_active": True
            }):
                policies.append(DataRetentionPolicy(**policy_doc))
            
            for policy in policies:
                try:
                    # Calculate cutoff date
                    cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_period_days)
                    
                    # Process each collection in the policy
                    for collection_name in policy.collection_names:
                        if hasattr(db, collection_name):
                            collection = getattr(db, collection_name)
                            
                            if policy.cleanup_method == "soft_delete":
                                # Mark as deleted
                                result = await collection.update_many(
                                    {
                                        "created_at": {"$lt": cutoff_date},
                                        "deleted": {"$ne": True},
                                        "organization_id": organization_id
                                    },
                                    {
                                        "$set": {
                                            "deleted": True,
                                            "deleted_at": datetime.utcnow(),
                                            "retention_policy": policy.name
                                        }
                                    }
                                )
                                cleanup_results["records_cleaned"] += result.modified_count
                                
                            elif policy.cleanup_method == "hard_delete":
                                # Actually delete
                                result = await collection.delete_many({
                                    "created_at": {"$lt": cutoff_date},
                                    "organization_id": organization_id
                                })
                                cleanup_results["records_cleaned"] += result.deleted_count
                            
                            elif policy.cleanup_method == "archive":
                                # Move to archive collection
                                archive_collection = getattr(db, f"{collection_name}_archive")
                                
                                # Find records to archive
                                cursor = collection.find({
                                    "created_at": {"$lt": cutoff_date},
                                    "organization_id": organization_id,
                                    "archived": {"$ne": True}
                                })
                                
                                archived_count = 0
                                async for doc in cursor:
                                    # Add archive metadata
                                    doc["archived"] = True
                                    doc["archived_at"] = datetime.utcnow()
                                    doc["retention_policy"] = policy.name
                                    
                                    # Insert to archive
                                    await archive_collection.insert_one(doc)
                                    
                                    # Remove from original
                                    await collection.delete_one({"_id": doc["_id"]})
                                    
                                    archived_count += 1
                                
                                cleanup_results["records_cleaned"] += archived_count
                    
                    cleanup_results["policies_processed"] += 1
                    
                    # Update policy last run
                    await db.data_retention_policies.update_one(
                        {"id": policy.id},
                        {
                            "$set": {
                                "last_cleanup_run": datetime.utcnow(),
                                "next_cleanup_scheduled": datetime.utcnow() + timedelta(days=1)
                            }
                        }
                    )
                    
                except Exception as e:
                    error_msg = f"Policy {policy.name} failed: {str(e)}"
                    cleanup_results["errors"].append(error_msg)
                    logger.error(error_msg)
            
            cleanup_results["completed_at"] = datetime.utcnow()
            cleanup_results["success"] = len(cleanup_results["errors"]) == 0
            
            # Log cleanup completion
            await self.security_service.log_security_event(
                db,
                event_type=SecurityEventType.DATA_ACCESS,
                user_id="system",
                organization_id=organization_id,
                description=f"Automated data cleanup completed: {cleanup_results['records_cleaned']} records processed",
                risk_level=RiskLevel.LOW,
                details=cleanup_results
            )
            
            return cleanup_results
            
        except Exception as e:
            logger.error(f"Automated cleanup failed: {e}")
            return {"success": False, "error": str(e)}
    
    async def schedule_cleanup_tasks(self, db: AsyncIOMotorDatabase):
        """Schedule and run periodic cleanup tasks"""
        try:
            logger.info("Starting automated data retention cleanup scheduler")
            
            while True:
                # Get all organizations with active retention policies
                organizations = await db.data_retention_policies.distinct(
                    "organization_id",
                    {"is_active": True}
                )
                
                for org_id in organizations:
                    try:
                        # Run cleanup for each organization
                        cleanup_result = await self.run_automated_cleanup(db, org_id)
                        logger.info(f"Cleanup completed for org {org_id}: {cleanup_result.get('records_cleaned', 0)} records")
                        
                    except Exception as e:
                        logger.error(f"Cleanup failed for org {org_id}: {e}")
                
                # Wait 24 hours before next cleanup cycle
                await asyncio.sleep(24 * 3600)
                
        except Exception as e:
            logger.error(f"Cleanup scheduler failed: {e}")
