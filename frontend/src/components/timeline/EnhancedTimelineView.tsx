import React, { useState, useEffect, useCallback } from 'react';
import { 
  Calendar, Clock, Users, AlertTriangle, TrendingUp, BarChart3, 
  UserCheck, AlertCircle, CheckCircle, Timer, Zap, Target,
  Activity, PieChart, Settings, Filter, Download, Upload
} from 'lucide-react';

interface EnhancedTimelineData {
  project: any;
  tasks: any[];
  regular_tasks: any[];
  dependencies: any[];
  teams: any[];
  users: any[];
  files: any[];
  comments: any[];
  resource_allocation: any;
  critical_path: string[];
  timeline_stats: any;
  resource_workload: any;
  task_risks: any[];
  milestones: any[];
  project_health: any;
}

interface EnhancedTimelineViewProps {
  projectId: string;
  onTaskUpdate?: (taskId: string, updates: any) => void;
}

const EnhancedTimelineView: React.FC<EnhancedTimelineViewProps> = ({ 
  projectId, 
  onTaskUpdate 
}) => {
  const [data, setData] = useState<EnhancedTimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'resources' | 'risks' | 'analytics'>('timeline');

  const fetchEnhancedData = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const token = localStorage.getItem('auth_tokens');
      const authData = token ? JSON.parse(token) : null;
      
      if (!authData?.access_token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/enhanced-timeline/project/${projectId}/comprehensive`, {
        headers: {
          'Authorization': `Bearer ${authData.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch enhanced timeline data: ${response.status}`);
      }

      const enhancedData = await response.json();
      setData(enhancedData);
      setError(null);
    } catch (err) {
      console.error('Error fetching enhanced timeline data:', err);
      setError('Failed to load enhanced timeline data');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEnhancedData();
  }, [fetchEnhancedData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading enhanced timeline data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error || 'No data available'}</p>
        <button
          onClick={fetchEnhancedData}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Key Metrics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center">
                <Target className="h-6 w-6 text-blue-600 mr-2" />
                {data.project.name}
              </h2>
              <p className="text-gray-600">Enhanced Timeline with Resource Integration</p>
            </div>
            
            {/* Project Health Score */}
            <div className="text-right">
              <div className="text-3xl font-bold text-gray-900">
                {data.project_health.overall_score}%
              </div>
              <div className={`text-sm font-medium ${
                data.project_health.risk_level === 'low' ? 'text-green-600' :
                data.project_health.risk_level === 'medium' ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {data.project_health.risk_level.toUpperCase()} RISK
              </div>
            </div>
          </div>

          {/* Key Metrics Dashboard */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-blue-50 rounded-lg p-4 mb-2">
                <CheckCircle className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {data.timeline_stats.completed_tasks}
                </div>
                <div className="text-sm text-gray-600">Completed Tasks</div>
                <div className="text-xs text-blue-600">
                  {Math.round((data.timeline_stats.completed_tasks / data.timeline_stats.total_tasks) * 100)}% Complete
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-yellow-50 rounded-lg p-4 mb-2">
                <Timer className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {data.timeline_stats.in_progress_tasks}
                </div>
                <div className="text-sm text-gray-600">In Progress</div>
                <div className="text-xs text-yellow-600">
                  {data.timeline_stats.remaining_hours}h remaining
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-green-50 rounded-lg p-4 mb-2">
                <Users className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {data.timeline_stats.unique_assignees}
                </div>
                <div className="text-sm text-gray-600">Team Members</div>
                <div className="text-xs text-green-600">
                  {Math.round(data.resource_workload.average_utilization)}% utilized
                </div>
              </div>
            </div>

            <div className="text-center">
              <div className="bg-purple-50 rounded-lg p-4 mb-2">
                <AlertTriangle className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <div className="text-2xl font-bold text-gray-900">
                  {data.task_risks.length}
                </div>
                <div className="text-sm text-gray-600">Risk Items</div>
                <div className="text-xs text-purple-600">
                  {data.timeline_stats.overdue_tasks} overdue
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-t border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'timeline', label: 'Timeline View', icon: Calendar },
              { key: 'resources', label: 'Resource Analysis', icon: Users },
              { key: 'risks', label: 'Risk Management', icon: AlertTriangle },
              { key: 'analytics', label: 'Analytics', icon: BarChart3 }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as any)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                  activeTab === key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'timeline' && <TimelineView data={data} />}
      {activeTab === 'resources' && <ResourceAnalysisView data={data} />}
      {activeTab === 'risks' && <RiskManagementView data={data} />}
      {activeTab === 'analytics' && <AnalyticsView data={data} />}
    </div>
  );
};

