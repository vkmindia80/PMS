import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Search, Filter, X, ChevronDown, AlertCircle, RefreshCw } from 'lucide-react'
import { API_ENDPOINTS } from '../../utils/config'
import { debounce } from 'lodash-es'

interface Project {
  id: string
  name: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  description?: string
  progress_percentage: number
  due_date?: string | null
  owner_id: string
  task_count: number
  team_member_count: number
}

interface ProjectFilterProps {
  selectedProject?: string | string[]
  onProjectChange: (projectId: string | string[]) => void
  showAllOption?: boolean
  placeholder?: string
  className?: string
  label?: string
  multiSelect?: boolean
  disabled?: boolean
  error?: string | null
  onError?: (error: string | null) => void
}

const ProjectFilter: React.FC<ProjectFilterProps> = ({
  selectedProject = '',
  onProjectChange,
  showAllOption = true,
  placeholder = 'Select project...',
  className = '',
  label = 'Filter by Project',
  multiSelect = false,
  disabled = false,
  error: externalError = null,
  onError
}) => {
  const { tokens } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [error, setError] = useState<string | null>(externalError)

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((term: string) => {
      setSearchTerm(term)
    }, 300),
    []
  )

  useEffect(() => {
    if (tokens?.access_token) {
      fetchProjects()
    }
  }, [tokens?.access_token])

  useEffect(() => {
    setError(externalError)
  }, [externalError])

  const fetchProjects = async () => {
    if (!tokens?.access_token) return
    
    try {
      setLoading(true)
      setError(null)
      onError?.(null)
      
      const response = await fetch(API_ENDPOINTS.projects.list, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `HTTP ${response.status}: Failed to fetch projects`)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load projects'
      setError(errorMsg)
      onError?.(errorMsg)
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  // Memoized filtered projects for performance
  const filteredProjects = useMemo(() => {
    return projects.filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [projects, searchTerm])

  // Memoized selected project display
  const selectedProjectDisplay = useMemo(() => {
    if (multiSelect && Array.isArray(selectedProject)) {
      if (selectedProject.length === 0 || (selectedProject.length === 1 && selectedProject[0] === 'all')) {
        return placeholder
      }
      if (selectedProject.length === 1) {
        const project = projects.find(p => p.id === selectedProject[0])
        return project?.name || placeholder
      }
      return `${selectedProject.length} projects selected`
    } else {
      const projectId = Array.isArray(selectedProject) ? selectedProject[0] : selectedProject
      if (!projectId || projectId === 'all') return placeholder
      const project = projects.find(p => p.id === projectId)
      return project?.name || placeholder
    }
  }, [selectedProject, projects, placeholder, multiSelect])

  const handleProjectSelect = (projectId: string) => {
    if (multiSelect && Array.isArray(selectedProject)) {
      if (projectId === 'all') {
        onProjectChange(['all'])
      } else {
        const currentSelection = selectedProject.filter(id => id !== 'all')
        const isSelected = currentSelection.includes(projectId)
        
        if (isSelected) {
          const newSelection = currentSelection.filter(id => id !== projectId)
          onProjectChange(newSelection.length === 0 ? ['all'] : newSelection)
        } else {
          onProjectChange([...currentSelection, projectId])
        }
      }
    } else {
      onProjectChange(projectId)
      setIsOpen(false)
      setSearchTerm('')
    }
  }

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onProjectChange(multiSelect ? ['all'] : 'all')
    setSearchTerm('')
  }

  const getStatusColor = (status: string) => {
    const colors = {
      planning: 'bg-blue-100 text-blue-800',
      active: 'bg-green-100 text-green-800',
      on_hold: 'bg-yellow-100 text-yellow-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
      archived: 'bg-gray-100 text-gray-500'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'text-green-600',
      medium: 'text-yellow-600',
      high: 'text-orange-600',
      critical: 'text-red-600'
    }
    return colors[priority as keyof typeof colors] || 'text-gray-600'
  }

  const isProjectSelected = (projectId: string) => {
    if (multiSelect && Array.isArray(selectedProject)) {
      return selectedProject.includes(projectId)
    }
    return selectedProject === projectId
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        <div className="text-sm text-red-600 p-2 border border-red-200 rounded-md bg-red-50">
          {error}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`} data-testid="project-filter">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      )}
      
      {/* Filter Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-full bg-white border border-gray-300 rounded-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
        data-testid="project-filter-button"
      >
        <span className="flex items-center">
          <Filter className="h-4 w-4 text-gray-400 mr-2" />
          <span className="block truncate">
            {selectedProject && selectedProject !== 'all' ? selectedProjectName : placeholder}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search */}
          <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                data-testid="project-search-input"
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              Loading projects...
            </div>
          )}

          {/* All Projects Option */}
          {showAllOption && !loading && (
            <button
              type="button"
              onClick={() => handleProjectSelect('all')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                selectedProject === 'all' || selectedProject === '' ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
              }`}
              data-testid="project-all-option"
            >
              <div className="flex items-center">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-400 mr-3"></div>
                <div>
                  <div className="font-medium">All Projects</div>
                  <div className="text-xs text-gray-500">Show items from all projects</div>
                </div>
              </div>
            </button>
          )}

          {/* Projects List */}
          {!loading && filteredProjects.length > 0 ? (
            filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectSelect(project.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none ${
                  selectedProject === project.id ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                }`}
                data-testid={`project-option-${project.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    <div className={`flex-shrink-0 w-2 h-2 rounded-full mr-3 ${getPriorityColor(project.priority).replace('text-', 'bg-')}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-gray-500 truncate">{project.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0 ml-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </button>
            ))
          ) : !loading && searchTerm ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No projects found matching "{searchTerm}"
            </div>
          ) : !loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              No projects available
            </div>
          ) : null}

          {/* Close button for mobile */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 py-2 sm:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0 bg-transparent"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

export default ProjectFilter