/**
 * AI/ML Dashboard - Phase 4.1 Advanced Features
 * Multi-Model AI Integration and Client-Side Machine Learning
 */
import React, { useState, useEffect } from 'react'
import { 
  Brain, 
  Zap, 
  TrendingUp, 
  Target, 
  Cpu, 
  BarChart3, 
  Lightbulb,
  Settings,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react'
import GlobalProjectFilter from '../components/common/GlobalProjectFilter'
import { useProjectFilterContext } from '../contexts/ProjectFilterContext'
import aiService, { AIModelResponse, ModelComparison } from '../services/aiService'
import tensorflowService, { PredictionResult, TaskData, PerformanceMetrics } from '../services/tensorflowService'

interface ModelStatus {
  name: string
  provider: string
  status: 'healthy' | 'degraded' | 'error'
  lastUsed?: Date
  tokensUsed?: number
}

const AIMLDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'models' | 'predictions' | 'training' | 'insights'>('models')
  const [modelStatuses, setModelStatuses] = useState<ModelStatus[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIModelResponse | null>(null)
  const [modelComparison, setModelComparison] = useState<ModelComparison | null>(null)
  const [tensorflowReady, setTensorflowReady] = useState(false)
  const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null)
  const [modelMetrics, setModelMetrics] = useState<PerformanceMetrics | null>(null)
  const [prompt, setPrompt] = useState('')
  const [selectedModel, setSelectedModel] = useState('gpt-4o')

  // Sample task data for predictions
  const [sampleTask, setSampleTask] = useState<TaskData>({
    title: 'Implement user authentication system',
    description: 'Build comprehensive JWT-based authentication with role management',
    priority: 'high',
    complexity: 7,
    estimatedHours: 16,
    requiredSkills: ['React', 'Node.js', 'JWT', 'Security'],
    assigneeExperience: 6,
    projectType: 'development',
    hasDeadline: true
  })

  useEffect(() => {
    initializeServices()
    loadModelStatuses()
  }, [])

  const initializeServices = async () => {
    try {
      setIsLoading(true)
      
      // Initialize TensorFlow.js
      await tensorflowService.initialize()
      setTensorflowReady(true)
      console.log('TensorFlow.js initialized successfully')
      
      // Check AI service health
      await aiService.healthCheck()
      console.log('AI service health check passed')
      
    } catch (error) {
      console.error('Failed to initialize services:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadModelStatuses = async () => {
    try {
      const models = await aiService.getAvailableModels()
      const statuses: ModelStatus[] = models.map(model => ({
        name: model.model,
        provider: model.provider,
        status: 'healthy',
        tokensUsed: 0
      }))
      setModelStatuses(statuses)
    } catch (error) {
      console.error('Failed to load model statuses:', error)
    }
  }

  const generateAIResponse = async () => {
    if (!prompt.trim()) return
    
    try {
      setIsLoading(true)
      const response = await aiService.generateResponse({
        prompt,
        model: selectedModel,
        context: { dashboard: 'ai_ml', user_role: 'admin' }
      })
      setAiResponse(response)
    } catch (error) {
      console.error('AI generation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const compareModels = async () => {
    if (!prompt.trim()) return
    
    try {
      setIsLoading(true)
      const comparison = await aiService.compareModels({
        prompt,
        models: ['gpt-4o', 'claude-3.5-sonnet', 'gemini-2.0-pro'],
        context: { comparison_type: 'enterprise_analysis' }
      })
      setModelComparison(comparison)
    } catch (error) {
      console.error('Model comparison error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const predictTaskDuration = async () => {
    if (!tensorflowReady) return
    
    try {
      setIsLoading(true)
      const result = await tensorflowService.predictTaskDuration(sampleTask)
      setPredictionResult(result)
    } catch (error) {
      console.error('Task prediction error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const trainModel = async () => {
    if (!tensorflowReady) return
    
    try {
      setIsLoading(true)
      
      // Generate sample training data
      const trainingData = [
        { taskData: {...sampleTask, complexity: 5}, actualDuration: 12 },
        { taskData: {...sampleTask, complexity: 8}, actualDuration: 20 },
        { taskData: {...sampleTask, complexity: 3}, actualDuration: 8 },
        { taskData: {...sampleTask, complexity: 6}, actualDuration: 14 },
        { taskData: {...sampleTask, complexity: 9}, actualDuration: 25 }
      ]
      
      const metrics = await tensorflowService.trainWithNewData(trainingData)
      setModelMetrics(metrics)
      
      // Save trained models
      await tensorflowService.saveModels()
      
    } catch (error) {
      console.error('Model training error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateInsights = async () => {
    try {
      setIsLoading(true)
      const insights = await aiService.generateComprehensiveInsights(
        {
          activeProjects: 8,
          teamUtilization: 0.85,
          averageTaskCompletion: 0.72,
          skillGaps: ['AI/ML', 'Cloud Architecture'],
          performanceMetrics: modelMetrics
        },
        'ai_ml_optimization'
      )
      setAiResponse({ ...insights, model: insights.model_used, provider: 'multi-model', tokens_used: 500, success: true })
    } catch (error) {
      console.error('Insights generation error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const renderModelsTab = () => (
    <div className="space-y-6">
      {/* Model Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {modelStatuses.map((model) => (
          <div key={model.name} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">{model.name}</h3>
              <div className={`w-3 h-3 rounded-full ${
                model.status === 'healthy' ? 'bg-green-500' : 
                model.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <p className="text-sm text-gray-600 mb-2">Provider: {model.provider}</p>
            <p className="text-sm text-gray-600">Tokens used: {model.tokensUsed || 0}</p>
          </div>
        ))}
      </div>

      {/* AI Interaction */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Interaction</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Model
            </label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="gpt-4o">GPT-4o (OpenAI)</option>
              <option value="claude-3.5-sonnet">Claude 3.5 Sonnet (Anthropic)</option>
              <option value="gemini-2.0-pro">Gemini 2.0 Pro (Google)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={4}
              placeholder="Enter your prompt for AI analysis..."
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={generateAIResponse}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Brain className="w-4 h-4 mr-2" />
              {isLoading ? 'Generating...' : 'Generate Response'}
            </button>
            
            <button
              onClick={compareModels}
              disabled={isLoading || !prompt.trim()}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Compare Models
            </button>
          </div>
        </div>

        {/* AI Response */}
        {aiResponse && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">AI Response</h4>
              <span className="text-sm text-gray-500">
                Model: {aiResponse.model} | Tokens: {aiResponse.tokens_used}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{aiResponse.content}</p>
          </div>
        )}

        {/* Model Comparison */}
        {modelComparison && (
          <div className="mt-6 space-y-4">
            <h4 className="font-medium text-gray-900">Model Comparison Results</h4>
            {Object.entries(modelComparison.responses).map(([model, response]) => (
              <div key={model} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium text-gray-800">{model}</h5>
                  <span className={`px-2 py-1 rounded text-xs ${
                    response.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {response.success ? 'Success' : 'Error'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {response.success ? response.content : response.error}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  const renderPredictionsTab = () => (
    <div className="space-y-6">
      {/* TensorFlow.js Status */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">TensorFlow.js Status</h3>
          <div className={`flex items-center ${tensorflowReady ? 'text-green-600' : 'text-red-600'}`}>
            {tensorflowReady ? <CheckCircle className="w-5 h-5 mr-2" /> : <AlertCircle className="w-5 h-5 mr-2" />}
            {tensorflowReady ? 'Ready' : 'Not Ready'}
          </div>
        </div>
        
        {tensorflowReady && (
          <div className="text-sm text-gray-600">
            <p>Backend: {tensorflowService.getModelInfo().backend}</p>
            <p>Version: {tensorflowService.getModelInfo().version}</p>
          </div>
        )}
      </div>

      {/* Task Duration Prediction */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Duration Prediction</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
              <input
                type="text"
                value={sampleTask.title}
                onChange={(e) => setSampleTask({...sampleTask, title: e.target.value})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={sampleTask.priority}
                onChange={(e) => setSampleTask({...sampleTask, priority: e.target.value as any})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Complexity (1-10): {sampleTask.complexity}
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={sampleTask.complexity}
                onChange={(e) => setSampleTask({...sampleTask, complexity: parseInt(e.target.value)})}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Hours</label>
              <input
                type="number"
                value={sampleTask.estimatedHours}
                onChange={(e) => setSampleTask({...sampleTask, estimatedHours: parseInt(e.target.value)})}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <button
              onClick={predictTaskDuration}
              disabled={!tensorflowReady || isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              <TrendingUp className="w-5 h-5 mr-2" />
              {isLoading ? 'Predicting...' : 'Predict Duration'}
            </button>
            
            {predictionResult && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-3">Prediction Result</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-blue-700">Predicted Duration:</span>
                    <span className="font-medium text-blue-900">
                      {predictionResult.prediction.toFixed(1)} hours
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-blue-700">Confidence:</span>
                    <span className="font-medium text-blue-900">
                      {(predictionResult.confidence * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-blue-700 mb-2">Top Factors:</p>
                    {Object.entries(predictionResult.factors)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 3)
                      .map(([factor, value]) => (
                        <div key={factor} className="flex justify-between text-sm">
                          <span className="text-blue-600">{factor}:</span>
                          <span className="text-blue-800">{(value * 100).toFixed(0)}%</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderTrainingTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Model Training</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-800 mb-3">Training Actions</h4>
            <div className="space-y-3">
              <button
                onClick={trainModel}
                disabled={!tensorflowReady || isLoading}
                className="w-full flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                <Play className="w-5 h-5 mr-2" />
                {isLoading ? 'Training...' : 'Train with Sample Data'}
              </button>
              
              <button
                onClick={() => tensorflowService.saveModels()}
                disabled={!tensorflowReady}
                className="w-full flex items-center justify-center px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
              >
                <Settings className="w-5 h-5 mr-2" />
                Save Models
              </button>
            </div>
          </div>
          
          <div>
            {modelMetrics && (
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900 mb-3">Training Results</h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-green-700">Accuracy:</span>
                    <span className="font-medium text-green-900">
                      {(modelMetrics.accuracy * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">MAE:</span>
                    <span className="font-medium text-green-900">
                      {modelMetrics.mae.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">R² Score:</span>
                    <span className="font-medium text-green-900">
                      {modelMetrics.r2Score.toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  const renderInsightsTab = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI-Powered Insights</h3>
        
        <button
          onClick={generateInsights}
          disabled={isLoading}
          className="flex items-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 mb-6"
        >
          <Lightbulb className="w-5 h-5 mr-2" />
          {isLoading ? 'Generating...' : 'Generate AI/ML Insights'}
        </button>
        
        {aiResponse && (
          <div className="p-4 bg-purple-50 rounded-lg">
            <h4 className="font-medium text-purple-900 mb-3">Strategic AI/ML Insights</h4>
            <p className="text-purple-800 whitespace-pre-wrap">{aiResponse.content}</p>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI/ML Dashboard</h1>
          <p className="text-gray-600">
            Advanced AI integration with multi-model support and client-side machine learning
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Brain className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">AI Models</p>
                <p className="text-2xl font-bold text-blue-600">{modelStatuses.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Cpu className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">TensorFlow.js</p>
                <p className="text-2xl font-bold text-green-600">
                  {tensorflowReady ? 'Ready' : 'Loading'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Target className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Predictions</p>
                <p className="text-2xl font-bold text-purple-600">
                  {predictionResult ? 'Active' : 'None'}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-orange-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Training</p>
                <p className="text-2xl font-bold text-orange-600">
                  {modelMetrics ? 'Complete' : 'Pending'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'models', name: 'AI Models', icon: Brain },
              { id: 'predictions', name: 'ML Predictions', icon: TrendingUp },
              { id: 'training', name: 'Model Training', icon: Cpu },
              { id: 'insights', name: 'AI Insights', icon: Lightbulb }
            ].map(({ id, name, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {name}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'models' && renderModelsTab()}
          {activeTab === 'predictions' && renderPredictionsTab()}
          {activeTab === 'training' && renderTrainingTab()}
          {activeTab === 'insights' && renderInsightsTab()}
        </div>
      </div>
    </div>
  )
}

export default AIMLDashboard