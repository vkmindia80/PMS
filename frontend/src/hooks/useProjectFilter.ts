import { useState, useEffect, useCallback, useRef } from 'react'
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
  const auth = useAuth()
  const { tokens, isAuthenticated, isLoading: authLoading } = auth || { tokens: null, isAuthenticated: false, isLoading: true }
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 2

  const fetchProjects = useCallback(async (skipAuthCheck = false) => {
    // Enhanced authentication check
    if (!skipAuthCheck && (!isAuthenticated || authLoading || !tokens?.access_token)) {
      const errorMsg = 'Authentication required - user not authenticated or tokens not available'
      setError(errorMsg)
      onError?.(errorMsg)
      console.log('useProjectFilter: Skipping fetch due to auth state:', { isAuthenticated, authLoading, hasToken: !!tokens?.access_token })
      return
    }

    try {
      setLoading(true)
      setError(null)
      onError?.(null)
      
      console.log('useProjectFilter: Fetching projects with token:', tokens?.access_token ? 'Present' : 'Missing')
      
      const response = await fetch(API_ENDPOINTS.projects.list, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        // Add timeout to avoid hanging requests
        signal: AbortSignal.timeout(10000)
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data || [])
        retryCount.current = 0 // Reset retry count on success
        console.log('useProjectFilter: Successfully fetched', data?.length || 0, 'projects')
      } else if (response.status === 401) {
        // Handle authentication errors specifically
        const errorMessage = `Authentication failed (${response.status}). Token may be expired.`
        setError(errorMessage)
        onError?.(errorMessage)
        
        // Attempt token refresh if available and haven't exceeded retry limit
        if (auth?.refreshToken && retryCount.current < maxRetries) {
          retryCount.current++
          console.log(`useProjectFilter: Attempting token refresh (attempt ${retryCount.current}/${maxRetries})`)
          try {
            await auth.refreshToken()
            // Retry the fetch after successful token refresh
            setTimeout(() => fetchProjects(true), 500)
          } catch (refreshError) {
            console.error('useProjectFilter: Token refresh failed:', refreshError)
            setError(`Token refresh failed: ${refreshError}`)
            onError?.(`Token refresh failed: ${refreshError}`)
          }
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMessage = errorData.detail || `HTTP ${response.status}: Failed to fetch projects`
        throw new Error(errorMessage)
      }
    } catch (err) {
      let errorMessage = 'Failed to load projects'
      
      if (err instanceof Error) {
        errorMessage = err.message
        
        // Handle network errors specifically
        if (err.name === 'TypeError' && err.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to server. Please check your connection.'
        } else if (err.name === 'AbortError' || err.message.includes('timeout')) {
          errorMessage = 'Request timeout: Server took too long to respond.'
        }
      }
      
      setError(errorMessage)
      onError?.(errorMessage)
      console.error('useProjectFilter: Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }, [tokens?.access_token, onError, isAuthenticated, authLoading, auth])

  // Enhanced effect with better conditions
  useEffect(() => {
    if (autoFetch && isAuthenticated && !authLoading && tokens?.access_token) {
      console.log('useProjectFilter: Auto-fetch triggered')
      fetchProjects()
    } else {
      console.log('useProjectFilter: Auto-fetch skipped. Auth state:', { 
        autoFetch, 
        isAuthenticated, 
        authLoading, 
        hasToken: !!tokens?.access_token 
      })
    }
  }, [autoFetch, isAuthenticated, authLoading, tokens?.access_token, fetchProjects])

  // Listen for token changes and refresh projects
  useEffect(() => {
    if (tokens?.access_token && projects.length === 0 && !loading && isAuthenticated && !authLoading) {
      console.log('useProjectFilter: Token changed, refreshing projects')
      fetchProjects()
    }
  }, [tokens?.access_token, projects.length, loading, isAuthenticated, authLoading, fetchProjects])

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