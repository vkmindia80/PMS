import React, { useState, useEffect } from 'react'
import { 
  Folder, 
  Search, 
  Filter, 
  Trash2, 
  Eye, 
  FileText,
  Calendar,
  Tag,
  RefreshCw,
  FolderOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

interface SavedProject {
  id: string
  project_name: string
  project_description: string
  business_domain: string
  priority: string
  document_count: number
  created_at: string
  updated_at: string
  tags: string[]
}

interface MyProjectsTabProps {
  onLoadProject: (projectId: string) => void
  refreshTrigger?: number
}

const MyProjectsTab: React.FC<MyProjectsTabProps> = ({ onLoadProject, refreshTrigger }) => {
  const [projects, setProjects] = useState<SavedProject[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Helper to get access token
  const getAccessToken = (): string | null => {
    try {
      const authTokensStr = localStorage.getItem('auth_tokens')
      if (!authTokensStr) return null
      const authTokens = JSON.parse(authTokensStr)
      return authTokens.access_token
    } catch (error) {
      console.error('Error getting access token:', error)
      return null
    }
  }

  useEffect(() => {
    loadProjects()
  }, [refreshTrigger])

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      loadProjects()
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [searchQuery, filterDomain, filterPriority])

  const loadProjects = async () => {
    setLoading(true)
    try {
      const accessToken = getAccessToken()
      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterDomain) params.append('domain', filterDomain)
      if (filterPriority) params.append('priority', filterPriority)

      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || 'Failed to load projects')
      }

      const data = await response.json()
      setProjects(data)
    } catch (error: any) {
      console.error('Error loading projects:', error)
      toast.error(error.message || 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  const deleteProject = async (projectId: string, projectName: string) => {
    if (!confirm(`Are you sure you want to delete "${projectName}"?`)) return

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete project')

      toast.success('Project deleted successfully')
      loadProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  const getUniqueDomains = () => {
    const domains = projects.map(p => p.business_domain)
    return Array.from(new Set(domains))
  }

  if (loading && projects.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading your projects...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">My Projects</h2>
        <p className="text-gray-600">
          Manage your saved project artifacts and documentation
        </p>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:space-x-4 space-y-3 md:space-y-0">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects by name or description..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="search-projects-input"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            data-testid="toggle-filters-btn"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(filterDomain || filterPriority) && (
              <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full">
                Active
              </span>
            )}
          </button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Business Domain
              </label>
              <select
                value={filterDomain}
                onChange={(e) => setFilterDomain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="filter-domain-select"
              >
                <option value="">All Domains</option>
                {getUniqueDomains().map((domain) => (
                  <option key={domain} value={domain}>{domain}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                data-testid="filter-priority-select"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      {!loading && (
        <div className="text-sm text-gray-600">
          {projects.length} {projects.length === 1 ? 'project' : 'projects'} found
        </div>
      )}

      {/* Projects Grid */}
      {projects.length === 0 && !loading ? (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <FolderOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Projects Yet</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || filterDomain || filterPriority 
              ? 'No projects match your filters. Try adjusting your search criteria.'
              : 'Start by generating your first project in the Generator tab.'}
          </p>
          {(searchQuery || filterDomain || filterPriority) && (
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterDomain('')
                setFilterPriority('')
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project.id}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
              data-testid={`project-card-${project.id}`}
            >
              {/* Header */}
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                  {project.project_name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-3 mb-3">
                  {project.project_description}
                </p>
              </div>

              {/* Metadata */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Domain</span>
                  <span className="font-medium text-gray-900">{project.business_domain}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Priority</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(project.priority)}`}>
                    {project.priority.toUpperCase()}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Documents</span>
                  <span className="font-medium text-gray-900">{project.document_count}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500 flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    Updated
                  </span>
                  <span className="font-medium text-gray-900">{formatDate(project.updated_at)}</span>
                </div>
              </div>

              {/* Tags */}
              {project.tags && project.tags.length > 0 && (
                <div className="mb-4">
                  <div className="flex flex-wrap gap-1">
                    {project.tags.slice(0, 3).map((tag, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                        {tag}
                      </span>
                    ))}
                    {project.tags.length > 3 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                        +{project.tags.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex space-x-2 pt-4 border-t border-gray-200">
                <button
                  onClick={() => onLoadProject(project.id)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  data-testid={`view-project-${project.id}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                
                <button
                  onClick={() => deleteProject(project.id, project.project_name)}
                  className="px-3 py-2 border border-red-300 text-red-600 text-sm font-medium rounded-md hover:bg-red-50 transition-colors"
                  data-testid={`delete-project-${project.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading && projects.length > 0 && (
        <div className="text-center py-4">
          <RefreshCw className="h-6 w-6 text-blue-600 animate-spin mx-auto" />
        </div>
      )}
    </div>
  )
}

export default MyProjectsTab
