from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse
from auth.middleware import get_current_user_optional, get_current_user
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
        
        # Import and run the master data loader
        from master_sample_data_loader import MasterDataLoader
        
        # Create loader instance
        loader = MasterDataLoader()
        
        # Run the complete data loading process in the background
        report = await loader.run_master_data_loading()
        
        if report and report.get('summary', {}).get('success_rate', 0) > 85:
            logger.info("✅ Demo data generation completed successfully")
            
            return {
                "success": True,
                "message": "Comprehensive demo data generated successfully!",
                "details": {
                    "total_data_points": report.get('total_data_points', 0),
                    "success_rate": report.get('summary', {}).get('success_rate', 0),
                    "loading_duration": report.get('loading_duration_seconds', 0),
                    "data_counts": report.get('final_data_counts', {}),
                    "features": [
                        "29 Professional Users with Skills & Roles",
                        "5 Specialized Teams (Dev, Design, Marketing, Sales, Ops)",
                        "12 Diverse Enterprise Projects",
                        "145+ Realistic Tasks with Dependencies",
                        "20+ AI-Generated Notifications",
                        "20+ AI Training History Records",
                        "4 Integration Configurations (Slack, Teams, GitHub, Google)",
                        "Comprehensive Comments & File Attachments"
                    ]
                }
            }
        else:
            logger.error("❌ Demo data generation completed with issues")
            return {
                "success": False,
                "message": "Demo data generation completed with some issues",
                "details": report if report else {}
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