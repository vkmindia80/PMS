#!/usr/bin/env python3
"""
Test script to verify the enhanced demo data generation worked correctly
"""

import requests
import json
import sys

BASE_URL = "http://localhost:8001"

def test_api_endpoint(endpoint, description):
    """Test an API endpoint and return the result"""
    try:
        url = f"{BASE_URL}{endpoint}"
        print(f"Testing {description}: {url}")
        
        response = requests.get(url, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Handle different response types
            if isinstance(data, list):
                count = len(data)
                print(f"  ✅ SUCCESS: Found {count} records")
                if count > 0:
                    print(f"  📝 Sample: {json.dumps(data[0] if isinstance(data[0], dict) else str(data[0]), indent=2)[:200]}...")
            elif isinstance(data, dict):
                if 'collection_counts' in data:
                    print(f"  ✅ SUCCESS: Database status retrieved")
                    print(f"  📊 Collections: {data['collection_counts']}")
                else:
                    print(f"  ✅ SUCCESS: Data retrieved")
                    print(f"  📝 Keys: {list(data.keys()) if data else 'Empty'}")
            else:
                print(f"  ✅ SUCCESS: {data}")
            
            return True
        else:
            print(f"  ❌ FAILED: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        print(f"  ❌ ERROR: {str(e)}")
        return False

def main():
    """Run comprehensive API tests"""
    print("🚀 Testing Enhanced Demo Data Generation Results...")
    print("=" * 60)
    
    # Test endpoints
    tests = [
        ("/api/health", "Health Check"),
        ("/api/database/status", "Database Status"),
        ("/api/users", "Users API"),  
        ("/api/teams", "Teams API"),
        ("/api/projects", "Projects API"),
        ("/api/tasks", "Tasks API"),
        ("/api/", "Root API Info")
    ]
    
    results = []
    
    for endpoint, description in tests:
        success = test_api_endpoint(endpoint, description)
        results.append((endpoint, success))
        print()
    
    # Summary
    print("=" * 60)
    print("🔍 TEST SUMMARY:")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    
    for endpoint, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"  {status}: {endpoint}")
    
    print(f"\n📊 Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! Enhanced demo data generation is working correctly.")
        print("🔗 Access the application:")
        print("   Frontend: http://localhost:3000")
        print("   Backend API: http://localhost:8001")
        print("   Demo Login: demo@company.com / demo123456")
        return True
    else:
        print("⚠️  Some tests failed. Check the API endpoints.")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)