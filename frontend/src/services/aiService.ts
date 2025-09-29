/**
 * Advanced AI Service for Multi-Model Integration
 * Supports GPT-4o, Claude 3.5 Sonnet, and Gemini 2.0 Pro
 */
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_REACT_APP_BACKEND_URL || process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001'

export interface AIModelRequest {
  prompt: string
  model?: string
  context?: Record<string, any>
  temperature?: number
  max_tokens?: number
}

export interface AIModelResponse {
  success: boolean
  content?: string
  model: string
  provider: string
  tokens_used: number
  timestamp: string
  error?: string
}

export interface ModelComparisonRequest {
  prompt: string
  models?: string[]
  context?: Record<string, any>
}

export interface ModelComparison {
  prompt: string
  context?: Record<string, any>
  models_compared: number
  responses: Record<string, AIModelResponse>
  summary: {
    best_model?: string
    avg_response_time: number
    total_tokens: number
  }
  timestamp: string
}

export interface TaskDurationPrediction {
  prediction: number
  confidence: number
  factors: Record<string, number>
  model_performance: Record<string, number>
  timestamp: string
}

export interface ComprehensiveInsights {
  insights: string
  analysis_type: string
  model_used: string
  confidence: number
  timestamp: string
}

class AIService {
  private getAuthHeaders() {
    const token = localStorage.getItem('access_token')
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  /**
   * Generate AI response using specified model
   */
  async generateResponse(request: AIModelRequest): Promise<AIModelResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/generate`,
        {
          prompt: request.prompt,
          model: request.model || 'gpt-4o',
          context: request.context,
          temperature: request.temperature || 0.7,
          max_tokens: request.max_tokens
        },
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('AI generation error:', error)
      throw new Error(error.response?.data?.detail || 'AI generation failed')
    }
  }

  /**
   * Compare responses from multiple AI models
   */
  async compareModels(request: ModelComparisonRequest): Promise<ModelComparison> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/compare-models`,
        {
          prompt: request.prompt,
          models: request.models || ['gpt-4o', 'claude-3.5-sonnet', 'gemini-2.0-pro'],
          context: request.context
        },
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Model comparison error:', error)
      throw new Error(error.response?.data?.detail || 'Model comparison failed')
    }
  }

  /**
   * Get list of available AI models
   */
  async getAvailableModels(): Promise<any[]> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/ai-ml/models/available`,
        { headers: this.getAuthHeaders() }
      )
      
      return response.data.models
    } catch (error: any) {
      console.error('Get available models error:', error)
      throw new Error(error.response?.data?.detail || 'Failed to get available models')
    }
  }

  /**
   * Get optimal model for specific task type
   */
  async getOptimalModel(taskType: string, context?: Record<string, any>): Promise<string> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/optimal-model`,
        null,
        { 
          headers: this.getAuthHeaders(),
          params: { task_type: taskType, context: JSON.stringify(context || {}) }
        }
      )
      
      return response.data.optimal_model
    } catch (error: any) {
      console.error('Get optimal model error:', error)
      throw new Error(error.response?.data?.detail || 'Failed to get optimal model')
    }
  }

  /**
   * Predict task duration using ML
   */
  async predictTaskDuration(
    taskData: Record<string, any>,
    historicalTasks?: Record<string, any>[]
  ): Promise<TaskDurationPrediction> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/predict/task-duration`,
        {
          task_data: taskData,
          historical_tasks: historicalTasks || []
        },
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Task duration prediction error:', error)
      throw new Error(error.response?.data?.detail || 'Task duration prediction failed')
    }
  }

  /**
   * Generate comprehensive AI-powered insights
   */
  async generateComprehensiveInsights(
    dataContext: Record<string, any>,
    analysisType: string = 'portfolio_optimization'
  ): Promise<ComprehensiveInsights> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/analytics/comprehensive-insights`,
        {
          data_context: dataContext,
          analysis_type: analysisType
        },
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Comprehensive insights error:', error)
      throw new Error(error.response?.data?.detail || 'Failed to generate insights')
    }
  }

  /**
   * Real-time portfolio optimization using AI
   */
  async realTimeOptimization(
    currentState: Record<string, any>,
    optimizationGoals: string[],
    constraints?: Record<string, any>
  ): Promise<any> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/analytics/real-time-optimization`,
        {
          current_state: currentState,
          optimization_goals: optimizationGoals,
          constraints: constraints || {}
        },
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('Real-time optimization error:', error)
      throw new Error(error.response?.data?.detail || 'Real-time optimization failed')
    }
  }

  /**
   * Health check for AI/ML services
   */
  async healthCheck(): Promise<any> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/api/ai-ml/health`,
        { headers: this.getAuthHeaders() }
      )
      
      return response.data
    } catch (error: any) {
      console.error('AI/ML health check error:', error)
      throw new Error(error.response?.data?.detail || 'AI/ML health check failed')
    }
  }
}

export const aiService = new AIService()
export default aiService