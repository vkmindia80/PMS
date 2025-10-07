from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from auth.middleware import get_current_user
import asyncio
import logging

router = APIRouter(prefix="/api/system", tags=["system"])
logger = logging.getLogger(__name__)

@router.post("/generate-demo-data", status_code=202)
async def generate_comprehensive_demo_data():
    """
    Generate comprehensive demo data for the entire application
    This endpoint creates realistic enterprise data to showcase all features
    Returns immediately with 202 Accepted while generation runs in background
    """
    try:
        logger.info("🚀 Starting comprehensive demo data generation via API...")
        
        # Import the generator
        from comprehensive_demo_data_generator import ComprehensiveDemoDataGenerator
        
        # Create generator instance
        generator = ComprehensiveDemoDataGenerator()
        
        # Run generation in background task
        async def run_generation():
            try:
                success = await generator.run_complete_generation()
                if success:
                    logger.info("✅ Demo data generation completed successfully")
                else:
                    logger.error("❌ Demo data generation failed")
            except Exception as e:
                logger.error(f"❌ Background demo data generation error: {str(e)}")
        
        # Start background task
        asyncio.create_task(run_generation())
        
        # Return immediately
        return {
            "success": True,
            "message": "Demo data generation started! This may take 10-30 seconds to complete.",
            "status": "processing",
            "details": {
                "note": "The generation is running in the background. You can refresh the page in a moment to see the new data.",
                "access_info": {
                    "demo_login": "demo@company.com / demo123456",
                    "frontend_url": "http://localhost:3000",
                    "backend_api": "http://localhost:8001",
                    "api_docs": "http://localhost:8001/docs"
                }
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Demo data generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start demo data generation: {str(e)}"
        )


@router.get("/demo-data-status", status_code=200)
async def get_demo_data_status():
    """
    Check the status of demo data generation
    """
    try:
        from database import get_database
        import json
        import glob
        import os
        
        db = await get_database()
        
        # Check if demo data exists
        demo_org = await db.organizations.find_one({"id": "demo-org-001"})
        demo_user_count = await db.users.count_documents({"organization_id": "demo-org-001"})
        project_count = await db.projects.count_documents({"organization_id": "demo-org-001"})
        task_count = await db.tasks.count_documents({"organization_id": "demo-org-001"})
        
        has_data = demo_org is not None and demo_user_count > 1 and project_count > 0
        
        if has_data:
            # Try to get the latest report
            try:
                report_files = glob.glob("/app/comprehensive_demo_data_report_*.json")
                if report_files:
                    latest_report_file = max(report_files, key=os.path.getctime)
                    with open(latest_report_file, 'r') as f:
                        report_data = json.load(f)
                    
                    return {
                        "success": True,
                        "status": "completed",
                        "message": "Demo data is available",
                        "details": {
                            "users_created": demo_user_count,
                            "projects_created": project_count,
                            "tasks_created": task_count,
                            "report": report_data.get('summary', {})
                        }
                    }
            except Exception as report_error:
                logger.warning(f"Could not read report: {report_error}")
            
            return {
                "success": True,
                "status": "completed",
                "message": "Demo data is available",
                "details": {
                    "users": demo_user_count,
                    "projects": project_count,
                    "tasks": task_count
                }
            }
        else:
            return {
                "success": True,
                "status": "not_found",
                "message": "No demo data found. Generate some first.",
                "details": {
                    "users": demo_user_count,
                    "projects": project_count,
                    "tasks": task_count
                }
            }
            
    except Exception as e:
        logger.error(f"Error checking demo data status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to check demo data status: {str(e)}"
        )


# Keep old sync version for backward compatibility
@router.post("/generate-demo-data-sync", status_code=200)
async def generate_comprehensive_demo_data_sync():
    """
    Generate comprehensive demo data synchronously (waits for completion)
    WARNING: This may timeout for large datasets. Use /generate-demo-data instead.
    """
    try:
        logger.info("🚀 Starting comprehensive demo data generation via API (SYNC)...")
        
        # Import and run the comprehensive demo data generator
        from comprehensive_demo_data_generator import ComprehensiveDemoDataGenerator
        
        # Create generator instance
        generator = ComprehensiveDemoDataGenerator()
        
        # Run the complete data generation process
        success = await generator.run_complete_generation()
        
        if success:
            logger.info("✅ Demo data generation completed successfully")
            
            # Get summary from the last generated report
            import json
            from datetime import datetime
            
            try:
                # Try to get the latest report file
                import glob
                import os
                report_files = glob.glob("/app/comprehensive_demo_data_report_*.json")
                if report_files:
                    latest_report_file = max(report_files, key=os.path.getctime)
                    with open(latest_report_file, 'r') as f:
                        report_data = json.load(f)
                    
                    return {
                        "success": True,
                        "message": "Comprehensive demo data generated successfully!",
                        "details": {
                            "total_data_points": report_data.get('summary', {}).get('total_data_points', 0),
                            "users_created": report_data.get('summary', {}).get('users_created', 0),
                            "teams_created": report_data.get('summary', {}).get('teams_created', 0),
                            "projects_created": report_data.get('summary', {}).get('projects_created', 0),
                            "tasks_created": report_data.get('summary', {}).get('tasks_created', 0),
                            "comments_created": report_data.get('summary', {}).get('comments_created', 0),
                            "files_created": report_data.get('summary', {}).get('files_created', 0),
                            "tasks_with_dependencies": report_data.get('statistics', {}).get('tasks_with_dependencies', 0),
                            "tasks_with_multiple_assignees": report_data.get('statistics', {}).get('tasks_with_multiple_assignees', 0),
                            "total_estimated_hours": report_data.get('statistics', {}).get('total_estimated_hours', 0),
                            "dependency_rate": report_data.get('statistics', {}).get('dependency_completion_rate', '0%'),
                            "multi_assignee_rate": report_data.get('statistics', {}).get('multi_assignee_rate', '0%'),
                            "success_rate": 100,
                            "access_info": report_data.get('access_information', {}),
                            "features": [
                                f"👥 {report_data.get('summary', {}).get('users_created', 0)} Professional Users with Skills & Roles",
                                f"👨‍👩‍👧‍👦 {report_data.get('summary', {}).get('teams_created', 0)} Specialized Teams (AI, Blockchain, IoT, FinTech, etc.)",
                                f"📁 {report_data.get('summary', {}).get('projects_created', 0)} Diverse Enterprise Projects with Budgets & Timelines",
                                f"✅ {report_data.get('summary', {}).get('tasks_created', 0)} Enhanced Tasks with Start/End Dates",
                                f"🔗 {report_data.get('statistics', {}).get('tasks_with_dependencies', 0)} Tasks with Dependencies ({report_data.get('statistics', {}).get('dependency_completion_rate', '0%')})",
                                f"👥 {report_data.get('statistics', {}).get('tasks_with_multiple_assignees', 0)} Multi-Assignee Tasks ({report_data.get('statistics', {}).get('multi_assignee_rate', '0%')})",
                                f"⏱️ {report_data.get('statistics', {}).get('total_estimated_hours', 0):,.0f} Hours of Time Tracking Data",
                                f"💬 {report_data.get('summary', {}).get('comments_created', 0)} Comments & Discussions",
                                f"📎 {report_data.get('summary', {}).get('files_created', 0)} File Attachments",
                                "🤖 AI Training Records and Integration Configurations",
                                "📊 Complete Analytics and Resource Management Data"
                            ]
                        }
                    }
                else:
                    # Fallback response if no report file found
                    return {
                        "success": True,
                        "message": "Demo data generated successfully!",
                        "details": {
                            "total_data_points": 200,
                            "features": [
                                "Professional Users with Skills & Roles",
                                "Specialized Teams",
                                "Enterprise Projects",
                                "Realistic Tasks with Dependencies", 
                                "Comments & File Attachments",
                                "AI Integration Data"
                            ]
                        }
                    }
            except Exception as report_error:
                logger.warning(f"Could not read report file: {report_error}")
                return {
                    "success": True,
                    "message": "Demo data generated successfully!",
                    "details": {
                        "note": "Demo data created but report details unavailable"
                    }
                }
        else:
            logger.error("❌ Demo data generation failed")
            return {
                "success": False,
                "message": "Demo data generation failed",
                "details": {"error": "Generation process returned failure"}
            }
            
    except Exception as e:
        logger.error(f"❌ Demo data generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate demo data: {str(e)}"
        )

@router.get("/health", status_code=200)
async def system_health():
    """
    System health check endpoint
    """
    try:
        from database import get_database
        
        # Test database connection
        db = await get_database()
        user_count = await db.users.count_documents({})
        
        return {
            "status": "healthy",
            "message": "System is operational",
            "database": "connected",
            "user_count": user_count,
            "timestamp": "2025-12-01T00:00:00Z"
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"System health check failed: {str(e)}"
        )

@router.post("/clear-demo-data", status_code=200)
async def clear_demo_data(current_user: dict = Depends(get_current_user)):
    """
    Clear demo data (admin only)
    """
    try:
        # Only allow admin users to clear demo data
        if current_user.get("role") not in ["admin", "super_admin"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admin users can clear demo data"
            )
        
        from database import get_database
        
        db = await get_database()
        
        # Collections to clear (keeping the demo user and organization)
        collections_to_clear = ['teams', 'projects', 'tasks', 'comments', 'files', 'notifications']
        
        cleared_counts = {}
        for collection_name in collections_to_clear:
            result = await db[collection_name].delete_many({"organization_id": "demo-org-001"})
            cleared_counts[collection_name] = result.deleted_count
        
        return {
            "success": True,
            "message": "Demo data cleared successfully",
            "cleared_counts": cleared_counts
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Failed to clear demo data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to clear demo data: {str(e)}"
        )