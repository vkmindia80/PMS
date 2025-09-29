#!/usr/bin/env node

// Simple test script to verify frontend API configuration
const API_BASE = 'http://localhost:8001';

async function testAPI() {
  try {
    // Login first
    console.log('🔐 Testing authentication...');
    const loginResponse = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@company.com', password: 'demo123456' })
    });

    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status}`);
    }

    const loginData = await loginResponse.json();
    const token = loginData.tokens.access_token;
    console.log('✅ Authentication successful');

    // Test all main endpoints
    const endpoints = [
      { name: 'Projects', url: `${API_BASE}/api/projects/` },
      { name: 'Tasks', url: `${API_BASE}/api/tasks/` },
      { name: 'Teams', url: `${API_BASE}/api/teams/` },
      { name: 'Users', url: `${API_BASE}/api/users/` },
      { name: 'Auth Profile', url: `${API_BASE}/api/auth/me` },
    ];

    console.log('🔍 Testing main API endpoints...');
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const data = await response.json();
          const count = Array.isArray(data) ? data.length : 'N/A';
          console.log(`✅ ${endpoint.name}: ${response.status} (${count} items)`);
        } else {
          console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint.name}: ${err.message}`);
      }
    }

    // Test analytics endpoints
    console.log('📊 Testing analytics endpoints...');
    const analyticsEndpoints = [
      { name: 'Security Dashboard', url: `${API_BASE}/api/security/dashboard/metrics` },
      { name: 'Security Health', url: `${API_BASE}/api/security/health` },
    ];

    for (const endpoint of analyticsEndpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          console.log(`✅ ${endpoint.name}: ${response.status}`);
        } else {
          console.log(`❌ ${endpoint.name}: ${response.status} ${response.statusText}`);
        }
      } catch (err) {
        console.log(`❌ ${endpoint.name}: ${err.message}`);
      }
    }

    console.log('\n🎉 API test complete!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAPI();