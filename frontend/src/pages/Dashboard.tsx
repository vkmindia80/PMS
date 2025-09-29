import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Users, BarChart3, Settings as SettingsIcon, Brain } from 'lucide-react'
import ProjectCreateModal from '../components/project/ProjectCreateModal'

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [apiStatus, setApiStatus] = useState<'loading' | 'connected' | 'error'>('loading')
  const [apiData, setApiData] = useState<any>(null)
  const [dbStatus, setDbStatus] = useState<any>(null)
  const [modelsInfo, setModelsInfo] = useState<any>(null)
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [dashboardData, setDashboardData] = useState({
    projects: 0,
    teams: 0,
    tasks: 0
  })

  const fetchDashboardData = async (API_URL: string) => {
    try {
      // Get auth token from localStorage - use the correct key
      const authTokensStr = localStorage.getItem('auth_tokens')
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      }
      
      if (authTokensStr) {
        try {
          const authTokens = JSON.parse(authTokensStr)
          headers['Authorization'] = `Bearer ${authTokens.access_token}`
        } catch (e) {
          console.error('Failed to parse auth tokens:', e)
        }
      }

      // Fetch projects count
      const projectsResponse = await fetch(`${API_URL}/api/projects/`, { headers })
      let projectsCount = 0
      if (projectsResponse.ok) {
        const projectsData = await projectsResponse.json()
        projectsCount = Array.isArray(projectsData) ? projectsData.filter(p => p.status === 'active').length : 0
      }

      // Fetch teams count  
      const teamsResponse = await fetch(`${API_URL}/api/teams/?organization_id=demo-org-001`, { headers })
      let teamsCount = 0
      if (teamsResponse.ok) {
        const teamsData = await teamsResponse.json()
        teamsCount = Array.isArray(teamsData) ? teamsData.reduce((sum, team) => sum + team.member_count, 0) : 0
      }

      // Fetch tasks count
      const tasksResponse = await fetch(`${API_URL}/api/tasks/`, { headers })
      let tasksCount = 0  
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json()
        tasksCount = Array.isArray(tasksData) ? tasksData.filter(t => t.status === 'todo' || t.status === 'in_progress').length : 0
      }

      setDashboardData({
        projects: projectsCount,
        teams: teamsCount,
        tasks: tasksCount
      })
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    }
  }

  useEffect(() => {
    const checkApiConnection = async () => {
      try {
        // Get API URL consistently
        const getApiUrl = () => {
          const isPreview = window.location.hostname.includes('emergentagent.com')
          const isProd = import.meta.env.PROD || isPreview
          
          if (isProd || isPreview) {
            return import.meta.env.VITE_PROD_API_URL || 'https://api-recovery-4.preview.emergentagent.com'
          }
          
          return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
        }
        
        const API_URL = getApiUrl()
        
        // Check API health
        const healthResponse = await fetch(`${API_URL}/api/health`)
        if (healthResponse.ok) {
          const healthData = await healthResponse.json()
          setApiData(healthData)
          setApiStatus('connected')
          
          // If API is connected, get database status
          const dbResponse = await fetch(`${API_URL}/api/database/status`)
          if (dbResponse.ok) {
            const dbData = await dbResponse.json()
            setDbStatus(dbData)
          }
          
          // Get models information
          const modelsResponse = await fetch(`${API_URL}/api/models/info`)
          if (modelsResponse.ok) {
            const modelsData = await modelsResponse.json()
            setModelsInfo(modelsData)
          }
          
          // Fetch dashboard data
          await fetchDashboardData(API_URL)
          
          toast.success('Successfully connected to backend API')
        } else {
          setApiStatus('error')
          toast.error('Failed to connect to backend API')
        }
      } catch (error) {
        setApiStatus('error')
        toast.error('Unable to reach backend API')
      }
    }

    checkApiConnection()
  }, [])

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Welcome to Enterprise Portfolio Management</h2>
          <p className="card-description">
            Your comprehensive SaaS platform for portfolio and project management
          </p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-primary-50 rounded-lg">
              <h3 className="text-lg font-semibold text-primary-900 mb-2">Projects</h3>
              <p className="text-3xl font-bold text-primary-600">{dashboardData.projects}</p>
              <p className="text-sm text-primary-700">Active Projects</p>
            </div>
            <div className="text-center p-6 bg-success-50 rounded-lg">
              <h3 className="text-lg font-semibold text-success-900 mb-2">Teams</h3>
              <p className="text-3xl font-bold text-success-600">{dashboardData.teams}</p>
              <p className="text-sm text-success-700">Team Members</p>
            </div>
            <div className="text-center p-6 bg-warning-50 rounded-lg">
              <h3 className="text-lg font-semibold text-warning-900 mb-2">Tasks</h3>
              <p className="text-3xl font-bold text-warning-600">{dashboardData.tasks}</p>
              <p className="text-sm text-warning-700">Pending Tasks</p>
            </div>
          </div>
        </div>
      </div>

      {/* API Status Section */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">System Status</h3>
          <p className="card-description">Current status of system components</p>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  apiStatus === 'connected' ? 'bg-success-500' :
                  apiStatus === 'error' ? 'bg-danger-500' : 'bg-warning-500 animate-pulse'
                }`}></div>
                <span className="font-medium">Backend API</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  apiStatus === 'connected' ? 'text-success-600' :
                  apiStatus === 'error' ? 'text-danger-600' : 'text-warning-600'
                }`}>
                  {apiStatus === 'connected' ? 'Connected' :
                   apiStatus === 'error' ? 'Disconnected' : 'Connecting...'}
                </div>
                {apiData && (
                  <div className="text-xs text-gray-500">
                    Version {apiData.version}
                  </div>
                )}
              </div>
            </div>
            
            {/* Database Status */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${
                  dbStatus?.status === 'connected' ? 'bg-success-500' : 
                  apiStatus === 'connected' ? 'bg-warning-500' : 'bg-danger-500'
                }`}></div>
                <span className="font-medium">Database (MongoDB)</span>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${
                  dbStatus?.status === 'connected' ? 'text-success-600' : 'text-danger-600'
                }`}>
                  {dbStatus?.status === 'connected' ? 'Connected' : 
                   apiStatus === 'connected' ? 'Checking...' : 'Disconnected'}
                </div>
                {dbStatus && (
                  <div className="text-xs text-gray-500">
                    {dbStatus.database_name} • {dbStatus.database_size_mb}MB
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-success-500"></div>
                <span className="font-medium">Frontend Application</span>
              </div>
              <div className="text-right">
                <div className="text-sm font-semibold text-success-600">Active</div>
                <div className="text-xs text-gray-500">Version 1.0.0</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Models Status */}
      {modelsInfo && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Data Models Status</h3>
            <p className="card-description">All enterprise data models loaded successfully</p>
          </div>
          <div className="card-content">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(modelsInfo.models).map(([modelName, modelInfo]: [string, any]) => (
                <div key={modelName} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition-colors">
                  <div className="flex items-center space-x-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-success-500"></div>
                    <h4 className="font-semibold text-sm">{modelName}</h4>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{modelInfo.description}</p>
                  <div className="text-xs text-gray-500">
                    {dbStatus?.collection_counts?.[modelName.toLowerCase() + 's'] !== undefined ? 
                      `${dbStatus.collection_counts[modelName.toLowerCase() + 's']} records` :
                      'Ready'
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Quick Actions</h3>
          <p className="card-description">Get started with these common actions</p>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <button 
              className="btn-primary p-4 h-auto flex-col space-y-2 transition-all hover:scale-105" 
              onClick={() => setShowProjectModal(true)}
            >
              <Plus className="h-6 w-6" />
              <span className="font-semibold">Create Project</span>
              <span className="text-xs opacity-90">Start a new project</span>
            </button>
            <button 
              className="btn-secondary p-4 h-auto flex-col space-y-2 transition-all hover:scale-105"
              onClick={() => navigate('/teams')}
            >
              <Users className="h-6 w-6" />
              <span className="font-semibold">Manage Teams</span>
              <span className="text-xs opacity-90">Add or manage team members</span>
            </button>
            <button 
              className="btn-outline p-4 h-auto flex-col space-y-2 transition-all hover:scale-105"
              onClick={() => navigate('/analytics')}
            >
              <BarChart3 className="h-6 w-6" />
              <span className="font-semibold">View Analytics</span>
              <span className="text-xs opacity-90">Portfolio insights and reports</span>
            </button>
            <button 
              className="btn-outline p-4 h-auto flex-col space-y-2 transition-all hover:scale-105 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200 hover:border-purple-300"
              onClick={() => navigate('/resource-management')}
            >
              <Brain className="h-6 w-6 text-purple-600" />
              <span className="font-semibold text-purple-700">AI Resources</span>
              <span className="text-xs opacity-90 text-purple-600">Smart resource optimization</span>
            </button>
            <button 
              className="btn-outline p-4 h-auto flex-col space-y-2 transition-all hover:scale-105"
              onClick={() => navigate('/settings')}
            >
              <SettingsIcon className="h-6 w-6" />
              <span className="font-semibold">Settings</span>
              <span className="text-xs opacity-90">Configure system preferences</span>
            </button>
          </div>
        </div>
      </div>

      {/* Project Creation Modal */}
      {showProjectModal && (
        <ProjectCreateModal
          isOpen={showProjectModal}
          onClose={() => setShowProjectModal(false)}
          onProjectCreated={() => {
            setShowProjectModal(false)
            toast.success('Project created successfully!')
          }}
        />
      )}
    </div>
  )
}

export default Dashboard