// Timeline View Component
const TimelineView: React.FC<{ data: EnhancedTimelineData }> = ({ data }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Project Timeline</h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Critical Path ({data.critical_path.length} tasks)</span>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <Target className="h-4 w-4" />
              <span>{data.milestones.length} Milestones</span>
            </div>
          </div>
        </div>

        {/* Enhanced Gantt Chart would go here */}
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">Enhanced Gantt Chart</p>
          <p className="text-sm text-gray-500">
            Interactive timeline with resource assignments, dependencies, and critical path highlighting
          </p>
        </div>

        {/* Milestones Summary */}
        <div className="mt-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Key Milestones</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {data.milestones.slice(0, 6).map((milestone, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <div className={`w-3 h-3 rounded-full ${
                  milestone.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {milestone.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {milestone.date ? new Date(milestone.date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Resource Analysis View Component
const ResourceAnalysisView: React.FC<{ data: EnhancedTimelineData }> = ({ data }) => {
  const workloadData = data.resource_workload;
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Resource Utilization */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Activity className="h-5 w-5 text-blue-600 mr-2" />
          Resource Utilization
        </h3>
        
        <div className="space-y-4">
          {Object.entries(workloadData.user_workloads).map(([userId, userLoad]: [string, any]) => (
            <div key={userId} className="border-b border-gray-100 pb-4 last:border-0">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                    {userLoad.user_info?.first_name?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {userLoad.user_info?.first_name} {userLoad.user_info?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {userLoad.tasks?.length || 0} tasks assigned
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-sm font-medium ${
                    userLoad.utilization_percentage > 100 ? 'text-red-600' :
                    userLoad.utilization_percentage > 80 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {Math.round(userLoad.utilization_percentage)}%
                  </div>
                </div>
              </div>
              
              {/* Utilization Bar */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    userLoad.utilization_percentage > 100 ? 'bg-red-500' :
                    userLoad.utilization_percentage > 80 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, userLoad.utilization_percentage)}%` }}
                ></div>
              </div>
              
              {/* Skills */}
              {userLoad.skills && userLoad.skills.length > 0 && (
                <div className="mt-2">
                  <div className="flex flex-wrap gap-1">
                    {userLoad.skills.slice(0, 3).map((skill: string, idx: number) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                        {skill}
                      </span>
                    ))}
                    {userLoad.skills.length > 3 && (
                      <span className="text-xs text-gray-500">+{userLoad.skills.length - 3} more</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Capacity Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <PieChart className="h-5 w-5 text-green-600 mr-2" />
          Capacity Summary
        </h3>
        
        <div className="space-y-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">Average Utilization</span>
              <span className="text-lg font-bold text-green-600">
                {Math.round(workloadData.average_utilization)}%
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-red-50 rounded-lg p-3">
              <div className="text-lg font-bold text-red-600">
                {workloadData.overloaded_users?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Overloaded</div>
            </div>
            <div className="bg-yellow-50 rounded-lg p-3">
              <div className="text-lg font-bold text-yellow-600">
                {workloadData.underutilized_users?.length || 0}
              </div>
              <div className="text-xs text-gray-600">Underutilized</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-lg font-bold text-green-600">
                {(workloadData.user_workloads ? Object.keys(workloadData.user_workloads).length : 0) - 
                 (workloadData.overloaded_users?.length || 0) - 
                 (workloadData.underutilized_users?.length || 0)}
              </div>
              <div className="text-xs text-gray-600">Balanced</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Total Capacity</span>
              <span className="font-medium">{workloadData.capacity_summary?.available_capacity || 0}h</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Current Work</span>
              <span className="font-medium">{Math.round(workloadData.capacity_summary?.total_current_work || 0)}h</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-600">Upcoming Work</span>
              <span className="font-medium">{Math.round(workloadData.capacity_summary?.total_upcoming_work || 0)}h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Risk Management View Component
const RiskManagementView: React.FC<{ data: EnhancedTimelineData }> = ({ data }) => {
  return (
    <div className="space-y-6">
      {/* Risk Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <div className="text-2xl font-bold text-gray-900">
            {data.task_risks.filter((r: any) => r.risk_level === 'high').length}
          </div>
          <div className="text-sm text-gray-600">High Risk Tasks</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <div className="text-2xl font-bold text-gray-900">
            {data.task_risks.filter((r: any) => r.risk_level === 'medium').length}
          </div>
          <div className="text-sm text-gray-600">Medium Risk Tasks</div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <div className="text-2xl font-bold text-gray-900">
            {data.tasks.length - data.task_risks.length}
          </div>
          <div className="text-sm text-gray-600">Low Risk Tasks</div>
        </div>
      </div>

      {/* Risk Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Analysis</h3>
          
          <div className="space-y-4">
            {data.task_risks.slice(0, 10).map((risk: any, index: number) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-md font-medium text-gray-900">{risk.task_name}</h4>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    risk.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                    risk.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {risk.risk_level.toUpperCase()} RISK
                  </span>
                </div>
                
                <div className="space-y-2">
                  {risk.risks.map((riskItem: string, riskIndex: number) => (
                    <div key={riskIndex} className="flex items-center space-x-2 text-sm text-gray-600">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                      <span>{riskItem}</span>
                    </div>
                  ))}
                </div>
                
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full ${
                        risk.risk_level === 'high' ? 'bg-red-500' :
                        risk.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${risk.risk_score}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Risk Score: {risk.risk_score}/100</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics View Component
const AnalyticsView: React.FC<{ data: EnhancedTimelineData }> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project Health */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <TrendingUp className="h-5 w-5 text-blue-600 mr-2" />
          Project Health Metrics
        </h3>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Schedule Health</span>
            <span className="text-sm font-medium">{data.timeline_stats.schedule_health}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 bg-blue-500 rounded-full"
              style={{ width: `${data.timeline_stats.schedule_health}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Progress Health</span>
            <span className="text-sm font-medium">{data.timeline_stats.progress_health}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 bg-green-500 rounded-full"
              style={{ width: `${data.timeline_stats.progress_health}%` }}
            ></div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">Resource Health</span>
            <span className="text-sm font-medium">{data.timeline_stats.resource_health}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="h-2 bg-purple-500 rounded-full"
              style={{ width: `${data.timeline_stats.resource_health}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Performance Statistics */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 text-green-600 mr-2" />
          Performance Statistics
        </h3>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-xl font-bold text-blue-600">
              {Math.round(data.timeline_stats.completion_rate * 100)}%
            </div>
            <div className="text-xs text-gray-600">Completion Rate</div>
          </div>
          
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <div className="text-xl font-bold text-green-600">
              {data.timeline_stats.completed_hours}h
            </div>
            <div className="text-xs text-gray-600">Hours Completed</div>
          </div>
          
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-xl font-bold text-yellow-600">
              {data.timeline_stats.remaining_hours}h
            </div>
            <div className="text-xs text-gray-600">Hours Remaining</div>
          </div>
          
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <div className="text-xl font-bold text-purple-600">
              {data.timeline_stats.total_dependencies}
            </div>
            <div className="text-xs text-gray-600">Dependencies</div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-900 mb-3">Resource Distribution</h4>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Overloaded Resources</span>
              <span className="font-medium text-red-600">
                {data.resource_workload.overloaded_users?.length || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Underutilized Resources</span>
              <span className="font-medium text-yellow-600">
                {data.resource_workload.underutilized_users?.length || 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Average Utilization</span>
              <span className="font-medium text-green-600">
                {Math.round(data.resource_workload.average_utilization)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedTimelineView;