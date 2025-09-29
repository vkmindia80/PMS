"""
Real-time AI Collaboration API Routes
WebSocket-based real-time AI assistance and collaboration
"""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from typing import Dict, List, Any, Optional
import asyncio
import json
import logging
from datetime import datetime

from auth.middleware import get_current_user
from ai_ml.realtime_collaboration import (
    RealTimeCollaborationEngine, 
    CollaborationEvent, 
    AIAssistantSession
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/realtime-ai", tags=["Real-time AI"])

# Initialize collaboration engine
collaboration_engine = RealTimeCollaborationEngine()

@router.websocket("/ws/{session_id}/{user_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str, user_id: str):
    """WebSocket endpoint for real-time AI collaboration"""
    try:
        await collaboration_engine.connect_user(websocket, user_id, session_id)
        logger.info(f"WebSocket connected: user {user_id}, session {session_id}")
        
        while True:
            try:
                # Receive message from client
                data = await websocket.receive_text()
                message = json.loads(data)
                
                # Create collaboration event
                event = CollaborationEvent(
                    event_id=f"{user_id}_{datetime.now().timestamp()}",
                    event_type=message.get("type", "unknown"),
                    user_id=user_id,
                    session_id=session_id,
                    data=message.get("data", {}),
                    timestamp=datetime.now()
                )
                
                # Handle the event
                await collaboration_engine.handle_collaboration_event(event)
                
            except WebSocketDisconnect:
                break
            except json.JSONDecodeError:
                logger.error(f"Invalid JSON received from {user_id}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": "Invalid JSON format",
                    "timestamp": datetime.now().isoformat()
                }))
            except Exception as e:
                logger.error(f"WebSocket error for user {user_id}: {str(e)}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "message": str(e),
                    "timestamp": datetime.now().isoformat()
                }))
    
    except Exception as e:
        logger.error(f"WebSocket connection error: {str(e)}")
    finally:
        await collaboration_engine.disconnect_user(user_id, session_id)
        logger.info(f"WebSocket disconnected: user {user_id}, session {session_id}")

@router.post("/sessions/{session_id}/events")
async def send_collaboration_event(
    session_id: str,
    event_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send collaboration event via REST API (alternative to WebSocket)"""
    try:
        user_id = current_user.get("id")
        
        event = CollaborationEvent(
            event_id=f"{user_id}_{datetime.now().timestamp()}",
            event_type=event_data.get("type", "api_event"),
            user_id=user_id,
            session_id=session_id,
            data=event_data.get("data", {}),
            timestamp=datetime.now()
        )
        
        await collaboration_engine.handle_collaboration_event(event)
        
        return {
            "success": True,
            "event_id": event.event_id,
            "timestamp": event.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending collaboration event: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/{session_id}/statistics")
async def get_session_statistics(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get collaboration session statistics"""
    try:
        stats = collaboration_engine.get_session_statistics(session_id)
        return stats
        
    except Exception as e:
        logger.error(f"Error getting session statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/sessions/active")
async def get_active_sessions(current_user: dict = Depends(get_current_user)):
    """Get all active collaboration sessions"""
    try:
        active_sessions = []
        
        for session_id, users in collaboration_engine.session_users.items():
            stats = collaboration_engine.get_session_statistics(session_id)
            active_sessions.append({
                "session_id": session_id,
                "active_users": list(users),
                "user_count": len(users),
                "statistics": stats
            })
        
        return {
            "active_sessions": active_sessions,
            "total_sessions": len(active_sessions)
        }
        
    except Exception as e:
        logger.error(f"Error getting active sessions: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/ai-query")
async def send_ai_query(
    session_id: str,
    query_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send AI query to collaboration session"""
    try:
        user_id = current_user.get("id")
        
        event = CollaborationEvent(
            event_id=f"ai_query_{user_id}_{datetime.now().timestamp()}",
            event_type="ai_query",
            user_id=user_id,
            session_id=session_id,
            data={
                "query": query_data.get("query"),
                "context": query_data.get("context", {}),
                "model_preference": query_data.get("model", "gpt-4o")
            },
            timestamp=datetime.now()
        )
        
        await collaboration_engine.handle_collaboration_event(event)
        
        return {
            "success": True,
            "event_id": event.event_id,
            "query": query_data.get("query"),
            "timestamp": event.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending AI query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/planning-update")
async def send_planning_update(
    session_id: str,
    planning_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send real-time planning update to collaboration session"""
    try:
        user_id = current_user.get("id")
        
        event = CollaborationEvent(
            event_id=f"planning_{user_id}_{datetime.now().timestamp()}",
            event_type="real_time_planning",
            user_id=user_id,
            session_id=session_id,
            data=planning_data,
            timestamp=datetime.now()
        )
        
        await collaboration_engine.handle_collaboration_event(event)
        
        return {
            "success": True,
            "event_id": event.event_id,
            "planning_update": planning_data,
            "timestamp": event.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending planning update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/sessions/{session_id}/resource-allocation")
async def send_resource_allocation_update(
    session_id: str,
    allocation_data: Dict[str, Any],
    current_user: dict = Depends(get_current_user)
):
    """Send resource allocation update with AI optimization"""
    try:
        user_id = current_user.get("id")
        
        event = CollaborationEvent(
            event_id=f"resource_{user_id}_{datetime.now().timestamp()}",
            event_type="resource_allocation",
            user_id=user_id,
            session_id=session_id,
            data=allocation_data,
            timestamp=datetime.now()
        )
        
        await collaboration_engine.handle_collaboration_event(event)
        
        return {
            "success": True,
            "event_id": event.event_id,
            "allocation_update": allocation_data,
            "timestamp": event.timestamp.isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error sending resource allocation update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/ai-assistants/capabilities")
async def get_ai_assistant_capabilities(current_user: dict = Depends(get_current_user)):
    """Get AI assistant capabilities and features"""
    try:
        return {
            "capabilities": [
                "Real-time task optimization",
                "Smart resource allocation",
                "Predictive planning assistance", 
                "Collaborative decision support",
                "Automated insights generation",
                "Risk assessment and mitigation",
                "Performance optimization recommendations",
                "Multi-model AI comparison"
            ],
            "supported_models": [
                "gpt-4o",
                "claude-3.5-sonnet", 
                "gemini-2.0-pro"
            ],
            "interaction_types": [
                "Natural language queries",
                "Context-aware suggestions",
                "Real-time optimization",
                "Collaborative brainstorming",
                "Data-driven insights",
                "Strategic recommendations"
            ],
            "real_time_features": [
                "WebSocket-based communication",
                "Multi-user sessions",
                "Conversation history",
                "Smart notifications",
                "Collaborative editing",
                "Live optimization suggestions"
            ]
        }
        
    except Exception as e:
        logger.error(f"Error getting AI assistant capabilities: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/health")
async def realtime_ai_health_check():
    """Health check for real-time AI collaboration services"""
    try:
        return {
            "status": "healthy",
            "service": "Real-time AI Collaboration",
            "active_sessions": len(collaboration_engine.session_users),
            "active_connections": len(collaboration_engine.active_connections),
            "ai_assistants": len(collaboration_engine.ai_assistants),
            "total_events": len(collaboration_engine.collaboration_events),
            "timestamp": datetime.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Real-time AI health check error: {str(e)}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "timestamp": datetime.now().isoformat()
        }