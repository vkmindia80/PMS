import React, { useState, useEffect } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle, 
  ChevronDown, 
  ChevronRight, 
  Calculator, 
  PieChart, 
  BarChart3, 
  AlertTriangle,
  Target,
  Activity,
  Zap,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { BACKEND_URL } from '../../utils/config'

interface PortfolioCostSummary {
  summary: {
    total_projects: number
    active_projects: number
    total_budget: number
    total_spent: number
    remaining_budget: number
    budget_utilization: number
    average_project_budget: number
    average_project_spent: number
    currency: string
  }
  alerts: {
    projects_over_budget: number
    high_risk_projects: number
    overdue_projects: number
    risk_level: string
    risk_score: number
  }
  breakdown: {
    by_status: Record<string, { count: number; budget: number; spent: number }>
    by_priority: Record<string, { count: number; budget: number; spent: number }>
    monthly_spending: Record<string, number>
  }
  insights: {
    cost_efficiency: number
    projected_monthly_spend: number
    projected_completion_cost: number
    budget_target_variance: number
  }
  projects: Array<{
    id: string
    name: string
    status: string
    priority: string
    total_budget: number
    spent_amount: number
    remaining_budget: number
    budget_utilization: number
    currency: string
    is_overdue: boolean
  }>
}

interface BudgetAlert {
  type: string
  severity: 'critical' | 'warning' | 'info'
  project_id: string
  project_name: string
  message: string
  details: Record<string, any>
}

interface CostCalculationSidebarProps {
  isVisible: boolean
  onToggle: () => void
}

