import React, { useState } from 'react'
import { 
  Plus, Search, Users, Crown, Shield, Star, Mail, Phone, 
  Calendar, Clock, BarChart3, Target, Award, Settings,
  MoreVertical, Edit2, UserX, MessageSquare
} from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
  role?: string
  metadata?: {
    department?: string
    skills?: string[]
    hourly_rate?: number
    experience_years?: number
    availability?: string
  }
}

interface TeamMember {
  user_id: string
  role: 'owner' | 'admin' | 'member' | 'viewer'
  joined_at: string
  permissions: string[]
  workload?: number
  utilization?: number
  recent_activity?: string
}

interface EnhancedTeamTabProps {
  project: any
  users: User[]
  teamMembers?: TeamMember[]
  onAddMember?: (userId: string, role: string) => void
  onRemoveMember?: (userId: string) => void
  onUpdateMemberRole?: (userId: string, role: string) => void
}

const EnhancedTeamTab: React.FC<EnhancedTeamTabProps> = ({
  project,
  users,
  teamMembers = [],
  onAddMember,
  onRemoveMember,
  onUpdateMemberRole
}) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddMember, setShowAddMember] = useState(false)
  const [roleFilter, setRoleFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState<string | null>(null)

  // Get team members with user details
  const enrichedTeamMembers = (project.team_members || []).map((memberId: string) => {
    const user = users.find(u => u.id === memberId)
    const memberInfo = teamMembers.find(tm => tm.user_id === memberId) || {
      user_id: memberId,
      role: 'member' as const,
      joined_at: new Date().toISOString(),
      permissions: ['read', 'write'],
      workload: Math.random() * 100,
      utilization: Math.random() * 100,
      recent_activity: `${Math.floor(Math.random() * 24)} hours ago`
    }
    return {
      ...memberInfo,
      user: user || { id: memberId, name: 'Unknown User', email: 'unknown@example.com' }
    }
  })

  const filteredMembers = enrichedTeamMembers.filter(member => {
    if (searchTerm && !member.user.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false
    }
    if (roleFilter !== 'all' && member.role !== roleFilter) {
      return false
    }
    return true
  })

  const availableUsers = users.filter(user => 
    !project.team_members?.includes(user.id) &&
    user.id !== project.owner_id
  )

  const getRoleIcon = (role: string) => {
    const icons = {
      owner: Crown,
      admin: Shield,
      member: Users,
      viewer: Target
    }
    const Icon = icons[role as keyof typeof icons] || Users
    return <Icon className="w-4 h-4" />
  }

  const getRoleColor = (role: string) => {
    const colors = {
      owner: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      admin: 'text-purple-600 bg-purple-50 border-purple-200',
      member: 'text-blue-600 bg-blue-50 border-blue-200',
      viewer: 'text-gray-600 bg-gray-50 border-gray-200'
    }
    return colors[role as keyof typeof colors] || colors.member
  }

  const getUtilizationColor = (utilization: number) => {
    if (utilization > 85) return 'text-red-600 bg-red-50'
    if (utilization > 70) return 'text-yellow-600 bg-yellow-50'
    return 'text-green-600 bg-green-50'
  }

  const formatJoinDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const TeamMemberCard: React.FC<{ member: any; isOwner: boolean }> = ({ member, isOwner }) => (
    <div className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {/* Avatar */}
          <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold text-lg">
            {member.user.name.charAt(0).toUpperCase()}
          </div>
          
          {/* User Info */}
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-semibold text-gray-900">{member.user.name}</h3>
              {isOwner && <Crown className="w-4 h-4 text-yellow-500" />}
              {member.role === 'admin' && <Shield className="w-4 h-4 text-purple-500" />}
            </div>
            <p className="text-sm text-gray-600">{member.user.email}</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className={`inline-flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full border ${getRoleColor(member.role)}`}>
                {getRoleIcon(member.role)}
                <span>{member.role.charAt(0).toUpperCase() + member.role.slice(1)}</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="relative">
          <button 
            onClick={() => setSelectedMember(selectedMember === member.user_id ? null : member.user_id)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
          
          {selectedMember === member.user_id && (
            <div className="absolute right-0 top-10 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-48">
              <div className="p-2">
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Send Message</span>
                </button>
                <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-2">
                  <Edit2 className="w-4 h-4" />
                  <span>Edit Role</span>
                </button>
                {!isOwner && (
                  <button className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 rounded flex items-center space-x-2 text-red-600">
                    <UserX className="w-4 h-4" />
                    <span>Remove from Project</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Skills */}
      {member.user.metadata?.skills && (
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">SKILLS</p>
          <div className="flex flex-wrap gap-1">
            {member.user.metadata.skills.slice(0, 4).map((skill: string) => (
              <span key={skill} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded">
                {skill}
              </span>
            ))}
            {member.user.metadata.skills.length > 4 && (
              <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded">
                +{member.user.metadata.skills.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <div className={`text-sm font-semibold ${getUtilizationColor(member.utilization || 0)}`}>
            {Math.round(member.utilization || 0)}%
          </div>
          <div className="text-xs text-gray-500">Utilization</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">
            {member.user.metadata?.experience_years || 0}Y
          </div>
          <div className="text-xs text-gray-500">Experience</div>
        </div>
        <div className="text-center">
          <div className="text-sm font-semibold text-gray-900">
            ${member.user.metadata?.hourly_rate || 0}
          </div>
          <div className="text-xs text-gray-500">Rate/hr</div>
        </div>
      </div>

      {/* Activity */}
      <div className="pt-4 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Joined {formatJoinDate(member.joined_at)}</span>
          </div>
          <div className="flex items-center space-x-2 text-gray-500">
            <Clock className="w-4 h-4" />
            <span>{member.recent_activity}</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Team Members ({filteredMembers.length})
          </h2>
          <p className="text-gray-600 mt-1">Manage project team and permissions</p>
        </div>
        
        <button
          onClick={() => setShowAddMember(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Member</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search team members..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Roles</option>
            <option value="owner">Owner</option>
            <option value="admin">Admin</option>
            <option value="member">Member</option>
            <option value="viewer">Viewer</option>
          </select>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-gray-900 mb-2">
            {filteredMembers.length}
          </div>
          <div className="text-sm text-gray-600">Total Members</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-green-600 mb-2">
            {Math.round(filteredMembers.reduce((sum, m) => sum + (m.utilization || 0), 0) / filteredMembers.length || 0)}%
          </div>
          <div className="text-sm text-gray-600">Avg Utilization</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-blue-600 mb-2">
            {filteredMembers.filter(m => (m.utilization || 0) < 70).length}
          </div>
          <div className="text-sm text-gray-600">Available</div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6 text-center">
          <div className="text-2xl font-bold text-purple-600 mb-2">
            {filteredMembers.reduce((sum, m) => sum + (m.user.metadata?.experience_years || 0), 0)}
          </div>
          <div className="text-sm text-gray-600">Total Years Exp</div>
        </div>
      </div>

      {/* Team Members Grid */}
      {filteredMembers.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredMembers.map(member => (
            <TeamMemberCard
              key={member.user_id}
              member={member}
              isOwner={member.user_id === project.owner_id}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
          <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No team members found</h3>
          <p className="text-gray-600 mb-6">
            {searchTerm || roleFilter !== 'all'
              ? 'Try adjusting your search criteria'
              : 'Add team members to start collaborating'}
          </p>
          <button
            onClick={() => setShowAddMember(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Add First Member
          </button>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Team Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select User
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="">Choose a user...</option>
                  {availableUsers.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <select className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={() => setShowAddMember(false)}
                  className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
                  Add Member
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedTeamTab