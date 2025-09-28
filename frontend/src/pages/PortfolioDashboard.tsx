import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { API_URL } from '../utils/config'
import toast from 'react-hot-toast'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale,
} from 'chart.js'
import { Bar, Doughnut, Line, Radar, Scatter } from 'react-chartjs-2'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  RadialLinearScale
)

// Enhanced Types for new analytics endpoints
interface EnhancedPortfolioOverview {
  overview: {
    total_projects: number
    active_projects: number
    completed_projects: number
    planning_projects: number
    on_hold_projects: number
    total_tasks: number
    completed_tasks: number
    in_progress_tasks: number
    blocked_tasks: number
    overdue_tasks: number
    total_teams: number
    total_members: number
    project_health_score: number
    task_completion_rate: number
    task_progress_rate: number
    resource_utilization: number
    budget_utilization: number
    risk_score: number
    avg_task_completion_time: number
    team_productivity: number
  }
  financial: {
    total_budget: number
    spent_budget: number
    remaining_budget: number
    budget_utilization: number
    cost_per_project: number
    cost_per_task: number
  }
  trends: {
    projects_created_this_month: number
    tasks_completed_this_week: number
    new_team_members: number
    projects_completed_this_month: number
    average_project_duration: number
  }
  alerts: Array<{
    type: string
    title: string
    message: string
    priority: string
  }>
}

interface ResourceUtilization {
  user_workloads: Array<{
    user_id: string
    name: string
    role: string
    active_tasks: number
    completed_tasks: number
    overdue_tasks: number
    workload_score: number
    capacity_utilization: number
    skills: string[]
    skill_match_score: number
    availability_status: string
  }>
  team_resources: Array<{
    team_id: string
    name: string
    type: string
    member_count: number
    avg_utilization: number
    total_active_tasks: number
    total_overdue_tasks: number
    capacity_status: string
  }>
  summary: {
    total_users: number
    overutilized_users: number
    underutilized_users: number
    optimal_users: number
    average_utilization: number
    total_active_tasks: number
  }
  recommendations: Array<{
    type: string
    title: string
    description: string
  }>
  capacity_forecast: {
    current_utilization: number
    available_capacity: number
    projected_need: number
    capacity_gap: number
  }
}

interface GanttTimeline {
  gantt_data: Array<{
    id: string
    name: string
    type: string
    start_date: string
    end_date: string
    status: string
    priority: string
    completion_rate: number
    children: Array<any>
    milestones: Array<any>
  }>
  insights: {
    critical_path: string[]
    schedule_variance: number
    resource_conflicts: Array<any>
    upcoming_milestones: Array<{
      project_id: string
      project_name: string
      milestone_name: string
      due_date: string
      days_until: number
    }>
    timeline_risks: Array<any>
  }
  summary: {
    total_projects: number
    total_tasks: number
    projects_on_schedule: number
    projects_behind_schedule: number
    critical_tasks: number
  }
}

// Keep existing interfaces for backward compatibility
interface ProjectHealth {
  projects: Array<{
    id: string
    name: string
    status: string
    priority: string
    completion_rate: number
    total_tasks: number
    completed_tasks: number
    overdue_tasks: number
    health_status: string
    budget_spent: number
    budget_total: number
    team_size: number
  }>
  summary: {
    total_projects: number
    healthy_projects: number
    at_risk_projects: number
    average_completion: number
  }
  distributions: {
    status: Record<string, number>
    priority: Record<string, number>
  }
}

interface TeamPerformance {
  teams: Array<{
    id: string
    name: string
    type: string
    member_count: number
    total_tasks: number
    completed_tasks: number
    completion_rate: number
    avg_task_completion_time: number
    skills: Record<string, number>
    productivity_score: number
  }>
  summary: {
    total_teams: number
    total_members: number
    average_team_size: number
    most_productive_team: string
  }
}

interface BudgetAnalytics {
  projects: Array<{
    project_id: string
    project_name: string
    allocated_budget: number
    spent_amount: number
    remaining_budget: number
    utilization_rate: number
    currency: string
    status: string
    completion_rate: number
  }>
  summary: {
    total_allocated: number
    total_spent: number
    total_remaining: number
    overall_utilization: number
    projects_over_budget: number
    projects_at_risk: number
  }
}

