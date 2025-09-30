import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../utils/config'

interface Project {
  id: string
  name: string
  status: string
  priority: string
  description?: string
}

export const useProjectFilter = () => {
  const { tokens } = useAuth()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchProjects = async () => {
    if (!tokens?.access_token) return

    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_URL}/api/projects/`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setProjects(data)
      } else {
        throw new Error('Failed to fetch projects')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
      console.error('Error fetching projects:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProjects()
  }, [tokens?.access_token])

  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    return project?.name || 'Unknown Project'
  }

  const getProject = (projectId: string) => {
    return projects.find(p => p.id === projectId)
  }

  return {
    projects,
    loading,
    error,
    fetchProjects,
    getProjectName,
    getProject
  }
}

export default useProjectFilter