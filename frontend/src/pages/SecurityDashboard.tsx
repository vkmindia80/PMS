/**
 * Security Dashboard Frontend Page
 * Phase 4.3: Enterprise Security & Compliance Interface
 */

import React, { useState, useEffect } from 'react';
import { AlertTriangle, Shield, Eye, Lock, Users, FileCheck, Activity, TrendingUp, RefreshCw } from 'lucide-react';
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

const SecurityDashboard: React.FC = () => {
  const { selectedProject, getSelectedProjectIds } = useProjectFilterContext();
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [threats, setThreats] = useState<ThreatDetection[]>([]);
  const [reports, setReports] = useState<ComplianceReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [selectedProject]); // Re-fetch when project filter changes

  const fetchSecurityData = async () => {
    try {
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

      // Use relative URLs - let proxy or ingress handle routing
      const metricsResponse = await fetch(`/api/security/dashboard/metrics${projectParam}`, { headers });
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
        console.log('Security metrics loaded:', metricsData);
      } else {
        console.error('Failed to fetch metrics:', metricsResponse.status, metricsResponse.statusText);
      }

      // Fetch active threats
      const threatsResponse = await fetch(`/api/security/threats/active${projectParam}`, { headers });
      if (threatsResponse.ok) {
        const threatsData = await threatsResponse.json();
        setThreats(threatsData);
        console.log('Active threats loaded:', threatsData);
      } else {
        console.error('Failed to fetch threats:', threatsResponse.status, threatsResponse.statusText);
      }

      // Fetch compliance reports
      const complianceResponse = await fetch(`/api/security/compliance/reports${projectParam}`, { headers });
      if (complianceResponse.ok) {
        const complianceData = await complianceResponse.json();
        setReports(complianceData.slice(0, 5)); // Latest 5 reports
        console.log('Compliance reports loaded:', complianceData);
      } else {
        console.error('Failed to fetch compliance reports:', complianceResponse.status, complianceResponse.statusText);
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching security data:', err);
      setError('Failed to load security data. Please try refreshing the page or check your network connection.');
      setLoading(false);
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
            <button
              onClick={refreshData}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
            <div className="text-sm text-gray-500">
              Last updated: {metrics?.system_health.last_updated ? 
                new Date(metrics.system_health.last_updated).toLocaleTimeString() : 
                'Never'}
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
              { id: 'threats', name: 'Threats', icon: AlertTriangle },
              { id: 'compliance', name: 'Compliance', icon: FileCheck },
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
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Compliance Reports</h3>
            </div>
            <div className="p-6">
              {reports.length === 0 ? (
                <div className="text-center py-12">
                  <FileCheck className="h-16 w-16 text-blue-400 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">No Compliance Reports</h4>
                  <p className="text-gray-600 mb-6">No compliance assessments have been performed yet</p>
                  <div className="space-y-4">
                    <button
                      onClick={() => window.open('/api/docs#/Enterprise%20Security/assess_compliance_api_security_compliance_assess_post', '_blank')}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Start Compliance Assessment
                    </button>
                    <div className="text-sm text-gray-500">
                      Supported standards: SOC2, GDPR, HIPAA, ISO 27001
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map(report => (
                    <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-semibold text-gray-900">
                            {report.compliance_standard.replace(/_/g, ' ').toUpperCase()}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            report.overall_score >= 80 
                              ? 'bg-green-100 text-green-800'
                              : report.overall_score >= 60
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            Score: {report.overall_score}/100
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(report.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>Compliance: {report.compliance_percentage}%</span>
                        <span>Critical Findings: {report.critical_findings.length}</span>
                        <span>High Findings: {report.high_findings.length}</span>
                        <span className={`capitalize ${getStatusColor(report.status)}`}>
                          {report.status}
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
