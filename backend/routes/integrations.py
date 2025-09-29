"""
Advanced External Integrations API
Phase 4.1: Microsoft Teams, Slack, GitHub, Google Workspace integration endpoints
"""
import asyncio
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
import logging

from auth.middleware import get_current_user
from database import get_database

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/integrations", tags=["Integrations"])

# Request/Response Models

class SlackIntegrationRequest(BaseModel):
    workspace_url: str
    bot_token: Optional[str] = None
    app_token: Optional[str] = None
    default_channel: str = "general"
    notifications_enabled: bool = True
    settings: Optional[Dict[str, Any]] = None

class TeamsIntegrationRequest(BaseModel):
    tenant_id: str
    application_id: Optional[str] = None
    client_secret: Optional[str] = None
    webhook_url: Optional[str] = None
    default_team: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None

class GitHubIntegrationRequest(BaseModel):
    organization: str
    repositories: List[str]
    access_token: Optional[str] = None
    webhook_secret: Optional[str] = None
    auto_sync: bool = True
    settings: Optional[Dict[str, Any]] = None

class GoogleWorkspaceRequest(BaseModel):
    domain: str
    service_account_key: Optional[str] = None
    delegated_user: Optional[str] = None
    calendar_sync: bool = True
    drive_sync: bool = True
    gmail_sync: bool = False
    settings: Optional[Dict[str, Any]] = None

class IntegrationResponse(BaseModel):
    success: bool
    integration_type: str
    data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    timestamp: datetime

class NotificationRequest(BaseModel):
    channel: str
    message: str
    attachments: Optional[List[Dict]] = None
    priority: str = "normal"

class AdaptiveCardRequest(BaseModel):
    channel_id: str
    card_data: Dict[str, Any]
    message: Optional[str] = None

# Slack Integration Endpoints

