import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { useProjectFilter } from '../hooks/useProjectFilter'

interface ProjectFilterContextType {
  selectedProject: string | string[]
  setSelectedProject: (project: string | string[]) => void
  projects: Array<{
    id: string
    name: string
    status: string
    priority: string
    description?: string
    progress_percentage: number
    due_date?: string | null
    owner_id: string
    task_count: number
    team_member_count: number
  }>
  loading: boolean
  error: string | null
  refreshProjects: () => void
  getProjectName: (projectId: string) => string
  getProject: (projectId: string) => any
  isProjectSelected: (projectId: string) => boolean
  getSelectedProjectIds: () => string[]
}

const ProjectFilterContext = createContext<ProjectFilterContextType | undefined>(undefined)

export const useProjectFilterContext = () => {
  const context = useContext(ProjectFilterContext)
  if (context === undefined) {
    throw new Error('useProjectFilterContext must be used within a ProjectFilterProvider')
  }
  return context
}

interface ProjectFilterProviderProps {
  children: React.ReactNode
}

export const ProjectFilterProvider: React.FC<ProjectFilterProviderProps> = ({ children }) => {
  const auth = useAuth()
  const { isAuthenticated, tokens, isLoading: authLoading } = auth || { isAuthenticated: false, tokens: null, isLoading: true }
  const [selectedProject, setSelectedProject] = useState<string | string[]>('all')
  
  // Enhanced error handler with token refresh capability
  const handleError = useCallback(async (error: string | null) => {
    if (error) {
      console.error('Project filter error:', error)
      
      // If it's an authentication error and we have a refresh token, try to refresh
      if (error.includes('401') || error.includes('Authentication required') || error.includes('Failed to fetch')) {
        if (auth?.refreshToken && tokens?.refresh_token) {
          try {
            console.log('Attempting token refresh due to project filter error...')
            await auth.refreshToken()
            // The useProjectFilter hook will automatically retry after token refresh
          } catch (refreshError) {
            console.error('Token refresh failed in ProjectFilterContext:', refreshError)
          }
        }
      }
    }
  }, [auth, tokens])

  const {
    projects,
    loading,
    error,
    fetchProjects,
    getProjectName,
    getProject
  } = useProjectFilter({
    // Only auto-fetch when authentication is complete and we have valid tokens
    autoFetch: isAuthenticated && !authLoading && !!tokens?.access_token,
    onError: handleError
  })

  // Reset selected project when user logs out/in
  useEffect(() => {
    if (!isAuthenticated || authLoading) {
      setSelectedProject('all')
    }
  }, [isAuthenticated, authLoading])

  // Trigger project fetch when authentication state becomes ready
  useEffect(() => {
    if (isAuthenticated && !authLoading && tokens?.access_token && projects.length === 0 && !loading && !error) {
      console.log('ProjectFilterContext: Triggering projects fetch after auth ready')
      fetchProjects()
    }
  }, [isAuthenticated, authLoading, tokens?.access_token, projects.length, loading, error, fetchProjects])

  const isProjectSelected = (projectId: string): boolean => {
    if (Array.isArray(selectedProject)) {
      return selectedProject.includes(projectId) || selectedProject.includes('all')
    }
    return selectedProject === projectId || selectedProject === 'all'
  }

  const getSelectedProjectIds = (): string[] => {
    if (Array.isArray(selectedProject)) {
      return selectedProject.filter(id => id !== 'all')
    }
    if (selectedProject && selectedProject !== 'all') {
      return [selectedProject]
    }
    return []
  }

  const contextValue: ProjectFilterContextType = {
    selectedProject,
    setSelectedProject,
    projects,
    loading,
    error,
    refreshProjects: fetchProjects,
    getProjectName,
    getProject,
    isProjectSelected,
    getSelectedProjectIds
  }

  return (
    <ProjectFilterContext.Provider value={contextValue}>
      {children}
    </ProjectFilterContext.Provider>
  )
}

export default ProjectFilterContext