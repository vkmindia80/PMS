import React, { useState, useEffect, useCallback } from 'react';
import {
  Target, GitBranch, BarChart3, Download, AlertCircle, TrendingUp,
  CheckCircle, Clock, Users, Zap, FileText, Package, Play, 
  Calendar, DollarSign, Activity, Settings, Info, ArrowRight,
  Save, RefreshCw, Eye, Compare, Archive, XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

interface AdvancedTimelineFeaturesProps {
  projectId: string;
  tokens: any;
}

interface CPMAnalysis {
  critical_path: string[];
  task_analysis: Record<string, any>;
  project_duration_days: number;
  critical_path_length: number;
  schedule_health_score: number;
}

interface ResourceConflict {
  resource_name: string;
  total_allocation_percentage: number;
  conflicting_tasks: string[];
  severity: string;
}

interface Baseline {
  id: string;
  name: string;
  baseline_date: string;
  is_active: boolean;
  summary: {
    total_tasks: number;
    total_planned_duration: number;
  };
}

export const AdvancedTimelineFeatures: React.FC<AdvancedTimelineFeaturesProps> = ({
  projectId,
  tokens
}) => {
  const [activeTab, setActiveTab] = useState<'cpm' | 'resources' | 'baseline' | 'export'>('cpm');
  const [loading, setLoading] = useState(false);
  
  // CPM State
  const [cpmAnalysis, setCpmAnalysis] = useState<CPMAnalysis | null>(null);
  const [showOptimizations, setShowOptimizations] = useState(false);
  const [optimizations, setOptimizations] = useState<any>(null);
  
  // Resource State
  const [resourceConflicts, setResourceConflicts] = useState<any>(null);
  const [levelingResult, setLevelingResult] = useState<any>(null);
  const [workloadAnalysis, setWorkloadAnalysis] = useState<any>(null);
  
  // Baseline State
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [selectedBaseline, setSelectedBaseline] = useState<string | null>(null);
  const [varianceAnalysis, setVarianceAnalysis] = useState<any>(null);
  const [showCreateBaseline, setShowCreateBaseline] = useState(false);
  const [newBaselineName, setNewBaselineName] = useState('');
  const [newBaselineDesc, setNewBaselineDesc] = useState('');

  // Fetch CPM Analysis
  const fetchCPMAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/critical-path`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCpmAnalysis(data);
        toast.success('Critical path calculated successfully');
      } else {
        toast.error('Failed to calculate critical path');
      }
    } catch (error) {
      console.error('Error fetching CPM:', error);
      toast.error('Error calculating critical path');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Fetch Schedule Optimizations
  const fetchOptimizations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/optimize-schedule`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOptimizations(data);
        setShowOptimizations(true);
        toast.success('Schedule optimization complete');
      }
    } catch (error) {
      console.error('Error fetching optimizations:', error);
      toast.error('Error optimizing schedule');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Fetch Resource Conflicts
  const fetchResourceConflicts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/resource-conflicts`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setResourceConflicts(data);
        toast.success('Resource analysis complete');
      }
    } catch (error) {
      console.error('Error fetching conflicts:', error);
      toast.error('Error analyzing resources');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Level Resources
  const levelResources = useCallback(async (applyChanges: boolean = false) => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/timeline/projects/${projectId}/level-resources?apply_changes=${applyChanges}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`
          }
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        setLevelingResult(data);
        toast.success(applyChanges ? 'Resources leveled successfully' : 'Leveling suggestions generated');
      }
    } catch (error) {
      console.error('Error leveling resources:', error);
      toast.error('Error leveling resources');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Fetch Workload Analysis
  const fetchWorkloadAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/workload-analysis`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setWorkloadAnalysis(data);
      }
    } catch (error) {
      console.error('Error fetching workload:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Fetch Baselines
  const fetchBaselines = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/baselines`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setBaselines(data.baselines || []);
      }
    } catch (error) {
      console.error('Error fetching baselines:', error);
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens]);

  // Create Baseline
  const createBaseline = useCallback(async () => {
    if (!newBaselineName.trim()) {
      toast.error('Please enter a baseline name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/baselines`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          baseline_name: newBaselineName,
          description: newBaselineDesc
        })
      });
      
      if (response.ok) {
        toast.success('Baseline created successfully');
        setShowCreateBaseline(false);
        setNewBaselineName('');
        setNewBaselineDesc('');
        await fetchBaselines();
      }
    } catch (error) {
      console.error('Error creating baseline:', error);
      toast.error('Error creating baseline');
    } finally {
      setLoading(false);
    }
  }, [projectId, tokens, newBaselineName, newBaselineDesc, fetchBaselines]);

  // Analyze Variance
  const analyzeVariance = useCallback(async (baselineId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timeline/baselines/${baselineId}/variance-analysis`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setVarianceAnalysis(data);
        toast.success('Variance analysis complete');
      }
    } catch (error) {
      console.error('Error analyzing variance:', error);
      toast.error('Error analyzing variance');
    } finally {
      setLoading(false);
    }
  }, [tokens]);

  // Export Functions
  const exportToCSV = useCallback(async () => {
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/export/csv`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gantt-${projectId}.csv`;
        a.click();
        toast.success('CSV export downloaded');
      }
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Error exporting CSV');
    }
  }, [projectId, tokens]);

  const exportToExcel = useCallback(async () => {
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/export/excel`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Convert to Excel using a library like SheetJS
        toast.success('Excel data ready');
        console.log('Excel data:', data);
      }
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Error exporting Excel');
    }
  }, [projectId, tokens]);

  const exportToMSProject = useCallback(async () => {
    try {
      const response = await fetch(`/api/timeline/projects/${projectId}/export/ms-project`, {
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `project-${projectId}.xml`;
        a.click();
        toast.success('MS Project export downloaded');
      }
    } catch (error) {
      console.error('Error exporting MS Project:', error);
      toast.error('Error exporting MS Project');
    }
  }, [projectId, tokens]);

  // Load initial data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'cpm':
        if (!cpmAnalysis) fetchCPMAnalysis();
        break;
      case 'resources':
        if (!resourceConflicts) fetchResourceConflicts();
        break;
      case 'baseline':
        if (baselines.length === 0) fetchBaselines();
        break;
    }
  }, [activeTab]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header with Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between px-6 py-4">
          <h2 className="text-xl font-bold text-gray-900">Advanced Timeline Features</h2>
        </div>
        
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('cpm')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'cpm'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Target className="h-5 w-5" />
              <span>Critical Path</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('resources')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'resources'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Resource Leveling</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('baseline')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'baseline'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Archive className="h-5 w-5" />
              <span>Baseline Management</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 font-medium transition-colors ${
              activeTab === 'export'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Download className="h-5 w-5" />
              <span>Export</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6">
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* CPM Tab */}
        {activeTab === 'cpm' && !loading && (
          <div className="space-y-6">
            {!cpmAnalysis ? (
              <div className="text-center py-12">
                <Target className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Critical Path Analysis
                </h3>
                <p className="text-gray-600 mb-6">
                  Calculate the critical path to identify tasks that directly impact project duration
                </p>
                <button
                  onClick={fetchCPMAnalysis}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Calculate Critical Path
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-3xl font-bold text-red-600">
                      {cpmAnalysis.critical_path_length}
                    </div>
                    <div className="text-sm text-gray-600">Critical Tasks</div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="text-3xl font-bold text-blue-600">
                      {cpmAnalysis.project_duration_days.toFixed(1)}
                    </div>
                    <div className="text-sm text-gray-600">Project Days</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600">
                      {cpmAnalysis.schedule_health_score.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Health Score</div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="text-3xl font-bold text-purple-600">
                      {Object.keys(cpmAnalysis.task_analysis).length - cpmAnalysis.critical_path_length}
                    </div>
                    <div className="text-sm text-gray-600">Float Tasks</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={fetchCPMAnalysis}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Recalculate</span>
                  </button>
                  
                  <button
                    onClick={fetchOptimizations}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Optimize Schedule</span>
                  </button>
                </div>

                {/* Optimizations */}
                {showOptimizations && optimizations && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">Optimization Suggestions</h4>
                    <div className="space-y-2">
                      {optimizations.optimization_suggestions?.slice(0, 5).map((suggestion: any, idx: number) => (
                        <div key={idx} className="flex items-start space-x-2 text-sm">
                          <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{suggestion.suggestion}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-gray-600">
                      Potential time savings: <span className="font-medium">{optimizations.estimated_time_savings?.toFixed(1)} hours</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && !loading && (
          <div className="space-y-6">
            {!resourceConflicts ? (
              <div className="text-center py-12">
                <Users className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Resource Conflict Detection
                </h3>
                <p className="text-gray-600 mb-6">
                  Identify resource over-allocation and workload imbalances
                </p>
                <button
                  onClick={fetchResourceConflicts}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Analyze Resources
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                    <div className="text-3xl font-bold text-red-600">
                      {resourceConflicts.total_conflicts || 0}
                    </div>
                    <div className="text-sm text-gray-600">Conflicts Detected</div>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="text-3xl font-bold text-yellow-600">
                      {resourceConflicts.over_allocated_resources?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Over-allocated Resources</div>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="text-3xl font-bold text-green-600">
                      {resourceConflicts.health_score?.toFixed(0) || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Resource Health</div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={fetchResourceConflicts}
                    className="flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
                  >
                    <RefreshCw className="h-4 w-4" />
                    <span>Refresh Analysis</span>
                  </button>
                  
                  <button
                    onClick={() => levelResources(false)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Level Resources</span>
                  </button>
                  
                  <button
                    onClick={fetchWorkloadAnalysis}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                  >
                    <BarChart3 className="h-4 w-4" />
                    <span>Workload Analysis</span>
                  </button>
                </div>

                {/* Conflicts List */}
                {resourceConflicts.conflicts && resourceConflicts.conflicts.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Resource
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Allocation
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Severity
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                            Tasks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {resourceConflicts.conflicts.slice(0, 10).map((conflict: any, idx: number) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {conflict.resource_name}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {conflict.total_allocation_percentage.toFixed(0)}%
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                conflict.severity === 'critical' ? 'bg-red-100 text-red-800' :
                                conflict.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                                conflict.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-green-100 text-green-800'
                              }`}>
                                {conflict.severity}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {conflict.conflicting_tasks.slice(0, 2).join(', ')}
                              {conflict.conflicting_tasks.length > 2 && '...'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Leveling Result */}
                {levelingResult && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-3">
                      Resource Leveling Results
                    </h4>
                    <p className="text-sm text-gray-600 mb-3">
                      {levelingResult.message}
                    </p>
                    {levelingResult.suggested_changes && levelingResult.suggested_changes.length > 0 && (
                      <div className="space-y-2">
                        {levelingResult.suggested_changes.slice(0, 5).map((change: any, idx: number) => (
                          <div key={idx} className="text-sm text-gray-700">
                            <strong>{change.task_name}:</strong> Shift by {change.shift_days} days
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      onClick={() => levelResources(true)}
                      className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm"
                    >
                      Apply Changes
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Baseline Tab */}
        {activeTab === 'baseline' && !loading && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Project Baselines</h3>
              <button
                onClick={() => setShowCreateBaseline(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                <Save className="h-4 w-4" />
                <span>Create Baseline</span>
              </button>
            </div>

            {/* Create Baseline Modal */}
            {showCreateBaseline && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg p-6 w-full max-w-md">
                  <h3 className="text-lg font-semibold mb-4">Create New Baseline</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Baseline Name *
                      </label>
                      <input
                        type="text"
                        value={newBaselineName}
                        onChange={(e) => setNewBaselineName(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., Initial Plan"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={newBaselineDesc}
                        onChange={(e) => setNewBaselineDesc(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Optional description..."
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setShowCreateBaseline(false);
                        setNewBaselineName('');
                        setNewBaselineDesc('');
                      }}
                      className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={createBaseline}
                      disabled={!newBaselineName.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
                    >
                      Create Baseline
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Baselines List */}
            {baselines.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No baselines created yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {baselines.map((baseline) => (
                  <div
                    key={baseline.id}
                    className={`border rounded-lg p-4 ${
                      baseline.is_active ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{baseline.name}</h4>
                      {baseline.is_active && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>Created: {new Date(baseline.baseline_date).toLocaleDateString()}</p>
                      <p>Tasks: {baseline.summary.total_tasks}</p>
                      <p>Duration: {baseline.summary.total_planned_duration}h</p>
                    </div>
                    <div className="flex space-x-2 mt-4">
                      <button
                        onClick={() => analyzeVariance(baseline.id)}
                        className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                      >
                        Analyze Variance
                      </button>
                      <button
                        onClick={() => setSelectedBaseline(baseline.id)}
                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Variance Analysis */}
            {varianceAnalysis && (
              <div className="border border-gray-200 rounded-lg p-6 space-y-4">
                <h4 className="text-lg font-medium text-gray-900">Variance Analysis</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {varianceAnalysis.summary?.overall_schedule_variance_percentage?.toFixed(1)}%
                    </div>
                    <div className="text-sm text-gray-600">Schedule Variance</div>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">
                      {varianceAnalysis.summary?.variance_health_score?.toFixed(0)}%
                    </div>
                    <div className="text-sm text-gray-600">Health Score</div>
                  </div>
                  
                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="text-2xl font-bold text-red-600">
                      {varianceAnalysis.critical_variances?.length || 0}
                    </div>
                    <div className="text-sm text-gray-600">Critical Variances</div>
                  </div>
                </div>

                {/* EVM Metrics */}
                {varianceAnalysis.evm_metrics && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h5 className="font-medium text-gray-900 mb-3">Earned Value Metrics</h5>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-gray-600">SPI</div>
                        <div className="text-lg font-semibold">
                          {varianceAnalysis.evm_metrics.spi?.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">CPI</div>
                        <div className="text-lg font-semibold">
                          {varianceAnalysis.evm_metrics.cpi?.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">Status</div>
                        <div className="text-lg font-semibold capitalize">
                          {varianceAnalysis.evm_metrics.performance_status}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-600">TCPI</div>
                        <div className="text-lg font-semibold">
                          {varianceAnalysis.evm_metrics.tcpi?.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Export Tab */}
        {activeTab === 'export' && !loading && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900">Export Options</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CSV Export */}
              <div className="border border-gray-200 rounded-lg p-6">
                <FileText className="h-12 w-12 text-blue-600 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Export to CSV</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export timeline data in CSV format for Excel or other spreadsheet tools
                </p>
                <button
                  onClick={exportToCSV}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  Download CSV
                </button>
              </div>

              {/* Excel Export */}
              <div className="border border-gray-200 rounded-lg p-6">
                <Package className="h-12 w-12 text-green-600 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Export to Excel</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export with multiple sheets including CPM and resource analysis
                </p>
                <button
                  onClick={exportToExcel}
                  className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
                >
                  Download Excel
                </button>
              </div>

              {/* MS Project Export */}
              <div className="border border-gray-200 rounded-lg p-6">
                <Calendar className="h-12 w-12 text-purple-600 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Export to MS Project</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Export in Microsoft Project compatible XML format
                </p>
                <button
                  onClick={exportToMSProject}
                  className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg"
                >
                  Download XML
                </button>
              </div>

              {/* Print View */}
              <div className="border border-gray-200 rounded-lg p-6">
                <Activity className="h-12 w-12 text-orange-600 mb-4" />
                <h4 className="font-medium text-gray-900 mb-2">Print View</h4>
                <p className="text-sm text-gray-600 mb-4">
                  Generate print-optimized HTML view of the Gantt chart
                </p>
                <button
                  onClick={() => window.open(`/api/timeline/projects/${projectId}/export/print`, '_blank')}
                  className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg"
                >
                  Open Print View
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedTimelineFeatures;
