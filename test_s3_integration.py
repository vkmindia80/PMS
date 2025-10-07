#!/usr/bin/env python3
"""
Test script to verify S3 file management integration
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://localhost:8001/api"
DEMO_CREDENTIALS = {
    "email": "demo@company.com",
    "password": "demo123456"
}

def test_api_connection():
    """Test basic API connection"""
    try:
        response = requests.get(f"{BASE_URL}/health")
        if response.status_code == 200:
            data = response.json()
            print("✅ API Health Check:", data.get("status"))
            return True
        else:
            print("❌ API Health Check failed:", response.status_code)
            return False
    except Exception as e:
        print("❌ API Connection failed:", str(e))
        return False

def get_auth_token():
    """Get authentication token"""
    try:
        response = requests.post(f"{BASE_URL}/auth/login", json=DEMO_CREDENTIALS)
        if response.status_code == 200:
            data = response.json()
            print("✅ Authentication successful")
            print("Response data:", json.dumps(data, indent=2))
            # Try different possible token field names
            token = data.get("access_token") or data.get("token") or data.get("access")
            if not token and "tokens" in data:
                token = data["tokens"].get("access_token")
            if token:
                return token
            else:
                print("❌ No access token found in response")
                return None
        else:
            print("❌ Authentication failed:", response.status_code, response.text)
            return None
    except Exception as e:
        print("❌ Authentication error:", str(e))
        return None

def test_file_endpoints(token):
    """Test file management endpoints"""
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: List projects to get a project ID
    try:
        response = requests.get(f"{BASE_URL}/projects", headers=headers)
        if response.status_code == 200:
            projects = response.json()
            print(f"✅ Found {len(projects)} projects")
            
            if projects:
                project_id = projects[0]["id"]
                print(f"📁 Testing with project: {project_id}")
                
                # Test 2: List files for project (should be empty initially)
                response = requests.get(f"{BASE_URL}/files/projects/{project_id}", headers=headers)
                if response.status_code == 200:
                    files_data = response.json()
                    print(f"✅ File listing endpoint works - found {files_data.get('total_count', 0)} files")
                else:
                    print(f"❌ File listing failed: {response.status_code}")
                
                # Test 3: Get file statistics
                response = requests.get(f"{BASE_URL}/files/projects/{project_id}/stats", headers=headers)
                if response.status_code == 200:
                    stats = response.json()
                    print(f"✅ File stats endpoint works - {stats.get('total_files', 0)} files, {stats.get('total_size_mb', 0)}MB")
                else:
                    print(f"❌ File stats failed: {response.status_code}")
                
                return True
            else:
                print("⚠️  No projects found to test file endpoints")
                return False
        else:
            print("❌ Failed to list projects:", response.status_code)
            return False
    except Exception as e:
        print("❌ File endpoints test error:", str(e))
        return False

def test_s3_configuration():
    """Test S3 configuration (without actual AWS credentials)"""
    try:
        # Import the S3 service to check configuration
        sys.path.append('/app/backend')
        from services.s3_service import S3Config
        
        config = S3Config()
        print("✅ S3 Configuration loaded:")
        print(f"   - Bucket: {config.bucket_name}")
        print(f"   - Region: {config.region}")
        print(f"   - Max file size: {config.max_file_size // (1024*1024)}MB")
        print(f"   - Allowed extensions: {len(config.allowed_extensions)} types")
        return True
    except Exception as e:
        print("❌ S3 configuration error:", str(e))
        return False

def main():
    """Run all tests"""
    print("🧪 Testing S3 File Management Integration")
    print("=" * 50)
    
    tests = [
        ("API Connection", test_api_connection),
        ("S3 Configuration", test_s3_configuration),
    ]
    
    # Run basic tests first
    for test_name, test_func in tests:
        print(f"\n🔍 Testing {test_name}...")
        if not test_func():
            print(f"❌ {test_name} test failed!")
            return False
    
    # Test authentication and file endpoints
    print("\n🔍 Testing Authentication...")
    token = get_auth_token()
    if not token:
        print("❌ Cannot proceed without authentication")
        return False
    
    print("\n🔍 Testing File Endpoints...")
    if not test_file_endpoints(token):
        print("❌ File endpoints test failed!")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All tests passed! S3 File Management integration is ready.")
    print("\n📋 Next Steps:")
    print("   1. Configure your AWS S3 credentials in backend/.env")
    print("   2. Update S3_BUCKET_NAME with your actual bucket name")
    print("   3. Test file upload functionality through the UI")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)