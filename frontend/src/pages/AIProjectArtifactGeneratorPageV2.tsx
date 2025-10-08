import React, { useState, useEffect } from 'react'
import { 
  FileText, 
  Download, 
  Save, 
  Eye, 
  Settings, 
  Lightbulb, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Plus,
  Minus,
  Copy,
  ExternalLink,
  RefreshCw,
  Zap,
  Folder,
  BookOpen,
  Search,
  Filter,
  Trash2,
  Edit,
  FolderOpen,
  Calendar,
  Tag
} from 'lucide-react'
import toast from 'react-hot-toast'

// Document Types
const DOCUMENT_TYPES = [
  {
    value: 'project_requirements_document',
    label: 'Project Requirements Document (PRD)',
    description: 'Comprehensive project requirements and specifications',
    icon: FileText
  },
  {
    value: 'technical_specifications',
    label: 'Technical Specifications',
    description: 'Detailed technical architecture and implementation specifications',
    icon: Settings
  },
  {
    value: 'user_stories',
    label: 'User Stories',
    description: 'User-focused stories with acceptance criteria and test scenarios',
    icon: Lightbulb
  },
  {
    value: 'project_charter',
    label: 'Project Charter',
    description: 'Executive project authorization and high-level scope definition',
    icon: FileText
  },
  {
    value: 'risk_assessment',
    label: 'Risk Assessment',
    description: 'Comprehensive risk analysis with mitigation strategies',
    icon: AlertCircle
  },
  {
    value: 'business_case',
    label: 'Business Case',
    description: 'Financial justification and ROI analysis for the project',
    icon: FileText
  },
  {
    value: 'architecture_document',
    label: 'Architecture Document',
    description: 'System architecture design and technical decisions',
    icon: Settings
  },
  {
    value: 'test_plan',
    label: 'Test Plan',
    description: 'Comprehensive testing strategy and execution plan',
    icon: CheckCircle
  },
  {
    value: 'deployment_guide',
    label: 'Deployment Guide',
    description: 'Step-by-step deployment and configuration instructions',
    icon: Settings
  },
  {
    value: 'user_manual',
    label: 'User Manual',
    description: 'End-user documentation and operational procedures',
    icon: FileText
  }
]

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
]

interface ProjectScope {
  project_name: string
  project_description: string
  project_objectives: string[]
  target_audience: string
  stakeholders: string[]
  technical_requirements: string[]
  technical_constraints: string[]
  technology_stack: string[]
  timeline: string
  budget_range: string
  priority: string
  business_domain: string
  business_context: string
  success_criteria: string[]
  risks_and_assumptions: string[]
  compliance_requirements: string[]
}

interface GeneratedDocument {
  document_type: string
  title: string
  content: string
  metadata: {
    project_name: string
    generated_at: string
    domain: string
    priority: string
    timeline: string
    word_count: number
    character_count: number
  }
}

interface SavedProject {
  id: string
  project_name: string
  project_description: string
  business_domain: string
  priority: string
  document_count: number
  created_at: string
  updated_at: string
  tags: string[]
}

interface FullSavedProject {
  id: string
  user_id: string
  project_scope: ProjectScope
  generated_documents: GeneratedDocument[]
  created_at: string
  updated_at: string
  tags: string[]
  document_count: number
}

