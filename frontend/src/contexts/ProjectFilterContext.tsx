import React, { createContext, useContext, useState, useEffect } from 'react'
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
  const isAuthenticated = auth?.isAuthenticated || false
  const [selectedProject, setSelectedProject] = useState<string | string[]>('all')
  
  const {
    projects,
    loading,
    error,
    fetchProjects,
    getProjectName,
    getProject
  } = useProjectFilter({
    autoFetch: isAuthenticated,
    onError: (error) => {
      if (error) {
        console.error('Project filter error:', error)
      }
    }
  })

  // Reset selected project when user logs out/in
  useEffect(() => {
    if (!isAuthenticated) {
      setSelectedProject('all')
    }
  }, [isAuthenticated])

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