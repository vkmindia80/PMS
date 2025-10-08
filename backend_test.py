#!/usr/bin/env python3
"""
Backend API Testing for Cost Analytics Functionality
Testing cost analytics endpoints, portfolio summary, budget alerts, and cost estimates
"""

import requests
import sys
import json
import time
from datetime import datetime
from typing import Dict, Any, Optional

class CostAnalyticsTester:
    def __init__(self, base_url: str = "https://artifact-genius.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_project_id = None  # Will be set from projects list
        self.test_results = []
        self.cost_data = None  # Store cost analytics data

    def log_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            
        result = {
            "test_name": test_name,
            "success": success,
            "details": details,
            "response_data": response_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")

    def run_test(self, name: str, method: str, endpoint: str, expected_status: int, data: Dict = None) -> tuple:
        """Run a single API test"""
        url = f"{self.base_url}{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        print(f"\n🔍 Testing {name}...")
        print(f"    URL: {url}")
        print(f"    Method: {method}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)

            print(f"    Response Status: {response.status_code}")
            
            success = response.status_code == expected_status
            response_data = {}
            
            try:
                response_data = response.json()
                if success:
                    print(f"    ✅ Success")
                else:
                    print(f"    ❌ Error: {response_data}")
            except:
                response_data = {"raw_response": response.text}
                if not success:
                    print(f"    Raw Response: {response.text}")

            self.log_result(name, success, f"Status: {response.status_code}", response_data)
            return success, response_data

        except Exception as e:
            error_msg = f"Request failed: {str(e)}"
            print(f"    ❌ Error: {error_msg}")
            self.log_result(name, False, error_msg)
            return False, {"error": error_msg}

    def test_login(self):
        """Test login with demo credentials"""
        print("\n" + "="*60)
        print("TESTING AUTHENTICATION")
        print("="*60)
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "/api/auth/login",
            200,
            data={"email": "demo@company.com", "password": "demo123456"}
        )
        
        if success and 'tokens' in response:
            self.token = response['tokens']['access_token']
            self.user_data = response.get('user', {})
            print(f"    ✅ Login successful, user ID: {self.user_data.get('id')}")
            return True
        else:
            print(f"    ❌ Login failed")
            return False

    def test_portfolio_cost_summary(self):
        """Test portfolio cost summary endpoint - CORE FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING PORTFOLIO COST SUMMARY")
        print("="*60)
        
        success, response = self.run_test(
            "Get Portfolio Cost Summary",
            "GET",
            "/api/cost-analytics/portfolio-summary",
            200
        )
        
        if success and isinstance(response, dict):
            self.cost_data = response
            
            # Check required sections
            required_sections = ['summary', 'alerts', 'breakdown', 'insights', 'projects']
            missing_sections = [section for section in required_sections if section not in response]
            
            if missing_sections:
                print(f"    ⚠️ Missing required sections: {missing_sections}")
                return False
            
            # Validate summary data
            summary = response.get('summary', {})
            print(f"    📊 Total Projects: {summary.get('total_projects', 0)}")
            print(f"    📊 Active Projects: {summary.get('active_projects', 0)}")
            print(f"    💰 Total Budget: ${summary.get('total_budget', 0):,.2f}")
            print(f"    💸 Total Spent: ${summary.get('total_spent', 0):,.2f}")
            print(f"    📈 Budget Utilization: {summary.get('budget_utilization', 0):.1f}%")
            
            # Validate alerts data
            alerts = response.get('alerts', {})
            print(f"    🚨 Over Budget Projects: {alerts.get('projects_over_budget', 0)}")
            print(f"    ⚠️ High Risk Projects: {alerts.get('high_risk_projects', 0)}")
            print(f"    📅 Overdue Projects: {alerts.get('overdue_projects', 0)}")
            print(f"    🎯 Risk Level: {alerts.get('risk_level', 'unknown')}")
            
            # Validate insights data
            insights = response.get('insights', {})
            print(f"    📊 Cost Efficiency: {insights.get('cost_efficiency', 0):.1f}%")
            print(f"    📈 Projected Monthly Spend: ${insights.get('projected_monthly_spend', 0):,.2f}")
            
            # Validate projects data
            projects = response.get('projects', [])
            print(f"    📁 Projects in Response: {len(projects)}")
            
            if len(projects) > 0:
                self.test_project_id = projects[0].get('id')
                print(f"    🎯 Using project ID for testing: {self.test_project_id}")
            
            return True
        else:
            print(f"    ❌ Failed to get portfolio cost summary")
            return False

    def test_budget_alerts(self):
        """Test budget alerts endpoint - KEY FUNCTIONALITY"""
        print("\n" + "="*60)
        print("TESTING BUDGET ALERTS ENDPOINT")
        print("="*60)
        
        success, response = self.run_test(
            "Get Budget Alerts",
            "GET",
            "/api/cost-analytics/budget-alerts",
            200
        )
        
        if success and isinstance(response, dict):
            alerts = response.get('alerts', [])
            summary = response.get('summary', {})
            
            print(f"    🚨 Total Alerts: {summary.get('total_alerts', 0)}")
            print(f"    🔴 Critical Alerts: {summary.get('critical_count', 0)}")
            print(f"    🟡 Warning Alerts: {summary.get('warning_count', 0)}")
            print(f"    🔵 Info Alerts: {summary.get('info_count', 0)}")
            
            # Check alert structure
            if len(alerts) > 0:
                sample_alert = alerts[0]
                required_fields = ['type', 'severity', 'project_id', 'project_name', 'message']
                missing_fields = [field for field in required_fields if field not in sample_alert]
                
                if missing_fields:
                    print(f"    ⚠️ Missing alert fields: {missing_fields}")
                else:
                    print(f"    ✅ Alert structure is valid")
                    print(f"    📋 Sample Alert: {sample_alert.get('message', 'Unknown')}")
            
            return response
        else:
            print(f"    ❌ Failed to get budget alerts")
            return None

    def test_cost_estimates(self):
        """Test cost estimates endpoint with different parameters"""
        print("\n" + "="*60)
        print("TESTING COST ESTIMATES ENDPOINT")
        print("="*60)
        
        # Test with different project types and parameters
        test_cases = [
            {"project_type": "software_development", "team_size": 5, "duration_months": 6},
            {"project_type": "marketing_campaign", "team_size": 3, "duration_months": 3},
            {"project_type": "product_launch", "team_size": 8, "duration_months": 4}
        ]
        
        all_success = True
        
        for i, params in enumerate(test_cases):
            query_params = "&".join([f"{k}={v}" for k, v in params.items()])
            
            success, response = self.run_test(
                f"Cost Estimate Test Case {i+1}",
                "GET",
                f"/api/cost-analytics/cost-estimates?{query_params}",
                200
            )
            
            if success and isinstance(response, dict):
                estimates = response.get('estimates', [])
                benchmarks = response.get('benchmarks', {})
                
                print(f"    📊 Test Case {i+1} - {params['project_type']}")
                print(f"    👥 Team Size: {params['team_size']}, Duration: {params['duration_months']} months")
                print(f"    💰 Estimates Generated: {len(estimates)}")
                
                if len(estimates) > 0:
                    for estimate in estimates:
                        method = estimate.get('method', 'Unknown')
                        cost = estimate.get('total_cost', 0)
                        confidence = estimate.get('confidence', 0)
                        print(f"      - {method}: ${cost:,.2f} ({confidence}% confidence)")
                
                # Check required fields
                required_fields = ['estimates', 'benchmarks', 'recommendations', 'parameters_used']
                missing_fields = [field for field in required_fields if field not in response]
                
                if missing_fields:
                    print(f"    ⚠️ Missing fields in test case {i+1}: {missing_fields}")
                    all_success = False
            else:
                print(f"    ❌ Test case {i+1} failed")
                all_success = False
        
        return all_success

    def test_detailed_cost_breakdown(self):
        """Test detailed cost breakdown for a specific project"""
        print("\n" + "="*60)
        print("TESTING DETAILED COST BREAKDOWN")
        print("="*60)
        
        if not self.test_project_id:
            print("    ❌ No test project ID available")
            return False
            
        success, response = self.run_test(
            "Get Detailed Cost Breakdown",
            "GET",
            f"/api/cost-analytics/detailed-breakdown/{self.test_project_id}",
            200
        )
        
        if success and isinstance(response, dict):
            budget_summary = response.get('budget_summary', {})
            cost_breakdown = response.get('cost_breakdown', {})
            insights = response.get('insights', {})
            
            print(f"    📊 Project: {response.get('project_name', 'Unknown')}")
            print(f"    💰 Total Budget: ${budget_summary.get('total_budget', 0):,.2f}")
            print(f"    💸 Spent Amount: ${budget_summary.get('spent_amount', 0):,.2f}")
            print(f"    📈 Budget Utilization: {budget_summary.get('budget_utilization', 0):.1f}%")
            
            # Check cost breakdown categories
            by_category = cost_breakdown.get('by_category', {})
            print(f"    📋 Cost Categories: {list(by_category.keys())}")
            
            # Check task breakdown
            by_task = cost_breakdown.get('by_task', [])
            print(f"    📋 Task Breakdown: {len(by_task)} tasks")
            
            # Check team breakdown
            by_team = cost_breakdown.get('by_team_member', [])
            print(f"    👥 Team Breakdown: {len(by_team)} members")
            
            # Validate required fields
            required_fields = ['project_id', 'project_name', 'budget_summary', 'cost_breakdown', 'insights']
            missing_fields = [field for field in required_fields if field not in response]
            
            if missing_fields:
                print(f"    ⚠️ Missing fields: {missing_fields}")
                return False
            else:
                print(f"    ✅ All required fields present")
                return True
        else:
            print(f"    ❌ Failed to get detailed cost breakdown")
            return False

    def test_cost_analytics_integration(self):
        """Test integration between different cost analytics endpoints"""
        print("\n" + "="*60)
        print("TESTING COST ANALYTICS INTEGRATION")
        print("="*60)
        
        # Test that portfolio summary and budget alerts are consistent
        if not self.cost_data:
            print("    ❌ No portfolio cost data available")
            return False
        
        # Get budget alerts
        success, alerts_response = self.run_test(
            "Get Budget Alerts for Integration Test",
            "GET",
            "/api/cost-analytics/budget-alerts",
            200
        )
        
        if success and isinstance(alerts_response, dict):
            portfolio_alerts = self.cost_data.get('alerts', {})
            api_alerts = alerts_response.get('summary', {})
            
            # Compare alert counts
            portfolio_over_budget = portfolio_alerts.get('projects_over_budget', 0)
            portfolio_high_risk = portfolio_alerts.get('high_risk_projects', 0)
            
            api_critical = api_alerts.get('critical_count', 0)
            api_warning = api_alerts.get('warning_count', 0)
            
            print(f"    📊 Portfolio Over Budget: {portfolio_over_budget}")
            print(f"    📊 Portfolio High Risk: {portfolio_high_risk}")
            print(f"    🚨 API Critical Alerts: {api_critical}")
            print(f"    ⚠️ API Warning Alerts: {api_warning}")
            
            # Check consistency (over budget should correlate with critical alerts)
            consistency_check = (portfolio_over_budget == api_critical or 
                               abs(portfolio_over_budget - api_critical) <= 1)  # Allow small variance
            
            if consistency_check:
                print(f"    ✅ Alert data is consistent between endpoints")
                return True
            else:
                print(f"    ⚠️ Alert data inconsistency detected")
                return False
        else:
            print(f"    ❌ Failed to get alerts for integration test")
            return False

    def test_auth_token_validity(self):
        """Test if auth token is working properly"""
        print("\n" + "="*60)
        print("TESTING AUTH TOKEN VALIDITY")
        print("="*60)
        
        # Test /me endpoint to verify token
        success, response = self.run_test(
            "Get Current User Profile",
            "GET",
            "/api/auth/me",
            200
        )
        
        if success and 'id' in response:
            print(f"    ✅ Auth token is valid")
            print(f"    👤 User ID: {response.get('id')}")
            print(f"    👤 Email: {response.get('email')}")
            print(f"    👤 Organization: {response.get('organization_id')}")
            return True
        else:
            print(f"    ❌ Auth token validation failed")
            return False

    def test_cost_analytics_performance(self):
        """Test performance and response times of cost analytics endpoints"""
        print("\n" + "="*60)
        print("TESTING COST ANALYTICS PERFORMANCE")
        print("="*60)
        
        endpoints = [
            ("/api/cost-analytics/portfolio-summary", "Portfolio Summary"),
            ("/api/cost-analytics/budget-alerts", "Budget Alerts"),
            ("/api/cost-analytics/cost-estimates?project_type=software_development&team_size=5&duration_months=6", "Cost Estimates")
        ]
        
        all_success = True
        
        for endpoint, name in endpoints:
            start_time = time.time()
            
            success, response = self.run_test(
                f"Performance Test - {name}",
                "GET",
                endpoint,
                200
            )
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            if success:
                print(f"    ⏱️ {name} Response Time: {response_time:.2f}ms")
                if response_time > 5000:  # 5 seconds threshold
                    print(f"    ⚠️ Slow response time for {name}")
                    all_success = False
                else:
                    print(f"    ✅ Good response time for {name}")
            else:
                print(f"    ❌ Performance test failed for {name}")
                all_success = False
        
        return all_success

    def test_generate_demo_data(self):
        """Test generate demo data functionality to ensure cost data exists"""
        print("\n" + "="*60)
        print("TESTING GENERATE DEMO DATA FUNCTIONALITY")
        print("="*60)
        
        success, response = self.run_test(
            "Generate Demo Data",
            "POST",
            "/api/system/generate-demo-data",
            200
        )
        
        if success and response.get('success'):
            print(f"    ✅ Demo data generation successful")
            details = response.get('details', {})
            print(f"    📊 Total data points: {details.get('total_data_points', 0)}")
            print(f"    👥 Users created: {details.get('users_created', 0)}")
            print(f"    👨‍👩‍👧‍👦 Teams created: {details.get('teams_created', 0)}")
            print(f"    📁 Projects created: {details.get('projects_created', 0)}")
            print(f"    ✅ Tasks created: {details.get('tasks_created', 0)}")
            
            # Wait a moment for data to be available
            time.sleep(2)
            return True
        else:
            print(f"    ❌ Demo data generation failed")
            return False

    def test_cost_data_validation(self):
        """Test cost data validation and edge cases"""
        print("\n" + "="*60)
        print("TESTING COST DATA VALIDATION")
        print("="*60)
        
        # Test cost estimates with edge case parameters
        edge_cases = [
            {"project_type": "invalid_type", "team_size": 1, "duration_months": 1},
            {"project_type": "software_development", "team_size": 100, "duration_months": 24},
            {"project_type": "software_development", "team_size": 0, "duration_months": 0}
        ]
        
        all_success = True
        
        for i, params in enumerate(edge_cases):
            query_params = "&".join([f"{k}={v}" for k, v in params.items()])
            
            success, response = self.run_test(
                f"Edge Case Test {i+1}",
                "GET",
                f"/api/cost-analytics/cost-estimates?{query_params}",
                200  # Should handle gracefully
            )
            
            if success:
                estimates = response.get('estimates', [])
                print(f"    📊 Edge Case {i+1}: Generated {len(estimates)} estimates")
                
                # Check if estimates are reasonable
                if len(estimates) > 0:
                    for estimate in estimates:
                        cost = estimate.get('total_cost', 0)
                        if cost < 0 or cost > 10000000:  # Unreasonable cost
                            print(f"    ⚠️ Unreasonable cost estimate: ${cost:,.2f}")
                            all_success = False
            else:
                print(f"    ❌ Edge case {i+1} failed")
                all_success = False
        
        return all_success

    def run_all_tests(self):
        """Run all cost analytics API tests"""
        print("🚀 Starting Cost Analytics Functionality Testing")
        print("="*80)
        
        # Test authentication
        if not self.test_login():
            print("❌ Authentication failed, stopping tests")
            return False
            
        # Test auth token validity
        if not self.test_auth_token_validity():
            print("❌ Auth token validation failed, stopping tests")
            return False
            
        # Generate demo data first to ensure we have cost data
        demo_data_success = self.test_generate_demo_data()
        if not demo_data_success:
            print("⚠️ Demo data generation failed, continuing with existing data")
        
        # Test portfolio cost summary - CORE FUNCTIONALITY
        portfolio_success = self.test_portfolio_cost_summary()
        
        # Test budget alerts - KEY FUNCTIONALITY
        alerts_success = self.test_budget_alerts() is not None
        
        # Test cost estimates - KEY FUNCTIONALITY
        estimates_success = self.test_cost_estimates()
        
        # Test detailed cost breakdown (if we have a project)
        breakdown_success = self.test_detailed_cost_breakdown() if self.test_project_id else True
        
        # Test cost analytics integration
        integration_success = self.test_cost_analytics_integration()
        
        # Test performance
        performance_success = self.test_cost_analytics_performance()
        
        # Test data validation
        validation_success = self.test_cost_data_validation()
        
        # Calculate overall success
        key_tests = [portfolio_success, alerts_success, estimates_success, breakdown_success, integration_success]
        key_tests_passed = sum(key_tests)
        overall_success = key_tests_passed >= 4  # At least 4 out of 5 key tests must pass
        
        # Print summary
        print("\n" + "="*80)
        print("COST ANALYTICS FUNCTIONALITY TEST SUMMARY")
        print("="*80)
        print(f"Tests run: {self.tests_run}")
        print(f"Tests passed: {self.tests_passed}")
        print(f"Success rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        print(f"\n🎯 KEY FUNCTIONALITY TESTS:")
        print(f"  Portfolio Cost Summary: {'✅' if portfolio_success else '❌'}")
        print(f"  Budget Alerts: {'✅' if alerts_success else '❌'}")
        print(f"  Cost Estimates: {'✅' if estimates_success else '❌'}")
        print(f"  Detailed Breakdown: {'✅' if breakdown_success else '❌'}")
        print(f"  Integration Tests: {'✅' if integration_success else '❌'}")
        print(f"  Performance Tests: {'✅' if performance_success else '❌'}")
        print(f"  Data Validation: {'✅' if validation_success else '❌'}")
        print(f"  Demo Data Generation: {'✅' if demo_data_success else '❌'}")
        
        if overall_success:
            print("\n🎉 Cost Analytics functionality is working!")
            print("✅ Portfolio cost summary should display correctly")
            print("✅ Budget alerts should show relevant warnings")
            print("✅ Cost estimator should generate accurate estimates")
            print("✅ Sidebar integration should work properly")
        else:
            print("\n❌ Cost Analytics has issues")
            print("🐛 Cost sidebar may not load properly")
            print("🐛 Budget calculations may be incorrect")
            print("🐛 API endpoints may be failing")
        
        return overall_success

def main():
    """Main test execution"""
    tester = CostAnalyticsTester()
    
    try:
        success = tester.run_all_tests()
        
        # Save test results
        with open('/app/test_reports/backend_cost_analytics_test_results.json', 'w') as f:
            json.dump({
                'timestamp': datetime.utcnow().isoformat(),
                'success': success,
                'tests_run': tester.tests_run,
                'tests_passed': tester.tests_passed,
                'results': tester.test_results,
                'project_id': tester.test_project_id,
                'cost_data_available': tester.cost_data is not None,
                'functionality_status': 'WORKING' if success else 'ISSUES_FOUND'
            }, f, indent=2)
        
        return 0 if success else 1
        
    except Exception as e:
        print(f"❌ Test execution failed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())