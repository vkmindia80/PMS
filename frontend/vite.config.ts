import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      'enterprise-roadmap.preview.emergentagent.com',
      'next-dev-steps.preview.emergentagent.com',
      '.preview.emergentagent.com', // Allow all subdomains
      '.emergentagent.com' // Allow all emergentagent.com subdomains
    ],
    proxy: {
      '/api': {
        target: (() => {
          let targetUrl = process.env.VITE_API_URL || 'http://localhost:8001';
          // Force HTTPS for emergentagent.com domains to prevent mixed content errors
          if (targetUrl.includes('emergentagent.com') && !targetUrl.startsWith('https://')) {
            targetUrl = targetUrl.replace('http://', 'https://');
          }
          return targetUrl;
        })(),
        changeOrigin: true,
        secure: false, // Allow self-signed certificates in development
        rewrite: (path) => path,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.log('Proxy error:', err);
          });
          proxy.on('proxyReq', (proxyReq, req) => {
            console.log(`Proxying ${req.method} ${req.url} to ${proxyReq.getHeader('host')}`);
          });
        }
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  define: {
    global: 'globalThis',
    'process.env': JSON.stringify({
      NODE_ENV: process.env.NODE_ENV || 'development',
      // Always use HTTPS for emergentagent.com domains to prevent mixed content errors
      REACT_APP_BACKEND_URL: process.env.REACT_APP_BACKEND_URL || process.env.VITE_API_URL || 'http://localhost:8001',
    }),
    // Inject environment-specific API URL - ensure HTTPS for emergentagent.com
    __API_URL__: JSON.stringify(
      process.env.NODE_ENV === 'production' 
        ? process.env.VITE_PROD_API_URL || (
            process.env.VITE_API_URL?.includes('emergentagent.com') 
              ? process.env.VITE_API_URL.replace('http:', 'https:')
              : process.env.VITE_API_URL || 'https://project-viewer-12.preview.emergentagent.com'
          )
        : process.env.VITE_API_URL || 'http://localhost:8001'
    ),
  },
})