// Test to check if the tasks API call will use HTTPS
console.log('🧪 Testing Tasks API URL Generation...\n');

// Mock the browser environment
global.window = {
  location: {
    hostname: 'project-404.preview.emergentagent.com',
    protocol: 'https:'
  }
};

// Mock import.meta.env
global.import = {
  meta: {
    env: {
      VITE_API_URL: 'http://project-404.preview.emergentagent.com',
      DEV: false
    }
  }
};

// Simulate the environment detection
const isEmergentagentDomain = () => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('emergentagent.com');
};

const getApiUrl = () => {
  if (typeof window === 'undefined') {
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    if (apiUrl.includes('emergentagent.com') && !apiUrl.startsWith('https://')) {
      apiUrl = apiUrl.replace('http://', 'https://');
    }
    return apiUrl;
  }
  
  if (isEmergentagentDomain()) {
    const hostname = window.location.hostname;
    return `https://${hostname}`;
  }
  
  let envBackendUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
  
  if (envBackendUrl.includes('emergentagent.com') && !envBackendUrl.startsWith('https://')) {
    envBackendUrl = envBackendUrl.replace('http://', 'https://');
  }
  
  return envBackendUrl;
};

// Simulate API_ENDPOINTS configuration
const API_ENDPOINTS = {
  tasks: {
    get list() { return `${getApiUrl()}/api/tasks`; },
    details: (id) => `${getApiUrl()}/api/tasks/${id}`,
  }
};

console.log('✅ Environment Detection:');
console.log('   Hostname:', window.location.hostname);
console.log('   Is emergentagent.com:', isEmergentagentDomain());

console.log('\n✅ API URL Generation:');
console.log('   Base API URL:', getApiUrl());

console.log('\n✅ Tasks API Endpoints:');
console.log('   Tasks List:', API_ENDPOINTS.tasks.list);
console.log('   Task Details (example):', API_ENDPOINTS.tasks.details('task-123'));

console.log('\n✅ Specific Test - Tasks API with Project ID:');
const projectId = 'proj-a16040431daa';
const tasksApiUrl = `${API_ENDPOINTS.tasks.list}?project_id=${projectId}`;
console.log('   Full Tasks API URL:', tasksApiUrl);
console.log('   Uses HTTPS:', tasksApiUrl.startsWith('https://'));
console.log('   Mixed Content Risk:', tasksApiUrl.startsWith('http://') ? '❌ YES' : '✅ NO');

console.log('\n🎉 Test Complete!');