#!/usr/bin/env python3
"""
Integration Platform Backend API Testing
Tests all 4 integration types: Slack, Teams, GitHub, Google Workspace
"""

import requests
import json
import sys
from datetime import datetime
import time

class IntegrationAPITester:
    def __init__(self, base_url="https://gantt-task-fix.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.session = requests.Session()

    def log_result(self, test_name: str, success: bool, details: str = ""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name}: PASSED {details}")
        else:
            self.failed_tests.append(f"{test_name}: {details}")
            print(f"❌ {test_name}: FAILED {details}")
    
    def authenticate(self) -> bool:
        """Authenticate with demo credentials"""
        try:
            auth_data = {
                "email": "demo@company.com",
                "password": "demo123456"
            }
            
            response = self.session.post(
                f"{self.base_url}/api/auth/login",
                json=auth_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                print(f"Auth response: {data}")
                
                # Try different possible token locations
                self.token = (data.get('access_token') or 
                             data.get('token') or 
                             (data.get('tokens', {}).get('access_token')) or
                             (data.get('data', {}).get('access_token')))
                
                if self.token:
                    self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                    self.log_result("Authentication", True, f"Status: {response.status_code}")
                    return True
                else:
                    # Try without authentication for public endpoints
                    self.log_result("Authentication", False, f"No access token found, trying without auth. Response: {data}")
                    return True  # Continue without auth for public endpoints
            else:
                self.log_result("Authentication", False, f"Status: {response.status_code}, Response: {response.text}")
                # Try without authentication for public endpoints
                return True
                
        except Exception as e:
            self.log_result("Authentication", False, f"Exception: {str(e)}")
            # Try without authentication for public endpoints
            return True

    def test_integration_health(self) -> bool:
        """Test integration health endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_result("Integration Health Check", True, f"Status: healthy, Services: {len(data.get('services', {}))}")
                    return True
                else:
                    self.log_result("Integration Health Check", False, f"Status: {data.get('status')}")
                    return False
            else:
                self.log_result("Integration Health Check", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Integration Health Check", False, f"Exception: {str(e)}")
            return False

    def test_available_integrations(self) -> bool:
        """Test available integrations endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/available")
            
            if response.status_code == 200:
                data = response.json()
                integrations = data.get('available_integrations', {})
                expected_types = ['slack', 'teams', 'github', 'google_workspace']
                
                if all(integration_type in integrations for integration_type in expected_types):
                    self.log_result("Available Integrations", True, f"Found all 4 integration types")
                    return True
                else:
                    missing = [t for t in expected_types if t not in integrations]
                    self.log_result("Available Integrations", False, f"Missing: {missing}")
                    return False
            else:
                self.log_result("Available Integrations", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Available Integrations", False, f"Exception: {str(e)}")
            return False

    def test_integration_status(self) -> bool:
        """Test integration status endpoint"""
        try:
            response = self.session.get(f"{self.base_url}/api/integrations/status")
            
            if response.status_code == 200:
                data = response.json()
                self.log_result("Integration Status", True, f"Total: {data.get('total_integrations', 0)}, Active: {data.get('active_integrations', 0)}")
                return True
            else:
                self.log_result("Integration Status", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Integration Status", False, f"Exception: {str(e)}")
            return False

    def test_slack_setup(self) -> bool:
        """Test Slack integration setup"""
        try:
            slack_config = {
                "workspace_url": "https://testcompany.slack.com",
                "bot_token": "xoxb-test-token",
                "app_token": "xapp-test-token",
                "default_channel": "general",
                "notifications_enabled": True,
                "settings": {"test": True}
            }
            
            response = self.session.post(
                f"{self.base_url}/api/integrations/slack/setup",
                json=slack_config
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('integration_type') == 'slack':
                    self.log_result("Slack Setup", True, f"Status: configured")
                    return True
                else:
                    self.log_result("Slack Setup", False, f"Response: {data}")
                    return False
            else:
                self.log_result("Slack Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Slack Setup", False, f"Exception: {str(e)}")
            return False

    def test_slack_validate(self) -> bool:
        """Test Slack validation endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/api/integrations/slack/validate")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    self.log_result("Slack Validation", True, f"Connection: {data.get('connection_status')}")
                    return True
                else:
                    self.log_result("Slack Validation", False, f"Errors: {data.get('errors')}")
                    return False
            else:
                self.log_result("Slack Validation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Slack Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_teams_setup(self) -> bool:
        """Test Teams integration setup"""
        try:
            teams_config = {
                "tenant_id": "12345678-1234-1234-1234-123456789012",
                "application_id": "87654321-4321-4321-4321-210987654321",
                "client_secret": "test-client-secret",
                "default_team": "General",
                "webhook_url": "https://outlook.office.com/webhook/test",
                "settings": {"test": True}
            }
            
            response = self.session.post(
                f"{self.base_url}/api/integrations/teams/setup",
                json=teams_config
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('integration_type') == 'teams':
                    self.log_result("Teams Setup", True, f"Status: configured")
                    return True
                else:
                    self.log_result("Teams Setup", False, f"Response: {data}")
                    return False
            else:
                self.log_result("Teams Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Teams Setup", False, f"Exception: {str(e)}")
            return False
    
    def test_teams_validate(self) -> bool:
        """Test Teams validation endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/api/integrations/teams/validate")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    self.log_result("Teams Validation", True, f"Connection: {data.get('connection_status')}")
                    return True
                else:
                    self.log_result("Teams Validation", False, f"Errors: {data.get('errors')}")
                    return False
            else:
                self.log_result("Teams Validation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Teams Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_github_setup(self) -> bool:
        """Test GitHub integration setup"""
        try:
            github_config = {
                "organization": "testorg",
                "repositories": ["frontend", "backend", "docs"],
                "access_token": "ghp_test_token_123456789",
                "webhook_secret": "test-webhook-secret",
                "auto_sync": True,
                "settings": {"test": True}
            }
            
            response = self.session.post(
                f"{self.base_url}/api/integrations/github/setup",
                json=github_config
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('integration_type') == 'github':
                    self.log_result("GitHub Setup", True, f"Status: configured")
                    return True
                else:
                    self.log_result("GitHub Setup", False, f"Response: {data}")
                    return False
            else:
                self.log_result("GitHub Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("GitHub Setup", False, f"Exception: {str(e)}")
            return False
    
    def test_github_validate(self) -> bool:
        """Test GitHub validation endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/api/integrations/github/validate")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    self.log_result("GitHub Validation", True, f"Connection: {data.get('connection_status')}")
                    return True
                else:
                    self.log_result("GitHub Validation", False, f"Errors: {data.get('errors')}")
                    return False
            else:
                self.log_result("GitHub Validation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("GitHub Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_google_workspace_setup(self) -> bool:
        """Test Google Workspace integration setup"""
        try:
            google_config = {
                "domain": "testcompany.com",
                "service_account_key": '{"type": "service_account", "project_id": "test"}',
                "delegated_user": "admin@testcompany.com",
                "calendar_sync": True,
                "drive_sync": True,
                "gmail_sync": False,
                "settings": {"test": True}
            }
            
            response = self.session.post(
                f"{self.base_url}/api/integrations/google-workspace/setup",
                json=google_config
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('success') and data.get('integration_type') == 'google_workspace':
                    self.log_result("Google Workspace Setup", True, f"Status: configured")
                    return True
                else:
                    self.log_result("Google Workspace Setup", False, f"Response: {data}")
                    return False
            else:
                self.log_result("Google Workspace Setup", False, f"Status: {response.status_code}, Response: {response.text}")
                return False
                
        except Exception as e:
            self.log_result("Google Workspace Setup", False, f"Exception: {str(e)}")
            return False
    
    def test_google_workspace_validate(self) -> bool:
        """Test Google Workspace validation endpoint"""
        try:
            response = self.session.post(f"{self.base_url}/api/integrations/google-workspace/validate")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    self.log_result("Google Workspace Validation", True, f"Connection: {data.get('connection_status')}")
                    return True
                else:
                    self.log_result("Google Workspace Validation", False, f"Errors: {data.get('errors')}")
                    return False
            else:
                self.log_result("Google Workspace Validation", False, f"Status: {response.status_code}")
                return False
                
        except Exception as e:
            self.log_result("Google Workspace Validation", False, f"Exception: {str(e)}")
            return False
    
    def test_integration_functionality(self) -> bool:
        """Test integration functionality endpoints"""
        success_count = 0
        total_tests = 0
        
        # Test Slack notification
        try:
            total_tests += 1
            response = self.session.post(
                f"{self.base_url}/api/integrations/slack/notify",
                json={
                    "channel": "general",
                    "message": "Test notification from integration testing",
                    "priority": "normal"
                }
            )
            if response.status_code == 200 and response.json().get('success'):
                success_count += 1
                self.log_result("Slack Notification", True, "Message sent successfully")
            else:
                self.log_result("Slack Notification", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Slack Notification", False, f"Exception: {str(e)}")
        
        # Test Teams adaptive card
        try:
            total_tests += 1
            response = self.session.post(
                f"{self.base_url}/api/integrations/teams/adaptive-card",
                json={
                    "channel_id": "test-channel",
                    "message": "Test adaptive card",
                    "card_data": {"body": [{"type": "TextBlock", "text": "Test"}]}
                }
            )
            if response.status_code == 200 and response.json().get('success'):
                success_count += 1
                self.log_result("Teams Adaptive Card", True, "Card sent successfully")
            else:
                self.log_result("Teams Adaptive Card", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Teams Adaptive Card", False, f"Exception: {str(e)}")
        
        # Test GitHub repositories
        try:
            total_tests += 1
            response = self.session.get(f"{self.base_url}/api/integrations/github/repositories")
            if response.status_code == 200:
                data = response.json()
                if 'repositories' in data:
                    success_count += 1
                    self.log_result("GitHub Repositories", True, f"Found {len(data['repositories'])} repositories")
                else:
                    self.log_result("GitHub Repositories", False, "No repositories in response")
            else:
                self.log_result("GitHub Repositories", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("GitHub Repositories", False, f"Exception: {str(e)}")
        
        # Test Google Workspace meeting scheduling
        try:
            total_tests += 1
            response = self.session.post(
                f"{self.base_url}/api/integrations/google-workspace/schedule-meeting",
                json={
                    "title": "Test Meeting",
                    "description": "Integration test meeting",
                    "start_time": "2024-12-01T10:00:00Z",
                    "end_time": "2024-12-01T11:00:00Z",
                    "attendees": ["test@example.com"]
                }
            )
            if response.status_code == 200 and response.json().get('success'):
                success_count += 1
                self.log_result("Google Workspace Meeting", True, "Meeting scheduled successfully")
            else:
                self.log_result("Google Workspace Meeting", False, f"Status: {response.status_code}")
        except Exception as e:
            self.log_result("Google Workspace Meeting", False, f"Exception: {str(e)}")
        
        return success_count == total_tests
    
    def run_all_tests(self):
        """Run all integration tests"""
        print("🚀 Starting Integration Platform Backend API Tests")
        print(f"📍 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Authentication
        if not self.authenticate():
            return self.get_results()
        
        # Core integration tests
        self.test_integration_health()
        self.test_available_integrations()
        self.test_integration_status()
        
        # Slack integration tests
        self.test_slack_setup()
        self.test_slack_validate()
        
        # Teams integration tests
        self.test_teams_setup()
        self.test_teams_validate()
        
        # GitHub integration tests
        self.test_github_setup()
        self.test_github_validate()
        
        # Google Workspace integration tests
        self.test_google_workspace_setup()
        self.test_google_workspace_validate()
        
        # Functionality tests
        self.test_integration_functionality()
        
        return self.get_results()
    
    def get_results(self):
        """Get test results summary"""
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        
        print("\n" + "=" * 60)
        print("📊 TEST RESULTS SUMMARY")
        print("=" * 60)
        print(f"✅ Tests Passed: {self.tests_passed}/{self.tests_run}")
        print(f"📈 Success Rate: {success_rate:.1f}%")
        
        if self.failed_tests:
            print(f"\n❌ Failed Tests ({len(self.failed_tests)}):")
            for failure in self.failed_tests:
                print(f"   • {failure}")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": len(self.failed_tests),
            "success_rate": success_rate,
            "failures": self.failed_tests,
            "timestamp": datetime.utcnow().isoformat()
        }

def main():
    """Main test execution"""
    tester = IntegrationAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["failed_tests"] == 0 else 1

if __name__ == "__main__":
    sys.exit(main())