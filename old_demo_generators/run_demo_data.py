#!/usr/bin/env python3
"""
Script to run the enhanced demo data creation
"""

import asyncio
from create_demo_data import create_enhanced_demo_data

async def main():
    """Main function to create demo data"""
    try:
        print("🚀 Starting enhanced demo data creation...")
        result = await create_enhanced_demo_data()
        print("\n✅ Demo data creation completed successfully!")
        print("\n📊 Summary:")
        print(f"  - Organization: {result['organization']['name']}")
        print(f"  - Users: {len(result['users'])}")
        print(f"  - Teams: {len(result['teams'])}")
        print(f"  - Projects: {len(result['projects'])}")
        print(f"  - Tasks: {len(result['tasks'])}")
        print("\n🎯 You can now access the analytics dashboard with meaningful data!")
        print("🔑 Login with: demo@company.com / demo123456")
        
    except Exception as e:
        print(f"❌ Error creating demo data: {e}")
        raise

if __name__ == "__main__":
    asyncio.run(main())