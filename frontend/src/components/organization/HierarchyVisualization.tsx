import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Users, Building2, Crown, Shield, UserCog, Eye,
  ChevronRight, ChevronDown, Star, MapPin, Layers,
  BarChart3, TrendingUp, Target, Palette, Code, Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

interface HierarchyNode {
  id: string
  name: string
  email: string
  role: string
  avatar_url?: string
  direct_reports?: HierarchyNode[]
  teams_led?: any[]
  teams_member?: any[]
}

interface TeamStructureNode {
  id: string
  type: 'team' | 'user'
  name: string
  team_type?: string
  role?: string
  email?: string
  member_count?: number
  lead_name?: string
}

interface Department {
  name: string
  type: string
  teams: any[]
  total_members: number
  team_count: number
}

const ROLE_ICONS = {
  super_admin: Crown,
  admin: Shield,
  manager: UserCog,
  team_lead: Users,
  member: Users,
  viewer: Eye
}

const TEAM_TYPE_ICONS = {
  development: Code,
  design: Palette,
  marketing: TrendingUp,
  sales: Target,
  support: Shield,
  operations: Settings,
  management: UserCog,
  cross_functional: Users
}

const TEAM_TYPE_COLORS = {
  development: 'bg-blue-100 text-blue-800',
  design: 'bg-purple-100 text-purple-800',
  marketing: 'bg-green-100 text-green-800',
  sales: 'bg-yellow-100 text-yellow-800',
  support: 'bg-red-100 text-red-800',
  operations: 'bg-gray-100 text-gray-800',
  management: 'bg-indigo-100 text-indigo-800',
  cross_functional: 'bg-pink-100 text-pink-800'
}

