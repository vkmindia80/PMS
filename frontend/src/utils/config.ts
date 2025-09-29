/**
 * Environment configuration utility for handling dynamic API URLs
 * across different emergentagent.com subdomains
 */

import { getApiUrl, getEnvironmentInfo, isLocalEnvironment } from './environment';

// Configuration object
export const config = {
  apiUrl: getApiUrl(),
  appName: import.meta.env.REACT_APP_NAME || 'Enterprise Portfolio Management',
  appVersion: import.meta.env.REACT_APP_VERSION || '1.0.0',
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isProduction: import.meta.env.NODE_ENV === 'production',
  isLocal: isLocalEnvironment(),
};

// Export individual values for convenience
export const API_URL = config.apiUrl;
export const BACKEND_URL = config.apiUrl; // Alias for compatibility
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
    list: `${API_URL}/api/organizations/`,
    create: `${API_URL}/api/organizations/`,
    details: (id: string) => `${API_URL}/api/organizations/${id}`,
  },
  teams: {
    list: `${API_URL}/api/teams/`,
    create: `${API_URL}/api/teams/`,
    details: (id: string) => `${API_URL}/api/teams/${id}`,
  },
  users: {
    list: `${API_URL}/api/users/`,
    details: (id: string) => `${API_URL}/api/users/${id}`,
  },
  projects: {
    list: `${API_URL}/api/projects/`,
    create: `${API_URL}/api/projects/`,
    details: (id: string) => `${API_URL}/api/projects/${id}`,
  },
  tasks: {
    list: `${API_URL}/api/tasks/`,
    create: `${API_URL}/api/tasks/`,
    details: (id: string) => `${API_URL}/api/tasks/${id}`,
  },
  analytics: {
    dashboard: `${API_URL}/api/analytics/dashboard`,
    projects: `${API_URL}/api/analytics/projects`,
    tasks: `${API_URL}/api/analytics/tasks`,
    teams: `${API_URL}/api/analytics/teams`,
  },
  security: {
    dashboard: `${API_URL}/api/security/dashboard/metrics`,
    threats: `${API_URL}/api/security/threats/active`,
    compliance: `${API_URL}/api/security/compliance/reports`,
    mfa: `${API_URL}/api/security/mfa/status`,
    health: `${API_URL}/api/security/health`,
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
    environment: getEnvironmentInfo(),
  });
}

export default config;