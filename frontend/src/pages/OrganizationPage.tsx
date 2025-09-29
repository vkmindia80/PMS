import React, { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import RoleManagement from '../components/organization/RoleManagement'
import HierarchyVisualization from '../components/organization/HierarchyVisualization'
import InviteMembersModal from '../components/organization/InviteMembersModal'
import { 
  Building2, Users, Settings, Plus, Search, Filter,
  MoreVertical, Edit, Trash2, UserPlus, Shield, 
  Award, Clock, TrendingUp, MapPin, BarChart3
} from 'lucide-react'
import toast from 'react-hot-toast'

interface Organization {
  id: string
  name: string
  slug: string
  description?: string
  type: string
  status: string
  website?: string
  email?: string
  phone?: string
  industry?: string
  size?: string
  founded_year?: number
  member_count: number
  project_count: number
  settings?: {
    logo_url?: string
    primary_color?: string
    timezone?: string
    currency?: string
  }
  created_at: string
}

interface OrganizationMember {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
  status: string
  avatar_url?: string
  last_login?: string
  created_at: string
}

interface OrganizationStats {
  organization_id: string
  member_count: number
  team_count: number
  project_count: number
  active_members: number
  roles_distribution: Record<string, number>
}

const OrganizationPage: React.FC = () => {
  const { user, tokens } = useAuth()
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [stats, setStats] = useState<OrganizationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'roles' | 'hierarchy' | 'settings'>('overview')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  
  // Get API URL consistently
  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://milestone-planner.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const API_URL = getApiUrl()

  useEffect(() => {
    if (user?.organization_id) {
      fetchOrganizationData()
    } else {
      setLoading(false)
    }
  }, [user])

  const fetchOrganizationData = async () => {
    try {
      setLoading(true)
      
      // Fetch organization details
      const orgResponse = await fetch(`${API_URL}/api/organizations/${user?.organization_id}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (orgResponse.ok) {
        const orgData = await orgResponse.json()
        setOrganization(orgData)
        
        // Fetch members
        const membersResponse = await fetch(`${API_URL}/api/organizations/${user?.organization_id}/members`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (membersResponse.ok) {
          const membersData = await membersResponse.json()
          setMembers(membersData)
        }
        
        // Fetch stats
        const statsResponse = await fetch(`${API_URL}/api/organizations/${user?.organization_id}/stats`, {
          headers: {
            'Authorization': `Bearer ${tokens?.access_token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (statsResponse.ok) {
          const statsData = await statsResponse.json()
          setStats(statsData)
        }
      }
    } catch (error) {
      console.error('Error fetching organization data:', error)
      toast.error('Failed to load organization data')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateOrganization = async (formData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/organizations/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          owner_id: user?.id
        }),
      })
      
      if (response.ok) {
        toast.success('Organization created successfully!')
        setShowCreateForm(false)
        fetchOrganizationData()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to create organization')
      }
    } catch (error) {
      toast.error('Failed to create organization')
    }
  }

  const handleUpdateOrganization = async (formData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/organizations/${organization?.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })
      
      if (response.ok) {
        toast.success('Organization updated successfully!')
        setShowEditForm(false)
        fetchOrganizationData()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to update organization')
      }
    } catch (error) {
      toast.error('Failed to update organization')
    }
  }

  const getRoleColor = (role: string) => {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'admin': 'bg-red-100 text-red-800',
      'manager': 'bg-blue-100 text-blue-800',
      'team_lead': 'bg-green-100 text-green-800',
      'member': 'bg-gray-100 text-gray-800',
      'viewer': 'bg-yellow-100 text-yellow-800'
    }
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'active': 'bg-green-100 text-green-800',
      'inactive': 'bg-gray-100 text-gray-800',
      'trial': 'bg-blue-100 text-blue-800',
      'suspended': 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  const filteredMembers = members.filter(member =>
    member.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.username.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading organization data...</p>
        </div>
      </div>
    )
  }

  // No organization - show create form
  if (!organization && !showCreateForm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8 text-center">
          <Building2 className="h-16 w-16 text-primary-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-4">No Organization</h2>
          <p className="text-gray-600 mb-6">
            You don't belong to an organization yet. Create one to get started with team collaboration.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="btn-primary w-full"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create Organization
          </button>
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
                <Building2 className="h-8 w-8 text-primary-600 mr-3" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {organization?.name || 'Create Organization'}
                  </h1>
                  <p className="text-gray-600">
                    {organization?.description || 'Set up your organization'}
                  </p>
                </div>
              </div>
              
              {organization && (
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowEditForm(true)}
                    className="btn-outline"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Invite Members
                  </button>
                </div>
              )}
            </div>
            
            {organization && (
              <div className="mt-6">
                <nav className="flex space-x-8">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'overview'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('members')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'members'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Members ({members.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('roles')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'roles'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Role Management
                  </button>
                  <button
                    onClick={() => setActiveTab('hierarchy')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'hierarchy'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <MapPin className="h-4 w-4 mr-1 inline" />
                    Organization Chart
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'settings'
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    Settings
                  </button>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Create Organization Form */}
        {showCreateForm && (
          <CreateOrganizationForm
            onSubmit={handleCreateOrganization}
            onCancel={() => setShowCreateForm(false)}
          />
        )}

        {/* Edit Organization Form */}
        {showEditForm && organization && (
          <EditOrganizationForm
            organization={organization}
            onSubmit={handleUpdateOrganization}
            onCancel={() => setShowEditForm(false)}
          />
        )}

        {/* Organization Content */}
        {organization && !showCreateForm && !showEditForm && (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Total Members</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats?.member_count || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Shield className="h-8 w-8 text-green-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Teams</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats?.team_count || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Award className="h-8 w-8 text-purple-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Projects</p>
                        <p className="text-2xl font-semibold text-gray-900">{stats?.project_count || 0}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-8 w-8 text-yellow-600" />
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-500">Status</p>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(organization.status)}`}>
                          {organization.status}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Organization Info */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">Organization Information</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Name</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Type</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.type?.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Industry</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.industry || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Size</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.size || 'Not specified'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Website</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {organization.website ? (
                            <a href={organization.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-500">
                              {organization.website}
                            </a>
                          ) : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Contact Email</label>
                        <p className="mt-1 text-sm text-gray-900">{organization.email || 'Not specified'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Members Tab */}
            {activeTab === 'members' && (
              <div className="space-y-6">
                {/* Search and Filter */}
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center space-x-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search members..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                      </div>
                    </div>
                    <button 
                      className="btn-primary"
                      onClick={() => setShowInviteModal(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite Member
                    </button>
                  </div>
                </div>

                {/* Members List */}
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-gray-900">
                      Members ({filteredMembers.length})
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Member
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th className="relative px-6 py-3">
                            <span className="sr-only">Actions</span>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredMembers.map((member) => (
                          <tr key={member.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="flex-shrink-0 h-10 w-10">
                                  {member.avatar_url ? (
                                    <img className="h-10 w-10 rounded-full" src={member.avatar_url} alt="" />
                                  ) : (
                                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                      <span className="text-sm font-medium text-gray-600">
                                        {member.first_name.charAt(0)}{member.last_name.charAt(0)}
                                      </span>
                                    </div>
                                  )}
                                </div>
                                <div className="ml-4">
                                  <div className="text-sm font-medium text-gray-900">
                                    {member.first_name} {member.last_name}
                                  </div>
                                  <div className="text-sm text-gray-500">{member.email}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(member.role)}`}>
                                {member.role.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(member.status)}`}>
                                {member.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {member.last_login ? (
                                new Date(member.last_login).toLocaleDateString()
                              ) : (
                                'Never'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button className="text-gray-400 hover:text-gray-600">
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Role Management Tab */}
            {activeTab === 'roles' && (
              <RoleManagement />
            )}

            {/* Hierarchy Visualization Tab */}
            {activeTab === 'hierarchy' && (
              <HierarchyVisualization />
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Organization Settings</h3>
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
                      <p className="text-blue-700">
                        <strong>Comprehensive Settings Available:</strong> Visit the main Settings page for complete
                        organization configuration, user preferences, notifications, and security settings.
                      </p>
                      <button
                        onClick={() => window.location.href = '/settings'}
                        className="mt-3 btn-primary btn-sm"
                      >
                        Open Settings Page
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-4 border border-gray-200 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">Current Organization</h4>
                        <p className="text-sm text-gray-600 mb-2">{organization?.name}</p>
                        <p className="text-xs text-gray-500">{organization?.type} • {organization?.industry}</p>
                      </div>
                      
                      <div className="p-4 border border-gray-200 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">Member Count</h4>
                        <p className="text-sm text-gray-600 mb-2">{stats?.member_count || 0} active members</p>
                        <p className="text-xs text-gray-500">Across {stats?.team_count || 0} teams</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Members Modal */}
      <InviteMembersModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        organizationId={organization?.id}
        onMembersInvited={() => {
          setShowInviteModal(false)
          // Refresh members list
          if (organization) {
            fetchMembers(organization.id)
          }
        }}
      />
    </div>
  )
}

// Create Organization Form Component
const CreateOrganizationForm: React.FC<{
  onSubmit: (data: any) => void
  onCancel: () => void
}> = ({ onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    type: 'small_business',
    website: '',
    email: '',
    phone: '',
    industry: '',
    size: '',
    founded_year: new Date().getFullYear()
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const generateSlug = (name: string) => {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Create Organization</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({
                ...formData,
                name: e.target.value,
                slug: generateSlug(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug *
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="startup">Startup</option>
              <option value="small_business">Small Business</option>
              <option value="medium_enterprise">Medium Enterprise</option>
              <option value="large_enterprise">Large Enterprise</option>
              <option value="non_profit">Non Profit</option>
              <option value="government">Government</option>
              <option value="education">Education</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            Create Organization
          </button>
        </div>
      </form>
    </div>
  )
}

// Edit Organization Form Component
const EditOrganizationForm: React.FC<{
  organization: Organization
  onSubmit: (data: any) => void
  onCancel: () => void
}> = ({ organization, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: organization.name,
    description: organization.description || '',
    type: organization.type,
    website: organization.website || '',
    email: organization.email || '',
    phone: organization.phone || '',
    industry: organization.industry || '',
    size: organization.size || '',
    founded_year: organization.founded_year || new Date().getFullYear()
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Edit Organization</h3>
      </div>
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="startup">Startup</option>
              <option value="small_business">Small Business</option>
              <option value="medium_enterprise">Medium Enterprise</option>
              <option value="large_enterprise">Large Enterprise</option>
              <option value="non_profit">Non Profit</option>
              <option value="government">Government</option>
              <option value="education">Education</option>
            </select>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Industry
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Size
            </label>
            <input
              type="text"
              value={formData.size}
              onChange={(e) => setFormData({ ...formData, size: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., 10-50 employees"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => setFormData({ ...formData, website: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-outline"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-primary"
          >
            Update Organization
          </button>
        </div>
      </form>
    </div>
  )
}

export default OrganizationPage