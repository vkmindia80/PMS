from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from auth.middleware import get_current_user
import asyncio
import logging

router = APIRouter(prefix="/api/system", tags=["system"])
logger = logging.getLogger(__name__)

@router.post("/generate-demo-data", status_code=200)
async def generate_comprehensive_demo_data():
    """
    Generate comprehensive demo data for the entire application
    This endpoint creates realistic enterprise data to showcase all features
    """
    try:
        logger.info("🚀 Starting comprehensive demo data generation via API...")
        
        # Import and run the fixed demo data generator (more reliable)
        from fixed_demo_data_generator import FixedDemoDataGenerator
        
        # Create generator instance
        generator = FixedDemoDataGenerator()
        
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
                report_files = glob.glob("/app/fixed_demo_data_report_*.json")
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
                            "access_info": report_data.get('access_information', {}),
                            "features": [
                                f"{report_data.get('summary', {}).get('users_created', 0)} Professional Users with Skills & Roles",
                                f"{report_data.get('summary', {}).get('teams_created', 0)} Specialized Teams (Dev, Design, Marketing, Sales, Ops)",
                                f"{report_data.get('summary', {}).get('projects_created', 0)} Diverse Enterprise Projects",
                                f"{report_data.get('summary', {}).get('tasks_created', 0)} Realistic Tasks with Dependencies",
                                f"{report_data.get('summary', {}).get('comments_created', 0)} Comments & Discussions",
                                f"{report_data.get('summary', {}).get('files_created', 0)} File Attachments",
                                "AI Training Records and Integration Configurations",
                                "Complete Analytics and Resource Management Data"
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