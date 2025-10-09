import React, { useState } from 'react'
import { Zap, BookOpen, Folder } from 'lucide-react'
import { Toaster } from 'react-hot-toast'
import toast from 'react-hot-toast'

// Import tab components
import SampleProjectsTab from '../components/ai-generator/SampleProjectsTab'
import MyProjectsTab from '../components/ai-generator/MyProjectsTab'

// Import the original generator page component (we'll treat it as the generator tab)
import AIProjectArtifactGeneratorPage from './AIProjectArtifactGeneratorPage'

// Import types
import type { ProjectScope, GeneratedDocument, SampleProject } from '../components/ai-generator/types'

const AIProjectArtifactGeneratorWithTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'generator' | 'samples' | 'projects'>('generator')
  const [projectsRefreshTrigger, setProjectsRefreshTrigger] = useState(0)
  const [isGenerating, setIsGenerating] = useState(false)

  // For passing project data to generator
  const [loadedProjectScope, setLoadedProjectScope] = useState<ProjectScope | null>(null)
  const [loadedDocumentTypes, setLoadedDocumentTypes] = useState<string[]>([])

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

  const handleLoadSample = (scope: ProjectScope, documentTypes: string[]) => {
    setLoadedProjectScope(scope)
    setLoadedDocumentTypes(documentTypes)
    setActiveTab('generator')
    toast.success('Sample project loaded into generator')
  }

  const handleGenerateSample = async (sample: SampleProject) => {
    setIsGenerating(true)
    try {
      const accessToken = getAccessToken()
      if (!accessToken) {
        throw new Error('Not authenticated')
      }

      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      
      const requestBody = {
        project_scope: sample.project_scope,
        document_types: sample.document_types,
        additional_instructions: undefined
      }

      const response = await fetch(`${backendUrl}/api/ai-project-generator/generate-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Store the generated data and switch to generator tab
      // We'll need to modify the original generator to accept this
      toast.success(`Successfully generated ${data.documents.length} documents in ${data.generation_time.toFixed(2)}s`)
      
      // For now, just load the sample and let user see the results
      setLoadedProjectScope(sample.project_scope)
      setLoadedDocumentTypes(sample.document_types)
      setActiveTab('generator')
    } catch (error: any) {
      console.error('Error generating documents:', error)
      toast.error(`Failed to generate documents: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleLoadProject = async (projectId: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to load project')

      const project = await response.json()
      
      // For now, just load the scope to generator
      // Ideally we'd pass the full project including generated documents
      setLoadedProjectScope(project.project_scope)
      setActiveTab('generator')
      
      toast.success('Project loaded successfully')
    } catch (error: any) {
      console.error('Error loading project:', error)
      toast.error('Failed to load project')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Zap className="h-8 w-8 mr-3 text-yellow-600" />
                AI Project Artifact Generator
              </h1>
              <p className="text-gray-600 mt-2">
                Generate comprehensive project documentation using AI based on your project scope and requirements.
              </p>
            </div>
          </div>

          {/* Horizontal Tabs */}
          <div className="flex space-x-1 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('generator')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'generator'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-generator"
            >
              <div className="flex items-center">
                <Zap className="h-4 w-4 mr-2" />
                Generator
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('samples')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'samples'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-samples"
            >
              <div className="flex items-center">
                <BookOpen className="h-4 w-4 mr-2" />
                Sample Projects
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('projects')}
              className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'projects'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              data-testid="tab-projects"
            >
              <div className="flex items-center">
                <Folder className="h-4 w-4 mr-2" />
                My Projects
              </div>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'generator' && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <AIProjectArtifactGeneratorPage 
                loadedProjectScope={loadedProjectScope}
                loadedDocumentTypes={loadedDocumentTypes}
                onProjectSaved={() => setProjectsRefreshTrigger(prev => prev + 1)}
              />
            </div>
          )}
          
          {activeTab === 'samples' && (
            <SampleProjectsTab 
              onLoadSample={handleLoadSample}
              onGenerateSample={handleGenerateSample}
              isGenerating={isGenerating}
            />
          )}
          
          {activeTab === 'projects' && (
            <MyProjectsTab 
              onLoadProject={handleLoadProject}
              refreshTrigger={projectsRefreshTrigger}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AIProjectArtifactGeneratorWithTabs
