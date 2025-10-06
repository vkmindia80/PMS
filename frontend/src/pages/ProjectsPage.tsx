import React, { useState, useEffect, useMemo } from 'react'
import { Plus, Search, Filter, Grid, List, Calendar, BarChart3, Users, Clock, DollarSign, FolderOpen, TrendingUp, Target, CheckCircle, AlertCircle, ChevronDown, SlidersHorizontal, Download, Zap, Eye, Activity } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ProjectCreateModal from '../components/project/ProjectCreateModal'
import AdvancedProjectCard from '../components/project/AdvancedProjectCard'
import AdvancedProjectList from '../components/project/AdvancedProjectList'
import AdvancedProjectDashboard from '../components/project/AdvancedProjectDashboard'
import { BACKEND_URL, API_ENDPOINTS } from '../utils/config'

interface ProjectSummary {
  id: string
  name: string
  status: 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled' | 'archived'
  priority: 'low' | 'medium' | 'high' | 'critical'
  progress_percentage: number
  due_date: string | null
  owner_id: string
  task_count: number
  team_member_count: number
  category?: string
  tags?: string[]
  budget?: {
    total_budget: number | null
    spent_amount: number
    currency: string
  }
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  total_budget: number
  spent_budget: number
  progress_trend: number
  completion_rate: number
}

interface AdvancedFilters {
  status: string[]
  priority: string[]
  category: string[]
  tags: string[]
  dateRange: {
    start: string | null
    end: string | null
  }
  budgetRange: {
    min: number | null
    max: number | null
  }
  teamSize: {
    min: number | null
    max: number | null
  }
}

