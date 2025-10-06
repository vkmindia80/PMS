/**
 * TensorFlow.js Client-Side Machine Learning Service
 * Advanced predictive models running in the browser
 */
import * as tf from '@tensorflow/tfjs'

export interface ModelConfig {
  name: string
  url: string
  inputShape: number[]
  outputShape: number[]
  modelType: 'regression' | 'classification' | 'time_series'
  preprocessing: {
    scaler_mean: number[]
    scaler_std: number[]
    feature_names: string[]
  }
  postprocessing: Record<string, any>
}

export interface PredictionResult {
  prediction: number | number[]
  confidence: number
  modelUsed: string
  processingTime: number
  timestamp: string
}

export interface TrainingData {
  inputs: number[][]
  outputs: number[]
  sampleCount: number
  featureNames: string[]
  modelConfig: {
    inputShape: number[]
    outputShape: number[]
    modelType: string
  }
}

class TensorFlowService {
  private models: Map<string, tf.LayersModel> = new Map()
  private modelConfigs: Map<string, ModelConfig> = new Map()
  private isInitialized: boolean = false
  private getAPI_BASE_URL = () => {
    // Import dynamically to avoid circular dependencies
    const { getApiUrl } = require('../utils/environment')
    return getApiUrl()
  }

  /**
   * Initialize TensorFlow.js service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing TensorFlow.js Service...')
      
      // Set backend (WebGL for GPU acceleration, fallback to CPU)
      await tf.ready()
      console.log(`✅ TensorFlow.js backend: ${tf.getBackend()}`)
      
      // Load available models
      await this.loadAvailableModels()
      
      this.isInitialized = true
      console.log('✅ TensorFlow.js Service initialized successfully')
      
    } catch (error) {
      console.error('❌ TensorFlow.js initialization error:', error)
      throw error
    }
  }

  /**
   * Load available models from backend
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      // Get auth token from localStorage - use the correct key
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) {
        throw new Error('No authentication token');
      }

      const authTokens = JSON.parse(authTokensStr);
      const response = await fetch(`${this.API_BASE_URL}/api/tensorflow/models`, {
        headers: {
          'Authorization': `Bearer ${authTokens.access_token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to load models: ${response.statusText}`)
      }

      const modelsData = await response.json()
      
      // Load each model
      for (const [modelName, config] of Object.entries(modelsData.models)) {
        await this.loadModel(modelName, config as ModelConfig)
      }
      
    } catch (error) {
      console.error('Error loading available models:', error)
      // Initialize with default model configurations
      await this.initializeDefaultModels()
    }
  }

  /**
   * Load individual model
   */
  private async loadModel(modelName: string, config: ModelConfig): Promise<void> {
    try {
      console.log(`📦 Loading model: ${modelName}`)
      
      // Store model configuration
      this.modelConfigs.set(modelName, config)
      
      // Check if model file exists, otherwise create model
      try {
        const model = await tf.loadLayersModel(config.url)
        this.models.set(modelName, model)
        console.log(`✅ Loaded pre-trained model: ${modelName}`)
      } catch (loadError) {
        // Create new model if pre-trained doesn't exist
        const model = await this.createModel(config)
        this.models.set(modelName, model)
        console.log(`✅ Created new model: ${modelName}`)
      }
      
    } catch (error) {
      console.error(`❌ Error loading model ${modelName}:`, error)
    }
  }

  /**
   * Create new TensorFlow.js model based on configuration
   */
  private async createModel(config: ModelConfig): Promise<tf.LayersModel> {
    const model = tf.sequential()
    
    if (config.modelType === 'regression') {
      return this.createRegressionModel(config)
    } else if (config.modelType === 'classification') {
      return this.createClassificationModel(config)
    } else {
      throw new Error(`Unsupported model type: ${config.modelType}`)
    }
  }

  /**
   * Create regression model
   */
  private createRegressionModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential()
    
    // Input layer
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: config.inputShape
    }))
    
    // Hidden layers with dropout
    model.add(tf.layers.dropout({ rate: 0.2 }))
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }))
    model.add(tf.layers.dropout({ rate: 0.2 }))
    
    // Output layer
    model.add(tf.layers.dense({ 
      units: config.outputShape[0], 
      activation: 'linear' 
    }))
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'meanSquaredError',
      metrics: ['meanAbsoluteError']
    })
    
    return model
  }

  /**
   * Create classification model
   */
  private createClassificationModel(config: ModelConfig): tf.LayersModel {
    const model = tf.sequential()
    
    // Input layer
    model.add(tf.layers.dense({
      units: 16,
      activation: 'relu',
      inputShape: config.inputShape
    }))
    
    // Hidden layers with dropout
    model.add(tf.layers.dropout({ rate: 0.3 }))
    model.add(tf.layers.dense({ units: 8, activation: 'relu' }))
    model.add(tf.layers.dropout({ rate: 0.2 }))
    
    // Output layer
    model.add(tf.layers.dense({ 
      units: config.outputShape[0], 
      activation: config.outputShape[0] > 2 ? 'softmax' : 'sigmoid'
    }))
    
    // Compile model
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: config.outputShape[0] > 2 ? 'categoricalCrossentropy' : 'binaryCrossentropy',
      metrics: ['accuracy']
    })
    
    return model
  }

  /**
   * Initialize default models if backend is unavailable
   */
  private async initializeDefaultModels(): Promise<void> {
    console.log('🔧 Initializing default models...')
    
    const defaultConfigs: Record<string, ModelConfig> = {
      task_duration: {
        name: 'task_duration_predictor',
        url: '/models/task_duration_model.json',
        inputShape: [8],
        outputShape: [1],
        modelType: 'regression',
        preprocessing: {
          scaler_mean: [5.0, 1.5, 3.0, 8.0, 2.0, 0.3, 4.0, 5.0],
          scaler_std: [2.0, 0.8, 2.0, 6.0, 1.5, 0.5, 2.0, 2.0],
          feature_names: [
            'complexity_score', 'priority_weight', 'required_skills_count',
            'estimated_hours', 'dependencies_count', 'has_external_dependency',
            'team_size', 'experience_level'
          ]
        },
        postprocessing: { min_value: 0.5, max_value: 200.0 }
      },
      project_success: {
        name: 'project_success_classifier',
        url: '/models/project_success_model.json',
        inputShape: [8],
        outputShape: [2],
        modelType: 'classification',
        preprocessing: {
          scaler_mean: [5.0, 5.0, 5.0, 5.0, 5.0, 5.0, 3.0, 0.5],
          scaler_std: [2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 2.0, 0.5],
          feature_names: [
            'budget_adequacy', 'stakeholder_alignment', 'scope_clarity',
            'timeline_realism', 'team_experience', 'technical_risk',
            'complexity_score', 'has_executive_sponsor'
          ]
        },
        postprocessing: { labels: ['failure', 'success'], threshold: 0.5 }
      }
    }
    
    for (const [modelName, config] of Object.entries(defaultConfigs)) {
      const model = await this.createModel(config)
      this.models.set(modelName, model)
      this.modelConfigs.set(modelName, config)
    }
  }

  /**
   * Make prediction using specified model
   */
  async predict(
    modelName: string, 
    inputData: number[], 
    options: { 
      returnConfidence?: boolean
      batchSize?: number 
    } = {}
  ): Promise<PredictionResult> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const startTime = performance.now()
    
    try {
      const model = this.models.get(modelName)
      const config = this.modelConfigs.get(modelName)
      
      if (!model || !config) {
        throw new Error(`Model '${modelName}' not found`)
      }

      // Preprocess input data
      const processedInput = this.preprocessInput(inputData, config)
      
      // Create tensor
      const inputTensor = tf.tensor2d([processedInput])
      
      // Make prediction
      const prediction = model.predict(inputTensor) as tf.Tensor
      const predictionData = await prediction.data()
      
      // Clean up tensors
      inputTensor.dispose()
      prediction.dispose()
      
      // Postprocess output
      const finalPrediction = this.postprocessOutput(
        Array.from(predictionData), 
        config
      )
      
      const processingTime = performance.now() - startTime
      
      return {
        prediction: finalPrediction,
        confidence: options.returnConfidence ? this.calculateConfidence(predictionData, config) : 0.8,
        modelUsed: modelName,
        processingTime: Math.round(processingTime * 100) / 100,
        timestamp: new Date().toISOString()
      }
      
    } catch (error) {
      console.error(`Prediction error for model ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Preprocess input data
   */
  private preprocessInput(inputData: number[], config: ModelConfig): number[] {
    const { scaler_mean, scaler_std } = config.preprocessing
    
    if (inputData.length !== scaler_mean.length) {
      console.warn(`Input size mismatch. Expected: ${scaler_mean.length}, got: ${inputData.length}`)
    }
    
    return inputData.map((value, index) => {
      const mean = scaler_mean[index] || 0
      const std = scaler_std[index] || 1
      return std > 0 ? (value - mean) / std : value
    })
  }

  /**
   * Postprocess model output
   */
  private postprocessOutput(rawOutput: number[], config: ModelConfig): number | number[] {
    const { postprocessing } = config
    
    if (config.modelType === 'regression') {
      const value = rawOutput[0]
      const min_value = postprocessing.min_value || 0
      const max_value = postprocessing.max_value || 100
      
      return Math.max(min_value, Math.min(max_value, value))
    } else if (config.modelType === 'classification') {
      if (rawOutput.length === 1) {
        // Binary classification
        return rawOutput[0] > (postprocessing.threshold || 0.5) ? 1 : 0
      } else {
        // Multi-class classification
        const maxIndex = rawOutput.indexOf(Math.max(...rawOutput))
        return postprocessing.labels ? postprocessing.labels[maxIndex] : maxIndex
      }
    }
    
    return rawOutput
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(predictionData: Float32Array | number[], config: ModelConfig): number {
    if (config.modelType === 'classification') {
      // For classification, confidence is the max probability
      return Math.max(...Array.from(predictionData))
    } else {
      // For regression, use a heuristic based on model performance
      return 0.8 // Default confidence
    }
  }

  /**
   * Train model with new data
   */
  async trainModel(
    modelName: string, 
    trainingData: TrainingData,
    options: {
      epochs?: number
      batchSize?: number
      validationSplit?: number
      verbose?: boolean
    } = {}
  ): Promise<void> {
    try {
      const model = this.models.get(modelName)
      if (!model) {
        throw new Error(`Model '${modelName}' not found`)
      }

      console.log(`🏋️ Training model: ${modelName}`)
      
      // Prepare training data
      const xs = tf.tensor2d(trainingData.inputs)
      const ys = tf.tensor2d(
        trainingData.outputs.map(output => 
          Array.isArray(output) ? output : [output]
        )
      )
      
      // Training options
      const trainingOptions = {
        epochs: options.epochs || 50,
        batchSize: options.batchSize || 32,
        validationSplit: options.validationSplit || 0.2,
        verbose: options.verbose || false,
        callbacks: {
          onEpochEnd: (epoch: number, logs: any) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs.loss?.toFixed(4)}`)
            }
          }
        }
      }
      
      // Train model
      await model.fit(xs, ys, trainingOptions)
      
      // Clean up tensors
      xs.dispose()
      ys.dispose()
      
      console.log(`✅ Model '${modelName}' training completed`)
      
    } catch (error) {
      console.error(`Training error for model ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Save model to browser storage
   */
  async saveModel(modelName: string): Promise<void> {
    try {
      const model = this.models.get(modelName)
      if (!model) {
        throw new Error(`Model '${modelName}' not found`)
      }

      const saveUrl = `localstorage://tensorflow-${modelName}`
      await model.save(saveUrl)
      
      console.log(`✅ Model '${modelName}' saved to local storage`)
      
    } catch (error) {
      console.error(`Save error for model ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Load model from browser storage
   */
  async loadModelFromStorage(modelName: string): Promise<void> {
    try {
      const loadUrl = `localstorage://tensorflow-${modelName}`
      const model = await tf.loadLayersModel(loadUrl)
      
      this.models.set(modelName, model)
      console.log(`✅ Model '${modelName}' loaded from local storage`)
      
    } catch (error) {
      console.error(`Load error for model ${modelName}:`, error)
      throw error
    }
  }

  /**
   * Get model information
   */
  getModelInfo(modelName: string): any {
    const model = this.models.get(modelName)
    const config = this.modelConfigs.get(modelName)
    
    if (!model || !config) {
      return null
    }
    
    return {
      name: config.name,
      type: config.modelType,
      inputShape: config.inputShape,
      outputShape: config.outputShape,
      parameters: model.countParams(),
      layers: model.layers.length,
      featureNames: config.preprocessing.feature_names
    }
  }

  /**
   * Get all loaded models
   */
  getLoadedModels(): string[] {
    return Array.from(this.models.keys())
  }

  /**
   * Get TensorFlow.js system info
   */
  getSystemInfo(): any {
    return {
      backend: tf.getBackend(),
      version: tf.version.tfjs,
      platform: tf.ENV.platform,
      memory: tf.memory(),
      isInitialized: this.isInitialized,
      loadedModels: this.getLoadedModels().length
    }
  }

  /**
   * Dispose all models and free memory
   */
  dispose(): void {
    for (const model of this.models.values()) {
      model.dispose()
    }
    
    this.models.clear()
    this.modelConfigs.clear()
    this.isInitialized = false
    
    console.log('🧹 TensorFlow.js service disposed')
  }

  /**
   * Batch prediction for multiple inputs
   */
  async batchPredict(
    modelName: string, 
    inputBatch: number[][], 
    options: { batchSize?: number } = {}
  ): Promise<PredictionResult[]> {
    if (!this.isInitialized) {
      await this.initialize()
    }

    const batchSize = options.batchSize || 32
    const results: PredictionResult[] = []
    
    // Process in batches
    for (let i = 0; i < inputBatch.length; i += batchSize) {
      const batch = inputBatch.slice(i, i + batchSize)
      
      for (const input of batch) {
        const result = await this.predict(modelName, input)
        results.push(result)
      }
    }
    
    return results
  }
}

export const tensorflowService = new TensorFlowService()
export default tensorflowService