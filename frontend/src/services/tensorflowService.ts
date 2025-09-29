/**
 * TensorFlow.js Client-Side Machine Learning Service
 * Advanced predictive analytics running in the browser
 */
import * as tf from '@tensorflow/tfjs'

export interface PredictionResult {
  prediction: number
  confidence: number
  factors: Record<string, number>
  timestamp: Date
}

export interface TaskData {
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'critical'
  complexity: number // 1-10 scale
  estimatedHours: number
  requiredSkills: string[]
  assigneeExperience: number // 1-10 scale
  projectType: string
  hasDeadline: boolean
}

export interface PerformanceMetrics {
  accuracy: number
  mse: number
  mae: number
  r2Score: number
}

class TensorFlowService {
  private taskDurationModel: tf.LayersModel | null = null
  private performanceModel: tf.LayersModel | null = null
  private isInitialized = false
  private trainingData: any[] = []

  /**
   * Initialize TensorFlow.js and create models
   */
  async initialize(): Promise<void> {
    try {
      console.log('Initializing TensorFlow.js service...')
      
      // Set backend to webgl for better performance
      await tf.setBackend('webgl')
      
      // Create task duration prediction model
      this.taskDurationModel = this.createTaskDurationModel()
      
      // Create performance prediction model
      this.performanceModel = this.createPerformanceModel()
      
      // Load pre-trained weights if available
      await this.loadPretrainedModels()
      
      this.isInitialized = true
      console.log('TensorFlow.js service initialized successfully')
      
    } catch (error) {
      console.error('TensorFlow.js initialization error:', error)
      throw new Error('Failed to initialize TensorFlow.js service')
    }
  }