@router.post("/slack/setup", response_model=IntegrationResponse)
async def setup_slack_integration(
    request: SlackIntegrationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Setup Slack integration for the organization"""
    try:
        # For Phase 4.1 MVP, we'll store configuration and simulate setup
        db = await get_database()
        
        # Extract organization_id from user object
        organization_id = getattr(current_user, 'organization_id', 'demo-org-001')
        
        integration_config = {
            "type": "slack",
            "organization_id": organization_id,
            "workspace_url": request.workspace_url,
            "default_channel": request.default_channel,
            "notifications_enabled": request.notifications_enabled,
            "settings": request.settings or {},
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        # Store in database
        await db.integrations.update_one(
            {
                "organization_id": organization_id,
                "type": "slack"
            },
            {"$set": integration_config},
            upsert=True
        )
        
        return IntegrationResponse(
            success=True,
            integration_type="slack",
            data={
                "workspace_url": request.workspace_url,
                "status": "configured",
                "features": [
                    "Real-time notifications",
                    "Project updates",
                    "Task assignments",
                    "Team collaboration"
                ]
            },
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Slack integration setup error: {str(e)}")
        return IntegrationResponse(
            success=False,
            integration_type="slack",
            error=str(e),
            timestamp=datetime.utcnow()
        )

@router.post("/slack/notify")
async def send_slack_notification(
    request: NotificationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send notification to Slack channel"""
    try:
        # Simulate sending Slack notification
        notification_data = {
            "channel": request.channel,
            "message": request.message,
            "attachments": request.attachments or [],
            "priority": request.priority,
            "sent_at": datetime.utcnow(),
            "sender": getattr(current_user, 'email', 'system')
        }
        
        # In production, this would use the Slack Web API
        logger.info(f"Slack notification sent to {request.channel}: {request.message}")
        
        return {
            "success": True,
            "message_id": f"slack_{datetime.utcnow().timestamp()}",
            "data": notification_data
        }
        
    except Exception as e:
        logger.error(f"Slack notification error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/slack/channels")
async def get_slack_channels(current_user: dict = Depends(get_current_user)):
    """Get available Slack channels"""
    try:
        # Simulate fetching Slack channels
        channels = [
            {"id": "C1234567890", "name": "general", "is_member": True},
            {"id": "C2345678901", "name": "projects", "is_member": True},
            {"id": "C3456789012", "name": "development", "is_member": True},
            {"id": "C4567890123", "name": "notifications", "is_member": False},
            {"id": "C5678901234", "name": "team-leads", "is_member": True}
        ]
        
        return {"channels": channels}
        
    except Exception as e:
        logger.error(f"Get Slack channels error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Microsoft Teams Integration Endpoints

@router.post("/teams/setup", response_model=IntegrationResponse)
async def setup_teams_integration(
    request: TeamsIntegrationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Setup Microsoft Teams integration"""
    try:
        db = await get_database()
        
        integration_config = {
            "type": "teams",
            "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
            "tenant_id": request.tenant_id,
            "webhook_url": request.webhook_url,
            "default_team": request.default_team,
            "settings": request.settings or {},
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.integrations.update_one(
            {
                "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
                "type": "teams"
            },
            {"$set": integration_config},
            upsert=True
        )
        
        return IntegrationResponse(
            success=True,
            integration_type="teams",
            data={
                "tenant_id": request.tenant_id,
                "status": "configured",
                "features": [
                    "Adaptive Cards",
                    "Bot notifications",
                    "Meeting integration",
                    "File sharing"
                ]
            },
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Teams integration setup error: {str(e)}")
        return IntegrationResponse(
            success=False,
            integration_type="teams",
            error=str(e),
            timestamp=datetime.utcnow()
        )

@router.post("/teams/adaptive-card")
async def send_teams_adaptive_card(
    request: AdaptiveCardRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send adaptive card to Microsoft Teams"""
    try:
        # Create sample adaptive card
        adaptive_card = {
            "type": "AdaptiveCard",
            "version": "1.3",
            "body": [
                {
                    "type": "TextBlock",
                    "text": "Project Update",
                    "weight": "Bolder",
                    "size": "Medium"
                },
                {
                    "type": "TextBlock",
                    "text": request.message or "New update available",
                    "wrap": True
                }
            ],
            **request.card_data
        }
        
        card_data = {
            "channel_id": request.channel_id,
            "card": adaptive_card,
            "sent_at": datetime.utcnow(),
            "sender": getattr(current_user, 'email', 'system')
        }
        
        logger.info(f"Teams adaptive card sent to {request.channel_id}")
        
        return {
            "success": True,
            "card_id": f"teams_{datetime.utcnow().timestamp()}",
            "data": card_data
        }
        
    except Exception as e:
        logger.error(f"Teams adaptive card error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# GitHub Integration Endpoints

@router.post("/github/setup", response_model=IntegrationResponse)
async def setup_github_integration(
    request: GitHubIntegrationRequest,
    current_user: dict = Depends(get_current_user)
):
    """Setup GitHub integration"""
    try:
        db = await get_database()
        
        integration_config = {
            "type": "github",
            "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
            "github_organization": request.organization,
            "repositories": request.repositories,
            "auto_sync": request.auto_sync,
            "settings": request.settings or {},
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.integrations.update_one(
            {
                "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
                "type": "github"
            },
            {"$set": integration_config},
            upsert=True
        )
        
        return IntegrationResponse(
            success=True,
            integration_type="github",
            data={
                "organization": request.organization,
                "repositories": request.repositories,
                "status": "configured",
                "features": [
                    "Code sync",
                    "Issue tracking",
                    "Pull request management",
                    "Deployment tracking"
                ]
            },
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"GitHub integration setup error: {str(e)}")
        return IntegrationResponse(
            success=False,
            integration_type="github",
            error=str(e),
            timestamp=datetime.utcnow()
        )

@router.post("/github/sync/{project_id}")
async def sync_github_project(
    project_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Sync project data with GitHub repositories"""
    try:
        db = await get_database()
        
        # Get project details
        project = await db.projects.find_one({"id": project_id})
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
        
        # Simulate GitHub sync
        sync_data = {
            "project_id": project_id,
            "repositories_synced": 3,
            "issues_synced": 15,
            "pull_requests_synced": 8,
            "commits_synced": 42,
            "last_sync": datetime.utcnow(),
            "sync_status": "completed"
        }
        
        # Update project with sync data
        await db.projects.update_one(
            {"id": project_id},
            {"$set": {"github_sync": sync_data}}
        )
        
        logger.info(f"GitHub sync completed for project {project_id}")
        
        return {
            "success": True,
            "data": sync_data
        }
        
    except Exception as e:
        logger.error(f"GitHub sync error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/github/repositories")
async def get_github_repositories(current_user: dict = Depends(get_current_user)):
    """Get GitHub repositories"""
    try:
        # Simulate fetching GitHub repositories
        repositories = [
            {
                "id": 123456789,
                "name": "enterprise-portfolio-frontend",
                "full_name": "myorg/enterprise-portfolio-frontend",
                "private": True,
                "language": "TypeScript",
                "stargazers_count": 12,
                "open_issues_count": 3
            },
            {
                "id": 234567890,
                "name": "enterprise-portfolio-backend",
                "full_name": "myorg/enterprise-portfolio-backend",
                "private": True,
                "language": "Python",
                "stargazers_count": 8,
                "open_issues_count": 5
            },
            {
                "id": 345678901,
                "name": "mobile-app",
                "full_name": "myorg/mobile-app",
                "private": True,
                "language": "React Native",
                "stargazers_count": 15,
                "open_issues_count": 2
            }
        ]
        
        return {"repositories": repositories}
        
    except Exception as e:
        logger.error(f"Get GitHub repositories error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Google Workspace Integration Endpoints

@router.post("/google-workspace/setup", response_model=IntegrationResponse)
async def setup_google_workspace_integration(
    request: GoogleWorkspaceRequest,
    current_user: dict = Depends(get_current_user)
):
    """Setup Google Workspace integration"""
    try:
        db = await get_database()
        
        integration_config = {
            "type": "google_workspace",
            "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
            "domain": request.domain,
            "calendar_sync": request.calendar_sync,
            "drive_sync": request.drive_sync,
            "gmail_sync": request.gmail_sync,
            "settings": request.settings or {},
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        await db.integrations.update_one(
            {
                "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
                "type": "google_workspace"
            },
            {"$set": integration_config},
            upsert=True
        )
        
        return IntegrationResponse(
            success=True,
            integration_type="google_workspace",
            data={
                "domain": request.domain,
                "status": "configured",
                "features": [
                    "Calendar integration" if request.calendar_sync else None,
                    "Drive sync" if request.drive_sync else None,
                    "Gmail sync" if request.gmail_sync else None
                ]
            },
            timestamp=datetime.utcnow()
        )
        
    except Exception as e:
        logger.error(f"Google Workspace integration setup error: {str(e)}")
        return IntegrationResponse(
            success=False,
            integration_type="google_workspace",
            error=str(e),
            timestamp=datetime.utcnow()
        )

@router.post("/google-workspace/schedule-meeting")
async def schedule_google_calendar_meeting(
    meeting_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Schedule meeting in Google Calendar"""
    try:
        # Simulate scheduling Google Calendar meeting
        meeting_info = {
            "meeting_id": f"gcal_{datetime.utcnow().timestamp()}",
            "title": meeting_data.get("title", "Portfolio Review Meeting"),
            "description": meeting_data.get("description", ""),
            "start_time": meeting_data.get("start_time"),
            "end_time": meeting_data.get("end_time"),
            "attendees": meeting_data.get("attendees", []),
            "location": meeting_data.get("location", "Virtual"),
            "calendar_link": f"https://calendar.google.com/calendar/event?eid=example",
            "meet_link": f"https://meet.google.com/example-meet-link",
            "created_at": datetime.utcnow(),
            "organizer": current_user.get("email", "system")
        }
        
        logger.info(f"Google Calendar meeting scheduled: {meeting_info['title']}")
        
        return {
            "success": True,
            "data": meeting_info
        }
        
    except Exception as e:
        logger.error(f"Google Calendar scheduling error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# General Integration Management

@router.get("/status")
async def get_integration_status(current_user: dict = Depends(get_current_user)):
    """Get status of all integrations"""
    try:
        db = await get_database()
        
        integrations = await db.integrations.find({
            "organization_id": getattr(current_user, 'organization_id', 'demo-org-001')
        }).to_list(None)
        
        status_summary = {
            "total_integrations": len(integrations),
            "active_integrations": len([i for i in integrations if i.get("status") == "active"]),
            "integrations": {}
        }
        
        for integration in integrations:
            status_summary["integrations"][integration["type"]] = {
                "status": integration.get("status", "unknown"),
                "last_updated": integration.get("updated_at"),
                "features": integration.get("settings", {}).get("features", [])
            }
        
        return status_summary
        
    except Exception as e:
        logger.error(f"Get integration status error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available")
async def get_available_integrations(current_user: dict = Depends(get_current_user)):
    """Get list of available integrations"""
    try:
        available_integrations = {
            "slack": {
                "name": "Slack",
                "description": "Team communication and notifications",
                "features": [
                    "Real-time notifications",
                    "Interactive workflows",
                    "File sharing",
                    "Channel management"
                ],
                "setup_required": ["workspace_url", "bot_token"]
            },
            "teams": {
                "name": "Microsoft Teams",
                "description": "Microsoft Teams integration with adaptive cards",
                "features": [
                    "Adaptive cards",
                    "Bot framework",
                    "Meeting integration",
                    "File collaboration"
                ],
                "setup_required": ["tenant_id", "application_id"]
            },
            "github": {
                "name": "GitHub",
                "description": "Code repository and issue tracking",
                "features": [
                    "Repository sync",
                    "Issue tracking",
                    "Pull request management",
                    "Deployment tracking"
                ],
                "setup_required": ["organization", "access_token"]
            },
            "google_workspace": {
                "name": "Google Workspace",
                "description": "Calendar, Drive, and Gmail integration",
                "features": [
                    "Calendar sync",
                    "Drive file management",
                    "Gmail integration",
                    "Meeting scheduling"
                ],
                "setup_required": ["domain", "service_account_key"]
            }
        }
        
        return {"available_integrations": available_integrations}
        
    except Exception as e:
        logger.error(f"Get available integrations error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{integration_type}")
async def remove_integration(
    integration_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove integration"""
    try:
        db = await get_database()
        
        result = await db.integrations.delete_one({
            "organization_id": getattr(current_user, 'organization_id', 'demo-org-001'),
            "type": integration_type
        })
        
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Integration not found")
        
        logger.info(f"Integration {integration_type} removed for organization {current_user.get('organization_id')}")
        
        return {
            "success": True,
            "message": f"{integration_type} integration removed successfully"
        }
        
    except Exception as e:
        logger.error(f"Remove integration error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Health check for integrations
@router.get("/health")
async def integrations_health_check():
    """Health check for integration services"""
    try:
        health_status = {
            "status": "healthy",
            "integrations_available": 4,
            "services": {
                "slack": "available",
                "teams": "available", 
                "github": "available",
                "google_workspace": "available"
            },
            "timestamp": datetime.utcnow()
        }
        
        return health_status
        
    except Exception as e:
        logger.error(f"Integrations health check error: {str(e)}")
        return {"status": "unhealthy", "error": str(e)}