const ProjectsPage: React.FC = () => {
  const { user, tokens } = useAuth()
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [stats, setStats] = useState<ProjectStats>({
    total_projects: 0,
    active_projects: 0,
    completed_projects: 0,
    overdue_projects: 0,
    total_budget: 0,
    spent_budget: 0,
    progress_trend: 0,
    completion_rate: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'dashboard'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [sortBy, setSortBy] = useState('updated_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  
  const [filters, setFilters] = useState<AdvancedFilters>({
    status: [],
    priority: [],
    category: [],
    tags: [],
    dateRange: { start: null, end: null },
    budgetRange: { min: null, max: null },
    teamSize: { min: null, max: null }
  })

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      
      // Add filters to params
      if (filters.status.length > 0) params.append('status_filter', filters.status.join(','))
      if (filters.priority.length > 0) params.append('priority_filter', filters.priority.join(','))
      if (sortBy) params.append('sort_by', sortBy)
      if (sortOrder) params.append('sort_order', sortOrder)
      
      const response = await fetch(`${API_ENDPOINTS.projects.list}?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch projects')
      }

      const projectsData = await response.json()
      setProjects(projectsData)
      
      // Calculate enhanced stats
      const currentDate = new Date()
      const lastMonth = new Date()
      lastMonth.setMonth(lastMonth.getMonth() - 1)
      
      const stats = projectsData.reduce((acc: ProjectStats, project: ProjectSummary) => {
        acc.total_projects++
        if (project.status === 'active') acc.active_projects++
        if (project.status === 'completed') acc.completed_projects++
        if (project.due_date && new Date(project.due_date) < currentDate && 
            !['completed', 'cancelled', 'archived'].includes(project.status)) {
          acc.overdue_projects++
        }
        
        // Budget calculations
        if (project.budget?.total_budget) {
          acc.total_budget += project.budget.total_budget
          acc.spent_budget += project.budget.spent_amount
        }
        
        return acc
      }, {
        total_projects: 0,
        active_projects: 0,
        completed_projects: 0,
        overdue_projects: 0,
        total_budget: 0,
        spent_budget: 0,
        progress_trend: Math.random() * 10 - 5, // Mock trend data
        completion_rate: projectsData.length > 0 ? 
          (projectsData.filter((p: ProjectSummary) => p.status === 'completed').length / projectsData.length) * 100 : 0
      })
      
      setStats(stats)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (tokens?.access_token && user) {
      fetchProjects()
    }
  }, [tokens?.access_token, user, filters.status, filters.priority, sortBy, sortOrder])

  const handleProjectCreated = () => {
    setShowCreateModal(false)
    fetchProjects()
  }

  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // Text search
      if (searchTerm && !project.name.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false
      }
      
      // Category filter
      if (filters.category.length > 0 && (!project.category || !filters.category.includes(project.category))) {
        return false
      }
      
      // Tags filter
      if (filters.tags.length > 0 && (!project.tags || !project.tags.some(tag => filters.tags.includes(tag)))) {
        return false
      }
      
      // Date range filter
      if (filters.dateRange.start || filters.dateRange.end) {
        const projectDate = project.due_date ? new Date(project.due_date) : null
        if (!projectDate) return false
        
        if (filters.dateRange.start && projectDate < new Date(filters.dateRange.start)) return false
        if (filters.dateRange.end && projectDate > new Date(filters.dateRange.end)) return false
      }
      
      // Team size filter
      if (filters.teamSize.min !== null && project.team_member_count < filters.teamSize.min) return false
      if (filters.teamSize.max !== null && project.team_member_count > filters.teamSize.max) return false
      
      return true
    })
  }, [projects, searchTerm, filters])

  const handleFilterChange = (filterType: keyof AdvancedFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }))
  }

  const clearAllFilters = () => {
    setFilters({
      status: [],
      priority: [],
      category: [],
      tags: [],
      dateRange: { start: null, end: null },
      budgetRange: { min: null, max: null },
      teamSize: { min: null, max: null }
    })
    setSearchTerm('')
  }

  const getActiveFiltersCount = () => {
    return filters.status.length + 
           filters.priority.length + 
           filters.category.length + 
           filters.tags.length +
           (filters.dateRange.start || filters.dateRange.end ? 1 : 0) +
           (filters.budgetRange.min || filters.budgetRange.max ? 1 : 0) +
           (filters.teamSize.min || filters.teamSize.max ? 1 : 0)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary-200 border-t-primary-600 mx-auto mb-4"></div>
            <div className="absolute inset-0 rounded-full h-16 w-16 border-4 border-transparent border-r-primary-400 animate-spin" style={{animationDelay: '0.15s', animationDuration: '1s'}}></div>
          </div>
          <p className="text-gray-600 animate-pulse">Loading your projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="text-red-600 mb-6">
            <AlertCircle className="w-16 h-16 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Failed to load projects</h2>
            <p className="text-sm text-gray-600">{error}</p>
          </div>
          <button
            onClick={fetchProjects}
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-lg hover:shadow-xl"
          >
            <Activity className="w-5 h-5 mr-2" />
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen" data-testid="projects-page">
      {/* Enhanced Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <div className="p-3 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl text-white">
                <FolderOpen className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Project Portfolio</h1>
                <p className="text-gray-600 mt-1">Manage and track your organization's projects with advanced insights</p>
              </div>
            </div>
            
            {/* Quick Stats Row */}
            <div className="flex items-center space-x-6 mt-4 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-gray-600">{stats.active_projects} Active</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                <span className="text-gray-600">{stats.completion_rate.toFixed(1)}% Complete</span>
              </div>
              <div className="flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{filteredProjects.length} Total</span>
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {/* TODO: Export functionality */}}
              className="flex items-center space-x-2 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              data-testid="export-projects-btn"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
              data-testid="create-project-btn"
            >
              <Plus className="w-5 h-5" />
              <span>New Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-xl">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{stats.total_projects}</div>
              <div className="text-sm text-gray-500">Total Projects</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Portfolio Overview</span>
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Eye className="w-3 h-3" />
              <span>View All</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-xl">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-green-600">{stats.active_projects}</div>
              <div className="text-sm text-gray-500">Active Projects</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Currently Running</span>
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-purple-600">{stats.completion_rate.toFixed(0)}%</div>
              <div className="text-sm text-gray-500">Completion Rate</div>
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-500" 
              style={{ width: `${stats.completion_rate}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-orange-100 rounded-xl">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-orange-600">{stats.overdue_projects}</div>
              <div className="text-sm text-gray-500">Overdue</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Needs Attention</span>
            {stats.overdue_projects > 0 && (
              <div className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                Action Required
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Advanced Search and Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="space-y-4">
          {/* Main Search Row */}
          <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
            <div className="flex flex-col sm:flex-row gap-4 flex-1 w-full lg:w-auto">
              {/* Enhanced Search */}
              <div className="relative flex-1 min-w-80">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search projects by name, description, or tags..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 pr-4 py-3 w-full border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-gray-50 focus:bg-white transition-colors"
                  data-testid="search-projects-input"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick Filters */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white"
                >
                  <option value="updated_at">Recently Updated</option>
                  <option value="created_at">Recently Created</option>
                  <option value="name">Name</option>
                  <option value="due_date">Due Date</option>
                  <option value="progress_percentage">Progress</option>
                </select>
              </div>
            </div>

            {/* View Controls */}
            <div className="flex items-center space-x-3">
              {/* Advanced Filters Toggle */}
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-xl border transition-colors ${
                  showAdvancedFilters || getActiveFiltersCount() > 0
                    ? 'bg-primary-50 border-primary-200 text-primary-700'
                    : 'bg-gray-50 border-gray-300 text-gray-700 hover:bg-gray-100'
                }`}
                data-testid="advanced-filters-btn"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Filters</span>
                {getActiveFiltersCount() > 0 && (
                  <span className="bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {getActiveFiltersCount()}
                  </span>
                )}
              </button>

              {/* View Mode Toggle */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="grid-view-btn"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="list-view-btn"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('dashboard')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'dashboard' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-600 hover:text-gray-900'
                  }`}
                  data-testid="dashboard-view-btn"
                >
                  <BarChart3 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="border-t border-gray-200 pt-4 mt-4 animate-in slide-in-from-top-2 duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="space-y-2">
                    {['planning', 'active', 'on_hold', 'completed'].map(status => (
                      <label key={status} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.status.includes(status)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFilterChange('status', [...filters.status, status])
                            } else {
                              handleFilterChange('status', filters.status.filter(s => s !== status))
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{status.replace('_', ' ')}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Priority Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <div className="space-y-2">
                    {['low', 'medium', 'high', 'critical'].map(priority => (
                      <label key={priority} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.priority.includes(priority)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              handleFilterChange('priority', [...filters.priority, priority])
                            } else {
                              handleFilterChange('priority', filters.priority.filter(p => p !== priority))
                            }
                          }}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="ml-2 text-sm text-gray-700 capitalize">{priority}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Date Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date Range</label>
                  <div className="space-y-2">
                    <input
                      type="date"
                      value={filters.dateRange.start || ''}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, start: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Start date"
                    />
                    <input
                      type="date"
                      value={filters.dateRange.end || ''}
                      onChange={(e) => handleFilterChange('dateRange', { ...filters.dateRange, end: e.target.value || null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="End date"
                    />
                  </div>
                </div>

                {/* Team Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Team Size</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={filters.teamSize.min || ''}
                      onChange={(e) => handleFilterChange('teamSize', { ...filters.teamSize, min: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Min team size"
                      min="0"
                    />
                    <input
                      type="number"
                      value={filters.teamSize.max || ''}
                      onChange={(e) => handleFilterChange('teamSize', { ...filters.teamSize, max: e.target.value ? parseInt(e.target.value) : null })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Max team size"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              
              {/* Clear Filters */}
              {getActiveFiltersCount() > 0 && (
                <div className="flex justify-end mt-4">
                  <button
                    onClick={clearAllFilters}
                    className="text-sm text-gray-600 hover:text-gray-900 underline"
                  >
                    Clear all filters ({getActiveFiltersCount()})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Projects Content */}
      <div data-testid="projects-content">
        {viewMode === 'dashboard' ? (
          <AdvancedProjectDashboard projects={filteredProjects} stats={stats} />
        ) : viewMode === 'list' ? (
          <AdvancedProjectList 
            projects={filteredProjects} 
            onProjectUpdate={fetchProjects}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <AdvancedProjectCard
                  key={project.id}
                  project={project}
                  onProjectUpdate={fetchProjects}
                />
              ))
            ) : (
              <div className="col-span-full">
                <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <FolderOpen className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">No projects found</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchTerm || getActiveFiltersCount() > 0
                      ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                      : 'Get started by creating your first project and begin organizing your work.'}
                  </p>
                  {!searchTerm && getActiveFiltersCount() === 0 && (
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all shadow-lg hover:shadow-xl"
                      data-testid="create-first-project-btn"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Create Your First Project</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <ProjectCreateModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onProjectCreated={handleProjectCreated}
        />
      )}
    </div>
  )
}

export default ProjectsPage