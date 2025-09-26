#!/usr/bin/env python3
"""
Script to create demo user and organization for the Enterprise Portfolio Management system
"""
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from auth.utils import hash_password

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "enterprise_portfolio_db")

async def create_demo_data():
    """Create demo organization and demo user"""
    # Connect to database
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DATABASE_NAME]
    
    print("🚀 Creating demo data for Enterprise Portfolio Management...")
    
    # Create demo organization
    demo_org = {
        "id": "demo-org-001",
        "name": "Demo Organization",
        "slug": "demo-organization",
        "description": "A demo organization for testing the system",
        "type": "startup",
        "status": "active",
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
            "date_format": "YYYY-MM-DD",
            "time_format": "24h",
            "language": "en",
            "features": {},
            "max_users": 50,
            "max_projects": 100,
            "storage_limit_gb": 10.0
        },
        "industry": "Technology",
        "size": "small",
        "founded_year": 2024,
        "owner_id": "demo-user-001",
        "member_count": 1,
        "project_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert organization if it doesn't exist
    existing_org = await db.organizations.find_one({"id": "demo-org-001"})
    if not existing_org:
        try:
            await db.organizations.insert_one(demo_org)
            print("✅ Created demo organization")
        except Exception as e:
            print(f"⚠️  Organization might already exist: {e}")
    else:
        print("⏭️  Demo organization already exists")
    
    # Create demo user
    demo_user = {
        "id": "demo-user-001",
        "email": "demo@company.com",
        "username": "demo_user",
        "password_hash": hash_password("demo123456"),
        "first_name": "Demo",
        "last_name": "User",
        "phone": "+1-555-0123",
        "bio": "Demo user for testing the Enterprise Portfolio Management system",
        "avatar_url": None,
        "role": "admin",  # Give admin role for demo
        "organization_id": "demo-org-001",
        "is_active": True,
        "status": "active",
        "email_verified": True,  # Pre-verify for demo
        "email_verification_token": None,
        "password_reset_token": None,
        "password_reset_expires": None,
        "last_login": None,
        "login_count": 0,
        "timezone": "UTC",
        "language": "en",
        "theme": "light",
        "notifications_enabled": True,
        "profile_completed": True,
        "onboarding_completed": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    # Insert user if it doesn't exist
    existing_user = await db.users.find_one({"email": "demo@company.com"})
    if not existing_user:
        try:
            await db.users.insert_one(demo_user)
            print("✅ Created demo user: demo@company.com / demo123456")
        except Exception as e:
            print(f"❌ Failed to create demo user: {e}")
    else:
        print("⏭️  Demo user already exists")
    
    print("\n🎉 Demo data creation completed!")
    print("\n📋 Demo Credentials:")
    print("  Email: demo@company.com")
    print("  Password: demo123456")
    print("  Organization: Demo Organization")
    print("  Role: Admin")
    
    print("\n🧪 Test the login:")
    print(f"""curl -X POST http://localhost:8001/api/auth/login \\
-H "Content-Type: application/json" \\
-d '{{
  "email": "demo@company.com",
  "password": "demo123456"
}}'""")
    
    # Close connection
    client.close()

if __name__ == "__main__":
    asyncio.run(create_demo_data())