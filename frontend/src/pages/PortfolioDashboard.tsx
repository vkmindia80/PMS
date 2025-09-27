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
} from 'chart.js'
import { Bar, Doughnut, Line } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
)

// Types
interface PortfolioOverview {
  overview: {
    total_projects: number
    active_projects: number
    completed_projects: number
    total_tasks: number
    completed_tasks: number
    overdue_tasks: number
    total_teams: number
    total_members: number
    project_health_score: number
    task_completion_rate: number
    resource_utilization: number
  }
  trends: {
    projects_created_this_month: number
    tasks_completed_this_week: number
    new_team_members: number
  }
}

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
  
  // State for different analytics data
  const [portfolioOverview, setPortfolioOverview] = useState<PortfolioOverview | null>(null)
  const [projectHealth, setProjectHealth] = useState<ProjectHealth | null>(null)
  const [teamPerformance, setTeamPerformance] = useState<TeamPerformance | null>(null)
  const [budgetAnalytics, setBudgetAnalytics] = useState<BudgetAnalytics | null>(null)
  const [timelineAnalytics, setTimelineAnalytics] = useState<TimelineAnalytics | null>(null)
  
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'teams' | 'budget' | 'timeline'>('overview')

  // Fetch all analytics data
  const fetchAnalyticsData = async () => {
    if (!tokens?.access_token) return
    
    setLoading(true)
    setError(null)
    
    try {
      const headers = {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }

      // Fetch all analytics endpoints in parallel
      const [overviewRes, projectsRes, teamsRes, budgetRes, timelineRes] = await Promise.all([
        fetch(`${API_URL}/api/analytics/portfolio/overview`, { headers }),
        fetch(`${API_URL}/api/analytics/projects/health`, { headers }),
        fetch(`${API_URL}/api/analytics/teams/performance`, { headers }),
        fetch(`${API_URL}/api/analytics/budget/tracking`, { headers }),
        fetch(`${API_URL}/api/analytics/timeline/overview`, { headers })
      ])

      if (overviewRes.ok) {
        const data = await overviewRes.json()
        setPortfolioOverview(data)
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

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data')
      console.error('Error fetching analytics:', err)
    } finally {
      setLoading(false)
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
            onClick={fetchAnalyticsData}
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
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Portfolio Analytics</h1>
              <p className="mt-2 text-gray-600">
                Comprehensive insights into your organization's performance
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={fetchAnalyticsData}
                className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <span>🔄</span>
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: '📊' },
              { key: 'projects', label: 'Project Health', icon: '📋' },
              { key: 'teams', label: 'Team Performance', icon: '👥' },
              { key: 'budget', label: 'Budget Tracking', icon: '💰' },
              { key: 'timeline', label: 'Timeline', icon: '⏰' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.key
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && portfolioOverview && (
          <OverviewTab data={portfolioOverview} />
        )}
        
        {activeTab === 'projects' && projectHealth && (
          <ProjectHealthTab data={projectHealth} />
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

// Overview Tab Component
const OverviewTab: React.FC<{ data: PortfolioOverview }> = ({ data }) => {
  const { overview, trends } = data

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Projects"
          value={overview.total_projects}
          subtitle={`${overview.active_projects} active`}
          color="blue"
          icon="📋"
        />
        <MetricCard
          title="Task Completion"
          value={`${overview.task_completion_rate}%`}
          subtitle={`${overview.completed_tasks}/${overview.total_tasks} completed`}
          color="green"
          icon="✅"
        />
        <MetricCard
          title="Project Health"
          value={`${overview.project_health_score}%`}
          subtitle={`${overview.overdue_tasks} overdue tasks`}
          color="yellow"
          icon="🏥"
        />
        <MetricCard
          title="Team Members"
          value={overview.total_members}
          subtitle={`${overview.total_teams} teams`}
          color="purple"
          icon="👥"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Distribution</h3>
          <div className="w-64 h-64 mx-auto">
            <Doughnut
              data={{
                labels: ['Active', 'Completed', 'Planning'],
                datasets: [{
                  data: [
                    overview.active_projects,
                    overview.completed_projects,
                    overview.total_projects - overview.active_projects - overview.completed_projects
                  ],
                  backgroundColor: ['#3B82F6', '#10B981', '#F59E0B'],
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

        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance Metrics</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Task Completion Rate</span>
                <span className="text-sm text-gray-500">{overview.task_completion_rate}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${overview.task_completion_rate}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Project Health Score</span>
                <span className="text-sm text-gray-500">{overview.project_health_score}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-yellow-500 h-2 rounded-full"
                  style={{ width: `${overview.project_health_score}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Resource Utilization</span>
                <span className="text-sm text-gray-500">{overview.resource_utilization}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{ width: `${overview.resource_utilization}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trends Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Trends</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{trends.projects_created_this_month}</div>
            <div className="text-sm text-gray-500">Projects Created This Month</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">{trends.tasks_completed_this_week}</div>
            <div className="text-sm text-gray-500">Tasks Completed This Week</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{trends.new_team_members}</div>
            <div className="text-sm text-gray-500">New Team Members This Month</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Project Health Tab Component
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

// Reusable Metric Card Component
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
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <span className="font-semibold">{icon}</span>
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