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

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (isOpen && !target.closest('[data-testid="project-filter"]')) {
        setIsOpen(false)
        setSearchTerm('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setSearchTerm('')
    }
    if (event.key === 'Enter' && !isOpen) {
      setIsOpen(true)
    }
  }

  if (error) {
    return (
      <div className={`${className}`}>
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
        )}
        <div className="relative">
          <div className="text-sm text-red-600 p-2 border border-red-200 rounded-md bg-red-50 flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="flex-1">{error}</span>
            <button
              onClick={fetchProjects}
              className="ml-2 text-red-800 hover:text-red-900"
              title="Retry loading projects"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
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
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`relative w-full bg-white border rounded-md shadow-sm pl-3 pr-10 py-2 text-left focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 sm:text-sm transition-colors ${
          disabled
            ? 'border-gray-200 text-gray-400 cursor-not-allowed'
            : error
            ? 'border-red-300 text-red-900'
            : 'border-gray-300 cursor-pointer hover:border-gray-400'
        }`}
        data-testid="project-filter-button"
      >
        <span className="flex items-center">
          <Filter className={`h-4 w-4 mr-2 ${disabled ? 'text-gray-300' : 'text-gray-400'}`} />
          <span className="block truncate">
            {selectedProjectDisplay}
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-2">
          {loading ? (
            <RefreshCw className="h-4 w-4 text-gray-400 animate-spin" />
          ) : (
            <>
              {!disabled && (selectedProject && 
                ((Array.isArray(selectedProject) && selectedProject.length > 0 && selectedProject[0] !== 'all') || 
                (!Array.isArray(selectedProject) && selectedProject !== 'all' && selectedProject !== ''))
              ) && (
                <button
                  onClick={handleClearSelection}
                  className="mr-1 text-gray-400 hover:text-gray-600"
                  title="Clear selection"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
              <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </>
          )}
        </span>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
          {/* Search */}
          <div className="sticky top-0 z-10 bg-white px-3 py-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search projects..."
                onChange={(e) => debouncedSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500 text-sm"
                data-testid="project-search-input"
                autoFocus
              />
            </div>
          </div>

          {/* Loading */}
          {loading && (
            <div className="px-3 py-2 text-sm text-gray-500 text-center flex items-center justify-center">
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Loading projects...
            </div>
          )}

          {/* All Projects Option */}
          {showAllOption && !loading && (
            <button
              type="button"
              onClick={() => handleProjectSelect('all')}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                ((!Array.isArray(selectedProject) && (selectedProject === 'all' || selectedProject === '')) ||
                 (Array.isArray(selectedProject) && (selectedProject.length === 0 || selectedProject[0] === 'all')))
                  ? 'bg-primary-50 text-primary-600' 
                  : 'text-gray-900'
              }`}
              data-testid="project-all-option"
            >
              <div className="flex items-center">
                <div className="flex items-center justify-center w-4 h-4 mr-3">
                  {multiSelect && (
                    <div className={`w-3 h-3 border rounded ${
                      (Array.isArray(selectedProject) && (selectedProject.length === 0 || selectedProject[0] === 'all'))
                        ? 'bg-primary-600 border-primary-600'
                        : 'border-gray-300'
                    }`}>
                      {(Array.isArray(selectedProject) && (selectedProject.length === 0 || selectedProject[0] === 'all')) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  )}
                  {!multiSelect && <div className="flex-shrink-0 w-2 h-2 rounded-full bg-gray-400"></div>}
                </div>
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
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none transition-colors ${
                  isProjectSelected(project.id) ? 'bg-primary-50 text-primary-600' : 'text-gray-900'
                }`}
                data-testid={`project-option-${project.id}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center flex-1 min-w-0">
                    {multiSelect && (
                      <div className={`w-3 h-3 border rounded mr-3 flex-shrink-0 ${
                        isProjectSelected(project.id)
                          ? 'bg-primary-600 border-primary-600'
                          : 'border-gray-300'
                      }`}>
                        {isProjectSelected(project.id) && (
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    )}
                    {!multiSelect && (
                      <div className={`flex-shrink-0 w-2 h-2 rounded-full mr-3 ${
                        getPriorityColor(project.priority).replace('text-', 'bg-').replace('-600', '-500')
                      }`}></div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{project.name}</div>
                      {project.description && (
                        <div className="text-xs text-gray-500 truncate">{project.description}</div>
                      )}
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-semibold rounded ${getStatusColor(project.status)}`}>
                          {project.status.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-medium ${getPriorityColor(project.priority)}`}>
                          {project.priority.toUpperCase()}
                        </span>
                        <span className="text-xs text-gray-500">
                          {project.progress_percentage}% • {project.team_member_count} members
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </button>
            ))
          ) : !loading && searchTerm ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              <Search className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p>No projects found matching "{searchTerm}"</p>
              <button
                onClick={() => debouncedSearch('')}
                className="mt-1 text-primary-600 hover:text-primary-700 text-xs"
              >
                Clear search
              </button>
            </div>
          ) : !loading ? (
            <div className="px-3 py-2 text-sm text-gray-500 text-center">
              <Filter className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p>No projects available</p>
              <button
                onClick={fetchProjects}
                className="mt-1 text-primary-600 hover:text-primary-700 text-xs flex items-center justify-center mx-auto"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Refresh
              </button>
            </div>
          ) : null}

          {/* Multi-select summary */}
          {multiSelect && Array.isArray(selectedProject) && selectedProject.length > 1 && (
            <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-3 py-2">
              <div className="text-xs text-gray-600 text-center">
                {selectedProject.length} projects selected
                <button
                  onClick={handleClearSelection}
                  className="ml-2 text-primary-600 hover:text-primary-700"
                >
                  Clear all
                </button>
              </div>
            </div>
          )}

          {/* Close button for mobile */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-3 py-2 sm:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-full px-3 py-2 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectFilter