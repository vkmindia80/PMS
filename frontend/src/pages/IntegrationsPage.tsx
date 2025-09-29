/**
 * Advanced Integrations Page - Phase 4.1
 * Microsoft Teams, Slack, GitHub, Google Workspace integration management
 */
import React, { useState, useEffect } from 'react'
import { 
  MessageSquare, 
  Github, 
  Calendar, 
  Mail, 
  Slack, 
  CheckCircle, 
  AlertCircle, 
  Settings,
  Plus,
  Trash2,
  RefreshCw,
  ExternalLink,
  Zap,
  Users,
  FileText,
  Video
} from 'lucide-react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || import.meta.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

interface Integration {
  type: string
  name: string
  description: string
  features: string[]
  setup_required: string[]
  status?: 'active' | 'inactive' | 'error'
  last_updated?: Date
}

interface IntegrationConfig {
  success: boolean
  integration_type: string
  data?: any
  error?: string
  timestamp: string
}

const IntegrationsPage: React.FC = () => {
  const [availableIntegrations, setAvailableIntegrations] = useState<Record<string, Integration>>({})
  const [activeIntegrations, setActiveIntegrations] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [setupModal, setSetupModal] = useState<{ type: string, integration: Integration } | null>(null)
  const [testResults, setTestResults] = useState<Record<string, any>>({})

  // Form states for different integrations
  const [slackConfig, setSlackConfig] = useState({
    workspace_url: '',
    default_channel: 'general',
    notifications_enabled: true
  })

  const [teamsConfig, setTeamsConfig] = useState({
    tenant_id: '',
    default_team: '',
    webhook_url: ''
  })

  const [githubConfig, setGithubConfig] = useState({
    organization: '',
    repositories: [] as string[],
    auto_sync: true
  })

  const [googleConfig, setGoogleConfig] = useState({
    domain: '',
    calendar_sync: true,
    drive_sync: true,
    gmail_sync: false
  })

  useEffect(() => {
    loadIntegrations()
  }, [])

  const getAuthHeaders = () => {
    const authTokens = localStorage.getItem('auth_tokens')
    let token = null
    
    if (authTokens) {
      try {
        const parsedTokens = JSON.parse(authTokens)
        token = parsedTokens.access_token
      } catch (error) {
        console.error('Failed to parse auth tokens:', error)
      }
    }
    
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  const loadIntegrations = async () => {
    try {
      setIsLoading(true)
      
      // Load available integrations
      const availableResponse = await axios.get(
        `${API_BASE_URL}/api/integrations/available`,
        { headers: getAuthHeaders() }
      )
      setAvailableIntegrations(availableResponse.data.available_integrations)

      // Load active integrations status
      const statusResponse = await axios.get(
        `${API_BASE_URL}/api/integrations/status`,
        { headers: getAuthHeaders() }
      )
      setActiveIntegrations(statusResponse.data.integrations || {})

    } catch (error) {
      console.error('Failed to load integrations:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const setupIntegration = async (type: string) => {
    try {
      setIsLoading(true)
      let config: any = {}
      let endpoint = ''

      switch (type) {
        case 'slack':
          config = slackConfig
          endpoint = 'slack/setup'
          break
        case 'teams':
          config = teamsConfig
          endpoint = 'teams/setup'
          break
        case 'github':
          config = githubConfig
          endpoint = 'github/setup'
          break
        case 'google_workspace':
          config = googleConfig
          endpoint = 'google-workspace/setup'
          break
        default:
          throw new Error('Unknown integration type')
      }

      const response = await axios.post(
        `${API_BASE_URL}/api/integrations/${endpoint}`,
        config,
        { headers: getAuthHeaders() }
      )

      if (response.data.success) {
        setSetupModal(null)
        await loadIntegrations()
        
        // Show success message
        alert(`${availableIntegrations[type]?.name} integration setup successful!`)
      } else {
        alert(`Setup failed: ${response.data.error}`)
      }

    } catch (error: any) {
      console.error('Integration setup error:', error)
      alert(`Setup failed: ${error.response?.data?.detail || error.message}`)
    } finally {
      setIsLoading(false)
    }
  }

  const testIntegration = async (type: string) => {
    try {
      setIsLoading(true)
      let result: any = {}

      switch (type) {
        case 'slack':
          const slackResult = await axios.post(
            `${API_BASE_URL}/api/integrations/slack/notify`,
            {
              channel: 'general',
              message: 'Test notification from Enterprise Portfolio Management',
              priority: 'normal'
            },
            { headers: getAuthHeaders() }
          )
          result = slackResult.data
          break

        case 'teams':
          const teamsResult = await axios.post(
            `${API_BASE_URL}/api/integrations/teams/adaptive-card`,
            {
              channel_id: 'test-channel',
              message: 'Test adaptive card from Enterprise Portfolio Management',
              card_data: {
                body: [
                  {
                    type: 'TextBlock',
                    text: 'Integration Test Successful! ✅',
                    weight: 'Bolder',
                    color: 'Good'
                  }
                ]
              }
            },
            { headers: getAuthHeaders() }
          )
          result = teamsResult.data
          break

        case 'github':
          const githubResult = await axios.get(
            `${API_BASE_URL}/api/integrations/github/repositories`,
            { headers: getAuthHeaders() }
          )
          result = { success: true, repositories: githubResult.data.repositories }
          break

        case 'google_workspace':
          const googleResult = await axios.post(
            `${API_BASE_URL}/api/integrations/google-workspace/schedule-meeting`,
            {
              title: 'Test Meeting',
              description: 'Integration test meeting',
              start_time: new Date(Date.now() + 3600000).toISOString(),
              end_time: new Date(Date.now() + 7200000).toISOString(),
              attendees: ['test@example.com']
            },
            { headers: getAuthHeaders() }
          )
          result = googleResult.data
          break
      }

      setTestResults({ ...testResults, [type]: result })
      
    } catch (error: any) {
      console.error('Integration test error:', error)
      setTestResults({ 
        ...testResults, 
        [type]: { 
          success: false, 
          error: error.response?.data?.detail || error.message 
        } 
      })
    } finally {
      setIsLoading(false)
    }
  }

  const removeIntegration = async (type: string) => {
    if (!confirm(`Are you sure you want to remove the ${availableIntegrations[type]?.name} integration?`)) {
      return
    }

    try {
      await axios.delete(
        `${API_BASE_URL}/api/integrations/${type}`,
        { headers: getAuthHeaders() }
      )
      
      await loadIntegrations()
      alert('Integration removed successfully')
      
    } catch (error: any) {
      console.error('Remove integration error:', error)
      alert(`Failed to remove integration: ${error.response?.data?.detail || error.message}`)
    }
  }

  const getIntegrationIcon = (type: string) => {
    switch (type) {
      case 'slack':
        return <Slack className="w-8 h-8 text-green-600" />
      case 'teams':
        return <MessageSquare className="w-8 h-8 text-blue-600" />
      case 'github':
        return <Github className="w-8 h-8 text-gray-800" />
      case 'google_workspace':
        return <Calendar className="w-8 h-8 text-orange-600" />
      default:
        return <Settings className="w-8 h-8 text-gray-600" />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return 'text-green-600 bg-green-100'
      case 'inactive':
        return 'text-gray-600 bg-gray-100'
      case 'error':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const renderSetupModal = () => {
    if (!setupModal) return null

    const { type, integration } = setupModal

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Setup {integration.name}</h3>
            <button
              onClick={() => setSetupModal(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            {type === 'slack' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Workspace URL
                  </label>
                  <input
                    type="url"
                    value={slackConfig.workspace_url}
                    onChange={(e) => setSlackConfig({ ...slackConfig, workspace_url: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.slack.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Channel
                  </label>
                  <input
                    type="text"
                    value={slackConfig.default_channel}
                    onChange={(e) => setSlackConfig({ ...slackConfig, default_channel: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="general"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="slack-notifications"
                    checked={slackConfig.notifications_enabled}
                    onChange={(e) => setSlackConfig({ ...slackConfig, notifications_enabled: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="slack-notifications" className="text-sm text-gray-700">
                    Enable notifications
                  </label>
                </div>
              </>
            )}

            {type === 'teams' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tenant ID
                  </label>
                  <input
                    type="text"
                    value={teamsConfig.tenant_id}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, tenant_id: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12345678-1234-1234-1234-123456789012"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Team
                  </label>
                  <input
                    type="text"
                    value={teamsConfig.default_team}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, default_team: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="General"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Webhook URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={teamsConfig.webhook_url}
                    onChange={(e) => setTeamsConfig({ ...teamsConfig, webhook_url: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="https://outlook.office.com/webhook/..."
                  />
                </div>
              </>
            )}

            {type === 'github' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Organization
                  </label>
                  <input
                    type="text"
                    value={githubConfig.organization}
                    onChange={(e) => setGithubConfig({ ...githubConfig, organization: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="mycompany"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Repositories (comma-separated)
                  </label>
                  <input
                    type="text"
                    onChange={(e) => setGithubConfig({ 
                      ...githubConfig, 
                      repositories: e.target.value.split(',').map(r => r.trim()).filter(r => r) 
                    })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="frontend, backend, mobile-app"
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="github-auto-sync"
                    checked={githubConfig.auto_sync}
                    onChange={(e) => setGithubConfig({ ...githubConfig, auto_sync: e.target.checked })}
                    className="mr-2"
                  />
                  <label htmlFor="github-auto-sync" className="text-sm text-gray-700">
                    Enable automatic sync
                  </label>
                </div>
              </>
            )}

            {type === 'google_workspace' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Domain
                  </label>
                  <input
                    type="text"
                    value={googleConfig.domain}
                    onChange={(e) => setGoogleConfig({ ...googleConfig, domain: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="mycompany.com"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="calendar-sync"
                      checked={googleConfig.calendar_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, calendar_sync: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="calendar-sync" className="text-sm text-gray-700">
                      Enable Calendar sync
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="drive-sync"
                      checked={googleConfig.drive_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, drive_sync: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="drive-sync" className="text-sm text-gray-700">
                      Enable Drive sync
                    </label>
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="gmail-sync"
                      checked={googleConfig.gmail_sync}
                      onChange={(e) => setGoogleConfig({ ...googleConfig, gmail_sync: e.target.checked })}
                      className="mr-2"
                    />
                    <label htmlFor="gmail-sync" className="text-sm text-gray-700">
                      Enable Gmail sync
                    </label>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex space-x-3 mt-6">
            <button
              onClick={() => setupIntegration(type)}
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Setting up...' : 'Setup Integration'}
            </button>
            <button
              onClick={() => setSetupModal(null)}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-400"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Integrations</h1>
          <p className="text-gray-600">
            Connect your enterprise tools for seamless workflow automation
          </p>
          <div className="flex items-center mt-4">
            <button
              onClick={loadIntegrations}
              disabled={isLoading}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh Status
            </button>
          </div>
        </div>

        {/* Integration Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.entries(availableIntegrations).map(([type, integration]) => {
            const isActive = activeIntegrations[type]?.status === 'active'
            const testResult = testResults[type]

            return (
              <div key={type} className="bg-white rounded-lg shadow p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center">
                    {getIntegrationIcon(type)}
                    <div className="ml-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {integration.name}
                      </h3>
                      <p className="text-sm text-gray-600">{integration.description}</p>
                    </div>
                  </div>
                  <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                    getStatusColor(activeIntegrations[type]?.status)
                  }`}>
                    {activeIntegrations[type]?.status || 'Not configured'}
                  </div>
                </div>

                {/* Features */}
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Features:</h4>
                  <div className="flex flex-wrap gap-2">
                    {integration.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Test Results */}
                {testResult && (
                  <div className={`mb-4 p-3 rounded-lg ${
                    testResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center">
                      {testResult.success ? (
                        <CheckCircle className="w-4 h-4 text-green-600 mr-2" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                      )}
                      <span className={`text-sm ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {testResult.success ? 'Test successful' : `Test failed: ${testResult.error}`}
                      </span>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex space-x-3">
                  {!isActive ? (
                    <button
                      onClick={() => setSetupModal({ type, integration })}
                      className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Setup
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => testIntegration(type)}
                        disabled={isLoading}
                        className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <Zap className="w-4 h-4 mr-2" />
                        Test
                      </button>
                      <button
                        onClick={() => removeIntegration(type)}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Integration Statistics */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Overview</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {Object.keys(availableIntegrations).length}
              </div>
              <div className="text-sm text-gray-600">Available</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {Object.values(activeIntegrations).filter(i => i.status === 'active').length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {Object.values(testResults).filter(r => r?.success).length}
              </div>
              <div className="text-sm text-gray-600">Tested</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {Object.values(testResults).filter(r => r?.success === false).length}
              </div>
              <div className="text-sm text-gray-600">Failed Tests</div>
            </div>
          </div>
        </div>
      </div>

      {renderSetupModal()}
    </div>
  )
}

export default IntegrationsPage