import React, { useState, useEffect } from 'react';
import { 
  Users, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Brain, 
  BarChart3,
  Clock,
  Zap,
  UserCheck,
  Calendar
} from 'lucide-react';
import { API_URL } from '../utils/config';

interface ResourceAllocation {
  current_state: {
    user_workloads: Array<{
      user_id: string;
      name: string;
      role: string;
      active_tasks: number;
      completed_tasks: number;
      estimated_hours: number;
      capacity_utilization: number;
      skills: string[];
      availability_status: string;
    }>;
    average_utilization: number;
    total_capacity_hours: number;
    utilized_hours: number;
    available_capacity_hours: number;
  };
  ai_recommendations: any;
  optimization_strategies: any[];
  improvement_metrics: {
    current_efficiency: number;
    potential_efficiency: number;
    efficiency_gain: number;
    estimated_time_savings: string;
    productivity_increase: string;
  };
  action_items: any[];
  priority_assignments: any[];
  capacity_forecast: any;
}

interface SkillsAssignment {
  assignment_recommendations: Array<{
    task: {
      id: string;
      title: string;
      priority: string;
      estimated_hours: number;
      due_date: string;
      project_id: string;
      requirements: string[];
    };
    recommended_assignees: Array<{
      user_id: string;
      name: string;
      role: string;
      skills: string[];
      match_score: number;
      availability_score: number;
      workload_score: number;
      overall_score: number;
      current_tasks: number;
      recommendation_reason: string;
    }>;
    assignment_confidence: number;
  }>;
  skills_analysis: any;
  ai_insights: any;
  assignment_strategy: any;
}

interface CapacityPlanning {
  current_capacity: any;
  capacity_forecast: any;
  team_capacity: any[];
  bottlenecks: any[];
  ai_recommendations: any;
  optimization_plan: any;
  capacity_metrics: any;
  recommendations: any;
}

interface WorkloadBalancing {
  current_workload: any;
  balancing_opportunities: any[];
  recommendations: any[];
  ai_strategy: any;
  balancing_impact: any;
  workload_metrics: any;
  team_balance: any[];
  alerts: any[];
}

interface SkillsGapAnalysis {
  skills_inventory: any;
  skills_demand: any;
  skills_gaps: any;
  team_skills_analysis: any;
  ai_strategy: any;
  development_recommendations: any;
  skills_metrics: any;
  skills_roi: any;
  hiring_strategy: any;
  training_roadmap: any;
}

const ResourceManagementPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('allocation');
  const [resourceAllocation, setResourceAllocation] = useState<ResourceAllocation | null>(null);
  const [skillsAssignment, setSkillsAssignment] = useState<SkillsAssignment | null>(null);
  const [capacityPlanning, setCapacityPlanning] = useState<CapacityPlanning | null>(null);
  const [workloadBalancing, setWorkloadBalancing] = useState<WorkloadBalancing | null>(null);
  const [skillsGapAnalysis, setSkillsGapAnalysis] = useState<SkillsGapAnalysis | null>(null);
  const [loading, setLoading] = useState<{ [key: string]: boolean }>({});

  const backendUrl = API_URL;

  const fetchData = async (endpoint: string, setter: Function, key: string) => {
    setLoading(prev => ({ ...prev, [key]: true }));
    try {
      const authTokens = localStorage.getItem('auth_tokens');
      const token = authTokens ? JSON.parse(authTokens).access_token : null;
      console.log(`Fetching ${key} from ${backendUrl}${endpoint}`);
      console.log(`Token available: ${!!token}`);
      
      const response = await fetch(`${backendUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      console.log(`Response status for ${key}: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`Data received for ${key}:`, data);
        setter(data);
      } else {
        console.error(`Failed to fetch ${key}:`, response.status, response.statusText);
      }
    } catch (error) {
      console.error(`Error fetching ${key}:`, error);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  };

  useEffect(() => {
    // Load data based on active tab
    switch (activeTab) {
      case 'allocation':
        if (!resourceAllocation) {
          fetchData('/api/resource-management/allocation/optimize', setResourceAllocation, 'allocation');
        }
        break;
      case 'skills':
        if (!skillsAssignment) {
          fetchData('/api/resource-management/skills/assignment', setSkillsAssignment, 'skills');
        }
        break;
      case 'capacity':
        if (!capacityPlanning) {
          fetchData('/api/resource-management/capacity/planning', setCapacityPlanning, 'capacity');
        }
        break;
      case 'workload':
        if (!workloadBalancing) {
          fetchData('/api/resource-management/workload/balancing', setWorkloadBalancing, 'workload');
        }
        break;
      case 'skills-gap':
        if (!skillsGapAnalysis) {
          fetchData('/api/resource-management/skills/gap-analysis', setSkillsGapAnalysis, 'skillsGap');
        }
        break;
    }
  }, [activeTab]);

  const tabs = [
    { id: 'allocation', name: 'AI Resource Allocation', icon: Brain },
    { id: 'skills', name: 'Skills Assignment', icon: Target },
    { id: 'capacity', name: 'Capacity Planning', icon: BarChart3 },
    { id: 'workload', name: 'Workload Balancing', icon: TrendingUp },
    { id: 'skills-gap', name: 'Skills Gap Analysis', icon: Users },
  ];

  const renderResourceAllocation = () => {
    if (loading.allocation) {
      return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (!resourceAllocation) return null;

    return (
      <div className="space-y-6" data-testid="resource-allocation-dashboard">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Team Utilization</p>
                <p className="text-2xl font-bold text-gray-900">{resourceAllocation.current_state.average_utilization}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available Capacity</p>
                <p className="text-2xl font-bold text-gray-900">{resourceAllocation.current_state.available_capacity_hours}h</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Efficiency Potential</p>
                <p className="text-2xl font-bold text-gray-900">{resourceAllocation.improvement_metrics.efficiency_gain}%</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-yellow-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Productivity Boost</p>
                <p className="text-2xl font-bold text-gray-900">{resourceAllocation.improvement_metrics.productivity_increase}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Workload Overview */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Workload Distribution</h3>
          <div className="space-y-4">
            {resourceAllocation.current_state.user_workloads.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-medium">{user.name.charAt(0)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.role} • {user.active_tasks} active tasks</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.capacity_utilization}%</p>
                    <p className="text-xs text-gray-500">{user.estimated_hours}h / 40h</p>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        user.capacity_utilization > 80 ? 'bg-red-500' : 
                        user.capacity_utilization > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, user.capacity_utilization)}%` }}
                    ></div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.availability_status === 'available' ? 'bg-green-100 text-green-800' :
                    user.availability_status === 'busy' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {user.availability_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center mb-4">
            <Brain className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">AI-Powered Recommendations</h3>
          </div>
          <div className="space-y-4">
            {Object.entries(resourceAllocation.ai_recommendations.recommendations || {}).map(([key, value]) => (
              <div key={key} className="border-l-4 border-blue-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900 capitalize">
                  {key.replace(/_/g, ' ')}
                </h4>
                <p className="text-sm text-gray-600 mt-1">
                  {typeof value === 'object' ? (value as any).description || JSON.stringify(value) : String(value)}
                </p>
                {typeof value === 'object' && (value as any).action && (
                  <p className="text-sm text-blue-600 mt-2 font-medium">
                    Action: {(value as any).action}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Action Items */}
        {resourceAllocation.action_items.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended Actions</h3>
            <div className="space-y-3">
              {resourceAllocation.action_items.map((item, index) => (
                <div key={index} className="flex items-start p-3 border rounded-lg">
                  <AlertTriangle className={`h-5 w-5 mt-0.5 mr-3 ${
                    item.priority === 'high' ? 'text-red-500' : 'text-yellow-500'
                  }`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{item.action}</p>
                    <p className="text-sm text-gray-500">Timeline: {item.timeline}</p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${
                      item.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {item.priority} priority
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSkillsAssignment = () => {
    if (loading.skills) {
      return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (!skillsAssignment) return null;

    return (
      <div className="space-y-6" data-testid="skills-assignment-dashboard">
        {/* Assignment Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Recommendations</p>
                <p className="text-2xl font-bold text-gray-900">{skillsAssignment.assignment_recommendations.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <UserCheck className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">High Confidence Matches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsAssignment.assignment_strategy?.high_confidence_matches || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unassigned Tasks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsAssignment.assignment_strategy?.total_unassigned_tasks || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Assignment Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Skills-Based Task Assignments</h3>
          <div className="space-y-4">
            {skillsAssignment.assignment_recommendations.slice(0, 10).map((rec) => (
              <div key={rec.task.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">{rec.task.title}</h4>
                    <p className="text-sm text-gray-500">
                      Priority: {rec.task.priority} • {rec.task.estimated_hours}h • 
                      Due: {rec.task.due_date ? new Date(rec.task.due_date).toLocaleDateString() : 'No deadline'}
                    </p>
                    {rec.task.requirements.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {rec.task.requirements.map((req, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                            {req}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    rec.assignment_confidence > 80 ? 'bg-green-100 text-green-800' :
                    rec.assignment_confidence > 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {rec.assignment_confidence}% confidence
                  </span>
                </div>
                
                {rec.recommended_assignees.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Recommended Assignees:</p>
                    <div className="space-y-2">
                      {rec.recommended_assignees.slice(0, 3).map((assignee, idx) => (
                        <div key={assignee.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-gray-900">
                              #{idx + 1} {assignee.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-500">({assignee.role})</span>
                          </div>
                          <div className="flex items-center space-x-4 text-sm">
                            <span>Match: {assignee.match_score}%</span>
                            <span>Available: {assignee.availability_score}%</span>
                            <span className="font-medium">Overall: {assignee.overall_score}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* AI Insights */}
        {skillsAssignment.ai_insights && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center mb-4">
              <Brain className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">AI Assignment Insights</h3>
            </div>
            <div className="prose text-sm text-gray-600">
              {typeof skillsAssignment.ai_insights === 'string' ? 
                skillsAssignment.ai_insights : 
                JSON.stringify(skillsAssignment.ai_insights, null, 2)}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCapacityPlanning = () => {
    if (loading.capacity) {
      return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (!capacityPlanning) return null;

    return (
      <div className="space-y-6" data-testid="capacity-planning-dashboard">
        {/* Capacity Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Current Utilization</p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlanning.capacity_metrics?.current_utilization || 0}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Available Capacity</p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlanning.capacity_metrics?.available_capacity_hours || 0}h
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Demand Trend</p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlanning.capacity_forecast?.demand_trend || 'Stable'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Bottlenecks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {capacityPlanning.bottlenecks?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Capacity Overview */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Team Capacity Analysis</h3>
          <div className="space-y-4">
            {capacityPlanning.team_capacity?.map((team) => (
              <div key={team.team_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-gray-500 mr-3" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{team.team_name}</p>
                    <p className="text-sm text-gray-500">{team.member_count} members</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{team.utilization_percent}%</p>
                    <p className="text-xs text-gray-500">{team.utilized_hours}h / {team.total_capacity_hours}h</p>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        team.utilization_percent > 90 ? 'bg-red-500' : 
                        team.utilization_percent > 70 ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, team.utilization_percent)}%` }}
                    ></div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    team.status === 'optimal' ? 'bg-green-100 text-green-800' :
                    team.status === 'overloaded' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {team.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottlenecks & Issues */}
        {capacityPlanning.bottlenecks && capacityPlanning.bottlenecks.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Capacity Bottlenecks</h3>
            <div className="space-y-3">
              {capacityPlanning.bottlenecks.map((bottleneck, index) => (
                <div key={index} className="flex items-start p-3 border border-red-200 rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{bottleneck.type.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-red-700">{bottleneck.description}</p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${
                      bottleneck.severity === 'critical' ? 'bg-red-100 text-red-800' : 
                      bottleneck.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {bottleneck.severity} severity
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Capacity Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <div className="flex items-center mb-4">
            <Brain className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">AI Capacity Recommendations</h3>
          </div>
          <div className="space-y-4">
            {capacityPlanning.recommendations?.immediate_actions?.map((action, index) => (
              <div key={index} className="border-l-4 border-red-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Immediate Action Required</h4>
                <p className="text-sm text-gray-600 mt-1">{action.action}</p>
                <p className="text-xs text-gray-500 mt-1">Timeline: {action.timeline}</p>
              </div>
            ))}
            {capacityPlanning.recommendations?.medium_term_planning?.map((plan, index) => (
              <div key={index} className="border-l-4 border-yellow-500 pl-4">
                <h4 className="text-sm font-medium text-gray-900">Medium-term Planning</h4>
                <p className="text-sm text-gray-600 mt-1">{plan.action}</p>
                <p className="text-xs text-gray-500 mt-1">Timeframe: {plan.timeframe}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderWorkloadBalancing = () => {
    if (loading.workload) {
      return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (!workloadBalancing) return null;

    return (
      <div className="space-y-6" data-testid="workload-balancing-dashboard">
        {/* Balancing Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Balance Score</p>
                <p className="text-2xl font-bold text-gray-900">
                  {workloadBalancing.workload_metrics?.balancing_score || 0}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Optimal Users</p>
                <p className="text-2xl font-bold text-gray-900">
                  {workloadBalancing.current_workload?.optimal?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Overloaded</p>
                <p className="text-2xl font-bold text-gray-900">
                  {workloadBalancing.current_workload?.overloaded?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Opportunities</p>
                <p className="text-2xl font-bold text-gray-900">
                  {workloadBalancing.balancing_opportunities?.length || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Workload Distribution */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Workload Distribution</h3>
          <div className="space-y-4">
            {workloadBalancing.current_workload?.users?.map((user) => (
              <div key={user.user_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      user.category === 'overloaded' ? 'bg-red-500' :
                      user.category === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'
                    }`}>
                      <span className="text-white text-sm font-medium">{user.name.charAt(0)}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.role} • {user.task_count} tasks</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{user.utilization_percent}%</p>
                    <p className="text-xs text-gray-500">{user.current_hours}h</p>
                  </div>
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        user.category === 'overloaded' ? 'bg-red-500' :
                        user.category === 'optimal' ? 'bg-green-500' : 'bg-yellow-500'
                      }`}
                      style={{ width: `${Math.min(100, user.utilization_percent)}%` }}
                    ></div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    user.category === 'optimal' ? 'bg-green-100 text-green-800' :
                    user.category === 'overloaded' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {user.category}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Balancing Opportunities */}
        {workloadBalancing.balancing_opportunities && workloadBalancing.balancing_opportunities.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Balancing Opportunities</h3>
            <div className="space-y-3">
              {workloadBalancing.balancing_opportunities.map((opportunity, index) => (
                <div key={index} className="p-4 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Redistribute from {opportunity.from_name} to {opportunity.to_name}
                      </p>
                      <p className="text-sm text-gray-500">
                        {opportunity.redistributable_tasks} tasks ({opportunity.potential_hours_moved}h)
                      </p>
                    </div>
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {opportunity.impact_score}% impact
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Balancing Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Balancing Recommendations</h3>
          <div className="space-y-3">
            {workloadBalancing.recommendations?.map((rec, index) => (
              <div key={index} className="flex items-start p-3 border rounded-lg">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{rec.description}</p>
                  <p className="text-sm text-gray-500 mt-1">Impact: {rec.estimated_impact}</p>
                  <p className="text-sm text-gray-500">Effort: {rec.implementation_effort}</p>
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-2 ${
                    rec.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {rec.priority} priority
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {workloadBalancing.alerts && workloadBalancing.alerts.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Workload Alerts</h3>
            <div className="space-y-3">
              {workloadBalancing.alerts.map((alert, index) => (
                <div key={index} className="flex items-start p-3 border rounded-lg bg-yellow-50">
                  <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">{alert.message}</p>
                    <p className="text-sm text-yellow-700 mt-1">Action: {alert.action_required.replace(/_/g, ' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderSkillsGapAnalysis = () => {
    if (loading.skillsGap) {
      return <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>;
    }

    if (!skillsGapAnalysis) return null;

    return (
      <div className="space-y-6" data-testid="skills-gap-analysis-dashboard">
        {/* Skills Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Skills Coverage</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsGapAnalysis.skills_metrics?.skills_coverage_score || 0}%
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Critical Gaps</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsGapAnalysis.skills_gaps?.critical_gaps?.length || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Skills</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsGapAnalysis.skills_inventory?.total_unique_skills || 0}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Diversity Index</p>
                <p className="text-2xl font-bold text-gray-900">
                  {skillsGapAnalysis.skills_metrics?.skills_diversity_index || 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Skills Gaps */}
        {skillsGapAnalysis.skills_gaps?.critical_gaps && skillsGapAnalysis.skills_gaps.critical_gaps.length > 0 && (
          <div className="bg-white rounded-lg border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Critical Skills Gaps</h3>
            <div className="space-y-3">
              {skillsGapAnalysis.skills_gaps.critical_gaps.map((gap, index) => (
                <div key={index} className="flex items-start p-3 border border-red-200 rounded-lg bg-red-50">
                  <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 mr-3" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{gap.skill}</p>
                    <p className="text-sm text-red-700">
                      Demand Score: {gap.demand_score} | Current Supply: {gap.current_supply}
                    </p>
                    <p className="text-sm text-red-600">Gap Ratio: {gap.gap_ratio.toFixed(1)}x</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills Inventory */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Current Skills Inventory</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Most Common Skills</h4>
              <div className="space-y-2">
                {skillsGapAnalysis.skills_inventory?.most_common_skills?.slice(0, 8).map(([skill, data], index) => (
                  <div key={skill} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900">{skill}</span>
                    <span className="text-sm font-medium text-gray-600">{data.count} people</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Skills Distribution</h4>
              <div className="space-y-2">
                {Object.entries(skillsGapAnalysis.skills_inventory?.skills_distribution || {}).map(([category, skills]) => (
                  <div key={category} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-900 capitalize">{category}</span>
                    <span className="text-sm font-medium text-gray-600">{(skills as string[]).length} skills</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Development Recommendations */}
        <div className="bg-white rounded-lg border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Development Recommendations</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Training Programs</h4>
              <div className="space-y-2">
                {skillsGapAnalysis.development_recommendations?.training_programs?.map((program, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{program.skill}</p>
                    <p className="text-xs text-gray-500">
                      Duration: {program.estimated_duration} • Cost: {program.estimated_cost}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${
                      program.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {program.priority} priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Hiring Priorities</h4>
              <div className="space-y-2">
                {skillsGapAnalysis.development_recommendations?.hiring_priorities?.map((hire, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{hire.skill}</p>
                    <p className="text-xs text-gray-500">
                      Positions needed: {hire.positions_needed} • Urgency: {hire.urgency}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full mt-1 ${
                      hire.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {hire.priority} priority
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* AI Strategy */}
        {skillsGapAnalysis.ai_strategy && (
          <div className="bg-white rounded-lg border p-6">
            <div className="flex items-center mb-4">
              <Brain className="h-5 w-5 text-purple-500 mr-2" />
              <h3 className="text-lg font-medium text-gray-900">AI Skills Development Strategy</h3>
            </div>
            <div className="prose text-sm text-gray-600">
              {typeof skillsGapAnalysis.ai_strategy === 'string' ? 
                skillsGapAnalysis.ai_strategy : 
                JSON.stringify(skillsGapAnalysis.ai_strategy, null, 2)}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="resource-management-title">
            Resource Management & Allocation
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            AI-powered resource optimization, capacity planning, and intelligent allocation
          </p>
        </div>

        {/* Navigation Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                  data-testid={`tab-${tab.id}`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'allocation' && renderResourceAllocation()}
          {activeTab === 'skills' && renderSkillsAssignment()}
          {activeTab === 'capacity' && renderCapacityPlanning()}
          {activeTab === 'workload' && renderWorkloadBalancing()}
          {activeTab === 'skills-gap' && renderSkillsGapAnalysis()}
        </div>
      </div>
    </div>
  );
};

export default ResourceManagementPage;