const AIProjectArtifactGeneratorPageV2: React.FC = () => {
  // Tab state
  const [activeTab, setActiveTab] = useState<'generator' | 'samples' | 'projects'>('generator')
  
  // Generator state
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [viewingDocument, setViewingDocument] = useState<GeneratedDocument | null>(null)
  const [generationTime, setGenerationTime] = useState<number>(0)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

  // Projects state
  const [savedProjects, setSavedProjects] = useState<SavedProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterDomain, setFilterDomain] = useState('')
  const [filterPriority, setFilterPriority] = useState('')

  // Sample projects state
  const [sampleProjects, setSampleProjects] = useState<any[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [expandedSample, setExpandedSample] = useState<string | null>(null)

  const [projectScope, setProjectScope] = useState<ProjectScope>({
    project_name: '',
    project_description: '',
    project_objectives: [''],
    target_audience: '',
    stakeholders: [''],
    technical_requirements: [''],
    technical_constraints: [''],
    technology_stack: [''],
    timeline: '',
    budget_range: '',
    priority: 'medium',
    business_domain: '',
    business_context: '',
    success_criteria: [''],
    risks_and_assumptions: [''],
    compliance_requirements: ['']
  })

  const [additionalInstructions, setAdditionalInstructions] = useState('')

  // Load sample projects on mount
  useEffect(() => {
    if (activeTab === 'samples') {
      loadSampleProjects()
    }
  }, [activeTab])

  // Load saved projects on mount
  useEffect(() => {
    if (activeTab === 'projects') {
      loadSavedProjects()
    }
  }, [activeTab])

  const loadSampleProjects = async () => {
    setLoadingSamples(true)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/api/ai-project-generator/sample-projects`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to load sample projects')

      const data = await response.json()
      setSampleProjects(data.samples || [])
    } catch (error: any) {
      console.error('Error loading sample projects:', error)
      toast.error('Failed to load sample projects')
    } finally {
      setLoadingSamples(false)
    }
  }

  const loadSavedProjects = async () => {
    setLoadingProjects(true)
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterDomain) params.append('domain', filterDomain)
      if (filterPriority) params.append('priority', filterPriority)

      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to load saved projects')

      const data = await response.json()
      setSavedProjects(data)
    } catch (error: any) {
      console.error('Error loading saved projects:', error)
      toast.error('Failed to load saved projects')
    } finally {
      setLoadingProjects(false)
    }
  }

  const loadProjectToGenerator = (scope: ProjectScope) => {
    setProjectScope(scope)
    setActiveTab('generator')
    setStep(1)
    toast.success('Project loaded into generator')
  }

  const loadSampleProject = (sample: any) => {
    loadProjectToGenerator(sample.project_scope)
    setSelectedDocuments(sample.document_types || [])
  }

  const loadSavedProject = async (projectId: string) => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to load project')

      const project: FullSavedProject = await response.json()
      
      setProjectScope(project.project_scope)
      setGeneratedDocuments(project.generated_documents)
      setCurrentProjectId(project.id)
      setActiveTab('generator')
      setStep(3) // Go to results view
      
      toast.success('Project loaded successfully')
    } catch (error: any) {
      console.error('Error loading project:', error)
      toast.error('Failed to load project')
    }
  }

  const deleteSavedProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects/${projectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete project')

      toast.success('Project deleted successfully')
      loadSavedProjects()
    } catch (error: any) {
      console.error('Error deleting project:', error)
      toast.error('Failed to delete project')
    }
  }

  const saveProject = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      
      const requestBody = {
        project_scope: projectScope,
        generated_documents: generatedDocuments,
        tags: []
      }

      const response = await fetch(`${backendUrl}/api/ai-project-generator/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) throw new Error('Failed to save project')

      const savedProject = await response.json()
      setCurrentProjectId(savedProject.id)
      
      toast.success('Project saved successfully!')
    } catch (error: any) {
      console.error('Error saving project:', error)
      toast.error('Failed to save project')
    }
  }

  const generateSampleDocuments = async (sample: any) => {
    setIsGenerating(true)
    try {
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
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      // Load project to generator with results
      setProjectScope(sample.project_scope)
      setGeneratedDocuments(data.documents)
      setGenerationTime(data.generation_time)
      setActiveTab('generator')
      setStep(3)
      
      toast.success(`Successfully generated ${data.documents.length} documents in ${data.generation_time.toFixed(2)}s`)
    } catch (error: any) {
      console.error('Error generating documents:', error)
      toast.error(`Failed to generate documents: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  // Helper functions for array fields
  const addArrayItem = (field: keyof ProjectScope, value: string = '') => {
    setProjectScope(prev => ({
      ...prev,
      [field]: [...(prev[field] as string[]), value]
    }))
  }

  const removeArrayItem = (field: keyof ProjectScope, index: number) => {
    setProjectScope(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index)
    }))
  }

  const updateArrayItem = (field: keyof ProjectScope, index: number, value: string) => {
    setProjectScope(prev => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) => i === index ? value : item)
    }))
  }

  const handleDocumentSelection = (documentType: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentType)
        ? prev.filter(type => type !== documentType)
        : [...prev, documentType]
    )
  }

  const generateDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('Please select at least one document type')
      return
    }

    if (!projectScope.project_name.trim() || !projectScope.project_description.trim()) {
      toast.error('Please fill in project name and description')
      return
    }

    setIsGenerating(true)
    setGeneratedDocuments([])

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'
      
      const cleanedScope = {
        ...projectScope,
        project_objectives: projectScope.project_objectives.filter(obj => obj.trim()),
        stakeholders: projectScope.stakeholders.filter(s => s.trim()),
        technical_requirements: projectScope.technical_requirements.filter(req => req.trim()),
        technical_constraints: projectScope.technical_constraints.filter(cons => cons.trim()),
        technology_stack: projectScope.technology_stack.filter(tech => tech.trim()),
        success_criteria: projectScope.success_criteria.filter(crit => crit.trim()),
        risks_and_assumptions: projectScope.risks_and_assumptions.filter(risk => risk.trim()),
        compliance_requirements: projectScope.compliance_requirements.filter(comp => comp.trim())
      }

      const requestBody = {
        project_scope: cleanedScope,
        document_types: selectedDocuments,
        additional_instructions: additionalInstructions.trim() || undefined
      }

      const response = await fetch(`${backendUrl}/api/ai-project-generator/generate-documents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setGeneratedDocuments(data.documents)
      setGenerationTime(data.generation_time)
      setStep(3)
      
      toast.success(`Successfully generated ${data.documents.length} documents in ${data.generation_time.toFixed(2)}s`)

    } catch (error: any) {
      console.error('Error generating documents:', error)
      toast.error(`Failed to generate documents: ${error.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const copyToClipboard = async (content: string, title: string) => {
    try {
      await navigator.clipboard.writeText(content)
      toast.success(`${title} copied to clipboard!`)
    } catch (error) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const downloadDocument = (document: GeneratedDocument, format: string = 'txt') => {
    const blob = new Blob([document.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = window.document.createElement('a')
    a.href = url
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`
    window.document.body.appendChild(a)
    a.click()
    window.document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${document.title}`)
  }

  // Render functions will be continued in next message due to size...
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
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
          <div className="flex space-x-1 mt-6 border-b border-gray-200">
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
        {activeTab === 'generator' && renderGeneratorTab()}
        {activeTab === 'samples' && renderSamplesTab()}
        {activeTab === 'projects' && renderProjectsTab()}
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && renderDocumentViewer()}
    </div>
  )

  // Render functions continue in the rest of the file...
  // Due to message size limits, I'll add them in a second part
}

export default AIProjectArtifactGeneratorPageV2
