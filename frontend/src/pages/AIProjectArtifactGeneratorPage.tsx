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
  Zap
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

interface AIProjectArtifactGeneratorPageProps {
  loadedProjectScope?: ProjectScope | null
  loadedDocumentTypes?: string[]
  onProjectSaved?: () => void
}

const AIProjectArtifactGeneratorPage: React.FC<AIProjectArtifactGeneratorPageProps> = ({ 
  loadedProjectScope,
  loadedDocumentTypes,
  onProjectSaved
}) => {
  const [step, setStep] = useState(1)
  const [isGenerating, setIsGenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([])
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([])
  const [viewingDocument, setViewingDocument] = useState<GeneratedDocument | null>(null)
  const [generationTime, setGenerationTime] = useState<number>(0)
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null)

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

  // Load project scope when passed from parent
  useEffect(() => {
    if (loadedProjectScope) {
      setProjectScope(loadedProjectScope)
    }
  }, [loadedProjectScope])

  // Load document types when passed from parent
  useEffect(() => {
    if (loadedDocumentTypes && loadedDocumentTypes.length > 0) {
      setSelectedDocuments(loadedDocumentTypes)
    }
  }, [loadedDocumentTypes])

  // Save project function
  const saveProject = async () => {
    if (!generatedDocuments || generatedDocuments.length === 0) {
      toast.error('No documents to save')
      return
    }

    setIsSaving(true)
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
      
      if (onProjectSaved) {
        onProjectSaved()
      }
    } catch (error: any) {
      console.error('Error saving project:', error)
      toast.error('Failed to save project')
    } finally {
      setIsSaving(false)
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
      
      // Clean up the project scope - remove empty strings from arrays
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
    const a = document.createElement('a')
    a.href = url
    a.download = `${document.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.${format}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${document.title}`)
  }

  const renderProjectScopeForm = () => (
    <div className="space-y-8">
      {/* Basic Information */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <FileText className="h-5 w-5 mr-2 text-blue-600" />
          Basic Project Information
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project Name *
            </label>
            <input
              type="text"
              value={projectScope.project_name}
              onChange={(e) => setProjectScope(prev => ({ ...prev, project_name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter project name"
              data-testid="project-name-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Domain *
            </label>
            <input
              type="text"
              value={projectScope.business_domain}
              onChange={(e) => setProjectScope(prev => ({ ...prev, business_domain: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., E-commerce, Healthcare, Fintech"
              data-testid="business-domain-input"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Description *
          </label>
          <textarea
            value={projectScope.project_description}
            onChange={(e) => setProjectScope(prev => ({ ...prev, project_description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
            placeholder="Provide a detailed description of the project"
            data-testid="project-description-input"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Timeline *
            </label>
            <input
              type="text"
              value={projectScope.timeline}
              onChange={(e) => setProjectScope(prev => ({ ...prev, timeline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., 6 months, Q1 2024"
              data-testid="timeline-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Range
            </label>
            <input
              type="text"
              value={projectScope.budget_range}
              onChange={(e) => setProjectScope(prev => ({ ...prev, budget_range: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., $100K-500K"
              data-testid="budget-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Priority
            </label>
            <select
              value={projectScope.priority}
              onChange={(e) => setProjectScope(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="priority-select"
            >
              {PRIORITY_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stakeholders */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Lightbulb className="h-5 w-5 mr-2 text-green-600" />
          Stakeholders & Audience
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Target Audience *
            </label>
            <textarea
              value={projectScope.target_audience}
              onChange={(e) => setProjectScope(prev => ({ ...prev, target_audience: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
              placeholder="Describe the primary users and target audience"
              data-testid="target-audience-input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Business Context
            </label>
            <textarea
              value={projectScope.business_context}
              onChange={(e) => setProjectScope(prev => ({ ...prev, business_context: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-20"
              placeholder="Additional business context and background"
              data-testid="business-context-input"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Key Stakeholders *
          </label>
          {projectScope.stakeholders.map((stakeholder, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={stakeholder}
                onChange={(e) => updateArrayItem('stakeholders', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter stakeholder name/role"
                data-testid={`stakeholder-input-${index}`}
              />
              {projectScope.stakeholders.length > 1 && (
                <button
                  onClick={() => removeArrayItem('stakeholders', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-stakeholder-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addArrayItem('stakeholders')}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            data-testid="add-stakeholder-btn"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Stakeholder
          </button>
        </div>
      </div>

      {/* Project Objectives */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-purple-600" />
          Objectives & Success Criteria
        </h3>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Project Objectives *
          </label>
          {projectScope.project_objectives.map((objective, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={objective}
                onChange={(e) => updateArrayItem('project_objectives', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter project objective"
                data-testid={`objective-input-${index}`}
              />
              {projectScope.project_objectives.length > 1 && (
                <button
                  onClick={() => removeArrayItem('project_objectives', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-objective-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
          <button
            onClick={() => addArrayItem('project_objectives')}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium mb-4"
            data-testid="add-objective-btn"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Objective
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Success Criteria
          </label>
          {projectScope.success_criteria.map((criteria, index) => (
            <div key={index} className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={criteria}
                onChange={(e) => updateArrayItem('success_criteria', index, e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter success criteria"
                data-testid={`success-criteria-input-${index}`}
              />
              <button
                onClick={() => removeArrayItem('success_criteria', index)}
                className="p-2 text-red-600 hover:text-red-800"
                data-testid={`remove-success-criteria-${index}`}
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            onClick={() => addArrayItem('success_criteria')}
            className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
            data-testid="add-success-criteria-btn"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Success Criteria
          </button>
        </div>
      </div>

      {/* Technical Details */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Settings className="h-5 w-5 mr-2 text-orange-600" />
          Technical Details
        </h3>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technology Stack
            </label>
            {projectScope.technology_stack.map((tech, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={tech}
                  onChange={(e) => updateArrayItem('technology_stack', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., React, Node.js, MongoDB"
                  data-testid={`tech-stack-input-${index}`}
                />
                <button
                  onClick={() => removeArrayItem('technology_stack', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-tech-stack-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('technology_stack')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="add-tech-stack-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Technology
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technical Requirements
            </label>
            {projectScope.technical_requirements.map((req, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={req}
                  onChange={(e) => updateArrayItem('technical_requirements', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technical requirement"
                  data-testid={`tech-req-input-${index}`}
                />
                <button
                  onClick={() => removeArrayItem('technical_requirements', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-tech-req-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('technical_requirements')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="add-tech-req-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Requirement
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Technical Constraints
            </label>
            {projectScope.technical_constraints.map((constraint, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={constraint}
                  onChange={(e) => updateArrayItem('technical_constraints', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter technical constraint"
                  data-testid={`tech-constraint-input-${index}`}
                />
                <button
                  onClick={() => removeArrayItem('technical_constraints', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-tech-constraint-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('technical_constraints')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="add-tech-constraint-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Constraint
            </button>
          </div>
        </div>
      </div>

      {/* Risk & Compliance */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2 text-red-600" />
          Risks & Compliance
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Risks & Assumptions
            </label>
            {projectScope.risks_and_assumptions.map((risk, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={risk}
                  onChange={(e) => updateArrayItem('risks_and_assumptions', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter risk or assumption"
                  data-testid={`risk-input-${index}`}
                />
                <button
                  onClick={() => removeArrayItem('risks_and_assumptions', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-risk-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('risks_and_assumptions')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="add-risk-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Risk/Assumption
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Compliance Requirements
            </label>
            {projectScope.compliance_requirements.map((compliance, index) => (
              <div key={index} className="flex items-center space-x-2 mb-2">
                <input
                  type="text"
                  value={compliance}
                  onChange={(e) => updateArrayItem('compliance_requirements', index, e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., GDPR, HIPAA, SOX"
                  data-testid={`compliance-input-${index}`}
                />
                <button
                  onClick={() => removeArrayItem('compliance_requirements', index)}
                  className="p-2 text-red-600 hover:text-red-800"
                  data-testid={`remove-compliance-${index}`}
                >
                  <Minus className="h-4 w-4" />
                </button>
              </div>
            ))}
            <button
              onClick={() => addArrayItem('compliance_requirements')}
              className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
              data-testid="add-compliance-btn"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Compliance Requirement
            </button>
          </div>
        </div>
      </div>

      {/* Additional Instructions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Additional Instructions (Optional)
        </h3>
        <textarea
          value={additionalInstructions}
          onChange={(e) => setAdditionalInstructions(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 h-24"
          placeholder="Any specific requirements or instructions for document generation..."
          data-testid="additional-instructions-input"
        />
      </div>
    </div>
  )

  const renderDocumentSelection = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Documents to Generate</h2>
        <p className="text-gray-600">
          Choose which project artifacts you'd like to generate based on your project scope.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {DOCUMENT_TYPES.map((docType) => {
          const Icon = docType.icon
          const isSelected = selectedDocuments.includes(docType.value)
          
          return (
            <div
              key={docType.value}
              className={`relative border-2 rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleDocumentSelection(docType.value)}
              data-testid={`document-type-${docType.value}`}
            >
              {isSelected && (
                <div className="absolute top-2 right-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
              )}
              
              <div className="flex items-start space-x-3">
                <Icon className={`h-6 w-6 mt-1 ${isSelected ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="flex-1 min-w-0">
                  <h3 className={`text-sm font-semibold ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                    {docType.label}
                  </h3>
                  <p className={`text-xs mt-1 ${isSelected ? 'text-blue-700' : 'text-gray-500'}`}>
                    {docType.description}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center">
        <p className="text-sm text-gray-500">
          Selected: {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )

  const renderGeneratedDocuments = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Generated Documents</h2>
        <p className="text-gray-600">
          Successfully generated {generatedDocuments.length} documents in {generationTime.toFixed(2)} seconds.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {generatedDocuments.map((doc, index) => {
          const docType = DOCUMENT_TYPES.find(type => type.value === doc.document_type)
          const Icon = docType?.icon || FileText

          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Icon className="h-6 w-6 text-blue-600" />
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900 truncate">
                      {docType?.label || doc.document_type}
                    </h3>
                  </div>
                </div>
              </div>

              <div className="space-y-2 text-xs text-gray-500">
                <p>Words: {doc.metadata.word_count.toLocaleString()}</p>
                <p>Characters: {doc.metadata.character_count.toLocaleString()}</p>
                <p>Generated: {new Date(doc.metadata.generated_at).toLocaleString()}</p>
              </div>

              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setViewingDocument(doc)}
                  className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  data-testid={`view-document-${index}`}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </button>
                
                <button
                  onClick={() => copyToClipboard(doc.content, doc.title)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  data-testid={`copy-document-${index}`}
                >
                  <Copy className="h-4 w-4" />
                </button>
                
                <button
                  onClick={() => downloadDocument(doc)}
                  className="px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                  data-testid={`download-document-${index}`}
                >
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="text-center flex justify-center space-x-4">
        <button
          onClick={saveProject}
          disabled={isSaving || !!currentProjectId}
          className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          data-testid="save-project-btn"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : currentProjectId ? (
            <>
              <Save className="h-5 w-5 mr-2" />
              Saved
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save Project
            </>
          )}
        </button>

        <button
          onClick={() => {
            setStep(1)
            setGeneratedDocuments([])
            setSelectedDocuments([])
            setCurrentProjectId(null)
          }}
          className="inline-flex items-center px-6 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 transition-colors"
          data-testid="generate-new-documents-btn"
        >
          <RefreshCw className="h-5 w-5 mr-2" />
          Generate New Documents
        </button>
      </div>
    </div>
  )

  const renderDocumentViewer = () => {
    if (!viewingDocument) return null

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg w-full max-w-4xl h-full max-h-screen flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-semibold text-gray-900 truncate">
                {viewingDocument.title}
              </h2>
              <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                <span>Words: {viewingDocument.metadata.word_count.toLocaleString()}</span>
                <span>Characters: {viewingDocument.metadata.character_count.toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => copyToClipboard(viewingDocument.content, viewingDocument.title)}
                className="flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                data-testid="copy-document-viewer"
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy
              </button>
              
              <button
                onClick={() => downloadDocument(viewingDocument)}
                className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                data-testid="download-document-viewer"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </button>
              
              <button
                onClick={() => setViewingDocument(null)}
                className="flex items-center px-3 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 transition-colors"
                data-testid="close-document-viewer"
              >
                Close
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-6">
              <div className="prose max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-800 font-mono">
                  {viewingDocument.content}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
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
            
            {/* Step Indicator */}
            <div className="flex items-center space-x-4">
              {[1, 2, 3].map((stepNum) => (
                <div
                  key={stepNum}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                    stepNum === step
                      ? 'bg-blue-600 border-blue-600 text-white'
                      : stepNum < step
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-white border-gray-300 text-gray-400'
                  }`}
                >
                  {stepNum < step ? (
                    <CheckCircle className="h-6 w-6" />
                  ) : (
                    stepNum
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step Labels */}
          <div className="flex justify-end mt-2">
            <div className="flex space-x-8 text-xs text-gray-500">
              <span className={step >= 1 ? 'text-blue-600 font-medium' : ''}>Project Scope</span>
              <span className={step >= 2 ? 'text-blue-600 font-medium' : ''}>Document Selection</span>
              <span className={step >= 3 ? 'text-blue-600 font-medium' : ''}>Generated Documents</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="mb-8">
          {step === 1 && renderProjectScopeForm()}
          {step === 2 && renderDocumentSelection()}
          {step === 3 && renderGeneratedDocuments()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center bg-white rounded-lg border border-gray-200 p-6">
          <div>
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center px-6 py-2 border border-gray-300 text-gray-700 font-medium rounded-md hover:bg-gray-50 transition-colors"
                data-testid="previous-step-btn"
              >
                Previous
              </button>
            )}
          </div>

          <div className="flex items-center space-x-4">
            {step === 1 && (
              <button
                onClick={() => setStep(2)}
                className="flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                disabled={!projectScope.project_name.trim() || !projectScope.project_description.trim() || !projectScope.target_audience.trim()}
                data-testid="next-to-selection-btn"
              >
                Continue to Document Selection
              </button>
            )}

            {step === 2 && (
              <button
                onClick={generateDocuments}
                disabled={isGenerating || selectedDocuments.length === 0}
                className="flex items-center px-8 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                data-testid="generate-documents-btn"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Generating Documents...
                  </>
                ) : (
                  <>
                    <Zap className="h-5 w-5 mr-2" />
                    Generate Documents ({selectedDocuments.length})
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {renderDocumentViewer()}
    </div>
  )
}

export default AIProjectArtifactGeneratorPage