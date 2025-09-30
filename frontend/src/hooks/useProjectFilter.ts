import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_ENDPOINTS } from '../utils/config'

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

interface UseProjectFilterOptions {
  autoFetch?: boolean
  onError?: (error: string | null) => void
}

export const useProjectFilter = (options: UseProjectFilterOptions = {}) => {
  const { autoFetch = true, onError } = options
  const { tokens } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = useCallback(async () => {
    if (!tokens?.access_token) {
      setError('Authentication required')
      onError?.('Authentication required')
      return
    }

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
        setProjects(data || [])
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP ${response.status}: Failed to fetch projects`
        throw new Error(errorMessage)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load projects'
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }, [tokens?.access_token, onError])

  useEffect(() => {
    if (autoFetch && tokens?.access_token) {
      fetchProjects()
    }
  }, [autoFetch, fetchProjects, tokens?.access_token])

  const getProjectName = useCallback((projectId: string) => {
    if (!projectId || projectId === 'all') return 'All Projects'
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }, [projects])

  const getProject = useCallback((projectId: string) => {
    if (!projectId || projectId === 'all') return null
    return projects.find(p => p.id === projectId) || null
  }, [projects])

  const getProjectsByStatus = useCallback((status: Project['status']) => {
    return projects.filter(p => p.status === status)
  }, [projects])

  const getProjectsByPriority = useCallback((priority: Project['priority']) => {
    return projects.filter(p => p.priority === priority)
  }, [projects])

  const searchProjects = useCallback((searchTerm: string) => {
    if (!searchTerm.trim()) return projects
    
    const term = searchTerm.toLowerCase()
    return projects.filter(project =>
      project.name.toLowerCase().includes(term) ||
      project.description?.toLowerCase().includes(term)
    )
  }, [projects])

  const filterProjects = useCallback((filters: {
    status?: Project['status'][]
    priority?: Project['priority'][]
    search?: string
  }) => {
    let filtered = projects

    if (filters.search) {
      filtered = searchProjects(filters.search)
    }

    if (filters.status && filters.status.length > 0) {
      filtered = filtered.filter(p => filters.status!.includes(p.status))
    }

    if (filters.priority && filters.priority.length > 0) {
      filtered = filtered.filter(p => filters.priority!.includes(p.priority))
    }

    return filtered
  }, [projects, searchProjects])

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProjectName,
    getProject,
    getProjectsByStatus,
    getProjectsByPriority,
    searchProjects,
    filterProjects,
    // Statistics
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    overdueProjects: projects.filter(p => 
      p.due_date && 
      new Date(p.due_date) < new Date() && 
      !['completed', 'cancelled', 'archived'].includes(p.status)
    ).length,
  }
}

export default useProjectFilter