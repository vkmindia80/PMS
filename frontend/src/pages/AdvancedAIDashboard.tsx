/**
 * Advanced AI/ML Dashboard - Phase 4.1
 * Multi-model AI integration with real-time predictive analytics
 */
import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  TrendingUp, 
  Cpu, 
  Zap, 
  BarChart3, 
  Network, 
  Sparkles, 
  Target,
  GitBranch,
  Users,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Lightbulb
} from 'lucide-react'
import GlobalProjectFilter from '../components/common/GlobalProjectFilter'
import { useProjectFilterContext } from '../contexts/ProjectFilterContext'
import aiService from '../services/aiService'
import tensorflowService from '../services/tensorflowService'

interface AIModel {
  model: string
  provider: string
  capabilities: string[]
  max_tokens: number
  cost_per_token: number
}

interface ModelComparison {
  prompt: string
  models_compared: number
  responses: Record<string, any>
  summary: {
    best_model?: string
    avg_response_time: number
    total_tokens: number
  }
  timestamp: string
}

interface PredictionResult {
  prediction: number | number[]
  confidence: number
  modelUsed: string
  processingTime: number
  timestamp: string
}

const AdvancedAIDashboard: React.FC = () => {
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4o')
  const [aiPrompt, setAiPrompt] = useState<string>('')
  const [aiResponse, setAiResponse] = useState<string>('')
  const [modelComparison, setModelComparison] = useState<ModelComparison | null>(null)
  const [tensorflowInfo, setTensorflowInfo] = useState<any>(null)
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({})
  const [loading, setLoading] = useState<boolean>(false)
  const [activeTab, setActiveTab] = useState<string>('ai-models')

  useEffect(() => {
    initializeAIServices()
  }, [])

  const initializeAIServices = async () => {
    try {
      // Load available AI models
      const models = await aiService.getAvailableModels()
      setAvailableModels(models)

      // Initialize TensorFlow.js
      await tensorflowService.initialize()
      const tfInfo = tensorflowService.getSystemInfo()
      setTensorflowInfo(tfInfo)

      console.log('✅ AI Services initialized successfully')
    } catch (error) {
      console.error('❌ AI Services initialization error:', error)
    }
  }

  const generateAIResponse = async () => {
    if (!aiPrompt.trim()) return

    setLoading(true)
    try {
      const response = await aiService.generateResponse({
        prompt: aiPrompt,
        model: selectedModel,
        context: {
          dashboard_context: 'enterprise_portfolio_management',
          user_role: 'admin',
          timestamp: new Date().toISOString()
        },
        temperature: 0.7
      })

      setAiResponse(response.content || 'No response received')
    } catch (error) {
      console.error('AI generation error:', error)
      setAiResponse('Error generating response')
    } finally {
      setLoading(false)
    }
  }

  const compareModels = async () => {
    if (!aiPrompt.trim()) return

    setLoading(true)
    try {
      const comparison = await aiService.compareModels({
        prompt: aiPrompt,
        models: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-2.0-pro'],
        context: {
          comparison_mode: true,
          analysis_type: 'enterprise_insights'
        }
      })

      setModelComparison(comparison)
    } catch (error) {
      console.error('Model comparison error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runTaskDurationPrediction = async () => {
    setLoading(true)
    try {
      // Sample task data
      const taskData = {
        complexity_score: 7,
        priority_weight: 2,
        required_skills_count: 3,
        estimated_hours: 16,
        dependencies_count: 2,
        has_external_dependency: true,
        team_size: 4,
        experience_level: 6
      }

      // Convert to feature array
      const features = [
        taskData.complexity_score,
        taskData.priority_weight,
        taskData.required_skills_count,
        taskData.estimated_hours,
        taskData.dependencies_count,
        taskData.has_external_dependency ? 1 : 0,
        taskData.team_size,
        taskData.experience_level
      ]

      const result = await tensorflowService.predict('task_duration', features, {
        returnConfidence: true
      })

      setPredictions(prev => ({
        ...prev,
        task_duration: result
      }))
    } catch (error) {
      console.error('Task duration prediction error:', error)
    } finally {
      setLoading(false)
    }
  }

  const runProjectSuccessPrediction = async () => {
    setLoading(true)
    try {
      // Sample project data
      const projectData = {
        budget_adequacy: 6,
        stakeholder_alignment: 7,
        scope_clarity: 5,
        timeline_realism: 6,
        team_experience: 7,
        technical_risk: 4,
        complexity_score: 6,
        has_executive_sponsor: true
      }

      const features = [
        projectData.budget_adequacy,
        projectData.stakeholder_alignment,
        projectData.scope_clarity,
        projectData.timeline_realism,
        projectData.team_experience,
        projectData.technical_risk,
        projectData.complexity_score,
        projectData.has_executive_sponsor ? 1 : 0
      ]

      const result = await tensorflowService.predict('project_success', features, {
        returnConfidence: true
      })

      setPredictions(prev => ({
        ...prev,
        project_success: result
      }))
    } catch (error) {
      console.error('Project success prediction error:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateComprehensiveInsights = async () => {
    if (!aiPrompt.trim()) return

    setLoading(true)
    try {
      const insights = await aiService.generateComprehensiveInsights(
        {
          portfolio_data: {
            active_projects: 12,
            total_resources: 45,
            utilization_rate: 0.78,
            avg_project_success_rate: 0.85
          },
          team_performance: {
            productivity_score: 0.82,
            collaboration_effectiveness: 0.75,
            skill_development_rate: 0.68
          }
        },
        'portfolio_optimization'
      )

      setAiResponse(`
        **Comprehensive AI Insights**
        
        ${insights.insights}
        
        **Analysis Type:** ${insights.analysis_type}
        **Model Used:** ${insights.model_used}
        **Confidence:** ${(insights.confidence * 100).toFixed(1)}%
        **Generated:** ${new Date(insights.timestamp).toLocaleString()}
      `)
    } catch (error) {
      console.error('Comprehensive insights error:', error)
      setAiResponse('Error generating comprehensive insights')
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'ai-models', label: 'Multi-Model AI', icon: Brain },
    { id: 'tensorflow', label: 'Client ML', icon: Cpu },
    { id: 'predictions', label: 'Predictions', icon: TrendingUp },
    { id: 'insights', label: 'AI Insights', icon: Lightbulb }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Advanced AI/ML Dashboard
              </h1>
              <p className="text-slate-600">
                Multi-model AI integration with real-time predictive analytics
              </p>
            </div>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">AI Models</p>
                  <p className="text-2xl font-bold text-blue-600">{availableModels.length}</p>
                </div>
                <Network className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">TensorFlow.js</p>
                  <p className="text-2xl font-bold text-green-600">
                    {tensorflowInfo?.isInitialized ? 'Ready' : 'Loading'}
                  </p>
                </div>
                <Cpu className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">ML Models</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {tensorflowInfo?.loadedModels || 0}
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600">Backend</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {tensorflowInfo?.backend || 'Unknown'}
                  </p>
                </div>
                <Zap className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 bg-white p-1 rounded-lg shadow-sm border">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* AI Models Tab */}
          {activeTab === 'ai-models' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI Model Selection */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Brain className="h-5 w-5 text-blue-500" />
                  Multi-Model AI Generation
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select AI Model
                    </label>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availableModels.map((model) => (
                        <option key={model.model} value={model.model}>
                          {model.model} ({model.provider})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      AI Prompt
                    </label>
                    <textarea
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="Enter your AI prompt for analysis..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={generateAIResponse}
                      disabled={loading || !aiPrompt.trim()}
                      className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      {loading ? 'Generating...' : 'Generate Response'}
                    </button>
                    <button
                      onClick={compareModels}
                      disabled={loading || !aiPrompt.trim()}
                      className="flex-1 bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white px-4 py-2 rounded-md font-medium transition-colors"
                    >
                      Compare Models
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Response */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-500" />
                  AI Response
                </h2>

                <div className="bg-slate-50 rounded-lg p-4 min-h-[200px]">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    </div>
                  ) : aiResponse ? (
                    <div className="whitespace-pre-wrap text-slate-700">{aiResponse}</div>
                  ) : (
                    <div className="text-slate-400 italic">AI response will appear here...</div>
                  )}
                </div>
              </div>

              {/* Model Comparison Results */}
              {modelComparison && (
                <div className="lg:col-span-2 bg-white rounded-lg p-6 shadow-sm border">
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <GitBranch className="h-5 w-5 text-green-500" />
                    Model Comparison Results
                  </h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Object.entries(modelComparison.responses).map(([model, response]: [string, any]) => (
                      <div key={model} className="border rounded-lg p-4">
                        <h3 className="font-semibold text-lg mb-2 capitalize">
                          {model.replace('-', ' ')}
                        </h3>
                        <p className="text-sm text-slate-600 mb-2">
                          Provider: {response.provider}
                        </p>
                        <div className="bg-slate-50 rounded p-3 text-sm">
                          {response.success ? (
                            <div>
                              <p className="text-slate-700 mb-2">
                                {response.content?.substring(0, 150)}...
                              </p>
                              <p className="text-xs text-slate-500">
                                Tokens: {response.tokens_used}
                              </p>
                            </div>
                          ) : (
                            <p className="text-red-600">Error: {response.error}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TensorFlow.js Tab */}
          {activeTab === 'tensorflow' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* TensorFlow.js Status */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Cpu className="h-5 w-5 text-green-500" />
                  TensorFlow.js Status
                </h2>

                {tensorflowInfo && (
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Backend:</span>
                      <span className="font-medium">{tensorflowInfo.backend}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Version:</span>
                      <span className="font-medium">{tensorflowInfo.version}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Platform:</span>
                      <span className="font-medium">{tensorflowInfo.platform}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Loaded Models:</span>
                      <span className="font-medium">{tensorflowInfo.loadedModels}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Status:</span>
                      <span className={`font-medium ${tensorflowInfo.isInitialized ? 'text-green-600' : 'text-red-600'}`}>
                        {tensorflowInfo.isInitialized ? 'Initialized' : 'Not Initialized'}
                      </span>
                    </div>

                    {tensorflowInfo.memory && (
                      <div className="mt-4 p-3 bg-slate-50 rounded">
                        <p className="text-sm font-medium text-slate-700 mb-2">Memory Usage:</p>
                        <div className="text-xs text-slate-600 space-y-1">
                          <div>Tensors: {tensorflowInfo.memory.numTensors}</div>
                          <div>Bytes: {(tensorflowInfo.memory.numBytes / 1024 / 1024).toFixed(2)} MB</div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Model Information */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Network className="h-5 w-5 text-blue-500" />
                  Available ML Models
                </h2>

                <div className="space-y-3">
                  {tensorflowService.getLoadedModels().map((modelName) => {
                    const modelInfo = tensorflowService.getModelInfo(modelName)
                    return (
                      <div key={modelName} className="border rounded-lg p-3">
                        <h3 className="font-medium text-lg">{modelName}</h3>
                        {modelInfo && (
                          <div className="mt-2 text-sm text-slate-600 space-y-1">
                            <div>Type: {modelInfo.type}</div>
                            <div>Parameters: {modelInfo.parameters?.toLocaleString()}</div>
                            <div>Layers: {modelInfo.layers}</div>
                            <div>Input Shape: [{modelInfo.inputShape?.join(', ')}]</div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Predictions Tab */}
          {activeTab === 'predictions' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Prediction Controls */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Run Predictions
                </h2>

                <div className="space-y-4">
                  <button
                    onClick={runTaskDurationPrediction}
                    disabled={loading}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  >
                    Predict Task Duration
                  </button>

                  <button
                    onClick={runProjectSuccessPrediction}
                    disabled={loading}
                    className="w-full bg-green-500 hover:bg-green-600 disabled:bg-slate-300 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  >
                    Predict Project Success
                  </button>

                  <button
                    onClick={generateComprehensiveInsights}
                    disabled={loading}
                    className="w-full bg-purple-500 hover:bg-purple-600 disabled:bg-slate-300 text-white px-4 py-3 rounded-md font-medium transition-colors"
                  >
                    Generate AI Insights
                  </button>
                </div>
              </div>

              {/* Prediction Results */}
              <div className="bg-white rounded-lg p-6 shadow-sm border">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-green-500" />
                  Prediction Results
                </h2>

                <div className="space-y-4">
                  {Object.entries(predictions).map(([predictionType, result]) => (
                    <div key={predictionType} className="border rounded-lg p-4">
                      <h3 className="font-medium text-lg capitalize mb-2">
                        {predictionType.replace('_', ' ')}
                      </h3>
                      <div className="text-sm text-slate-600 space-y-1">
                        <div>
                          <span className="font-medium">Prediction:</span>{' '}
                          {typeof result.prediction === 'number' 
                            ? result.prediction.toFixed(2) 
                            : JSON.stringify(result.prediction)
                          }
                        </div>
                        <div>
                          <span className="font-medium">Confidence:</span>{' '}
                          {(result.confidence * 100).toFixed(1)}%
                        </div>
                        <div>
                          <span className="font-medium">Model:</span> {result.modelUsed}
                        </div>
                        <div>
                          <span className="font-medium">Processing Time:</span>{' '}
                          {result.processingTime}ms
                        </div>
                      </div>
                    </div>
                  ))}

                  {Object.keys(predictions).length === 0 && (
                    <div className="text-slate-400 italic text-center py-8">
                      No predictions yet. Click the buttons to run predictions.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* AI Insights Tab */}
          {activeTab === 'insights' && (
            <div className="bg-white rounded-lg p-6 shadow-sm border">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                AI-Powered Insights
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-800">Team Performance</h3>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">82%</p>
                  <p className="text-sm text-blue-600">Productivity Score</p>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-800">Success Rate</h3>
                  </div>
                  <p className="text-2xl font-bold text-green-600">85%</p>
                  <p className="text-sm text-green-600">Project Success</p>
                </div>

                <div className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-800">Time Accuracy</h3>
                  </div>
                  <p className="text-2xl font-bold text-yellow-600">78%</p>
                  <p className="text-sm text-yellow-600">Prediction Accuracy</p>
                </div>

                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                    <h3 className="font-medium text-purple-800">Utilization</h3>
                  </div>
                  <p className="text-2xl font-bold text-purple-600">78%</p>
                  <p className="text-sm text-purple-600">Resource Usage</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-lg p-6">
                <h3 className="font-medium text-lg mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Resource Optimization</p>
                      <p className="text-sm text-slate-600">
                        Consider reallocating 20% of frontend capacity to backend development for better balance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-blue-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Timeline Adjustment</p>
                      <p className="text-sm text-slate-600">
                        Extend Phase 2 by 3 days to reduce risk and improve success probability.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-green-500 mt-0.5" />
                    <div>
                      <p className="font-medium">Skill Development</p>
                      <p className="text-sm text-slate-600">
                        Focus on DevOps training for the team to address identified skill gaps.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdvancedAIDashboard