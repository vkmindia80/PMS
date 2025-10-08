import React, { useState, useEffect } from 'react'
import { BookOpen, ChevronDown, ChevronUp, Zap, FileText, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'

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

interface SampleProject {
  id: string
  project_scope: ProjectScope
  document_types: string[]
}

interface SampleProjectsTabProps {
  onLoadSample: (scope: ProjectScope, documentTypes: string[]) => void
  onGenerateSample: (sample: SampleProject) => void
  isGenerating: boolean
}

const SampleProjectsTab: React.FC<SampleProjectsTabProps> = ({ 
  onLoadSample, 
  onGenerateSample,
  isGenerating 
}) => {
  const [sampleProjects, setSampleProjects] = useState<SampleProject[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSample, setExpandedSample] = useState<string | null>(null)

  useEffect(() => {
    loadSampleProjects()
  }, [])

  const loadSampleProjects = async () => {
    setLoading(true)
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
      setLoading(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    const colors: { [key: string]: string } = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800'
    }
    return colors[priority] || 'bg-gray-100 text-gray-800'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading sample projects...</p>
        </div>
      </div>
    )
  }

  if (sampleProjects.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Sample Projects Available</h3>
        <p className="text-gray-600">Sample projects will be displayed here once available.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Sample Projects</h2>
        <p className="text-gray-600">
          Browse pre-configured project templates to get started quickly
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {sampleProjects.map((sample) => (
          <div
            key={sample.id}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow duration-200"
            data-testid={`sample-project-${sample.id}`}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {sample.project_scope.project_name}
                  </h3>
                  <p className="text-gray-600 mb-3">
                    {sample.project_scope.project_description}
                  </p>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-medium text-gray-700">
                      {sample.project_scope.business_domain}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(sample.project_scope.priority)}`}>
                      {sample.project_scope.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">
                      {sample.document_types.length} documents
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Expandable Content */}
            <div className="p-6 bg-gray-50">
              <button
                onClick={() => setExpandedSample(expandedSample === sample.id ? null : sample.id)}
                className="flex items-center justify-between w-full text-left mb-4"
                data-testid={`expand-sample-${sample.id}`}
              >
                <span className="text-sm font-medium text-gray-700">View Project Details</span>
                {expandedSample === sample.id ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>

              {expandedSample === sample.id && (
                <div className="space-y-4 mb-4">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Objectives</h4>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {sample.project_scope.project_objectives.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Target Audience</h4>
                    <p className="text-sm text-gray-600">{sample.project_scope.target_audience}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Timeline</h4>
                      <p className="text-sm text-gray-600">{sample.project_scope.timeline}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Budget Range</h4>
                      <p className="text-sm text-gray-600">{sample.project_scope.budget_range || 'TBD'}</p>
                    </div>
                  </div>

                  {sample.project_scope.technology_stack && sample.project_scope.technology_stack.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2">Technology Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {sample.project_scope.technology_stack.map((tech, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-semibold text-gray-900 mb-2">Document Types</h4>
                    <div className="flex flex-wrap gap-2">
                      {sample.document_types.map((docType, idx) => (
                        <span key={idx} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {docType.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => onLoadSample(sample.project_scope, sample.document_types)}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                  data-testid={`load-sample-${sample.id}`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Load to Generator
                </button>
                
                <button
                  onClick={() => onGenerateSample(sample)}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center px-4 py-3 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                  data-testid={`generate-sample-${sample.id}`}
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="h-4 w-4 mr-2" />
                      Generate Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SampleProjectsTab
