import { getApiUrl } from '../utils/environment'

class SystemService {
  private getAuthHeaders() {
    // Get auth token from localStorage - use the correct key
    const authTokensStr = localStorage.getItem('auth_tokens');
    if (!authTokensStr) {
      return {
        'Content-Type': 'application/json'
      }
    }
    
    try {
      const authTokens = JSON.parse(authTokensStr);
      return {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authTokens.access_token}`
      }
    } catch (error) {
      console.error('Failed to parse auth tokens:', error);
      return {
        'Content-Type': 'application/json'
      }
    }
  }

  async generateDemoData(): Promise<{
    success: boolean
    message: string
    details?: any
  }> {
    try {
      console.log('🔄 Generating demo data...');
      const apiUrl = `${getApiUrl()}/api/system/generate-demo-data`;
      console.log('📡 API URL:', apiUrl);
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('📨 Response status:', response.status);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Error response:', errorText);
          throw new Error(`HTTP error! status: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        console.log('✅ Demo data generation result:', result);
        return result;
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        if (fetchError.name === 'AbortError') {
          throw new Error('Request timeout - Demo data generation is taking longer than expected. Please try again.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('❌ Error generating demo data:', error);
      throw error;
    }
  }

  async getSystemHealth(): Promise<{
    status: string
    message: string
    database: string
    user_count: number
  }> {
    try {
      const response = await fetch(`${getApiUrl()}/api/system/health`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error checking system health:', error)
      throw error
    }
  }

  async clearDemoData(): Promise<{
    success: boolean
    message: string
    cleared_counts?: Record<string, number>
  }> {
    try {
      const response = await fetch(`${getApiUrl()}/api/system/clear-demo-data`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error clearing demo data:', error)
      throw error
    }
  }
}

export const systemService = new SystemService()
export default SystemService