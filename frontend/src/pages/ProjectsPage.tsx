import React, { useState, useEffect } from 'react'
import { Plus, Search, Filter, Grid, List, Calendar, BarChart3, Users, Clock, DollarSign } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import ProjectCreateModal from '../components/project/ProjectCreateModal'
import ProjectCard from '../components/project/ProjectCard'
import ProjectList from '../components/project/ProjectList'
import ProjectDashboard from '../components/project/ProjectDashboard'
import { BACKEND_URL } from '../utils/config'

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
}

interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  overdue_projects: number
  total_budget: number
  spent_budget: number
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
    spent_budget: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'dashboard'>('grid')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')

  const fetchProjects = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status_filter', statusFilter)
      if (priorityFilter !== 'all') params.append('priority_filter', priorityFilter)
      
      const response = await fetch(`${BACKEND_URL}/api/projects/?${params}`, {
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
      
      // Calculate stats
      const stats = projectsData.reduce((acc: ProjectStats, project: ProjectSummary) => {
        acc.total_projects++
        if (project.status === 'active') acc.active_projects++
        if (project.status === 'completed') acc.completed_projects++
        if (project.due_date && new Date(project.due_date) < new Date() && 
            !['completed', 'cancelled', 'archived'].includes(project.status)) {
          acc.overdue_projects++
        }
        return acc
      }, {
        total_projects: 0,
        active_projects: 0,
        completed_projects: 0,
        overdue_projects: 0,
        total_budget: 0,
        spent_budget: 0
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
  }, [tokens?.access_token, user, statusFilter, priorityFilter])

  const handleProjectCreated = () => {
    setShowCreateModal(false)
    fetchProjects()
  }

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading projects...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">
            <BarChart3 className="w-16 h-16 mx-auto mb-2" />
            <p className="text-xl font-semibold">Failed to load projects</p>
            <p className="text-sm">{error}</p>
          </div>
          <button
            onClick={fetchProjects}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="projects-page">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">Manage and track your organization's projects</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          data-testid="create-project-btn"
        >
          <Plus className="w-5 h-5" />
          <span>New Project</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-3xl font-bold text-gray-900">{stats.total_projects}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Projects</p>
              <p className="text-3xl font-bold text-green-600">{stats.active_projects}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <Clock className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-3xl font-bold text-gray-900">{stats.completed_projects}</p>
            </div>
            <div className="p-3 bg-gray-100 rounded-full">
              <Calendar className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{stats.overdue_projects}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-full">
              <Users className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="search-projects-input"
              />
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="status-filter"
              >
                <option value="all">All Status</option>
                <option value="planning">Planning</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                data-testid="priority-filter"
              >
                <option value="all">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              data-testid="grid-view-btn"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              data-testid="list-view-btn"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('dashboard')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'dashboard' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'
              }`}
              data-testid="dashboard-view-btn"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Projects Content */}
      <div data-testid="projects-content">
        {viewMode === 'dashboard' ? (
          <ProjectDashboard projects={filteredProjects} stats={stats} />
        ) : viewMode === 'list' ? (
          <ProjectList 
            projects={filteredProjects} 
            onProjectUpdate={fetchProjects}
            getStatusColor={getStatusColor}
            getPriorityColor={getPriorityColor}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.length > 0 ? (
              filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onProjectUpdate={fetchProjects}
                  getStatusColor={getStatusColor}
                  getPriorityColor={getPriorityColor}
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No projects found</h3>
                <p className="text-gray-600 mb-6">
                  {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all'
                    ? 'Try adjusting your search or filters'
                    : 'Get started by creating your first project'}
                </p>
                {!searchTerm && statusFilter === 'all' && priorityFilter === 'all' && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                    data-testid="create-first-project-btn"
                  >
                    Create Your First Project
                  </button>
                )}
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