interface TimelineAnalytics {
  upcoming_deadlines: Array<{
    id: string
    title: string
    type: string
    due_date: string
    days_until_due: number
    status: string
    project_id?: string
  }>
  overdue_items: Array<{
    id: string
    title: string
    type: string
    due_date: string
    days_until_due: number
    status: string
    project_id?: string
  }>
  summary: {
    total_upcoming: number
    total_overdue: number
    critical_items: number
    this_week_due: number
  }
}

const PortfolioDashboard: React.FC = () => {
  const { tokens, user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  
  // State for enhanced analytics data
  const [portfolioOverview, setPortfolioOverview] = useState<EnhancedPortfolioOverview | null>(null)
  const [resourceUtilization, setResourceUtilization] = useState<ResourceUtilization | null>(null)
  const [ganttTimeline, setGanttTimeline] = useState<GanttTimeline | null>(null)
  const [projectHealth, setProjectHealth] = useState<ProjectHealth | null>(null)
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null)
  const [budgetAnalytics, setBudgetAnalytics] = useState<BudgetAnalytics | null>(null)
  const [timelineAnalytics, setTimelineAnalytics] = useState<TimelineAnalytics | null>(null)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'teams' | 'budget' | 'timeline' | 'resources' | 'gantt'>('overview')
  const [autoRefresh, setAutoRefresh] = useState(false)

  // Auto-refresh functionality
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchAnalyticsData(true)
      }, 30000) // Refresh every 30 seconds
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoRefresh, tokens?.access_token])

  // Fetch all analytics data
  const fetchAnalyticsData = async (isRefresh = false) => {
    if (!tokens?.access_token) return
    
    if (isRefresh) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)
    
    try {
      const headers = {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }

      // Fetch all analytics endpoints in parallel
      const [overviewRes, resourceRes, ganttRes, projectsRes, teamsRes, budgetRes, timelineRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/portfolio/overview`, { headers }),
        fetch(`${API_URL}/api/analytics/resource/utilization`, { headers }),
        fetch(`${API_URL}/api/analytics/timeline/gantt`, { headers }),
        fetch(`${API_URL}/api/analytics/projects/health`, { headers }),
        fetch(`${API_URL}/api/analytics/teams/performance`, { headers }),
        fetch(`${API_URL}/api/analytics/budget/tracking`, { headers }),
        fetch(`${API_URL}/api/analytics/timeline/overview`, { headers })
      ])

      // Process responses
      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setPortfolioOverview(data)
      }

      if (resourceRes.ok) {
        const data = await resourceRes.json()
        setResourceUtilization(data)
      }

      if (ganttRes.ok) {
        const data = await ganttRes.json()
        setGanttTimeline(data)
      }

      if (projectsRes.ok) {
        const data = await projectsRes.json()
        setProjectHealth(data)
      }

      if (teamsRes.ok) {
        const data = await teamsRes.json()
        setTeamPerformance(data)
      }

      if (budgetRes.ok) {
        const data = await budgetRes.json()
        setBudgetAnalytics(data)
      }

      if (timelineRes.ok) {
        const data = await timelineRes.json()
        setTimelineAnalytics(data)
      }

      if (isRefresh) {
        toast.success('Analytics data refreshed')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      console.error('Error fetching analytics:', err)
      if (isRefresh) {
        toast.error('Failed to refresh data')
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchAnalyticsData()
  }, [tokens?.access_token])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading portfolio analytics...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Analytics</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => fetchAnalyticsData()}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Header with Controls */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive insights and real-time monitoring for {user?.first_name}'s organization
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh toggle */}
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className={autoRefresh ? 'text-primary-600' : 'text-gray-700'}>
                  Auto-refresh
                </span>
              </label>
              
              <button
                onClick={() => fetchAnalyticsData(true)}
                disabled={refreshing}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors disabled:opacity-50"
              >
                <span className={refreshing ? 'animate-spin' : ''}>🔄</span>
                <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {portfolioOverview?.alerts && portfolioOverview.alerts.length > 0 && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">⚠️ Active Alerts</h3>
            <div className="flex space-x-4 overflow-x-auto">
              {portfolioOverview.alerts.map((alert, index) => (
                <div
                  key={index}
                  className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm ${
                    alert.priority === 'high' ? 'bg-red-100 text-red-800 border border-red-200' :
                    alert.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' :
                    'bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <div className="font-medium">{alert.title}</div>
                  <div className="text-xs opacity-90">{alert.message}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {[
              { key: 'overview', label: 'Executive Overview', icon: '📊', description: 'Key metrics and KPIs' },
              { key: 'projects', label: 'Project Health', icon: '📋', description: 'Project status and risks' },
              { key: 'resources', label: 'Resource Planning', icon: '👥', description: 'Team utilization and capacity' },
              { key: 'gantt', label: 'Timeline & Gantt', icon: '📅', description: 'Project timelines and dependencies' },
              { key: 'teams', label: 'Team Performance', icon: '🏆', description: 'Team productivity metrics' },
              { key: 'budget', label: 'Financial Tracking', icon: '💰', description: 'Budget and cost analysis' },
              { key: 'timeline', label: 'Deadlines', icon: '⏰', description: 'Upcoming and overdue items' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 group whitespace-nowrap ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <div className="text-left">
                  <div>{tab.label}</div>
                  <div className="text-xs opacity-75 group-hover:opacity-100">{tab.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && portfolioOverview && (
          <EnhancedOverviewTab data={portfolioOverview} />
        )}
        
        {activeTab === 'projects' && projectHealth && (
          <ProjectHealthTab data={projectHealth} />
        )}
        
        {activeTab === 'resources' && resourceUtilization && (
          <ResourcePlanningTab data={resourceUtilization} />
        )}
        
        {activeTab === 'gantt' && ganttTimeline && (
          <GanttTimelineTab data={ganttTimeline} />
        )}
        
        {activeTab === 'teams' && teamPerformance && (
          <TeamPerformanceTab data={teamPerformance} />
        )}
        
        {activeTab === 'budget' && budgetAnalytics && (
          <BudgetTrackingTab data={budgetAnalytics} />
        )}
        
        {activeTab === 'timeline' && timelineAnalytics && (
          <TimelineTab data={timelineAnalytics} />
        )}
      </div>
    </div>
  )
}

// Enhanced Overview Tab Component
const EnhancedOverviewTab: React.FC<{ data: EnhancedPortfolioOverview }> = ({ data }) => {
  const { overview, financial, trends } = data

  return (
    <div className="space-y-8">
      {/* Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <ExecutiveKPICard
          title="Portfolio Health"
          value={`${overview.project_health_score}%`}
          subtitle="Overall health score"
          trend={overview.project_health_score > 75 ? 'up' : overview.project_health_score > 50 ? 'stable' : 'down'}
          color={overview.project_health_score > 75 ? 'green' : overview.project_health_score > 50 ? 'yellow' : 'red'}
          icon="🏥"
        />
        <ExecutiveKPICard
          title="Resource Utilization"
          value={`${overview.resource_utilization}%`}
          subtitle={`${overview.total_members} team members`}
          trend={overview.resource_utilization > 70 ? 'up' : overview.resource_utilization > 40 ? 'stable' : 'down'}
          color={overview.resource_utilization > 80 ? 'red' : overview.resource_utilization > 60 ? 'yellow' : 'green'}
          icon="👥"
        />
        <ExecutiveKPICard
          title="Budget Utilization"
          value={`${overview.budget_utilization}%`}
          subtitle={`$${financial.remaining_budget.toLocaleString()} remaining`}
          trend={overview.budget_utilization > 85 ? 'down' : overview.budget_utilization > 60 ? 'stable' : 'up'}
          color={overview.budget_utilization > 90 ? 'red' : overview.budget_utilization > 75 ? 'yellow' : 'green'}
          icon="💰"
        />
        <ExecutiveKPICard
          title="Risk Score"
          value={`${overview.risk_score}%`}
          subtitle={`${overview.overdue_tasks} overdue tasks`}
          trend={overview.risk_score > 30 ? 'down' : overview.risk_score > 15 ? 'stable' : 'up'}
          color={overview.risk_score > 40 ? 'red' : overview.risk_score > 20 ? 'yellow' : 'green'}
          icon="⚠️"
        />
      </div>

      {/* Portfolio Status Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Distribution</h3>
          <div className="w-64 h-64 mx-auto">
            <Doughnut
              data={{
                labels: ['Active', 'Completed', 'Planning', 'On Hold'],
                datasets: [{
                  data: [
                    overview.active_projects,
                    overview.completed_projects,
                    overview.planning_projects,
                    overview.on_hold_projects
                  ],
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'],
                  borderWidth: 0
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Task Progress */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Progress</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                <span className="text-sm text-gray-500">{overview.task_completion_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-green-600 h-3 rounded-full"
                  style={{ width: `${overview.task_completion_rate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Progress Rate</span>
                <span className="text-sm text-gray-500">{overview.task_progress_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-blue-600 h-3 rounded-full"
                  style={{ width: `${overview.task_progress_rate}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{overview.completed_tasks}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{overview.overdue_tasks}</div>
                <div className="text-xs text-gray-500">Overdue</div>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Overview */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Overview</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Budget</span>
              <span className="font-semibold">${financial.total_budget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Spent</span>
              <span className="font-semibold text-red-600">${financial.spent_budget.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Remaining</span>
              <span className="font-semibold text-green-600">${financial.remaining_budget.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Utilization</span>
                <span className="text-sm text-gray-500">{financial.budget_utilization}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    financial.budget_utilization > 90 ? 'bg-red-600' :
                    financial.budget_utilization > 75 ? 'bg-yellow-500' : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(financial.budget_utilization, 100)}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">${financial.cost_per_project.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Per Project</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">${financial.cost_per_task.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Per Task</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Productivity Radar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Radar</h3>
          <div className="w-80 h-80 mx-auto">
            <Radar
              data={{
                labels: [
                  'Project Health',
                  'Task Completion',
                  'Resource Utilization',
                  'Budget Control',
                  'Timeline Adherence',
                  'Team Productivity'
                ],
                datasets: [{
                  label: 'Current Performance',
                  data: [
                    overview.project_health_score,
                    overview.task_completion_rate,
                    overview.resource_utilization,
                    100 - overview.budget_utilization, // Inverted for better visualization
                    100 - overview.risk_score, // Inverted for better visualization
                    overview.team_productivity
                  ],
                  backgroundColor: 'rgba(59, 130, 246, 0.2)',
                  borderColor: 'rgba(59, 130, 246, 1)',
                  pointBackgroundColor: 'rgba(59, 130, 246, 1)',
                  pointBorderColor: '#fff',
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    display: false
                  }
                },
                scales: {
                  r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                      stepSize: 20
                    }
                  }
                }
              }}
            />
          </div>
        </div>

        {/* Trends and Insights */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trends & Insights</h3>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{trends.projects_created_this_month}</div>
                <div className="text-sm text-blue-800">Projects This Month</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{trends.tasks_completed_this_week}</div>
                <div className="text-sm text-green-800">Tasks This Week</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{trends.new_team_members}</div>
                <div className="text-sm text-purple-800">New Members</div>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-600">{trends.average_project_duration}</div>
                <div className="text-sm text-orange-800">Avg Duration (days)</div>
              </div>
            </div>
            
            {/* Key Insights */}
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3">💡 Key Insights</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {overview.overdue_tasks > 10 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-red-500">⚠️</span>
                    <span>High number of overdue tasks requires immediate attention</span>
                  </div>
                )}
                {overview.resource_utilization > 85 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-yellow-500">⚡</span>
                    <span>Team utilization is high - consider resource rebalancing</span>
                  </div>
                )}
                {overview.project_health_score > 80 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-green-500">✅</span>
                    <span>Strong project health indicates good execution</span>
                  </div>
                )}
                {financial.budget_utilization < 50 && (
                  <div className="flex items-start space-x-2">
                    <span className="text-blue-500">💡</span>
                    <span>Low budget utilization suggests opportunity for expansion</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// New Resource Planning Tab Component
const ResourcePlanningTab: React.FC<{ data: ResourceUtilization }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Users"
          value={data.summary.total_users}
          subtitle="team members"
          color="blue"
          icon="👥"
        />
        <MetricCard
          title="Optimal Utilization"
          value={data.summary.optimal_users}
          subtitle="properly utilized"
          color="green"
          icon="✅"
        />
        <MetricCard
          title="Overutilized"
          value={data.summary.overutilized_users}
          subtitle="need redistribution"
          color="red"
          icon="⚠️"
        />
        <MetricCard
          title="Underutilized"
          value={data.summary.underutilized_users}
          subtitle="available capacity"
          color="yellow"
          icon="📈"
        />
      </div>

      {/* Capacity Planning */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Capacity Forecast</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{data.capacity_forecast.current_utilization}%</div>
            <div className="text-sm text-gray-500">Current Utilization</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{data.capacity_forecast.available_capacity}</div>
            <div className="text-sm text-gray-500">Available Capacity</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">{data.capacity_forecast.projected_need}</div>
            <div className="text-sm text-gray-500">Projected Need</div>
          </div>
          <div className="text-center">
            <div className={`text-3xl font-bold ${
              data.capacity_forecast.capacity_gap > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {data.capacity_forecast.capacity_gap > 0 ? '+' : ''}{data.capacity_forecast.capacity_gap}
            </div>
            <div className="text-sm text-gray-500">Capacity Gap</div>
          </div>
        </div>
      </div>

      {/* User Workload Visualization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Member Utilization</h3>
        <Bar
          data={{
            labels: data.user_workloads.map(user => user.name),
            datasets: [{
              label: 'Capacity Utilization (%)',
              data: data.user_workloads.map(user => user.capacity_utilization),
              backgroundColor: data.user_workloads.map(user => 
                user.capacity_utilization > 90 ? '#EF4444' :
                user.capacity_utilization > 70 ? '#F59E0B' :
                user.capacity_utilization > 40 ? '#10B981' : '#3B82F6'
              ),
              borderRadius: 4
            }]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100,
                ticks: {
                  callback: function(value) {
                    return value + '%'
                  }
                }
              }
            }
          }}
        />
      </div>

      {/* Recommendations */}
      {data.recommendations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Recommendations</h3>
          <div className="space-y-4">
            {data.recommendations.map((rec, index) => (
              <div key={index} className="flex items-start space-x-3 p-4 bg-blue-50 rounded-lg">
                <div className="flex-shrink-0">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">{index + 1}</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">{rec.title}</h4>
                  <p className="text-sm text-blue-700">{rec.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// New Gantt Timeline Tab Component
const GanttTimelineTab: React.FC<{ data: GanttTimeline }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <MetricCard
          title="Total Projects"
          value={data.summary.total_projects}
          subtitle="active projects"
          color="blue"
          icon="📋"
        />
        <MetricCard
          title="On Schedule"
          value={data.summary.projects_on_schedule}
          subtitle="projects"
          color="green"
          icon="✅"
        />
        <MetricCard
          title="Behind Schedule"
          value={data.summary.projects_behind_schedule}
          subtitle="need attention"
          color="red"
          icon="⚠️"
        />
        <MetricCard
          title="Critical Tasks"
          value={data.insights.critical_path.length}
          subtitle="on critical path"
          color="orange"
          icon="⚡"
        />
        <MetricCard
          title="Schedule Variance"
          value={`${data.insights.schedule_variance > 0 ? '+' : ''}${data.insights.schedule_variance}`}
          subtitle="days"
          color={data.insights.schedule_variance > 0 ? 'green' : 'red'}
          icon="📅"
        />
      </div>

      {/* Upcoming Milestones */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">🎯 Upcoming Milestones</h3>
        {data.insights.upcoming_milestones.length > 0 ? (
          <div className="space-y-3">
            {data.insights.upcoming_milestones.slice(0, 5).map((milestone, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <div className="font-medium text-gray-900">{milestone.milestone_name}</div>
                  <div className="text-sm text-gray-600">{milestone.project_name}</div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    milestone.days_until <= 3 ? 'text-red-600' :
                    milestone.days_until <= 7 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {milestone.days_until === 0 ? 'Due Today' :
                     milestone.days_until === 1 ? 'Due Tomorrow' :
                     `Due in ${milestone.days_until} days`}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(milestone.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No upcoming milestones in the next 30 days</p>
        )}
      </div>

      {/* Project Timeline Overview */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Project Timeline Overview</h3>
        <div className="space-y-4">
          {data.gantt_data.map((project, index) => (
            <div key={project.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h4 className="font-medium text-gray-900">{project.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-gray-600">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      project.status === 'completed' ? 'bg-green-100 text-green-800' :
                      project.status === 'active' ? 'bg-blue-100 text-blue-800' :
                      project.status === 'on_hold' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {project.status}
                    </span>
                    <span>{project.children.length} tasks</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900">{project.completion_rate}%</div>
                  <div className="text-sm text-gray-500">Complete</div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    project.completion_rate >= 90 ? 'bg-green-500' :
                    project.completion_rate >= 50 ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}
                  style={{ width: `${project.completion_rate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Keep existing tab components with minor enhancements...
// Project Health Tab Component (enhanced)
const ProjectHealthTab: React.FC<{ data: ProjectHealth }> = ({ data }) => {
  const statusColors: Record<string, string> = {
    excellent: 'bg-green-100 text-green-800',
    good: 'bg-blue-100 text-blue-800',
    needs_attention: 'bg-yellow-100 text-yellow-800',
    at_risk: 'bg-red-100 text-red-800'
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={data.summary.total_projects}
          subtitle=""
          color="blue"
          icon="📋"
        />
        <MetricCard
          title="Healthy Projects"
          value={data.summary.healthy_projects}
          subtitle="Excellent status"
          color="green"
          icon="✅"
        />
        <MetricCard
          title="At Risk Projects"
          value={data.summary.at_risk_projects}
          subtitle="Need attention"
          color="red" 
          icon="⚠️"
        />
        <MetricCard
          title="Avg Completion"
          value={`${data.summary.average_completion}%`}
          subtitle="Across all projects"
          color="purple"
          icon="📊"
        />
      </div>

      {/* Project Health Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Project Health Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[project.health_status]}`}>
                      {project.health_status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${project.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{project.completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.completed_tasks}/{project.total_tasks}
                    {project.overdue_tasks > 0 && (
                      <span className="ml-2 text-red-600">({project.overdue_tasks} overdue)</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {project.team_size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {project.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Keep existing components (TeamPerformanceTab, BudgetTrackingTab, TimelineTab) with same implementation...
// Team Performance Tab Component
const TeamPerformanceTab: React.FC<{ data: TeamPerformance }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Teams"
          value={data.summary.total_teams}
          subtitle=""
          color="blue"
          icon="👥"
        />
        <MetricCard
          title="Total Members"
          value={data.summary.total_members}
          subtitle=""
          color="green"
          icon="👤"
        />
        <MetricCard
          title="Avg Team Size"
          value={data.summary.average_team_size}
          subtitle="members per team"
          color="purple"
          icon="📊"
        />
        <MetricCard
          title="Top Performer"
          value={data.summary.most_productive_team || 'N/A'}
          subtitle="highest productivity"
          color="gold"
          icon="🏆"
        />
      </div>

      {/* Team Performance Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Team Productivity Scores</h3>
        <Bar
          data={{
            labels: data.teams.map(team => team.name),
            datasets: [{
              label: 'Productivity Score',
              data: data.teams.map(team => team.productivity_score),
              backgroundColor: '#3B82F6',
              borderRadius: 4
            }]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                display: false
              }
            },
            scales: {
              y: {
                beginAtZero: true,
                max: 100
              }
            }
          }}
        />
      </div>

      {/* Team Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Team Performance Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Team
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Members
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tasks Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Productivity Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.teams.map((team) => (
                <tr key={team.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{team.name}</div>
                    <div className="text-sm text-gray-500">{team.type}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.member_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {team.completed_tasks}/{team.total_tasks}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${team.completion_rate}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{team.completion_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{team.productivity_score}/100</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Budget Tracking Tab Component
const BudgetTrackingTab: React.FC<{ data: BudgetAnalytics }> = ({ data }) => {
  const getBudgetStatusColor = (status: string) => {
    switch (status) {
      case 'on_track': return 'bg-green-100 text-green-800'
      case 'at_risk': return 'bg-yellow-100 text-yellow-800'
      case 'over_budget': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Total Allocated"
          value={`$${data.summary.total_allocated.toLocaleString()}`}
          subtitle=""
          color="blue"
          icon="💰"
        />
        <MetricCard
          title="Total Spent"
          value={`$${data.summary.total_spent.toLocaleString()}`}
          subtitle={`${data.summary.overall_utilization}% utilized`}
          color="green"
          icon="💸"
        />
        <MetricCard
          title="Remaining Budget"
          value={`$${data.summary.total_remaining.toLocaleString()}`}
          subtitle=""
          color="purple"
          icon="💵"
        />
        <MetricCard
          title="At Risk Projects"
          value={data.summary.projects_at_risk + data.summary.projects_over_budget}
          subtitle="need attention"
          color="red"
          icon="⚠️"
        />
      </div>

      {/* Budget Utilization Chart */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Utilization by Project</h3>
        <Bar
          data={{
            labels: data.projects.map(project => project.project_name),
            datasets: [
              {
                label: 'Allocated',
                data: data.projects.map(project => project.allocated_budget),
                backgroundColor: '#E5E7EB',
              },
              {
                label: 'Spent',
                data: data.projects.map(project => project.spent_amount),
                backgroundColor: '#3B82F6',
              }
            ]
          }}
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: 'top'
              }
            },
            scales: {
              y: {
                beginAtZero: true
              }
            }
          }}
        />
      </div>

      {/* Budget Details Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Budget Details by Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Allocated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Spent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remaining
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.projects.map((project) => (
                <tr key={project.project_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{project.project_name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${project.allocated_budget.toLocaleString()} {project.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${project.spent_amount.toLocaleString()} {project.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${project.remaining_budget.toLocaleString()} {project.currency}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div
                          className={`h-2 rounded-full ${
                            project.utilization_rate > 90 ? 'bg-red-600' :
                            project.utilization_rate > 75 ? 'bg-yellow-500' : 'bg-green-600'
                          }`}
                          style={{ width: `${Math.min(project.utilization_rate, 100)}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-500">{project.utilization_rate}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBudgetStatusColor(project.status)}`}>
                      {project.status.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Timeline Tab Component
const TimelineTab: React.FC<{ data: TimelineAnalytics }> = ({ data }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const getDaysText = (days: number) => {
    if (days < 0) return `${Math.abs(days)} days overdue`
    if (days === 0) return 'Due today'
    if (days === 1) return 'Due tomorrow'
    return `Due in ${days} days`
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <MetricCard
          title="Upcoming Deadlines"
          value={data.summary.total_upcoming}
          subtitle="next 30 days"
          color="blue"
          icon="⏰"
        />
        <MetricCard
          title="Overdue Items"
          value={data.summary.total_overdue}
          subtitle="need attention"
          color="red"
          icon="🚨"
        />
        <MetricCard
          title="Critical Items"
          value={data.summary.critical_items}
          subtitle="due in 3 days"
          color="orange"
          icon="⚡"
        />
        <MetricCard
          title="This Week"
          value={data.summary.this_week_due}
          subtitle="due this week"
          color="purple"
          icon="📅"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.upcoming_deadlines.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {data.upcoming_deadlines.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.type === 'project' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.type}
                          </span>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.days_until_due <= 3 ? 'bg-red-100 text-red-800' :
                            item.days_until_due <= 7 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {getDaysText(item.days_until_due)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-500">Due: {formatDate(item.due_date)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">🎉</div>
                <div>No upcoming deadlines</div>
              </div>
            )}
          </div>
        </div>

        {/* Overdue Items */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Overdue Items</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.overdue_items.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {data.overdue_items.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            item.type === 'project' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {item.type}
                          </span>
                          <span className="text-xs px-2 py-1 rounded-full bg-red-100 text-red-800">
                            {getDaysText(item.days_until_due)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <div className="text-sm font-medium text-gray-900">{item.title}</div>
                          <div className="text-sm text-gray-500">Was due: {formatDate(item.due_date)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <div className="text-4xl mb-2">✅</div>
                <div>No overdue items</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Enhanced Executive KPI Card Component
const ExecutiveKPICard: React.FC<{
  title: string
  value: string | number
  subtitle: string
  trend: 'up' | 'down' | 'stable'
  color: string
  icon: string
}> = ({ title, value, subtitle, trend, color, icon }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600 border-blue-200',
    green: 'bg-green-100 text-green-600 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-600 border-yellow-200',
    red: 'bg-red-100 text-red-600 border-red-200',
    purple: 'bg-purple-100 text-purple-600 border-purple-200',
    orange: 'bg-orange-100 text-orange-600 border-orange-200'
  }

  const trendIcons = {
    up: '📈',
    down: '📉',
    stable: '➡️'
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border-2 p-6 ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-2xl">{icon}</span>
            <span className="text-sm font-medium text-gray-600">{title}</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">{subtitle}</span>
            <span className="text-lg">{trendIcons[trend]}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Reusable Metric Card Component (enhanced)
const MetricCard: React.FC<{
  title: string
  value: string | number
  subtitle: string
  color: string
  icon: string
}> = ({ title, value, subtitle, color, icon }) => {
  const colorClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-green-100 text-green-600',
    yellow: 'bg-yellow-100 text-yellow-600',
    red: 'bg-red-100 text-red-600',
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    gold: 'bg-yellow-100 text-yellow-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center">
        <div className="flex-shrink-0">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <span className="font-semibold text-lg">{icon}</span>
          </div>
        </div>
        <div className="ml-4 flex-1">
          <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
          <p className="text-sm font-medium text-gray-700">{title}</p>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
      </div>
    </div>
  )
}

export default PortfolioDashboard