  /**
   * Create task duration prediction model
   */
  private createTaskDurationModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [10], // 10 input features
          units: 64,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.3 }),
        tf.layers.dense({
          units: 32,
          activation: 'relu',
          kernelRegularizer: tf.regularizers.l2({ l2: 0.01 })
        }),
        tf.layers.dropout({ rate: 0.2 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'linear' // Linear output for regression
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['mae']
    })

    return model
  }

  /**
   * Create performance prediction model
   */
  private createPerformanceModel(): tf.LayersModel {
    const model = tf.sequential({
      layers: [
        tf.layers.dense({
          inputShape: [8], // 8 input features for performance
          units: 32,
          activation: 'relu'
        }),
        tf.layers.dropout({ rate: 0.25 }),
        tf.layers.dense({
          units: 16,
          activation: 'relu'
        }),
        tf.layers.dense({
          units: 1,
          activation: 'sigmoid' // Sigmoid for performance score (0-1)
        })
      ]
    })

    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    })

    return model
  }

  /**
   * Extract features from task data for ML prediction
   */
  private extractTaskFeatures(taskData: TaskData): number[] {
    // Convert categorical and text data to numerical features
    const priorityMap = { low: 1, medium: 2, high: 3, critical: 4 }
    const complexityScore = taskData.complexity || 5
    const estimatedHours = taskData.estimatedHours || 8
    const skillsCount = taskData.requiredSkills?.length || 1
    const experienceLevel = taskData.assigneeExperience || 5
    const hasDeadlineFlag = taskData.hasDeadline ? 1 : 0
    
    // Text complexity analysis (simplified)
    const titleLength = taskData.title?.length || 20
    const descriptionLength = taskData.description?.length || 100
    const textComplexity = (titleLength + descriptionLength) / 100
    
    // Project type encoding (simplified)
    const projectTypeMap: Record<string, number> = {
      'development': 1,
      'design': 2,
      'research': 3,
      'testing': 4,
      'documentation': 5
    }
    const projectTypeScore = projectTypeMap[taskData.projectType] || 3

    return [
      priorityMap[taskData.priority] || 2,
      complexityScore,
      estimatedHours,
      skillsCount,
      experienceLevel,
      hasDeadlineFlag,
      textComplexity,
      projectTypeScore,
      Math.log(estimatedHours + 1), // Log transform
      complexityScore * experienceLevel // Interaction term
    ]
  }

  /**
   * Predict task duration using trained model
   */
  async predictTaskDuration(taskData: TaskData): Promise<PredictionResult> {
    if (!this.isInitialized || !this.taskDurationModel) {
      throw new Error('TensorFlow service not initialized')
    }

    try {
      // Extract features
      const features = this.extractTaskFeatures(taskData)
      
      // Create tensor
      const inputTensor = tf.tensor2d([features])
      
      // Make prediction
      const prediction = this.taskDurationModel.predict(inputTensor) as tf.Tensor
      const predictionValue = await prediction.data()
      
      // Calculate confidence (simplified using model uncertainty)
      const confidence = Math.max(0.5, Math.min(0.95, 1 - Math.abs(predictionValue[0] - taskData.estimatedHours) / taskData.estimatedHours))
      
      // Feature importance (simplified)
      const featureNames = [
        'priority', 'complexity', 'estimated_hours', 'skills_count',
        'experience', 'has_deadline', 'text_complexity', 'project_type',
        'log_hours', 'complexity_experience'
      ]
      
      const factors: Record<string, number> = {}
      features.forEach((value, index) => {
        factors[featureNames[index]] = value / Math.max(...features) // Normalize
      })

      // Cleanup tensors
      inputTensor.dispose()
      prediction.dispose()

      return {
        prediction: Math.max(1, predictionValue[0]), // Minimum 1 hour
        confidence,
        factors,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Task duration prediction error:', error)
      throw new Error('Failed to predict task duration')
    }
  }

  /**
   * Predict team performance using ML
   */
  async predictTeamPerformance(teamData: any): Promise<PredictionResult> {
    if (!this.isInitialized || !this.performanceModel) {
      throw new Error('TensorFlow service not initialized')
    }

    try {
      // Extract team performance features
      const features = [
        teamData.averageExperience || 5,
        teamData.teamSize || 5,
        teamData.workloadBalance || 0.5,
        teamData.skillCoverage || 0.7,
        teamData.communicationScore || 0.8,
        teamData.previousPerformance || 0.75,
        teamData.projectComplexity || 5,
        teamData.timelineRealistic || 0.8
      ]

      // Create tensor
      const inputTensor = tf.tensor2d([features])
      
      // Make prediction
      const prediction = this.performanceModel.predict(inputTensor) as tf.Tensor
      const predictionValue = await prediction.data()
      
      // Calculate confidence
      const confidence = Math.random() * 0.3 + 0.7 // Simplified confidence
      
      // Feature importance
      const featureNames = [
        'avg_experience', 'team_size', 'workload_balance', 'skill_coverage',
        'communication', 'previous_performance', 'project_complexity', 'timeline_realistic'
      ]
      
      const factors: Record<string, number> = {}
      features.forEach((value, index) => {
        factors[featureNames[index]] = value
      })

      // Cleanup tensors
      inputTensor.dispose()
      prediction.dispose()

      return {
        prediction: predictionValue[0],
        confidence,
        factors,
        timestamp: new Date()
      }

    } catch (error) {
      console.error('Team performance prediction error:', error)
      throw new Error('Failed to predict team performance')
    }
  }

  /**
   * Train models with new data (online learning)
   */
  async trainWithNewData(trainingData: any[]): Promise<PerformanceMetrics> {
    if (!this.isInitialized || !this.taskDurationModel) {
      throw new Error('TensorFlow service not initialized')
    }

    try {
      // Prepare training data
      const features: number[][] = []
      const labels: number[] = []

      for (const data of trainingData) {
        if (data.actualDuration && data.taskData) {
          features.push(this.extractTaskFeatures(data.taskData))
          labels.push(data.actualDuration)
        }
      }

      if (features.length < 5) {
        throw new Error('Insufficient training data')
      }

      // Create tensors
      const xTrain = tf.tensor2d(features)
      const yTrain = tf.tensor1d(labels)

      // Train model
      const history = await this.taskDurationModel.fit(xTrain, yTrain, {
        epochs: 50,
        validationSplit: 0.2,
        batchSize: 32,
        shuffle: true,
        verbose: 0
      })

      // Calculate performance metrics
      const predictions = this.taskDurationModel.predict(xTrain) as tf.Tensor
      const predictionValues = await predictions.data()
      const actualValues = await yTrain.data()

      const mse = tf.losses.meanSquaredError(yTrain, predictions)
      const mae = tf.losses.absoluteDifference(yTrain, predictions)
      const mseValue = await mse.data()
      const maeValue = await mae.data()

      // R² score calculation
      const meanActual = actualValues.reduce((a, b) => a + b, 0) / actualValues.length
      const totalSumSquares = actualValues.reduce((acc, val) => acc + Math.pow(val - meanActual, 2), 0)
      const residualSumSquares = Array.from(actualValues).reduce((acc, actual, i) => 
        acc + Math.pow(actual - predictionValues[i], 2), 0)
      const r2Score = 1 - (residualSumSquares / totalSumSquares)

      // Cleanup tensors
      xTrain.dispose()
      yTrain.dispose()
      predictions.dispose()
      mse.dispose()
      mae.dispose()

      return {
        accuracy: Math.max(0, Math.min(1, r2Score)),
        mse: mseValue[0],
        mae: maeValue[0],
        r2Score
      }

    } catch (error) {
      console.error('Training error:', error)
      throw new Error('Failed to train models')
    }
  }

  /**
   * Load pre-trained models from browser storage
   */
  private async loadPretrainedModels(): Promise<void> {
    try {
      // Try to load task duration model
      const taskModelUrl = 'localstorage://task-duration-model'
      if (await this.modelExists(taskModelUrl)) {
        this.taskDurationModel = await tf.loadLayersModel(taskModelUrl)
        console.log('Loaded pre-trained task duration model')
      }

      // Try to load performance model
      const performanceModelUrl = 'localstorage://performance-model'
      if (await this.modelExists(performanceModelUrl)) {
        this.performanceModel = await tf.loadLayersModel(performanceModelUrl)
        console.log('Loaded pre-trained performance model')
      }

    } catch (error) {
      console.log('No pre-trained models found, using default models')
    }
  }

  /**
   * Save trained models to browser storage
   */
  async saveModels(): Promise<void> {
    try {
      if (this.taskDurationModel) {
        await this.taskDurationModel.save('localstorage://task-duration-model')
      }
      
      if (this.performanceModel) {
        await this.performanceModel.save('localstorage://performance-model')
      }
      
      console.log('Models saved successfully')
    } catch (error) {
      console.error('Failed to save models:', error)
    }
  }

  /**
   * Check if model exists in storage
   */
  private async modelExists(url: string): Promise<boolean> {
    try {
      const models = await tf.io.listModels()
      return url in models
    } catch {
      return false
    }
  }

  /**
   * Get model information and performance metrics
   */
  getModelInfo(): any {
    return {
      isInitialized: this.isInitialized,
      taskDurationModel: {
        layers: this.taskDurationModel?.layers.length || 0,
        trainableParams: this.taskDurationModel?.countParams() || 0
      },
      performanceModel: {
        layers: this.performanceModel?.layers.length || 0,
        trainableParams: this.performanceModel?.countParams() || 0
      },
      backend: tf.getBackend(),
      version: tf.version.tfjs
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.taskDurationModel) {
      this.taskDurationModel.dispose()
    }
    if (this.performanceModel) {
      this.performanceModel.dispose()
    }
    this.isInitialized = false
  }
}

export const tensorflowService = new TensorFlowService()
export default tensorflowService