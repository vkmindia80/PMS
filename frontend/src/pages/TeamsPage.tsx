import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import {
  Users, Plus, Search, Filter, MoreVertical, Edit, Trash2,
  UserPlus, UserMinus, Settings, Star, Clock, Award,
  Briefcase, Code, Palette, TrendingUp, Shield, Target, BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'
import SkillsOverviewModal from '../components/SkillsOverviewModal'

interface TeamMember {
  user_id: string
  role: 'lead' | 'senior' | 'regular' | 'junior' | 'intern'
  joined_at?: string
  responsibilities: string[]
  skills: string[]
  user?: {
    id: string
    first_name: string
    last_name: string
    email: string
    avatar_url?: string
  }
}

interface Team {
  id: string
  name: string
  description?: string
  type: string
  organization_id: string
  lead_id?: string
  members: TeamMember[]
  tags: string[]
  is_active: boolean
  member_count: number
  active_project_count: number
  created_at: string
}

interface TeamStats {
  team_id: string
  total_members: number
  active_members: number
  total_projects: number
  active_projects: number
  completed_projects: number
  total_tasks: number
  completed_tasks: number
  task_completion_rate: number
}

interface User {
  id: string
  first_name: string
  last_name: string
  email: string
  username: string
  role: string
  avatar_url?: string
}

const TeamsPage: React.FC = () => {
  const { user, tokens } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState<Team | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [teamStats, setTeamStats] = useState<TeamStats | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('')
  const [organizationMembers, setOrganizationMembers] = useState<User[]>([])
  const [skillsOverview, setSkillsOverview] = useState<any>(null)
  const [showSkillsModal, setShowSkillsModal] = useState(false)

  // Get API URL consistently
  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://next-steps-74.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const API_URL = getApiUrl()

  useEffect(() => {
    if (user?.organization_id) {
      fetchTeams()
      fetchOrganizationMembers()
      fetchSkillsOverview()
    }
  }, [user])

  const fetchTeams = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/api/teams/?organization_id=${user?.organization_id}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setTeams(data)
      }
    } catch (error) {
      console.error('Error fetching teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  const fetchOrganizationMembers = async () => {
    try {
      const response = await fetch(`${API_URL}/api/organizations/${user?.organization_id}/members`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setOrganizationMembers(data)
      }
    } catch (error) {
      console.error('Error fetching organization members:', error)
    }
  }

  const fetchSkillsOverview = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/skills/overview`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setSkillsOverview(data)
      }
    } catch (error) {
      console.error('Error fetching skills overview:', error)
    }
  }

  const fetchTeamDetails = async (teamId: string) => {
    try {
      const [teamResponse, statsResponse] = await Promise.all([
        fetch(`${API_URL}/api/teams/${teamId}`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        }),
        fetch(`${API_URL}/api/teams/${teamId}/stats`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      ])

      if (teamResponse.ok) {
        const teamData = await teamResponse.json()
        // Populate member user details
        const populatedMembers = teamData.members.map((member: TeamMember) => ({
          ...member,
          user: organizationMembers.find(u => u.id === member.user_id)
        }))
        setSelectedTeam({ ...teamData, members: populatedMembers })
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setTeamStats(statsData)
      }
    } catch (error) {
      console.error('Error fetching team details:', error)
      toast.error('Failed to load team details')
    }
  }

  const handleCreateTeam = async (formData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/teams/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          organization_id: user?.organization_id
        }),
      })

      if (response.ok) {
        toast.success('Team created successfully!')
        setShowCreateForm(false)
        fetchTeams()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to create team')
      }
    } catch (error) {
      toast.error('Failed to create team')
    }
  }

  const handleUpdateTeam = async (teamId: string, formData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast.success('Team updated successfully!')
        setShowEditForm(null)
        fetchTeams()
        if (selectedTeam?.id === teamId) {
          fetchTeamDetails(teamId)
        }
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to update team')
      }
    } catch (error) {
      toast.error('Failed to update team')
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return

    try {
      const response = await fetch(`${API_URL}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast.success('Team deleted successfully!')
        fetchTeams()
        if (selectedTeam?.id === teamId) {
          setSelectedTeam(null)
        }
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to delete team')
      }
    } catch (error) {
      toast.error('Failed to delete team')
    }
  }

  const handleAddMember = async (teamId: string, memberData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(memberData),
      })

      if (response.ok) {
        toast.success('Member added successfully!')
        fetchTeams()
        fetchTeamDetails(teamId)
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to add member')
      }
    } catch (error) {
      toast.error('Failed to add member')
    }
  }

  const handleRemoveMember = async (teamId: string, userId: string) => {
    if (!confirm('Are you sure you want to remove this member?')) return

    try {
      const response = await fetch(`${API_URL}/api/teams/${teamId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        toast.success('Member removed successfully!')
        fetchTeams()
        fetchTeamDetails(teamId)
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to remove member')
      }
    } catch (error) {
      toast.error('Failed to remove member')
    }
  }

  const getTeamTypeIcon = (type: string) => {
    const icons = {
      development: Code,
      design: Palette,
      marketing: TrendingUp,
      sales: Target,
      support: Shield,
      operations: Settings,
      management: Briefcase,
      cross_functional: Users
    }
    const Icon = icons[type as keyof typeof icons] || Users
    return <Icon className="h-5 w-5" />
  }

  const getTeamTypeColor = (type: string) => {
    const colors = {
      development: 'bg-blue-100 text-blue-800',
      design: 'bg-purple-100 text-purple-800',
      marketing: 'bg-green-100 text-green-800',
      sales: 'bg-yellow-100 text-yellow-800',
      support: 'bg-red-100 text-red-800',
      operations: 'bg-gray-100 text-gray-800',
      management: 'bg-indigo-100 text-indigo-800',
      cross_functional: 'bg-pink-100 text-pink-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getRoleColor = (role: string) => {
    const colors = {
      lead: 'bg-red-100 text-red-800',
      senior: 'bg-blue-100 text-blue-800',
      regular: 'bg-green-100 text-green-800',
      junior: 'bg-yellow-100 text-yellow-800',
      intern: 'bg-gray-100 text-gray-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const filteredTeams = teams.filter(team => {
    const matchesSearch = team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         team.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    
    const matchesFilter = !filterType || team.type === filterType
    
    return matchesSearch && matchesFilter
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading teams...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Teams</h1>
                  <p className="text-gray-600">Manage your organization's teams and members</p>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowSkillsModal(true)}
                  className="btn-outline"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Skills Overview
                </button>
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="btn-primary"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Team
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Teams List */}
          <div className="flex-1">
            {/* Search and Filter */}
            <div className="bg-white rounded-lg shadow mb-6 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search teams..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">All Types</option>
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="marketing">Marketing</option>
                    <option value="sales">Sales</option>
                    <option value="support">Support</option>
                    <option value="operations">Operations</option>
                    <option value="management">Management</option>
                    <option value="cross_functional">Cross Functional</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredTeams.map((team) => (
                <div
                  key={team.id}
                  className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-2 ${
                    selectedTeam?.id === team.id ? 'border-primary-500' : 'border-transparent'
                  }`}
                  onClick={() => fetchTeamDetails(team.id)}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        {getTeamTypeIcon(team.type)}
                        <h3 className="ml-2 text-lg font-semibold text-gray-900">{team.name}</h3>
                      </div>
                      <div className="relative">
                        <button 
                          className="text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            // Handle dropdown menu
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mt-2 line-clamp-2">
                      {team.description || 'No description provided'}
                    </p>
                    
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTeamTypeColor(team.type)}`}>
                        {team.type.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {team.member_count} members
                      </span>
                    </div>
                    
                    {team.tags.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {team.tags.slice(0, 3).map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                        {team.tags.length > 3 && (
                          <span className="text-xs text-gray-400">+{team.tags.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {filteredTeams.length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No teams found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || filterType ? 'No teams match your search criteria.' : 'Create your first team to get started.'}
                </p>
                {!searchTerm && !filterType && (
                  <button
                    onClick={() => setShowCreateForm(true)}
                    className="btn-primary"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Team
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Team Details Sidebar */}
          {selectedTeam && (
            <div className="w-full lg:w-96">
              <TeamDetailsPanel
                team={selectedTeam}
                stats={teamStats}
                onEdit={() => setShowEditForm(selectedTeam)}
                onDelete={() => handleDeleteTeam(selectedTeam.id)}
                onAddMember={(memberData) => handleAddMember(selectedTeam.id, memberData)}
                onRemoveMember={(userId) => handleRemoveMember(selectedTeam.id, userId)}
                availableMembers={organizationMembers}
                currentUser={user}
              />
            </div>
          )}
        </div>
      </div>

      {/* Create Team Modal */}
      {showCreateForm && (
        <CreateTeamModal
          onSubmit={handleCreateTeam}
          onClose={() => setShowCreateForm(false)}
          availableMembers={organizationMembers}
        />
      )}

      {/* Edit Team Modal */}
      {showEditForm && (
        <EditTeamModal
          team={showEditForm}
          onSubmit={(formData) => handleUpdateTeam(showEditForm.id, formData)}
          onClose={() => setShowEditForm(null)}
          availableMembers={organizationMembers}
        />
      )}

      {/* Skills Overview Modal */}
      {showSkillsModal && skillsOverview && (
        <SkillsOverviewModal
          skillsData={skillsOverview}
          onClose={() => setShowSkillsModal(false)}
        />
      )}
    </div>
  )
}

// Team Details Panel Component
const TeamDetailsPanel: React.FC<{
  team: Team
  stats: TeamStats | null
  onEdit: () => void
  onDelete: () => void
  onAddMember: (memberData: any) => void
  onRemoveMember: (userId: string) => void
  availableMembers: User[]
  currentUser: any
}> = ({ team, stats, onEdit, onDelete, onAddMember, onRemoveMember, availableMembers, currentUser }) => {
  const [showAddMember, setShowAddMember] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  const [memberRole, setMemberRole] = useState('regular')
  const [memberSkills, setMemberSkills] = useState('')
  const [memberResponsibilities, setMemberResponsibilities] = useState('')

  const getTeamTypeIcon = (type: string) => {
    const icons = {
      development: Code,
      design: Palette,
      marketing: TrendingUp,
      sales: Target,
      support: Shield,
      operations: Settings,
      management: Briefcase,
      cross_functional: Users
    }
    const Icon = icons[type as keyof typeof icons] || Users
    return <Icon className="h-5 w-5" />
  }

  const getRoleColor = (role: string) => {
    const colors = {
      lead: 'bg-red-100 text-red-800',
      senior: 'bg-blue-100 text-blue-800',
      regular: 'bg-green-100 text-green-800',
      junior: 'bg-yellow-100 text-yellow-800',
      intern: 'bg-gray-100 text-gray-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const handleAddMember = () => {
    if (!selectedUserId) return

    const skills = memberSkills.split(',').map(s => s.trim()).filter(s => s)
    const responsibilities = memberResponsibilities.split(',').map(r => r.trim()).filter(r => r)

    onAddMember({
      user_id: selectedUserId,
      role: memberRole,
      skills,
      responsibilities
    })

    setSelectedUserId('')
    setMemberRole('regular')
    setMemberSkills('')
    setMemberResponsibilities('')
    setShowAddMember(false)
  }

  const availableMembersForAdd = availableMembers.filter(
    member => !team.members.some(teamMember => teamMember.user_id === member.id)
  )

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            {getTeamTypeIcon(team.type)}
            <div className="ml-3">
              <h2 className="text-lg font-semibold text-gray-900">{team.name}</h2>
              <p className="text-sm text-gray-600">{team.type.replace('_', ' ')}</p>
            </div>
          </div>
          <div className="flex space-x-2">
            <button onClick={onEdit} className="text-gray-400 hover:text-gray-600">
              <Edit className="h-4 w-4" />
            </button>
            <button onClick={onDelete} className="text-gray-400 hover:text-red-600">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {team.description && (
          <p className="mt-2 text-sm text-gray-600">{team.description}</p>
        )}

        {team.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {team.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Stats */}
      {stats && (
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Team Statistics</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.total_members}</p>
              <p className="text-sm text-gray-600">Total Members</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-gray-900">{stats.active_projects}</p>
              <p className="text-sm text-gray-600">Active Projects</p>
            </div>
          </div>
        </div>
      )}

      {/* Members */}
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-gray-900">Members ({team.members.length})</h3>
          <button
            onClick={() => setShowAddMember(true)}
            className="text-primary-600 hover:text-primary-700 text-sm flex items-center"
          >
            <UserPlus className="h-4 w-4 mr-1" />
            Add Member
          </button>
        </div>

        <div className="space-y-3">
          {team.members.map((member) => (
            <div key={member.user_id} className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-8 w-8">
                  {member.user?.avatar_url ? (
                    <img className="h-8 w-8 rounded-full" src={member.user.avatar_url} alt="" />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-xs font-medium text-gray-600">
                        {member.user?.first_name?.charAt(0)}{member.user?.last_name?.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    {member.user?.first_name} {member.user?.last_name}
                  </p>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    {team.lead_id === member.user_id && (
                      <Star className="h-3 w-3 text-yellow-500" />
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemoveMember(member.user_id)}
                className="text-gray-400 hover:text-red-600"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Member Form */}
        {showAddMember && (
          <div className="mt-4 p-4 border border-gray-200 rounded-lg">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Add Team Member</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Select Member
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a member...</option>
                  {availableMembersForAdd.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  value={memberRole}
                  onChange={(e) => setMemberRole(e.target.value)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="intern">Intern</option>
                  <option value="junior">Junior</option>
                  <option value="regular">Regular</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Skills (comma-separated)
                </label>
                <input
                  type="text"
                  value={memberSkills}
                  onChange={(e) => setMemberSkills(e.target.value)}
                  placeholder="React, TypeScript, Node.js"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Responsibilities (comma-separated)
                </label>
                <input
                  type="text"
                  value={memberResponsibilities}
                  onChange={(e) => setMemberResponsibilities(e.target.value)}
                  placeholder="Frontend development, Code reviews"
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-3">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="px-3 py-1 text-sm bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Create Team Modal Component (placeholder - would need full implementation)
const CreateTeamModal: React.FC<{
  onSubmit: (data: any) => void
  onClose: () => void
  availableMembers: User[]
}> = ({ onSubmit, onClose, availableMembers }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'cross_functional',
    lead_id: '',
    tags: '',
    members: [] as any[]
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      ...formData,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      members: formData.members
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create New Team</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="cross_functional">Cross Functional</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
                <option value="sales">Sales</option>
                <option value="support">Support</option>
                <option value="operations">Operations</option>
                <option value="management">Management</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Team Lead</label>
              <select
                value={formData.lead_id}
                onChange={(e) => setFormData({ ...formData, lead_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select team lead...</option>
                {availableMembers.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.first_name} {member.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tags (comma-separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="frontend, react, ui-ux"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button type="button" onClick={onClose} className="btn-outline">
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Create Team
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Edit Team Modal Component (placeholder)
const EditTeamModal: React.FC<{
  team: Team
  onSubmit: (data: any) => void
  onClose: () => void
  availableMembers: User[]
}> = ({ team, onSubmit, onClose, availableMembers }) => {
  // Implementation similar to CreateTeamModal but with pre-filled data
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900">Edit Team</h2>
          <p className="text-gray-600 mt-2">Edit form implementation coming soon...</p>
          <button onClick={onClose} className="mt-4 btn-outline">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default TeamsPage