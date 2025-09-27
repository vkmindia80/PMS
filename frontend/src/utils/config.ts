/**
 * Environment configuration utility for handling dynamic API URLs
 * across different emergentagent.com subdomains
 */

// Get the current hostname to determine the API URL
const getApiUrl = (): string => {
  // If we're on a preview.emergentagent.com subdomain, use HTTPS with same subdomain
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    
    // Check if we're on emergentagent.com subdomain
    if (hostname.includes('emergentagent.com')) {
      // Use the same subdomain but ensure it's the API endpoint
      const protocol = window.location.protocol;
      return `${protocol}//${hostname}`;
    }
    
    // Check if we're on localhost
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return import.meta.env.VITE_LOCAL_API_URL || 'http://localhost:8001';
    }
  }
  
  // Fallback to environment variable
  return import.meta.env.VITE_BACKEND_API_URL || 
         import.meta.env.REACT_APP_BACKEND_URL || 
         'http://localhost:8001';
};

// Configuration object
export const config = {
  apiUrl: getApiUrl(),
  appName: import.meta.env.REACT_APP_NAME || 'Enterprise Portfolio Management',
  appVersion: import.meta.env.REACT_APP_VERSION || '1.0.0',
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isProduction: import.meta.env.NODE_ENV === 'production',
};

// Export individual values for convenience
export const API_URL = config.apiUrl;
export const APP_NAME = config.appName;
export const APP_VERSION = config.appVersion;

// Demo credentials for easy access
export const DEMO_CREDENTIALS = {
  email: 'demo@company.com',
  password: 'demo123456'
};

// API endpoints
export const API_ENDPOINTS = {
  auth: {
    login: `${API_URL}/api/auth/login`,
    register: `${API_URL}/api/auth/register`,
    me: `${API_URL}/api/auth/me`,
    logout: `${API_URL}/api/auth/logout`,
  },
  organizations: {
    list: `${API_URL}/api/organizations`,
    create: `${API_URL}/api/organizations`,
    details: (id: string) => `${API_URL}/api/organizations/${id}`,
  },
  teams: {
    list: `${API_URL}/api/teams`,
    create: `${API_URL}/api/teams`,
    details: (id: string) => `${API_URL}/api/teams/${id}`,
  },
  users: {
    list: `${API_URL}/api/users`,
    details: (id: string) => `${API_URL}/api/users/${id}`,
  },
  projects: {
    list: `${API_URL}/api/projects`,
    create: `${API_URL}/api/projects`,
    details: (id: string) => `${API_URL}/api/projects/${id}`,
  },
  hierarchy: {
    organization: (orgId: string) => `${API_URL}/api/hierarchy/organization/${orgId}`,
    teamStructure: (orgId: string) => `${API_URL}/api/hierarchy/team-structure/${orgId}`,
  }
};

// Log configuration for debugging
if (config.isDevelopment) {
  console.log('🔧 Config loaded:', {
    apiUrl: config.apiUrl,
    hostname: typeof window !== 'undefined' ? window.location.hostname : 'server',
    environment: import.meta.env.NODE_ENV,
  });
}

export default config;