const HierarchyVisualization: React.FC = () => {
  const { user, tokens } = useAuth()
  const [hierarchy, setHierarchy] = useState<any>(null)
  const [teamStructure, setTeamStructure] = useState<any>(null)
  const [departments, setDepartments] = useState<Department[]>([])
  const [reportingStructure, setReportingStructure] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [activeView, setActiveView] = useState<'hierarchy' | 'teams' | 'departments' | 'reporting'>('hierarchy')
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://continuation-guide.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const API_URL = getApiUrl()

  useEffect(() => {
    if (user?.organization_id) {
      fetchHierarchyData()
    }
  }, [user])

  const fetchHierarchyData = async () => {
    if (!user?.organization_id) return

    try {
      setLoading(true)
      
      // Fetch all hierarchy data
      const [hierarchyRes, teamStructureRes, departmentsRes, reportingRes] = await Promise.all([
        fetch(`${API_URL}/api/hierarchy/organization/${user.organization_id}`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/hierarchy/team-structure/${user.organization_id}`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/hierarchy/department-structure/${user.organization_id}`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/hierarchy/reporting-structure/${user.organization_id}`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      ])

      if (hierarchyRes.ok) {
        const hierarchyData = await hierarchyRes.json()
        setHierarchy(hierarchyData)
      }

      if (teamStructureRes.ok) {
        const teamData = await teamStructureRes.json()
        setTeamStructure(teamData)
      }

      if (departmentsRes.ok) {
        const deptData = await departmentsRes.json()
        setDepartments(deptData.departments)
      }

      if (reportingRes.ok) {
        const reportData = await reportingRes.json()
        setReportingStructure(reportData)
      }

    } catch (error) {
      console.error('Error fetching hierarchy data:', error)
      toast.error('Failed to load organization hierarchy')
    } finally {
      setLoading(false)
    }
  }

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getRoleIcon = (role: string) => {
    const Icon = ROLE_ICONS[role as keyof typeof ROLE_ICONS] || Users
    return <Icon className="h-4 w-4" />
  }

  const getTeamTypeIcon = (teamType: string) => {
    const Icon = TEAM_TYPE_ICONS[teamType as keyof typeof TEAM_TYPE_ICONS] || Users
    return <Icon className="h-5 w-5" />
  }

  const getRoleColor = (role: string) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      team_lead: 'bg-green-100 text-green-800',
      member: 'bg-gray-100 text-gray-800',
      viewer: 'bg-yellow-100 text-yellow-800'
    }
    return colors[role as keyof typeof colors] || colors.member
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* View Selector */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveView('hierarchy')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeView === 'hierarchy'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Building2 className="h-4 w-4 mr-2 inline" />
            Organization Hierarchy
          </button>
          <button
            onClick={() => setActiveView('teams')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeView === 'teams'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Users className="h-4 w-4 mr-2 inline" />
            Team Structure
          </button>
          <button
            onClick={() => setActiveView('departments')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeView === 'departments'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="h-4 w-4 mr-2 inline" />
            Departments
          </button>
          <button
            onClick={() => setActiveView('reporting')}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeView === 'reporting'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="h-4 w-4 mr-2 inline" />
            Reporting Structure
          </button>
        </div>
      </div>

      {/* Organization Hierarchy View */}
      {activeView === 'hierarchy' && hierarchy && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Organization Hierarchy</h3>
          
          {/* Organization Header */}
          <div className="mb-6 p-4 bg-primary-50 rounded-lg">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-primary-600 mr-3" />
              <div>
                <h4 className="text-lg font-semibold text-primary-900">
                  {hierarchy.organization.name}
                </h4>
                <p className="text-sm text-primary-700">
                  {hierarchy.organization.member_count} members • {hierarchy.organization.team_count} teams
                </p>
              </div>
            </div>
          </div>

          {/* Leadership */}
          {hierarchy.leadership.length > 0 && (
            <div className="mb-6">
              <h4 className="text-md font-semibold text-gray-900 mb-3">Leadership</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hierarchy.leadership.map((leader: any) => (
                  <div key={leader.id} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {leader.avatar_url ? (
                          <img className="h-10 w-10 rounded-full" src={leader.avatar_url} alt="" />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-600">
                              {leader.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{leader.name}</p>
                        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(leader.role)}`}>
                          {getRoleIcon(leader.role)}
                          <span className="ml-1">{leader.role.replace('_', ' ')}</span>
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Teams */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">Teams ({hierarchy.teams.length})</h4>
            <div className="space-y-4">
              {hierarchy.teams.map((team: any) => (
                <div key={team.id} className="border border-gray-200 rounded-lg">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpanded(team.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="mr-3">
                          {expandedNodes.has(team.id) ? (
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-400" />
                          )}
                        </div>
                        {getTeamTypeIcon(team.type)}
                        <span className="ml-2 font-medium text-gray-900">{team.name}</span>
                        <span className={`ml-3 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${TEAM_TYPE_COLORS[team.type as keyof typeof TEAM_TYPE_COLORS]}`}>
                          {team.type.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500">
                        {team.member_count} members
                      </div>
                    </div>
                  </div>
                  
                  {expandedNodes.has(team.id) && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      {team.lead && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-500 mb-2">TEAM LEAD</p>
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-yellow-500 mr-2" />
                            <span className="text-sm font-medium">{team.lead.name}</span>
                            <span className="ml-2 text-sm text-gray-500">{team.lead.email}</span>
                          </div>
                        </div>
                      )}
                      
                      {team.members.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-2">MEMBERS</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {team.members.map((member: any) => (
                              <div key={member.id} className="flex items-center justify-between p-2 bg-white rounded">
                                <div className="flex items-center">
                                  <span className="text-sm font-medium">{member.name}</span>
                                  <span className={`ml-2 inline-flex px-1 py-0.5 text-xs rounded ${getRoleColor(member.team_role)}`}>
                                    {member.team_role}
                                  </span>
                                </div>
                                {member.skills.length > 0 && (
                                  <div className="text-xs text-gray-500">
                                    {member.skills.slice(0, 2).join(', ')}
                                    {member.skills.length > 2 && ` +${member.skills.length - 2}`}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Unassigned Members */}
          {hierarchy.unassigned_members.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">
                Unassigned Members ({hierarchy.unassigned_members.length})
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {hierarchy.unassigned_members.map((member: any) => (
                  <div key={member.id} className="p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-8 w-8">
                        {member.avatar_url ? (
                          <img className="h-8 w-8 rounded-full" src={member.avatar_url} alt="" />
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">
                              {member.name.split(' ').map((n: string) => n[0]).join('')}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-2">
                        <p className="text-sm font-medium text-gray-900">{member.name}</p>
                        <span className={`inline-flex px-1 py-0.5 text-xs rounded ${getRoleColor(member.role)}`}>
                          {member.role.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Team Structure View */}
      {activeView === 'teams' && teamStructure && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Team Structure</h3>
          
          <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{teamStructure.stats.total_teams}</p>
              <p className="text-sm text-blue-800">Total Teams</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{teamStructure.stats.total_members}</p>
              <p className="text-sm text-green-800">Total Members</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{Object.keys(teamStructure.stats.team_types).length}</p>
              <p className="text-sm text-purple-800">Team Types</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Team Types Distribution */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Team Types Distribution</h4>
              <div className="space-y-2">
                {Object.entries(teamStructure.stats.team_types).map(([type, count]: [string, any]) => (
                  <div key={type} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <div className="flex items-center">
                      {getTeamTypeIcon(type)}
                      <span className="ml-2 text-sm font-medium">{type.replace('_', ' ')}</span>
                    </div>
                    <span className="text-sm font-semibold">{count} teams</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Network Visualization Placeholder */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 mb-3">Network Overview</h4>
              <div className="bg-gray-50 p-6 rounded-lg text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Interactive network visualization</p>
                <p className="text-xs text-gray-500">Coming in next enhancement</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Departments View */}
      {activeView === 'departments' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Department Structure</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {departments.map((dept) => (
              <div key={dept.type} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    {getTeamTypeIcon(dept.type)}
                    <h4 className="ml-2 text-lg font-semibold text-gray-900">{dept.name}</h4>
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded ${TEAM_TYPE_COLORS[dept.type as keyof typeof TEAM_TYPE_COLORS]}`}>
                    {dept.type.replace('_', ' ')}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{dept.team_count}</p>
                    <p className="text-sm text-gray-600">Teams</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{dept.total_members}</p>
                    <p className="text-sm text-gray-600">Members</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  {dept.teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{team.name}</span>
                      <span className="text-sm text-gray-500">{team.member_count} members</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reporting Structure View */}
      {activeView === 'reporting' && reportingStructure && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Reporting Structure</h3>
          
          <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">{reportingStructure.summary.leadership_count}</p>
              <p className="text-sm text-purple-800">Leadership</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">{reportingStructure.summary.team_leads_count}</p>
              <p className="text-sm text-green-800">Team Leads</p>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{reportingStructure.summary.members_count}</p>
              <p className="text-sm text-blue-800">Members</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-gray-600">{reportingStructure.summary.total_employees}</p>
              <p className="text-sm text-gray-800">Total</p>
            </div>
          </div>
          
          <div className="space-y-6">
            {Object.entries(
              reportingStructure.reporting_structure.reduce((acc: any, person: any) => {
                const level = person.level
                if (!acc[level]) acc[level] = []
                acc[level].push(person)
                return acc
              }, {})
            ).map(([level, people]: [string, any]) => (
              <div key={level}>
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Level {parseInt(level) + 1}: {people[0]?.role.replace('_', ' ').toUpperCase()}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {people.map((person: any) => (
                    <div key={person.id} className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center mb-3">
                        <div className="flex-shrink-0 h-10 w-10">
                          {person.avatar_url ? (
                            <img className="h-10 w-10 rounded-full" src={person.avatar_url} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {person.name.split(' ').map((n: string) => n[0]).join('')}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">{person.name}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(person.role)}`}>
                            {getRoleIcon(person.role)}
                            <span className="ml-1">{person.role.replace('_', ' ')}</span>
                          </span>
                        </div>
                      </div>
                      
                      {person.teams_led.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs font-medium text-gray-500 mb-1">LEADS</p>
                          <div className="space-y-1">
                            {person.teams_led.map((team: any) => (
                              <div key={team.id} className="text-xs text-gray-600">
                                • {team.name} ({team.member_count} members)
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {person.teams_member.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 mb-1">MEMBER OF</p>
                          <div className="space-y-1">
                            {person.teams_member.map((team: any) => (
                              <div key={team.id} className="text-xs text-gray-600">
                                • {team.name} ({team.role})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default HierarchyVisualization