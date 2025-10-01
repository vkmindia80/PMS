/**
 * Security Dashboard Frontend Page
 * Phase 4.3: Enterprise Security & Compliance Interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { AlertTriangle, Shield, Eye, Lock, Users, FileCheck, Activity, TrendingUp, RefreshCw, Clock, Zap, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import GlobalProjectFilter from '../components/common/GlobalProjectFilter';
import { useProjectFilterContext } from '../contexts/ProjectFilterContext';

interface SecurityMetrics {
  security_events: {
    total_last_30_days: number;
    by_type: Record<string, number>;
    high_risk_events: number;
  };
  mfa_status: {
    adoption_rate: number;
    enabled_users: number;
    total_users: number;
  };
  threat_detection: {
    active_threats: number;
    status: string;
  };
  compliance: {
    active_certifications: number;
    status: string;
  };
  system_health: {
    overall_status: string;
    last_updated: string;
    zero_trust_enabled: boolean;
  };
}

interface ThreatDetection {
  id: string;
  threat_type: string;
  severity: string;
  confidence: number;
  first_detected: string;
  affected_users: string[];
  investigation_status: string;
  description?: string;
}

interface ComplianceReport {
  id: string;
  compliance_standard: string;
  overall_score: number;
  compliance_percentage: number;
  critical_findings: any[];
  high_findings: any[];
  created_at: string;
  status: string;
}

interface ComplianceStatus {
  soc2: ComplianceStandardStatus;
  gdpr: ComplianceStandardStatus;
  hipaa: ComplianceStandardStatus;
  iso27001: ComplianceStandardStatus;
  pci_dss: ComplianceStandardStatus;
  overall: OverallComplianceStatus;
  recent_activities: ComplianceActivity[];
  recommendations: ComplianceRecommendation[];
}

interface ComplianceStandardStatus {
  score: number;
  status: string;
  last_assessment: string | null;
  next_assessment: string;
  critical_issues: number;
  high_issues: number;
  compliance_percentage: number;
  trend: string;
  certification_valid: boolean;
  requires_assessment?: boolean;
}

interface OverallComplianceStatus {
  status: string;
  score: number;
  last_assessment: string;
  next_assessment: string;
  trend: string;
  critical_issues: number;
  total_standards: number;
  compliant_standards: number;
}

interface ComplianceActivity {
  type: string;
  timestamp: string;
  description: string;
  status: string;
  score?: number;
  icon: string;
}

interface ComplianceRecommendation {
  priority: string;
  category: string;
  title: string;
  description: string;
  timeline: string;
  effort: string;
  impact?: string;
}

interface SecurityEvent {
  id: string;
  organization_id: string;
  user_id?: string;
  event_type: string;
  action: string;
  outcome: string;
  description: string;
  risk_level: string;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  details: any;
}

const SecurityDashboard: React.FC = () => {
  const { selectedProject, getSelectedProjectIds } = useProjectFilterContext();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [complianceStatus, setComplianceStatus] = useState<ComplianceStatus | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchSecurityData();
    
    // Setup auto-refresh interval if enabled
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchSecurityData(true); // Silent refresh
      }, 30000); // Refresh every 30 seconds
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [selectedProject, autoRefresh]); // Re-fetch when project filter or auto-refresh changes

  const fetchSecurityData = async (silentRefresh = false) => {
    try {
      if (!silentRefresh) {
        setLoading(true);
        setError(null);
      }

      // Get auth token from localStorage - use the correct key
      const authTokensStr = localStorage.getItem('auth_tokens');
      if (!authTokensStr) throw new Error('No authentication token');

      const authTokens = JSON.parse(authTokensStr);
      const headers = {
        'Authorization': `Bearer ${authTokens.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('Fetching security data using relative URLs...');

      // Build query parameters for project filtering
      const selectedProjectIds = getSelectedProjectIds();
      const projectParam = selectedProjectIds.length > 0 
        ? `?project_id=${selectedProjectIds.join(',')}` 
        : '';

      // Fetch security dashboard metrics
      const metricsResponse = await fetch(`/api/security/dashboard/metrics${projectParam}`, { headers });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
        console.log('Security metrics loaded:', metricsData);
      } else {
        console.error('Failed to fetch metrics:', metricsResponse.status, metricsResponse.statusText);
      }

      // Fetch compliance status
      const complianceStatusResponse = await fetch(`/api/security/compliance/status`, { headers });
      if (complianceStatusResponse.ok) {
        const complianceStatusData = await complianceStatusResponse.json();
        setComplianceStatus(complianceStatusData);
        console.log('Compliance status loaded:', complianceStatusData);
      } else {
        console.error('Failed to fetch compliance status:', complianceStatusResponse.status, complianceStatusResponse.statusText);
      }

      // Fetch active threats (fallback to empty array on error)
      try {
        const threatsResponse = await fetch(`/api/security/threats/active${projectParam}`, { headers });
        if (threatsResponse.ok) {
          const threatsData = await threatsResponse.json();
          setThreats(threatsData);
          console.log('Active threats loaded:', threatsData);
        } else {
          setThreats([]);
        }
      } catch (err) {
        console.log('Threats endpoint not available, using empty array');
        setThreats([]);
      }

      // Fetch compliance reports (fallback to empty array on error)
      try {
        const complianceResponse = await fetch(`/api/security/compliance/reports${projectParam}`, { headers });
        if (complianceResponse.ok) {
          const complianceData = await complianceResponse.json();
          setReports(complianceData.slice(0, 5)); // Latest 5 reports
          console.log('Compliance reports loaded:', complianceData);
        } else {
          setReports([]);
        }
      } catch (err) {
        console.log('Compliance reports endpoint not available, using empty array');
        setReports([]);
      }

      // Fetch recent security events (fallback gracefully)
      try {
        const eventsResponse = await fetch(`/api/security/dashboard/realtime-events?limit=20`, { headers });
        if (eventsResponse.ok) {
          const eventsData = await eventsResponse.json();
          setSecurityEvents(eventsData);
          console.log('Security events loaded:', eventsData.length);
        } else {
          setSecurityEvents([]);
        }
      } catch (err) {
        console.log('Security events endpoint not available, using empty array');
        setSecurityEvents([]);
      }

      setLastUpdate(new Date());
      if (!silentRefresh) {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching security data:', err);
      setError('Failed to load security data. Please try refreshing the page or check your network connection.');
      if (!silentRefresh) {
        setLoading(false);
      }
    }
  };

  const getSeverityColor = (severity: string): string => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-600 bg-red-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'secure':
      case 'healthy':
      case 'compliant': return 'text-green-600';
      case 'attention_needed':
      case 'needs_assessment': return 'text-yellow-600';
      case 'critical':
      case 'degraded': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const refreshData = async () => {
    setError(null);
    setLoading(true);
    await fetchSecurityData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span>Loading security dashboard...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Security Dashboard Error</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-x-4">
            <button
              onClick={refreshData}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Retry
            </button>
            <a
              href="/api/security/health"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 inline-block"
            >
              Check Health
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Shield className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Security Dashboard</h1>
              <p className="text-gray-600">Monitor security events, threats, and compliance status</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <GlobalProjectFilter 
              className="min-w-[200px]" 
              placeholder="All Projects" 
              label=""
              multiSelect={true}
            />
            <div className="flex items-center space-x-2">
              <label className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-gray-600">Auto-refresh</span>
              </label>
              <button
                onClick={refreshData}
                disabled={loading}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="text-sm text-gray-500 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Last updated: {lastUpdate.toLocaleTimeString()}</span>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              metrics?.system_health.overall_status === 'secure' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {metrics?.system_health.overall_status || 'Unknown'}
            </div>
            {metrics?.system_health.zero_trust_enabled && (
              <div className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                Zero-Trust Enabled
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: Activity },
              { id: 'realtime', name: 'Real-Time Events', icon: Zap },
              { id: 'compliance', name: 'Compliance Status', icon: FileCheck },
              { id: 'threats', name: 'Threats', icon: AlertTriangle },
              { id: 'mfa', name: 'MFA Status', icon: Lock }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.name}</span>
                  {tab.id === 'realtime' && autoRefresh && (
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Security Events */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Activity className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Security Events (30d)</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.security_events.total_last_30_days || 0}
                  </p>
                  <p className="text-sm text-red-600">
                    {metrics?.security_events.high_risk_events || 0} high risk
                  </p>
                </div>
              </div>
            </div>

            {/* MFA Adoption */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Lock className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">MFA Adoption</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.mfa_status.adoption_rate || 0}%
                  </p>
                  <p className="text-sm text-gray-600">
                    {metrics?.mfa_status.enabled_users || 0} of {metrics?.mfa_status.total_users || 0} users
                  </p>
                </div>
              </div>
            </div>

            {/* Active Threats */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertTriangle className="h-6 w-6 text-red-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Active Threats</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.threat_detection.active_threats || 0}
                  </p>
                  <p className={`text-sm ${
                    metrics?.threat_detection.status === 'healthy' ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {metrics?.threat_detection.status || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>

            {/* Compliance Status */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileCheck className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Compliance</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {metrics?.compliance.active_certifications || 0}
                  </p>
                  <p className={`text-sm ${getStatusColor(metrics?.compliance.status || '')}`}>
                    {metrics?.compliance.status || 'Unknown'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Events Breakdown */}
          {metrics?.security_events.by_type && Object.keys(metrics.security_events.by_type).length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Security Events by Type</h3>
              <div className="space-y-3">
                {Object.entries(metrics.security_events.by_type).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 capitalize">
                      {type.replace(/_/g, ' ')}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'realtime' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Real-Time Security Events</h3>
                <p className="text-sm text-gray-600">Live monitoring of security activities</p>
              </div>
              <div className="flex items-center space-x-3">
                {autoRefresh && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span>Live</span>
                  </div>
                )}
                <span className="text-sm text-gray-500">{securityEvents.length} events</span>
              </div>
            </div>
            <div className="p-6">
              {securityEvents.length === 0 ? (
                <div className="text-center py-12">
                  <Activity className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Recent Events</h4>
                  <p className="text-gray-600 mb-4">No security events have been recorded recently</p>
                  <button
                    onClick={() => {
                      // Generate demo events for demonstration
                      fetch('/api/security/dashboard/generate-demo-events', {
                        method: 'POST',
                        headers: {
                          'Authorization': `Bearer ${JSON.parse(localStorage.getItem('auth_tokens') || '{}').access_token}`,
                          'Content-Type': 'application/json'
                        }
                      }).then(() => {
                        setTimeout(() => fetchSecurityData(), 1000);
                      });
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Generate Demo Events
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {securityEvents.map((event, index) => (
                    <div
                      key={event.id || index}
                      className={`border-l-4 pl-4 py-3 rounded-r-lg transition-all duration-300 ${
                        event.risk_level === 'critical' ? 'border-red-500 bg-red-50' :
                        event.risk_level === 'high' ? 'border-orange-500 bg-orange-50' :
                        event.risk_level === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                        'border-green-500 bg-green-50'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              event.risk_level === 'critical' ? 'bg-red-100 text-red-800' :
                              event.risk_level === 'high' ? 'bg-orange-100 text-orange-800' :
                              event.risk_level === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {event.risk_level}
                            </span>
                            <span className="text-sm font-medium text-gray-700 capitalize">
                              {event.event_type.replace(/_/g, ' ')}
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              event.outcome === 'success' ? 'bg-green-100 text-green-800' :
                              event.outcome === 'failure' ? 'bg-red-100 text-red-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {event.outcome}
                            </span>
                          </div>
                          <p className="text-gray-700 text-sm mb-2">{event.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500">
                            <span>Action: {event.action}</span>
                            {event.ip_address && <span>IP: {event.ip_address}</span>}
                            {event.user_id && <span>User ID: {event.user_id}</span>}
                          </div>
                        </div>
                        <div className="text-right text-xs text-gray-500">
                          <div>{new Date(event.timestamp).toLocaleDateString()}</div>
                          <div>{new Date(event.timestamp).toLocaleTimeString()}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'threats' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Active Security Threats</h3>
            </div>
            <div className="p-6">
              {threats.length === 0 ? (
                <div className="text-center py-12">
                  <Shield className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">All Clear!</h4>
                  <p className="text-gray-600 mb-4">No active security threats detected</p>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                    <p className="text-sm text-green-800">
                      Your security monitoring is active and all systems are secure.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {threats.map(threat => (
                    <div key={threat.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            getSeverityColor(threat.severity)
                          }`}>
                            {threat.severity}
                          </span>
                          <h4 className="font-semibold text-gray-900 capitalize">
                            {threat.threat_type.replace(/_/g, ' ')}
                          </h4>
                          <span className="text-sm text-gray-600">
                            {Math.round(threat.confidence * 100)}% confidence
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(threat.first_detected).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-gray-700 text-sm mb-2">
                        {threat.description || 'No description available'}
                      </p>
                      {threat.affected_users.length > 0 && (
                        <div className="text-sm text-gray-600">
                          Affected users: {threat.affected_users.length}
                        </div>
                      )}
                      <div className="mt-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          threat.investigation_status === 'open' 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {threat.investigation_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && (
        <div className="space-y-6">
          {/* Overall Compliance Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Status Overview</h3>
              {complianceStatus?.overall && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  complianceStatus.overall.status === 'compliant' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {complianceStatus.overall.status}
                </div>
              )}
            </div>

            {complianceStatus?.overall && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{complianceStatus.overall.score}</div>
                  <div className="text-sm text-gray-600">Overall Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{complianceStatus.overall.compliant_standards}</div>
                  <div className="text-sm text-gray-600">Compliant Standards</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{complianceStatus.overall.critical_issues}</div>
                  <div className="text-sm text-gray-600">Critical Issues</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{complianceStatus.overall.total_standards}</div>
                  <div className="text-sm text-gray-600">Total Standards</div>
                </div>
              </div>
            )}

            {/* Compliance Standards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {complianceStatus && Object.entries(complianceStatus).map(([key, standard]) => {
                if (key === 'overall' || key === 'recent_activities' || key === 'recommendations') return null;
                
                const standardData = standard as ComplianceStandardStatus;
                return (
                  <div key={key} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900 uppercase">{key.replace('_', ' ')}</h4>
                      <div className="flex items-center space-x-2">
                        {standardData.certification_valid ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          standardData.status === 'compliant' ? 'bg-green-100 text-green-800' :
                          standardData.status === 'needs_attention' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {standardData.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Score:</span>
                        <span className={`font-medium ${
                          standardData.score >= 80 ? 'text-green-600' :
                          standardData.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {standardData.score}/100
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Compliance:</span>
                        <span>{standardData.compliance_percentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Issues:</span>
                        <span className="text-red-600">
                          {standardData.critical_issues + standardData.high_issues}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Next Assessment:</span>
                        <span className="text-gray-600">
                          {new Date(standardData.next_assessment).toLocaleDateString()}
                        </span>
                      </div>
                      {standardData.requires_assessment && (
                        <div className="mt-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500 inline mr-1" />
                          <span className="text-xs text-yellow-600">Assessment Required</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Activities */}
          {complianceStatus?.recent_activities && complianceStatus.recent_activities.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Recent Compliance Activities</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {complianceStatus.recent_activities.slice(0, 5).map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 py-2">
                      <div className={`p-2 rounded-full ${
                        activity.icon === 'file-check' ? 'bg-blue-100' : 'bg-green-100'
                      }`}>
                        {activity.icon === 'file-check' ? (
                          <FileCheck className="h-4 w-4 text-blue-600" />
                        ) : (
                          <Shield className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(activity.timestamp).toLocaleDateString()} at {new Date(activity.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      {activity.score && (
                        <div className="text-sm font-medium text-gray-600">
                          Score: {activity.score}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {complianceStatus?.recommendations && complianceStatus.recommendations.length > 0 && (
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">Priority Recommendations</h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {complianceStatus.recommendations.slice(0, 5).map((rec, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            rec.priority === 'critical' ? 'bg-red-100 text-red-800' :
                            rec.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {rec.priority}
                          </span>
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                            {rec.category}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{rec.timeline.replace('_', ' ')}</span>
                      </div>
                      <h4 className="font-medium text-gray-900 mb-1">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                      <div className="flex items-center space-x-4 text-xs text-gray-500">
                        <span>Effort: {rec.effort}</span>
                        {rec.impact && <span>Impact: {rec.impact}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'mfa' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Factor Authentication Status</h3>
            
            {/* MFA Progress */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">MFA Adoption Progress</span>
                <span className="text-sm text-gray-600">
                  {metrics?.mfa_status.enabled_users} / {metrics?.mfa_status.total_users} users
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${metrics?.mfa_status.adoption_rate || 0}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {metrics?.mfa_status.adoption_rate || 0}% of users have enabled MFA
              </p>
            </div>

            {/* MFA Recommendations */}
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Recommendations</h4>
              <div className="space-y-2">
                {(metrics?.mfa_status.adoption_rate || 0) < 90 && (
                  <div className="flex items-center space-x-2 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm text-yellow-800">
                      Consider implementing mandatory MFA for all users
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2 p-3 bg-blue-50 rounded-lg">
                  <Lock className="h-5 w-5 text-blue-600" />
                  <span className="text-sm text-blue-800">
                    Enable MFA for high-privilege accounts (Admin, Super Admin)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SecurityDashboard;
