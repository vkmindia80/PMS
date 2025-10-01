/**
 * Environment detection and configuration utility
 * Automatically adapts to different emergentagent.com subdomains
 */

// Environment detection functions
export const isEmergentagentDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('emergentagent.com');
};

export const isPreviewEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname.includes('.preview.emergentagent.com');
};

export const isLocalEnvironment = (): boolean => {
  if (typeof window === 'undefined') return false;
  const hostname = window.location.hostname;
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.');
};

export const getCurrentSubdomain = (): string | null => {
  if (typeof window === 'undefined') return null;
  
  const hostname = window.location.hostname;
  
  if (hostname.includes('.preview.emergentagent.com')) {
    return hostname.split('.preview.emergentagent.com')[0];
  }
  
  if (hostname.includes('.emergentagent.com')) {
    return hostname.split('.emergentagent.com')[0];
  }
  
  return null;
};

// Dynamic API URL generation
export const getApiUrl = (): string => {
  // Server-side rendering fallback
  if (typeof window === 'undefined') {
    return import.meta.env.VITE_API_URL || 'http://localhost:8001';
  }
  
  const hostname = window.location.hostname;
  const protocol = window.location.protocol;
  
  // For localhost development, use the configured backend URL directly
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    // Check for environment variables first
    const backendUrl = import.meta.env.VITE_API_URL || 
                      import.meta.env.REACT_APP_BACKEND_URL || 
                      'http://localhost:8001';
    return backendUrl;
  }
  
  // If on emergentagent.com domain, use relative URLs to let proxy handle it
  if (isEmergentagentDomain()) {
    // For preview domains, use the same origin (protocol + hostname)
    // This will be handled by the proxy configuration
    return `${protocol}//${hostname}`;
  }
  
  // Default fallback
  return 'http://localhost:8001';
};

// Environment info for debugging
export const getEnvironmentInfo = () => {
  if (typeof window === 'undefined') {
    return {
      type: 'server',
      hostname: 'server-side',
      apiUrl: getApiUrl(),
    };
  }
  
  return {
    type: isLocalEnvironment() ? 'local' : isPreviewEnvironment() ? 'preview' : 'production',
    hostname: window.location.hostname,
    subdomain: getCurrentSubdomain(),
    apiUrl: getApiUrl(),
    isEmergentagent: isEmergentagentDomain(),
    isPreview: isPreviewEnvironment(),
    isLocal: isLocalEnvironment(),
  };
};

// Log environment info in development
if (import.meta.env.DEV) {
  console.log('🌍 Environment Info:', getEnvironmentInfo());
}

export default {
  isEmergentagentDomain,
  isPreviewEnvironment,
  isLocalEnvironment,
  getCurrentSubdomain,
  getApiUrl,
  getEnvironmentInfo,
};