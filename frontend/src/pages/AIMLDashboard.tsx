/**
 * AI/ML Dashboard - Advanced AI and Machine Learning Features
 * Phase 4.1: Next-generation AI/ML integration with TensorFlow.js
 */
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Brain, 
  TrendingUp, 
  Users, 
  Target, 
  Activity, 
  Zap,
  Bot,
  BarChart3,
  Cpu,
  Network,
  AlertTriangle,
  CheckCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import axios from 'axios';
import { Line, Bar, Radar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import tensorFlowService from '../utils/tensorflowService';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  RadialLinearScale,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AIModel {
  model: string;
  provider: string;
  capabilities: string[];
  max_tokens: number;
  cost_per_token: number;
}

interface PredictionResult {
  prediction: number;
  confidence: number;
  factors: Record<string, number>;
  timestamp: string;
}

interface ModelMetrics {
  accuracy: number;
  loss: number;
  trainedSamples: number;
  lastUpdated: Date;
}

interface IntegrationStatus {
  enabled: boolean;
  configured: boolean;
  type: string;
  features: string[];
}

const AIMLDashboard: React.FC = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState('gpt-4o');
  const [predictions, setPredictions] = useState<Record<string, PredictionResult>>({});
  const [integrations, setIntegrations] = useState<Record<string, IntegrationStatus>>({});
  const [modelMetrics, setModelMetrics] = useState<Record<string, ModelMetrics>>({});
  const [tensorflowReady, setTensorflowReady] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loading, setLoading] = useState(true);

  // API base URL
  const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

  // Initialize component
  useEffect(() => {
    initializeDashboard();
  }, []);

  const initializeDashboard = async () => {
    try {
      setLoading(true);
      
      // Load available AI models
      await loadAvailableModels();
      
      // Load integration status
      await loadIntegrationStatus();
      
      // Initialize TensorFlow.js
      await initializeTensorFlow();
      
      // Load sample predictions
      await loadSamplePredictions();
      
      setLoading(false);
    } catch (error) {
      console.error('Dashboard initialization error:', error);
      setLoading(false);
    }
  };

  const loadAvailableModels = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/ai-ml/models/available`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAvailableModels(response.data.models);
    } catch (error) {
      console.error('Error loading AI models:', error);
    }
  };

  const loadIntegrationStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_BASE_URL}/api/ai-ml/integrations/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIntegrations(response.data.integrations);
    } catch (error) {
      console.error('Error loading integration status:', error);
    }
  };

  const initializeTensorFlow = async () => {
    try {
      // TensorFlow.js initialization is handled by the service
      const memoryInfo = tensorFlowService.getMemoryInfo();
      console.log('TensorFlow.js Memory Info:', memoryInfo);
      setTensorflowReady(true);
      
      // Load sample model metrics
      const sampleMetrics: Record<string, ModelMetrics> = {
        task_duration: {
          accuracy: 0.85,
          loss: 0.12,
          trainedSamples: 150,
          lastUpdated: new Date()
        },
        resource_demand: {
          accuracy: 0.78,
          loss: 0.18,
          trainedSamples: 120,
          lastUpdated: new Date()
        },
        team_performance: {
          accuracy: 0.82,
          loss: 0.15,
          trainedSamples: 95,
          lastUpdated: new Date()
        }
      };
      setModelMetrics(sampleMetrics);
    } catch (error) {
      console.error('TensorFlow.js initialization error:', error);
    }
  };

  const loadSamplePredictions = async () => {
    try {
      // Generate sample predictions using TensorFlow.js
      const taskPrediction = await tensorFlowService.predictTaskDuration({
        complexityScore: 7.5,
        priorityWeight: 2.0,
        requiredSkillsCount: 4,
        estimatedHours: 40,
        dependenciesCount: 2,
        hasExternalDependency: true,
        teamSize: 3,
        experienceLevel: 6.5
      });

      const teamPerformance = await tensorFlowService.predictTeamPerformance(
        {
          teamSize: 6,
          averageExperience: 5.5,
          skillDiversity: 0.8,
          workloadBalance: 0.75,
          collaborationScore: 0.85
        },
        {
          totalHours: 320,
          highPriorityTasks: 12,
          overdueTasks: 3,
          avgTaskComplexity: 6.2
        }
      );

      setPredictions({
        task_duration: taskPrediction,
        productivity: teamPerformance.productivityScore,
        burnout_risk: teamPerformance.burnoutRisk,
        collaboration: teamPerformance.collaborationEffectiveness
      });
    } catch (error) {
      console.error('Error loading predictions:', error);
    }
  };

  const generateAIResponse = async () => {
    if (!aiPrompt.trim()) return;
    
    setIsGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE_URL}/api/ai-ml/generate`,
        {
          prompt: aiPrompt,
          model: selectedModel,
          context: {
            dashboard_context: "enterprise_portfolio_management",
            user_role: "project_manager"
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setAiResponse(response.data.content);
      } else {
        setAiResponse('Error generating response: ' + response.data.error);
      }
    } catch (error) {
      console.error('AI generation error:', error);
      setAiResponse('Failed to generate AI response. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const predictTaskDuration = async () => {
    try {
      const sampleTaskData = {
        complexity_score: 8.0,
        priority_weight: 2.5,
        required_skills_count: 5,
        estimated_hours: 80,
        dependencies_count: 3,
        has_external_dependency: true,
        team_size: 4,
        experience_level: 7.0
      };

      const prediction = await tensorFlowService.predictTaskDuration({
        complexityScore: sampleTaskData.complexity_score,
        priorityWeight: sampleTaskData.priority_weight,
        requiredSkillsCount: sampleTaskData.required_skills_count,
        estimatedHours: sampleTaskData.estimated_hours,
        dependenciesCount: sampleTaskData.dependencies_count,
        hasExternalDependency: sampleTaskData.has_external_dependency,
        teamSize: sampleTaskData.team_size,
        experienceLevel: sampleTaskData.experience_level
      });

      setPredictions(prev => ({
        ...prev,
        task_duration_ml: prediction
      }));
    } catch (error) {
      console.error('Task duration prediction error:', error);
    }
  };

  const runAnomalyDetection = async () => {
    try {
      const currentMetrics = {
        velocity: 8.2,
        qualityScore: 7.8,
        teamMorale: 8.5,
        budgetUtilization: 0.75,
        timelineAdherence: 0.85
      };

      const historicalMetrics = [
        { velocity: 7.5, qualityScore: 8.2, teamMorale: 8.0, budgetUtilization: 0.72, timelineAdherence: 0.88, timestamp: new Date() },
        { velocity: 7.8, qualityScore: 8.1, teamMorale: 7.9, budgetUtilization: 0.74, timelineAdherence: 0.86, timestamp: new Date() },
        { velocity: 7.2, qualityScore: 8.3, teamMorale: 8.2, budgetUtilization: 0.70, timelineAdherence: 0.90, timestamp: new Date() },
      ];

      const anomalies = await tensorFlowService.detectAnomalies(currentMetrics, historicalMetrics);
      
      setPredictions(prev => ({
        ...prev,
        anomaly_detection: {
          prediction: anomalies.overallRiskScore,
          confidence: 0.85,
          factors: {
            detected_anomalies: anomalies.anomalies.length,
            risk_score: anomalies.overallRiskScore
          },
          timestamp: new Date().toISOString()
        }
      }));
    } catch (error) {
      console.error('Anomaly detection error:', error);
    }
  };

  // Chart configurations
  const getPredictionChartData = () => {
    const predictionKeys = Object.keys(predictions);
    const confidenceData = predictionKeys.map(key => predictions[key]?.confidence * 100 || 0);
    const predictionData = predictionKeys.map(key => predictions[key]?.prediction || 0);

    return {
      labels: predictionKeys.map(key => key.replace('_', ' ').toUpperCase()),
      datasets: [
        {
          label: 'Confidence %',
          data: confidenceData,
          backgroundColor: 'rgba(59, 130, 246, 0.6)',
          borderColor: 'rgb(59, 130, 246)',
          borderWidth: 2,
          fill: true
        },
        {
          label: 'Prediction Score',
          data: predictionData,
          backgroundColor: 'rgba(16, 185, 129, 0.6)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 2,
          fill: true
        }
      ]
    };
  };

  const getModelPerformanceData = () => {
    const modelNames = Object.keys(modelMetrics);
    return {
      labels: modelNames.map(name => name.replace('_', ' ').toUpperCase()),
      datasets: [
        {
          label: 'Accuracy',
          data: modelNames.map(name => modelMetrics[name].accuracy * 100),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(139, 92, 246, 0.8)'
          ],
          borderWidth: 2
        }
      ]
    };
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">AI Models Available</p>
              <p className="text-3xl font-bold text-gray-900">{availableModels.length}</p>
            </div>
            <Brain className="h-12 w-12 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Integrations</p>
              <p className="text-3xl font-bold text-gray-900">
                {Object.values(integrations).filter(i => i.enabled).length}
              </p>
            </div>
            <Network className="h-12 w-12 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">ML Models Trained</p>
              <p className="text-3xl font-bold text-gray-900">{Object.keys(modelMetrics).length}</p>
            </div>
            <Cpu className="h-12 w-12 text-purple-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">TensorFlow.js</p>
              <p className="text-sm font-medium text-green-600">{tensorflowReady ? 'Ready' : 'Loading'}</p>
            </div>
            <Zap className="h-12 w-12 text-orange-500" />
          </div>
        </div>
      </div>

      {/* Prediction Performance Chart */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Prediction Performance Overview
        </h3>
        <div className="h-64">
          <Line 
            data={getPredictionChartData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              },
              plugins: {
                legend: {
                  position: 'top' as const,
                },
                title: {
                  display: true,
                  text: 'AI/ML Model Performance Metrics'
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Available AI Models */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available AI Models</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableModels.map((model, index) => (
            <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-gray-900">{model.model}</h4>
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {model.provider}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Max Tokens: {model.max_tokens?.toLocaleString()}
              </p>
              <div className="flex flex-wrap gap-1">
                {model.capabilities?.map((cap, capIndex) => (
                  <span key={capIndex} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    {cap}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAIPlaygroundTab = () => (
    <div className="space-y-6">
      {/* AI Model Selector */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Model Playground</h3>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select AI Model
          </label>
          <select 
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            {availableModels.map(model => (
              <option key={model.model} value={model.model}>
                {model.model} ({model.provider})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter your prompt
          </label>
          <textarea
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            placeholder="Ask for portfolio insights, resource optimization recommendations, or strategic advice..."
            rows={4}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          onClick={generateAIResponse}
          disabled={isGenerating || !aiPrompt.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate AI Response
            </>
          )}
        </button>

        {aiResponse && (
          <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
            <h4 className="font-semibold text-gray-900 mb-2">AI Response:</h4>
            <div className="prose max-w-none text-gray-700 whitespace-pre-wrap">
              {aiResponse}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderPredictiveAnalyticsTab = () => (
    <div className="space-y-6">
      {/* ML Prediction Actions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Machine Learning Predictions
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={predictTaskDuration}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all group"
          >
            <Clock className="h-8 w-8 text-gray-400 group-hover:text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Predict Task Duration</p>
            <p className="text-xs text-gray-500">ML-powered estimation</p>
          </button>

          <button
            onClick={runAnomalyDetection}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all group"
          >
            <AlertTriangle className="h-8 w-8 text-gray-400 group-hover:text-orange-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Detect Anomalies</p>
            <p className="text-xs text-gray-500">Real-time monitoring</p>
          </button>

          <button
            onClick={() => loadSamplePredictions()}
            className="p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all group"
          >
            <TrendingUp className="h-8 w-8 text-gray-400 group-hover:text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-gray-900">Team Performance</p>
            <p className="text-xs text-gray-500">Predict productivity</p>
          </button>
        </div>
      </div>

      {/* Model Performance */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          ML Model Performance
        </h3>
        <div className="h-64">
          <Bar 
            data={getModelPerformanceData()} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  max: 100
                }
              },
              plugins: {
                legend: {
                  display: false
                },
                title: {
                  display: true,
                  text: 'Model Accuracy Scores'
                }
              }
            }} 
          />
        </div>
      </div>

      {/* Prediction Results */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Predictions</h3>
        <div className="space-y-4">
          {Object.entries(predictions).map(([key, prediction]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900">
                  {key.replace('_', ' ').toUpperCase()}
                </h4>
                <span className="text-sm text-gray-500">
                  {new Date(prediction.timestamp).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Prediction</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {typeof prediction.prediction === 'number' 
                      ? prediction.prediction.toFixed(2)
                      : prediction.prediction
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Confidence</p>
                  <p className="text-lg font-semibold text-green-600">
                    {(prediction.confidence * 100).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderIntegrationsTab = () => (
    <div className="space-y-6">
      {/* Integration Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Integration Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(integrations).map(([key, integration]) => (
            <div key={key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-gray-900 capitalize">
                  {key.replace('_', ' ')}
                </h4>
                <div className="flex items-center gap-2">
                  {integration.enabled ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Type: {integration.type}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Status: {integration.enabled ? 'Enabled' : 'Disabled'}
              </p>
              <div className="flex flex-wrap gap-1">
                {integration.features?.map((feature, index) => (
                  <span key={index} className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Available Integrations */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Integrations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { name: 'Slack Advanced Workflows', type: 'Communication', features: ['Interactive Cards', 'Slash Commands', 'Workflows'] },
            { name: 'Microsoft Teams', type: 'Communication', features: ['Adaptive Cards', 'Bot Framework', 'Graph API'] },
            { name: 'GitHub Advanced Sync', type: 'Development', features: ['PR Tracking', 'CI/CD Integration', 'Code Quality'] },
            { name: 'Google Workspace', type: 'Productivity', features: ['Calendar Sync', 'Drive Integration', 'Gmail'] },
            { name: 'Linear Project Sync', type: 'Project Management', features: ['Issue Tracking', 'Roadmap Sync'] },
            { name: 'Notion Documentation', type: 'Documentation', features: ['Database Sync', 'Page Templates'] }
          ].map((integration, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <h4 className="font-semibold text-gray-900 mb-2">{integration.name}</h4>
              <p className="text-sm text-gray-600 mb-2">Type: {integration.type}</p>
              <div className="flex flex-wrap gap-1 mb-3">
                {integration.features.map((feature, featureIndex) => (
                  <span key={featureIndex} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {feature}
                  </span>
                ))}
              </div>
              <button className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 text-sm">
                Configure Integration
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading AI/ML Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            AI/ML Dashboard
          </h1>
          <p className="text-gray-600">
            Advanced artificial intelligence and machine learning capabilities for enterprise portfolio management
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'ai-playground', name: 'AI Playground', icon: Bot },
              { id: 'predictive', name: 'Predictive Analytics', icon: TrendingUp },
              { id: 'integrations', name: 'Integrations', icon: Network }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700 border-b-2 border-blue-700'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'overview' && renderOverviewTab()}
          {activeTab === 'ai-playground' && renderAIPlaygroundTab()}
          {activeTab === 'predictive' && renderPredictiveAnalyticsTab()}
          {activeTab === 'integrations' && renderIntegrationsTab()}
        </div>
      </div>
    </div>
  );
};

export default AIMLDashboard;