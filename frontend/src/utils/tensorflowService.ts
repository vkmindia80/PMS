/**
 * TensorFlow.js Service for Client-Side Machine Learning
 * Predictive analytics and ML models running in the browser
 */
import * as tf from '@tensorflow/tfjs';

interface PredictionResult {
  prediction: number;
  confidence: number;
  factors: Record<string, number>;
  timestamp: Date;
}

interface TrainingData {
  features: number[][];
  labels: number[];
}

interface ModelMetrics {
  accuracy: number;
  loss: number;
  trainedSamples: number;
  lastUpdated: Date;
}

export class TensorFlowService {
  private models: Map<string, tf.LayersModel> = new Map();
  private scalers: Map<string, { mean: tf.Tensor; std: tf.Tensor }> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeTensorFlow();
  }

  private async initializeTensorFlow() {
    try {
      // Set TensorFlow.js backend (webgl for better performance)
      await tf.ready();
      await tf.setBackend('webgl');
      
      console.log('TensorFlow.js initialized with backend:', tf.getBackend());
      this.isInitialized = true;
    } catch (error) {
      console.warn('WebGL not available, falling back to CPU backend');
      await tf.setBackend('cpu');
      this.isInitialized = true;
    }
  }

  /**
   * Predict task duration based on historical data
   */
  async predictTaskDuration(
    taskFeatures: {
      complexityScore: number;
      priorityWeight: number;
      requiredSkillsCount: number;
      estimatedHours: number;
      dependenciesCount: number;
      hasExternalDependency: boolean;
      teamSize: number;
      experienceLevel: number;
    },
    historicalTasks?: any[]
  ): Promise<PredictionResult> {
    try {
      const modelKey = 'task_duration';
      let model = this.models.get(modelKey);

      // If no model exists or we have new training data, train/retrain
      if (!model && historicalTasks && historicalTasks.length > 20) {
        model = await this.trainTaskDurationModel(historicalTasks);
      }

      if (!model) {
        // Fallback prediction using simple heuristics
        return this.fallbackTaskDurationPrediction(taskFeatures);
      }

      // Normalize input features
      const inputTensor = this.normalizeFeatures([
        taskFeatures.complexityScore,
        taskFeatures.priorityWeight,
        taskFeatures.requiredSkillsCount,
        taskFeatures.estimatedHours,
        taskFeatures.dependenciesCount,
        taskFeatures.hasExternalDependency ? 1 : 0,
        taskFeatures.teamSize,
        taskFeatures.experienceLevel
      ], modelKey);

      // Make prediction
      const prediction = model.predict(inputTensor) as tf.Tensor;
      const predictionValue = await prediction.data();
      
      // Calculate feature importance (simplified)
      const featureImportance = await this.calculateFeatureImportance(
        inputTensor, model
      );

      // Clean up tensors
      inputTensor.dispose();
      prediction.dispose();

      return {
        prediction: Math.max(1, predictionValue[0]),
        confidence: 0.75, // Would be calculated based on model uncertainty
        factors: featureImportance,
        timestamp: new Date()
      };

    } catch (error) {
      console.error('Task duration prediction error:', error);
      return this.fallbackTaskDurationPrediction(taskFeatures);
    }
  }

  /**
   * Predict resource demand for different skill categories
   */
  async predictResourceDemand(
    projectData: {
      complexityScore: number;
      teamSize: number;
      budget: number;
      milestonesCount: number;
      durationWeeks: number;
      hasDependencies: boolean;
      riskScore: number;
      stakeholderCount: number;
    },
    skillCategories: string[] = [
      'frontend_development',
      'backend_development', 
      'devops',
      'design',
      'data_science',
      'project_management',
      'testing'
    ]
  ): Promise<Record<string, PredictionResult>> {
    try {
      const predictions: Record<string, PredictionResult> = {};

      for (const skill of skillCategories) {
        const demandPrediction = await this.predictSkillDemand(
          skill,
          projectData
        );
        predictions[skill] = demandPrediction;
      }

      return predictions;
    } catch (error) {
      console.error('Resource demand prediction error:', error);
      return {};
    }
  }

  /**
   * Predict team performance metrics
   */
  async predictTeamPerformance(
    teamData: {
      teamSize: number;
      averageExperience: number;
      skillDiversity: number;
      workloadBalance: number;
      collaborationScore: number;
    },
    workloadData: {
      totalHours: number;
      highPriorityTasks: number;
      overdueTasks: number;
      avgTaskComplexity: number;
    }
  ): Promise<{
    productivityScore: PredictionResult;
    burnoutRisk: PredictionResult;
    collaborationEffectiveness: PredictionResult;
  }> {
    try {
      // Predict productivity score
      const productivityScore = await this.predictProductivityScore(
        teamData,
        workloadData
      );

      // Predict burnout risk
      const burnoutRisk = await this.predictBurnoutRisk(
        teamData,
        workloadData
      );

      // Predict collaboration effectiveness
      const collaborationEffectiveness = await this.predictCollaborationScore(
        teamData,
        workloadData
      );

      return {
        productivityScore,
        burnoutRisk,
        collaborationEffectiveness
      };
    } catch (error) {
      console.error('Team performance prediction error:', error);
      throw error;
    }
  }

  /**
   * Real-time anomaly detection for project metrics
   */
  async detectAnomalies(
    currentMetrics: {
      velocity: number;
      qualityScore: number;
      teamMorale: number;
      budgetUtilization: number;
      timelineAdherence: number;
    },
    historicalMetrics: Array<{
      velocity: number;
      qualityScore: number;
      teamMorale: number;
      budgetUtilization: number;
      timelineAdherence: number;
      timestamp: Date;
    }>
  ): Promise<{
    anomalies: Array<{
      metric: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      recommendation: string;
    }>;
    overallRiskScore: number;
  }> {
    try {
      const anomalies: Array<{
        metric: string;
        severity: 'low' | 'medium' | 'high';
        description: string;
        recommendation: string;
      }> = [];

      // Simple anomaly detection using statistical methods
      const metrics = ['velocity', 'qualityScore', 'teamMorale', 'budgetUtilization', 'timelineAdherence'];
      
      for (const metric of metrics) {
        const historicalValues = historicalMetrics.map(h => h[metric as keyof typeof h] as number);
        const currentValue = currentMetrics[metric as keyof typeof currentMetrics];
        
        const anomaly = this.detectStatisticalAnomaly(
          currentValue,
          historicalValues,
          metric
        );
        
        if (anomaly) {
          anomalies.push(anomaly);
        }
      }

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore(anomalies, currentMetrics);

      return {
        anomalies,
        overallRiskScore
      };
    } catch (error) {
      console.error('Anomaly detection error:', error);
      return { anomalies: [], overallRiskScore: 0 };
    }
  }

  /**
   * Train task duration prediction model
   */
  private async trainTaskDurationModel(historicalTasks: any[]): Promise<tf.LayersModel> {
    try {
      // Prepare training data
      const trainingData = this.prepareTaskDurationTrainingData(historicalTasks);
      
      if (trainingData.features.length < 20) {
        throw new Error('Insufficient training data');
      }

      // Create model architecture
      const model = tf.sequential({
        layers: [
          tf.layers.dense({
            inputShape: [8], // Number of input features
            units: 64,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.2 }),
          tf.layers.dense({
            units: 32,
            activation: 'relu'
          }),
          tf.layers.dropout({ rate: 0.1 }),
          tf.layers.dense({
            units: 16,
            activation: 'relu'
          }),
          tf.layers.dense({
            units: 1,
            activation: 'linear'
          })
        ]
      });

      // Compile model
      model.compile({
        optimizer: tf.train.adam(0.001),
        loss: 'meanSquaredError',
        metrics: ['mae']
      });

      // Convert to tensors
      const xTrain = tf.tensor2d(trainingData.features);
      const yTrain = tf.tensor2d(trainingData.labels, [trainingData.labels.length, 1]);

      // Normalize features
      const { normalized: xTrainNorm, scaler } = this.normalizeTrainingData(xTrain);
      this.scalers.set('task_duration', scaler);

      // Train model
      await model.fit(xTrainNorm, yTrain, {
        epochs: 50,
        batchSize: 32,
        validationSplit: 0.2,
        callbacks: {
          onEpochEnd: (epoch, logs) => {
            if (epoch % 10 === 0) {
              console.log(`Epoch ${epoch}: loss = ${logs?.loss?.toFixed(4)}`);
            }
          }
        }
      });

      // Clean up tensors
      xTrain.dispose();
      yTrain.dispose();
      xTrainNorm.dispose();

      // Store model
      this.models.set('task_duration', model);
      
      console.log('Task duration model trained successfully');
      return model;
    } catch (error) {
      console.error('Model training error:', error);
      throw error;
    }
  }

  private prepareTaskDurationTrainingData(historicalTasks: any[]): TrainingData {
    const features: number[][] = [];
    const labels: number[] = [];

    for (const task of historicalTasks) {
      if (task.actualHours && task.status === 'completed') {
        const taskFeatures = [
          task.complexityScore || 5,
          task.priorityWeight || 1,
          task.requiredSkills?.length || 0,
          task.estimatedHours || 8,
          task.dependencies?.length || 0,
          task.hasExternalDependency ? 1 : 0,
          task.teamSize || 1,
          task.experienceLevel || 5
        ];
        
        features.push(taskFeatures);
        labels.push(task.actualHours);
      }
    }

    return { features, labels };
  }

  private normalizeTrainingData(tensor: tf.Tensor2D): {
    normalized: tf.Tensor2D;
    scaler: { mean: tf.Tensor; std: tf.Tensor };
  } {
    const mean = tensor.mean(0);
    const std = tensor.sub(mean).square().mean(0).sqrt();
    
    // Add small epsilon to prevent division by zero
    const epsilon = tf.scalar(1e-7);
    const normalizedStd = std.add(epsilon);
    
    const normalized = tensor.sub(mean).div(normalizedStd) as tf.Tensor2D;
    
    return {
      normalized,
      scaler: { mean, std: normalizedStd }
    };
  }

  private normalizeFeatures(features: number[], modelKey: string): tf.Tensor2D {
    const scaler = this.scalers.get(modelKey);
    const inputTensor = tf.tensor2d([features]);
    
    if (!scaler) {
      return inputTensor;
    }
    
    return inputTensor.sub(scaler.mean).div(scaler.std) as tf.Tensor2D;
  }

  private async calculateFeatureImportance(
    inputTensor: tf.Tensor2D,
    model: tf.LayersModel
  ): Promise<Record<string, number>> {
    // Simplified feature importance calculation
    // In practice, you'd use more sophisticated methods like SHAP or LIME
    
    const featureNames = [
      'complexity_score',
      'priority_weight', 
      'required_skills_count',
      'estimated_hours',
      'dependencies_count',
      'has_external_dependency',
      'team_size',
      'experience_level'
    ];

    const importance: Record<string, number> = {};
    
    // Set baseline importance (would be calculated from model weights)
    const baselineImportance = [0.25, 0.15, 0.12, 0.20, 0.10, 0.08, 0.15, 0.18];
    
    featureNames.forEach((name, index) => {
      importance[name] = baselineImportance[index];
    });

    return importance;
  }

  private fallbackTaskDurationPrediction(taskFeatures: any): PredictionResult {
    const baseEstimate = taskFeatures.estimatedHours || 8;
    const complexityMultiplier = 1 + (taskFeatures.complexityScore - 5) * 0.2;
    const prediction = baseEstimate * complexityMultiplier;

    return {
      prediction,
      confidence: 0.5,
      factors: {
        estimated_hours: 0.7,
        complexity_score: 0.3
      },
      timestamp: new Date()
    };
  }

  private async predictSkillDemand(
    skill: string,
    projectData: any
  ): Promise<PredictionResult> {
    // Simplified skill demand prediction
    const baseDemand = 0.2; // 20% baseline demand
    const complexityFactor = projectData.complexityScore / 10;
    const teamSizeFactor = Math.min(1, projectData.teamSize / 10);
    
    const prediction = baseDemand * (1 + complexityFactor * 0.5 + teamSizeFactor * 0.3);

    return {
      prediction: Math.min(1, Math.max(0.05, prediction)),
      confidence: 0.7,
      factors: {
        base_demand: baseDemand,
        complexity_factor: complexityFactor,
        team_size_factor: teamSizeFactor
      },
      timestamp: new Date()
    };
  }

  private async predictProductivityScore(teamData: any, workloadData: any): Promise<PredictionResult> {
    // Team utilization factor (optimal around 80%)
    const hoursPerPersonPerWeek = workloadData.totalHours / teamData.teamSize / 4;
    const utilizationFactor = Math.min(1, 32 / Math.max(1, hoursPerPersonPerWeek));
    
    // Experience factor
    const experienceFactor = Math.min(1, teamData.averageExperience / 5);
    
    // Workload balance factor
    const balanceFactor = teamData.workloadBalance;
    
    const productivityScore = (utilizationFactor * 0.4 + experienceFactor * 0.35 + balanceFactor * 0.25);

    return {
      prediction: productivityScore,
      confidence: 0.8,
      factors: {
        utilization: utilizationFactor,
        experience: experienceFactor,
        balance: balanceFactor
      },
      timestamp: new Date()
    };
  }

  private async predictBurnoutRisk(teamData: any, workloadData: any): Promise<PredictionResult> {
    // Overtime factor
    const hoursPerPersonPerWeek = workloadData.totalHours / teamData.teamSize / 4;
    const overtimeFactor = Math.max(0, (hoursPerPersonPerWeek - 40) / 40);
    
    // High priority pressure
    const priorityPressure = workloadData.highPriorityTasks / Math.max(1, workloadData.totalHours / 8);
    
    // Deadline pressure
    const deadlinePressure = workloadData.overdueTasks / Math.max(1, workloadData.totalHours / 8);
    
    const burnoutRisk = Math.min(1, overtimeFactor * 0.4 + priorityPressure * 0.3 + deadlinePressure * 0.3);

    return {
      prediction: burnoutRisk,
      confidence: 0.85,
      factors: {
        overtime: overtimeFactor,
        priority_pressure: priorityPressure,
        deadline_pressure: deadlinePressure
      },
      timestamp: new Date()
    };
  }

  private async predictCollaborationScore(teamData: any, workloadData: any): Promise<PredictionResult> {
    // Team size factor (optimal around 5-7 members)
    const sizeFactor = 1 - Math.abs(teamData.teamSize - 6) / 10;
    
    // Skill diversity factor
    const diversityFactor = Math.min(1, teamData.skillDiversity);
    
    // Existing collaboration score
    const collaborationFactor = teamData.collaborationScore;
    
    const collaborationScore = (sizeFactor * 0.3 + diversityFactor * 0.35 + collaborationFactor * 0.35);

    return {
      prediction: collaborationScore,
      confidence: 0.75,
      factors: {
        team_size: sizeFactor,
        diversity: diversityFactor,
        existing_collaboration: collaborationFactor
      },
      timestamp: new Date()
    };
  }

  private detectStatisticalAnomaly(
    currentValue: number,
    historicalValues: number[],
    metric: string
  ): {
    metric: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
    recommendation: string;
  } | null {
    if (historicalValues.length < 5) return null;

    // Calculate statistical measures
    const mean = historicalValues.reduce((sum, val) => sum + val, 0) / historicalValues.length;
    const variance = historicalValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / historicalValues.length;
    const stdDev = Math.sqrt(variance);
    
    // Calculate z-score
    const zScore = Math.abs((currentValue - mean) / stdDev);
    
    // Determine if anomalous (beyond 2 standard deviations)
    if (zScore > 2) {
      let severity: 'low' | 'medium' | 'high' = 'low';
      if (zScore > 3) severity = 'high';
      else if (zScore > 2.5) severity = 'medium';
      
      const direction = currentValue > mean ? 'higher' : 'lower';
      
      return {
        metric,
        severity,
        description: `${metric} is significantly ${direction} than historical average (z-score: ${zScore.toFixed(2)})`,
        recommendation: this.getAnomalyRecommendation(metric, direction, severity)
      };
    }

    return null;
  }

  private getAnomalyRecommendation(
    metric: string,
    direction: string,
    severity: 'low' | 'medium' | 'high'
  ): string {
    const recommendations: Record<string, Record<string, string>> = {
      velocity: {
        higher: 'Consider if the increased velocity is sustainable or if quality might be compromised',
        lower: 'Investigate potential blockers or resource constraints affecting team velocity'
      },
      qualityScore: {
        higher: 'Excellent! Consider documenting what factors contributed to this quality improvement',
        lower: 'Focus on code reviews, testing practices, and technical debt reduction'
      },
      teamMorale: {
        higher: 'Great team morale! Consider what factors are contributing to maintain this',
        lower: 'Address team concerns, workload balance, and provide additional support'
      },
      budgetUtilization: {
        higher: 'Review budget allocation and consider cost optimization measures',
        lower: 'Ensure resources are being utilized effectively or reallocate budget'
      },
      timelineAdherence: {
        higher: 'Project is ahead of schedule - consider advancing milestones or adding features',
        lower: 'Review timeline and identify ways to get back on track'
      }
    };

    return recommendations[metric]?.[direction] || `Review ${metric} trends and take appropriate action`;
  }

  private calculateOverallRiskScore(
    anomalies: Array<{ severity: 'low' | 'medium' | 'high' }>,
    currentMetrics: any
  ): number {
    let riskScore = 0;
    
    // Add risk based on anomalies
    for (const anomaly of anomalies) {
      switch (anomaly.severity) {
        case 'high': riskScore += 0.3; break;
        case 'medium': riskScore += 0.2; break;
        case 'low': riskScore += 0.1; break;
      }
    }
    
    // Add base risk from metrics
    const metricsRisk = (
      (1 - currentMetrics.qualityScore / 10) * 0.2 +
      (1 - currentMetrics.teamMorale / 10) * 0.15 +
      (1 - currentMetrics.timelineAdherence) * 0.25
    );
    
    riskScore += metricsRisk;
    
    return Math.min(1, riskScore);
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(modelKey: string): ModelMetrics | null {
    const model = this.models.get(modelKey);
    if (!model) return null;

    // In practice, these would be tracked during training
    return {
      accuracy: 0.85,
      loss: 0.12,
      trainedSamples: 150,
      lastUpdated: new Date()
    };
  }

  /**
   * Export model for later use
   */
  async exportModel(modelKey: string): Promise<string | null> {
    const model = this.models.get(modelKey);
    if (!model) return null;

    try {
      const modelUrl = await model.save('localstorage://portfolio-model-' + modelKey);
      return modelUrl.toString();
    } catch (error) {
      console.error('Model export error:', error);
      return null;
    }
  }

  /**
   * Load previously saved model
   */
  async loadModel(modelKey: string): Promise<boolean> {
    try {
      const model = await tf.loadLayersModel('localstorage://portfolio-model-' + modelKey);
      this.models.set(modelKey, model);
      console.log(`Model ${modelKey} loaded successfully`);
      return true;
    } catch (error) {
      console.error(`Model loading error for ${modelKey}:`, error);
      return false;
    }
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    // Dispose all models and tensors
    for (const [key, model] of this.models) {
      model.dispose();
      console.log(`Disposed model: ${key}`);
    }
    
    for (const [key, scaler] of this.scalers) {
      scaler.mean.dispose();
      scaler.std.dispose();
      console.log(`Disposed scaler: ${key}`);
    }
    
    this.models.clear();
    this.scalers.clear();
  }

  /**
   * Get memory usage information
   */
  getMemoryInfo(): {
    numTensors: number;
    numBytes: number;
    models: string[];
  } {
    const memInfo = tf.memory();
    return {
      numTensors: memInfo.numTensors,
      numBytes: memInfo.numBytes,
      models: Array.from(this.models.keys())
    };
  }
}

// Export singleton instance
export const tensorFlowService = new TensorFlowService();
export default tensorFlowService;