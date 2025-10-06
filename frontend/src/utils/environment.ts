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
    let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8001';
    // Force HTTPS for emergentagent.com domains even in SSR
    if (apiUrl.includes('emergentagent.com') && !apiUrl.startsWith('https://')) {
      apiUrl = apiUrl.replace('http://', 'https://');
    }
    return apiUrl;
  }
  
  // For Emergent platform (emergentagent.com), use same domain but with correct protocol
  if (isEmergentagentDomain()) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Use same protocol as frontend to avoid mixed content errors
    return `${protocol}//${hostname}`;
  }
  
  // For local development, use configured URL or localhost
  let envBackendUrl = import.meta.env.VITE_API_URL || 
                      import.meta.env.REACT_APP_BACKEND_URL || 
                      'http://localhost:8001';
  
  // Double-check: if we have an emergentagent.com URL but not HTTPS, force it
  if (envBackendUrl.includes('emergentagent.com') && !envBackendUrl.startsWith('https://')) {
    envBackendUrl = envBackendUrl.replace('http://', 'https://');
  }
  
  return envBackendUrl;
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

// Log environment info in development and when debugging issues
if (import.meta.env.DEV || typeof window !== 'undefined' && window.location.hostname.includes('emergentagent.com')) {
  console.log('🌍 Environment Info:', getEnvironmentInfo());
  console.log('🔗 API URL being used:', getApiUrl());
}

export default {
  isEmergentagentDomain,
  isPreviewEnvironment,
  isLocalEnvironment,
  getCurrentSubdomain,
  getApiUrl,
  getEnvironmentInfo,
};