const CostCalculationSidebar: React.FC<CostCalculationSidebarProps> = ({ isVisible, onToggle }) => {
  const { tokens } = useAuth()
  const [costData, setCostData] = useState<PortfolioCostSummary | null>(null)
  const [alerts, setAlerts] = useState<BudgetAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedSection, setExpandedSection] = useState<string | null>('overview')
  
  // Cost estimation form state
  const [showEstimator, setShowEstimator] = useState(false)
  const [estimatorData, setEstimatorData] = useState({
    projectType: 'software_development',
    teamSize: 5,
    durationMonths: 6
  })
  const [estimates, setEstimates] = useState<any>(null)

  const fetchCostData = async () => {
    try {
      setLoading(true)
      
      // Fetch portfolio summary
      const summaryResponse = await fetch(`${BACKEND_URL}/api/cost-analytics/portfolio-summary`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (summaryResponse.ok) {
        const summaryData = await summaryResponse.json()
        setCostData(summaryData)
      }
      
      // Fetch alerts
      const alertsResponse = await fetch(`${BACKEND_URL}/api/cost-analytics/budget-alerts`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (alertsResponse.ok) {
        const alertsData = await alertsResponse.json()
        setAlerts(alertsData.alerts || [])
      }
      
    } catch (error) {
      console.error('Failed to fetch cost data:', error)
    } finally {
      setLoading(false)
    }
  }

  const generateCostEstimate = async () => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/cost-analytics/cost-estimates?project_type=${estimatorData.projectType}&team_size=${estimatorData.teamSize}&duration_months=${estimatorData.durationMonths}`,
        {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      )
      
      if (response.ok) {
        const estimateData = await response.json()
        setEstimates(estimateData)
      }
    } catch (error) {
      console.error('Failed to generate cost estimate:', error)
    }
  }

  useEffect(() => {
    if (isVisible && tokens?.access_token) {
      fetchCostData()
    }
  }, [isVisible, tokens?.access_token])

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      case 'high': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />
      default: return <CheckCircle className="w-4 h-4 text-blue-500" />
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  if (!isVisible) return null

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l border-gray-200 shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <DollarSign className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900">Cost Analytics</h2>
            <p className="text-xs text-gray-600">Portfolio Financial Insights</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Portfolio Overview Section */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('overview')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="font-medium text-sm">Portfolio Overview</span>
                </div>
                {expandedSection === 'overview' ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSection === 'overview' && costData && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Budget Summary Cards */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-3">
                      <div className="text-xs text-blue-600 font-medium">Total Budget</div>
                      <div className="text-lg font-bold text-blue-900">
                        {formatCurrency(costData.summary.total_budget)}
                      </div>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-3">
                      <div className="text-xs text-green-600 font-medium">Total Spent</div>
                      <div className="text-lg font-bold text-green-900">
                        {formatCurrency(costData.summary.total_spent)}
                      </div>
                    </div>
                  </div>

                  {/* Budget Utilization */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700">Budget Utilization</span>
                      <span className="text-xs font-bold text-gray-900">
                        {costData.summary.budget_utilization.toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all ${
                          costData.summary.budget_utilization > 100 ? 'bg-red-500' :
                          costData.summary.budget_utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(costData.summary.budget_utilization, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Key Metrics */}
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Projects</span>
                      <span className="font-medium">{costData.summary.active_projects}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Remaining Budget</span>
                      <span className="font-medium">{formatCurrency(costData.summary.remaining_budget)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Avg Project Budget</span>
                      <span className="font-medium">{formatCurrency(costData.summary.average_project_budget)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Budget Alerts Section */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('alerts')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-medium text-sm">Budget Alerts</span>
                  {alerts.length > 0 && (
                    <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5">
                      {alerts.length}
                    </span>
                  )}
                </div>
                {expandedSection === 'alerts' ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSection === 'alerts' && (
                <div className="px-4 pb-4">
                  {alerts.length === 0 ? (
                    <div className="text-center py-4">
                      <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">No budget alerts</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {alerts.slice(0, 5).map((alert, index) => (
                        <div key={index} className={`p-3 rounded-lg border ${
                          alert.severity === 'critical' ? 'bg-red-50 border-red-200' :
                          alert.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-blue-50 border-blue-200'
                        }`}>
                          <div className="flex items-start space-x-2">
                            {getSeverityIcon(alert.severity)}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-medium text-gray-900 truncate">
                                {alert.project_name}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                {alert.message}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Cost Insights Section */}
            {costData && (
              <div className="border-b border-gray-100">
                <button
                  onClick={() => toggleSection('insights')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-sm">Cost Insights</span>
                  </div>
                  {expandedSection === 'insights' ? 
                    <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                </button>
                
                {expandedSection === 'insights' && (
                  <div className="px-4 pb-4 space-y-3">
                    {/* Risk Assessment */}
                    <div className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-700">Risk Assessment</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getRiskColor(costData.alerts.risk_level)}`}>
                          {costData.alerts.risk_level.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        Risk Score: {costData.alerts.risk_score.toFixed(1)}/100
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cost Efficiency</span>
                        <span className="font-medium">{costData.insights.cost_efficiency.toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Monthly Burn Rate</span>
                        <span className="font-medium">{formatCurrency(costData.insights.projected_monthly_spend)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Projected Completion</span>
                        <span className="font-medium">{formatCurrency(costData.insights.projected_completion_cost)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cost Estimator Section */}
            <div className="border-b border-gray-100">
              <button
                onClick={() => toggleSection('estimator')}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Calculator className="w-4 h-4 text-green-600" />
                  <span className="font-medium text-sm">Cost Estimator</span>
                </div>
                {expandedSection === 'estimator' ? 
                  <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                }
              </button>
              
              {expandedSection === 'estimator' && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Estimator Form */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Project Type
                      </label>
                      <select
                        value={estimatorData.projectType}
                        onChange={(e) => setEstimatorData({...estimatorData, projectType: e.target.value})}
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                      >
                        <option value="software_development">Software Development</option>
                        <option value="marketing_campaign">Marketing Campaign</option>
                        <option value="product_launch">Product Launch</option>
                        <option value="research">Research</option>
                        <option value="infrastructure">Infrastructure</option>
                        <option value="design">Design</option>
                        <option value="consulting">Consulting</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Team Size
                      </label>
                      <input
                        type="number"
                        value={estimatorData.teamSize}
                        onChange={(e) => setEstimatorData({...estimatorData, teamSize: parseInt(e.target.value) || 1})}
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                        min="1"
                        max="50"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Duration (Months)
                      </label>
                      <input
                        type="number"
                        value={estimatorData.durationMonths}
                        onChange={(e) => setEstimatorData({...estimatorData, durationMonths: parseInt(e.target.value) || 1})}
                        className="w-full text-xs border border-gray-300 rounded-md px-2 py-1"
                        min="1"
                        max="24"
                      />
                    </div>
                    
                    <button
                      onClick={generateCostEstimate}
                      className="w-full bg-blue-600 text-white text-xs py-2 px-3 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Generate Estimate
                    </button>
                  </div>

                  {/* Estimates Display */}
                  {estimates && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-xs font-medium text-gray-700">Cost Estimates</h4>
                      {estimates.estimates.map((estimate: any, index: number) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-gray-700">
                              {estimate.method}
                            </span>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                              {estimate.confidence}% confidence
                            </span>
                          </div>
                          <div className="text-sm font-bold text-gray-900 mt-1">
                            {formatCurrency(estimate.total_cost)}
                          </div>
                          {estimate.note && (
                            <div className="text-xs text-gray-600 mt-1">
                              {estimate.note}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Top Projects Section */}
            {costData && costData.projects.length > 0 && (
              <div className="border-b border-gray-100">
                <button
                  onClick={() => toggleSection('projects')}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <PieChart className="w-4 h-4 text-indigo-600" />
                    <span className="font-medium text-sm">Top Projects</span>
                  </div>
                  {expandedSection === 'projects' ? 
                    <ChevronDown className="w-4 h-4 text-gray-400" /> : 
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  }
                </button>
                
                {expandedSection === 'projects' && (
                  <div className="px-4 pb-4 space-y-2">
                    {costData.projects.slice(0, 5).map((project) => (
                      <div key={project.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 truncate">
                              {project.name}
                            </div>
                            <div className="text-xs text-gray-600">
                              {project.status} • {project.priority} priority
                            </div>
                          </div>
                          {project.is_overdue && (
                            <AlertCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Budget</span>
                            <span className="font-medium">{formatCurrency(project.total_budget)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Spent</span>
                            <span className="font-medium">{formatCurrency(project.spent_amount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Utilization</span>
                            <span className={`font-medium ${
                              project.budget_utilization > 100 ? 'text-red-600' :
                              project.budget_utilization > 80 ? 'text-yellow-600' : 'text-green-600'
                            }`}>
                              {project.budget_utilization.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                          <div 
                            className={`h-1.5 rounded-full transition-all ${
                              project.budget_utilization > 100 ? 'bg-red-500' :
                              project.budget_utilization > 80 ? 'bg-yellow-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(project.budget_utilization, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-3 bg-gray-50">
        <button
          onClick={fetchCostData}
          className="w-full flex items-center justify-center space-x-2 text-xs text-gray-600 hover:text-gray-900 transition-colors"
        >
          <Activity className="w-3 h-3" />
          <span>Refresh Data</span>
        </button>
      </div>
    </div>
  )
}

export default CostCalculationSidebar