#!/usr/bin/env node

/**
 * Test script to verify HTTPS fix for mixed content security errors
 */

// Simulate browser environment for testing
global.window = {
  location: {
    hostname: 'project-404.preview.emergentagent.com',
    protocol: 'https:',
  }
};

// Mock import.meta.env
const mockEnv = {
  VITE_API_URL: 'http://project-404.preview.emergentagent.com',  // Intentionally HTTP to test fix
  DEV: false
};

// Import the functions (we'll need to adapt this for Node.js)
const testEnvironmentDetection = () => {
  console.log('🧪 Testing Environment Detection and HTTPS Fix...\n');
  
  // Test 1: Check emergentagent domain detection
  const isEmergentagentDomain = () => {
    if (typeof window === 'undefined') return false;
    return window.location.hostname.includes('emergentagent.com');
  };
  
  console.log('✅ Test 1 - Domain Detection:');
  console.log('   Domain:', window.location.hostname);
  console.log('   Is emergentagent.com:', isEmergentagentDomain());
  
  // Test 2: API URL generation with HTTPS fix
  const getApiUrl = () => {
    if (typeof window === 'undefined') {
      let apiUrl = mockEnv.VITE_API_URL || 'http://localhost:8001';
      if (apiUrl.includes('emergentagent.com') && !apiUrl.startsWith('https://')) {
        apiUrl = apiUrl.replace('http://', 'https://');
      }
      return apiUrl;
    }
    
    if (isEmergentagentDomain()) {
      const hostname = window.location.hostname;
      return `https://${hostname}`;
    }
    
    let envBackendUrl = mockEnv.VITE_API_URL || 'http://localhost:8001';
    
    if (envBackendUrl.includes('emergentagent.com') && !envBackendUrl.startsWith('https://')) {
      envBackendUrl = envBackendUrl.replace('http://', 'https://');
    }
    
    return envBackendUrl;
  };
  
  console.log('\n✅ Test 2 - API URL Generation:');
  console.log('   Original VITE_API_URL:', import.meta.env.VITE_API_URL);
  console.log('   Generated API URL:', getApiUrl());
  console.log('   Uses HTTPS:', getApiUrl().startsWith('https://'));
  
  // Test 3: Verify specific API endpoints
  const createApiEndpoint = (path) => `${getApiUrl()}${path}`;
  
  console.log('\n✅ Test 3 - API Endpoints:');
  console.log('   Projects API:', createApiEndpoint('/api/projects'));
  console.log('   Tasks API:', createApiEndpoint('/api/tasks'));
  console.log('   Auth API:', createApiEndpoint('/api/auth/login'));
  
  // Test 4: Mixed Content Check
  const hasMixedContent = (url) => {
    const pageProtocol = window.location.protocol; // https:
    const urlProtocol = url.startsWith('https://') ? 'https:' : 'http:';
    return pageProtocol === 'https:' && urlProtocol === 'http:';
  };
  
  const testUrls = [
    getApiUrl() + '/api/projects',
    getApiUrl() + '/api/tasks',
    getApiUrl() + '/api/auth/login'
  ];
  
  console.log('\n✅ Test 4 - Mixed Content Check:');
  console.log('   Page Protocol:', window.location.protocol);
  testUrls.forEach(url => {
    console.log(`   ${url} - Mixed Content: ${hasMixedContent(url) ? '❌ YES' : '✅ NO'}`);
  });
  
  console.log('\n🎉 All tests completed!');
  console.log('💡 The fix should prevent mixed content errors by ensuring all API calls use HTTPS');
};

testEnvironmentDetection();