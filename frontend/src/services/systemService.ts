import { getApiUrl } from '../utils/environment'

class SystemService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  async generateDemoData(): Promise<{
    success: boolean
    message: string
    details?: any
  }> {
    try {
      const response = await fetch(`${getApiUrl()}/api/system/generate-demo-data`, {
        method: 'POST',
        headers: this.getAuthHeaders()
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Error generating demo data:', error)
      throw error
    }
  }

  async getSystemHealth(): Promise<{
    status: string
    message: string
    database: string
    user_count: number
  }> {
    try {
      const response = await fetch(`${getBackendUrl()}/api/system/health`, {
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
      const response = await fetch(`${getBackendUrl()}/api/system/clear-demo-data`, {
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