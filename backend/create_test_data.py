#!/usr/bin/env python3
"""
Script to create test data for the Enterprise Portfolio Management system
"""
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from models.organization import Organization
from models.user import User, UserRole, UserStatus

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "enterprise_portfolio_db")

async def create_test_data():
    """Create test organizations and users"""
    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]
    
    print("🚀 Creating test data for Enterprise Portfolio Management...")
    
    # Create test organizations
    organizations = [
        {
            "id": "demo-org-001",
            "name": "Demo Organization",
            "slug": "demo-organization",
            "display_name": "Demo Organization",
            "description": "A demo organization for testing the system",
            "type": "startup",
            "industry": "Technology",
            "size": "small",
            "website": "https://demo.example.com",
            "email": "contact@demo.example.com",
            "phone": "+1-555-0100",
            "address": {
                "street": "123 Demo Street",
                "city": "Demo City",
                "state": "DC",
                "postal_code": "12345",
                "country": "United States"
            },
            "settings": {
                "timezone": "UTC",
                "currency": "USD",
                "date_format": "MM/dd/yyyy",
                "business_hours": {
                    "start": "09:00",
                    "end": "17:00",
                    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
                }
            },
            "billing": {
                "plan": "starter",
                "status": "active"
            },
            "features": {
                "advanced_analytics": False,
                "custom_branding": False,
                "api_access": True,
                "integrations": True
            },
            "limits": {
                "max_users": 50,
                "max_projects": 100,
                "max_storage_gb": 10
            },
            "owner_id": "demo-user-001",
            "member_count": 1,
            "project_count": 0,
            "is_active": True,
            "status": "active",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": "startup-001",
            "name": "Tech Startup Inc.",
            "display_name": "Tech Startup Inc.",
            "description": "A technology startup focused on innovation",
            "type": "startup",
            "industry": "Technology",
            "size": "small",
            "website": "https://techstartup.example.com",
            "email": "hello@techstartup.example.com",
            "phone": "+1-555-0200",
            "address": {
                "street": "456 Innovation Way",
                "city": "Silicon Valley",
                "state": "CA",
                "postal_code": "94000",
                "country": "United States"
            },
            "settings": {
                "timezone": "America/Los_Angeles",
                "currency": "USD",
                "date_format": "MM/dd/yyyy",
                "business_hours": {
                    "start": "08:00",
                    "end": "18:00",
                    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
                }
            },
            "billing": {
                "plan": "professional",
                "status": "active"
            },
            "features": {
                "advanced_analytics": True,
                "custom_branding": True,
                "api_access": True,
                "integrations": True
            },
            "limits": {
                "max_users": 200,
                "max_projects": 500,
                "max_storage_gb": 50
            },
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "id": "enterprise-001",
            "name": "Enterprise Corp.",
            "display_name": "Enterprise Corp.",
            "description": "A large enterprise corporation",
            "type": "large_enterprise",
            "industry": "Finance",
            "size": "large",
            "website": "https://enterprise.example.com",
            "email": "info@enterprise.example.com",
            "phone": "+1-555-0300",
            "address": {
                "street": "789 Corporate Blvd",
                "city": "New York",
                "state": "NY",
                "postal_code": "10001",
                "country": "United States"
            },
            "settings": {
                "timezone": "America/New_York",
                "currency": "USD",
                "date_format": "MM/dd/yyyy",
                "business_hours": {
                    "start": "09:00",
                    "end": "17:00",
                    "days": ["monday", "tuesday", "wednesday", "thursday", "friday"]
                }
            },
            "billing": {
                "plan": "enterprise",
                "status": "active"
            },
            "features": {
                "advanced_analytics": True,
                "custom_branding": True,
                "api_access": True,
                "integrations": True
            },
            "limits": {
                "max_users": 1000,
                "max_projects": 2000,
                "max_storage_gb": 500
            },
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    # Insert organizations
    for org in organizations:
        existing = await db.organizations.find_one({"id": org["id"]})
        if not existing:
            await db.organizations.insert_one(org)
            print(f"✅ Created organization: {org['name']}")
        else:
            print(f"⏭️  Organization already exists: {org['name']}")
    
    print("\n🎉 Test data creation completed!")
    print("\n📋 Available Organizations:")
    for org in organizations:
        print(f"  • {org['name']} (ID: {org['id']})")
    
    print("\n💡 You can now register users with these organization IDs")
    print("\n🔧 Example registration command:")
    print(f"""curl -X POST http://localhost:8001/api/auth/register \\
-H "Content-Type: application/json" \\
-d '{{
  "email": "demo@company.com",
  "username": "demo_user",
  "password": "demo123456",
  "confirm_password": "demo123456",
  "first_name": "Demo",
  "last_name": "User",
  "organization_id": "demo-org-001",
  "phone": "+1-555-0123",
  "bio": "Demo user for testing"
}}'""")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(create_test_data())