/**
 * Environment configuration utility for handling dynamic API URLs
 * across different emergentagent.com subdomains
 */

import { getApiUrl, getEnvironmentInfo, isLocalEnvironment } from './environment';

// Configuration object with dynamic API URL getter
export const config = {
  get apiUrl() {
    return getApiUrl();
  },
  appName: import.meta.env.REACT_APP_NAME || 'Enterprise Portfolio Management',
  appVersion: import.meta.env.REACT_APP_VERSION || '1.0.0',
  isDevelopment: import.meta.env.NODE_ENV === 'development',
  isProduction: import.meta.env.NODE_ENV === 'production',
  isLocal: isLocalEnvironment(),
};

// Export dynamic API URL getters instead of static values
export const getApiUrlDynamic = () => getApiUrl();
export const getApiUrl_DEPRECATED = getApiUrl; // Use API_ENDPOINTS instead
export const BACKEND_URL = getApiUrl(); // Alias for compatibility

// DEPRECATED: Use API_ENDPOINTS instead of API_URL
// This ensures HTTPS enforcement and consistent configuration
export const get API_URL() {
  console.warn('⚠️ API_URL is deprecated. Use API_ENDPOINTS for proper HTTPS enforcement.');
  return getApiUrl();
};  
export const APP_NAME = config.appName;
export const APP_VERSION = config.appVersion;

// Demo credentials for easy access
export const DEMO_CREDENTIALS = {
  email: 'demo@company.com',
  password: 'demo123456'
};

// API endpoints - now using dynamic API URL generation
export const API_ENDPOINTS = {
  auth: {
    get login() { return `${getApiUrl()}/api/auth/login`; },
    get register() { return `${getApiUrl()}/api/auth/register`; },
    get me() { return `${getApiUrl()}/api/auth/me`; },
    get logout() { return `${getApiUrl()}/api/auth/logout`; },
  },
  organizations: {
    get list() { return `${getApiUrl()}/api/organizations`; },
    get create() { return `${getApiUrl()}/api/organizations`; },
    details: (id: string) => `${getApiUrl()}/api/organizations/${id}`,
  },
  teams: {
    get list() { return `${getApiUrl()}/api/teams`; },
    get create() { return `${getApiUrl()}/api/teams`; },
    details: (id: string) => `${getApiUrl()}/api/teams/${id}`,
  },
  users: {
    get list() { return `${getApiUrl()}/api/users`; },
    details: (id: string) => `${getApiUrl()}/api/users/${id}`,
  },
  projects: {
    get list() { return `${getApiUrl()}/api/projects`; },
    get create() { return `${getApiUrl()}/api/projects`; },
    details: (id: string) => `${getApiUrl()}/api/projects/${id}`,
  },
  tasks: {
    get list() { return `${getApiUrl()}/api/tasks`; },
    get create() { return `${getApiUrl()}/api/tasks`; },
    details: (id: string) => `${getApiUrl()}/api/tasks/${id}`,
  },
  timeline: {
    gantt: (projectId: string) => `${getApiUrl()}/api/timeline/gantt/${projectId}`,
    tasks: (projectId: string) => `${getApiUrl()}/api/timeline/tasks/${projectId}`,
    taskUpdate: (taskId: string) => `${getApiUrl()}/api/timeline/tasks/${taskId}`,
    taskCreate: () => `${getApiUrl()}/api/timeline/tasks`,
    dependencies: (projectId: string) => `${getApiUrl()}/api/timeline/dependencies/${projectId}`,
    dependencyCreate: () => `${getApiUrl()}/api/timeline/dependencies`,
    dependencyUpdate: (dependencyId: string) => `${getApiUrl()}/api/timeline/dependencies/${dependencyId}`,
    dependencyDelete: (dependencyId: string) => `${getApiUrl()}/api/timeline/dependencies/${dependencyId}`,
    project: (projectId: string) => `${getApiUrl()}/api/timeline/project/${projectId}`,
    stats: (projectId: string) => `${getApiUrl()}/api/timeline/stats/${projectId}`,
  },
  analytics: {
    get dashboard() { return `${getApiUrl()}/api/analytics/dashboard`; },
    get projects() { return `${getApiUrl()}/api/analytics/projects`; },
    get tasks() { return `${getApiUrl()}/api/analytics/tasks`; },
    get teams() { return `${getApiUrl()}/api/analytics/teams`; },
  },
  comments: {
    get list() { return `${getApiUrl()}/api/comments/`; },
    get create() { return `${getApiUrl()}/api/comments/`; },
    details: (id: string) => `${getApiUrl()}/api/comments/${id}`,
    reactions: (id: string) => `${getApiUrl()}/api/comments/${id}/reactions`,
    resolve: (id: string) => `${getApiUrl()}/api/comments/${id}/resolve`,
    threads: (entityType: string, entityId: string) => `${getApiUrl()}/api/comments/threads/${entityType}/${entityId}`,
    stats: (entityType: string, entityId: string) => `${getApiUrl()}/api/comments/stats/${entityType}/${entityId}`,
  },
  security: {
    get dashboard() { return `${getApiUrl()}/api/security/dashboard/metrics`; },
    get threats() { return `${getApiUrl()}/api/security/threats/active`; },
    get compliance() { return `${getApiUrl()}/api/security/compliance/reports`; },
    get mfa() { return `${getApiUrl()}/api/security/mfa/status`; },
    get health() { return `${getApiUrl()}/api/security/health`; },
  },
  hierarchy: {
    organization: (orgId: string) => `${getApiUrl()}/api/hierarchy/organization/${orgId}`,
    teamStructure: (orgId: string) => `${getApiUrl()}/api/hierarchy/team-structure/${orgId}`,
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