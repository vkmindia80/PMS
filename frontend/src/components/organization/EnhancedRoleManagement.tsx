import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Shield, Crown, UserCog, Users, Eye, Settings, Plus, Edit, Trash2,
  ChevronDown, Check, X, AlertTriangle, Search, Filter, Download,
  Upload, Copy, Info, Lock, Unlock
} from 'lucide-react'
import toast from 'react-hot-toast'
import { API_URL } from '../../utils/config'

// Types for System Roles
interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
  status: string
  avatar_url?: string
  created_at: string
  organization_id: string
}

// Types for Custom Roles
interface Permission {
  name: string
  display_name: string
  description: string
  category: string
}

interface CustomRole {
  id: string
  name: string
  display_name: string
  description?: string
  permissions: string[]
  organization_id: string
  is_active: boolean
  user_count: number
  role_type: 'system' | 'custom' | 'template'
  created_at: string
  updated_at: string
}

interface RoleTemplate {
  name: string
  display_name: string
  description: string
  permissions: string[]
  industry: string
  department?: string
}

interface RoleDistribution {
  organization_id: string
  total_users: number
  roles_distribution: Record<string, number>
}

// System Role Hierarchy
const SYSTEM_ROLE_HIERARCHY = {
  super_admin: { level: 0, label: 'Super Admin', color: 'purple', icon: Crown },
  admin: { level: 1, label: 'Admin', color: 'red', icon: Shield },
  manager: { level: 2, label: 'Manager', color: 'blue', icon: UserCog },
  team_lead: { level: 3, label: 'Team Lead', color: 'green', icon: Users },
  member: { level: 4, label: 'Member', color: 'gray', icon: Users },
  viewer: { level: 5, label: 'Viewer', color: 'yellow', icon: Eye }
}

const SYSTEM_ROLE_PERMISSIONS = {
  super_admin: ['All system permissions', 'Cross-organization access', 'System configuration'],
  admin: ['Organization management', 'User management', 'All organization features'],
  manager: ['Team management', 'Project oversight', 'User role assignments'],
  team_lead: ['Team leadership', 'Task assignments', 'Team member management'],
  member: ['Project participation', 'Task management', 'Team collaboration'],
  viewer: ['Read-only access', 'View projects and teams', 'Basic reporting']
}

const EnhancedRoleManagement: React.FC = () => {
  const { user, tokens } = useAuth()
  const [activeTab, setActiveTab] = useState<'system' | 'custom' | 'assignments'>('system')
  
  // System roles state
  const [users, setUsers] = useState<User[]>([])
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution | null>(null)
  
  // Custom roles state
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([])
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({})
  const [templates, setTemplates] = useState<RoleTemplate[]>([])
  
  // UI state
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  
  // Modals
  const [showSystemRoleModal, setShowSystemRoleModal] = useState(false)
  const [showCustomRoleModal, setShowCustomRoleModal] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showPermissionModal, setShowPermissionModal] = useState(false)
  
  // Selected items
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedCustomRole, setSelectedCustomRole] = useState<CustomRole | null>(null)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [newSystemRole, setNewSystemRole] = useState('')
  
  // New custom role form
  const [newCustomRole, setNewCustomRole] = useState({
    name: '',
    display_name: '',
    description: '',
    permissions: [] as string[],
    template: ''
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([
      fetchUsers(),
      fetchRoleDistribution(),
      fetchCustomRoles(),
      fetchPermissions(),
      fetchTemplates()
    ])
    setLoading(false)
  }

  // Fetch system roles data
  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (roleFilter) params.append('role', roleFilter)
      if (statusFilter) params.append('status', statusFilter)
      params.append('limit', '100')

      const response = await fetch(`${API_URL}/api/users/?${params}`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data)
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }

  const fetchRoleDistribution = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/roles/distribution`, {
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRoleDistribution(data)
      }
    } catch (error) {
      console.error('Error fetching role distribution:', error)
    }
  }

  // Fetch custom roles data
  const fetchCustomRoles = async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles`, {
        headers: { 'Authorization': `Bearer ${tokens?.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setCustomRoles(data)
      }
    } catch (error) {
      console.error('Error fetching custom roles:', error)
    }
  }

  const fetchPermissions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles/permissions`, {
        headers: { 'Authorization': `Bearer ${tokens?.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setPermissions(data)
      }
    } catch (error) {
      console.error('Error fetching permissions:', error)
    }
  }

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/roles/templates`, {
        headers: { 'Authorization': `Bearer ${tokens?.access_token}` }
      })
      if (response.ok) {
        const data = await response.json()
        setTemplates(data)
      }
    } catch (error) {
      console.error('Error fetching templates:', error)
    }
  }

  // System role management functions
  const handleSystemRoleChange = async () => {
    if (!selectedUser || !newSystemRole) return

    try {
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newSystemRole }),
      })

      if (response.ok) {
        toast.success('System role updated successfully!')
        setShowSystemRoleModal(false)
        setSelectedUser(null)
        setNewSystemRole('')
        fetchUsers()
        fetchRoleDistribution()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to update role')
      }
    } catch (error) {
      toast.error('Failed to update role')
    }
  }

  // Custom role management functions
  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const roleData = {
        name: newCustomRole.name.toLowerCase().replace(/\s+/g, '_'),
        display_name: newCustomRole.display_name,
        description: newCustomRole.description,
        permissions: newCustomRole.permissions,
        organization_id: user?.organization_id || 'demo-org-001'
      }

      const response = await fetch(`${API_URL}/api/roles/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.access_token}`
        },
        body: JSON.stringify(roleData)
      })

      if (response.ok) {
        toast.success('Custom role created successfully')
        setShowCustomRoleModal(false)
        setNewCustomRole({ name: '', display_name: '', description: '', permissions: [], template: '' })
        fetchCustomRoles()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to create role')
      }
    } catch (error) {
      console.error('Error creating role:', error)
      toast.error('Failed to create role')
    }
  }

  const handleDeleteCustomRole = async (roleId: string) => {
    if (!confirm('Are you sure you want to delete this custom role?')) return

    try {
      const response = await fetch(`${API_URL}/api/roles/${roleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${tokens?.access_token}` }
      })

      if (response.ok) {
        toast.success('Custom role deleted successfully')
        fetchCustomRoles()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to delete role')
      }
    } catch (error) {
      console.error('Error deleting role:', error)
      toast.error('Failed to delete role')
    }
  }

  const handleAssignCustomRole = async () => {
    if (!selectedCustomRole || selectedUsers.length === 0) return

    try {
      const assignmentData = {
        user_ids: selectedUsers,
        role_id: selectedCustomRole.id,
        organization_id: user?.organization_id || 'demo-org-001',
        notes: `Bulk assignment of ${selectedCustomRole.display_name} role`
      }

      const response = await fetch(`${API_URL}/api/roles/bulk-assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens?.access_token}`
        },
        body: JSON.stringify(assignmentData)
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`${result.new_assignments} users assigned to role`)
        setShowAssignModal(false)
        setSelectedUsers([])
        fetchCustomRoles()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to assign role')
      }
    } catch (error) {
      console.error('Error assigning role:', error)
      toast.error('Failed to assign role')
    }
  }

  // Apply template to new role
  const applyTemplate = (templateName: string) => {
    const template = templates.find(t => t.name === templateName)
    if (template) {
      setNewCustomRole({
        ...newCustomRole,
        name: template.name,
        display_name: template.display_name,
        description: template.description,
        permissions: template.permissions,
        template: templateName
      })
    }
  }

  // Toggle permission for custom role
  const togglePermission = (permissionName: string) => {
    const currentPermissions = newCustomRole.permissions
    if (currentPermissions.includes(permissionName)) {
      setNewCustomRole({
        ...newCustomRole,
        permissions: currentPermissions.filter(p => p !== permissionName)
      })
    } else {
      setNewCustomRole({
        ...newCustomRole,
        permissions: [...currentPermissions, permissionName]
      })
    }
  }

  // Utility functions
  const getRoleIcon = (role: string) => {
    const roleInfo = SYSTEM_ROLE_HIERARCHY[role as keyof typeof SYSTEM_ROLE_HIERARCHY]
    const Icon = roleInfo?.icon || Users
    return <Icon className="h-4 w-4" />
  }

  const getRoleColor = (role: string) => {
    const roleInfo = SYSTEM_ROLE_HIERARCHY[role as keyof typeof SYSTEM_ROLE_HIERARCHY]
    const color = roleInfo?.color || 'gray'
    
    const colors = {
      purple: 'bg-purple-100 text-purple-800',
      red: 'bg-red-100 text-red-800',
      blue: 'bg-blue-100 text-blue-800',
      green: 'bg-green-100 text-green-800',
      gray: 'bg-gray-100 text-gray-800',
      yellow: 'bg-yellow-100 text-yellow-800'
    }
    
    return colors[color as keyof typeof colors] || colors.gray
  }

  const getStatusColor = (status: string) => {
    const colors = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      suspended: 'bg-red-100 text-red-800'
    }
    return colors[status as keyof typeof colors] || colors.active
  }

  const canEditRole = (targetRole: string) => {
    if (!user) return false
    
    const userLevel = SYSTEM_ROLE_HIERARCHY[user.role as keyof typeof SYSTEM_ROLE_HIERARCHY]?.level || 5
    const targetLevel = SYSTEM_ROLE_HIERARCHY[targetRole as keyof typeof SYSTEM_ROLE_HIERARCHY]?.level || 5
    
    return userLevel <= targetLevel && user.role !== 'viewer'
  }

  const filteredUsers = users.filter(u => 
    u.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6" data-testid="enhanced-role-management">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Role Management</h2>
          <p className="text-gray-600">Manage system roles and create custom roles with granular permissions</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowCustomRoleModal(true)}
            className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            data-testid="create-custom-role-button"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Combined Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold text-gray-900">{roleDistribution?.total_users || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Shield className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">System Roles</p>
              <p className="text-2xl font-semibold text-gray-900">{Object.keys(SYSTEM_ROLE_HIERARCHY).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Settings className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Custom Roles</p>
              <p className="text-2xl font-semibold text-gray-900">{customRoles.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Check className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Permissions</p>
              <p className="text-2xl font-semibold text-gray-900">
                {Object.values(permissions).reduce((acc, perms) => acc + perms.length, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'system'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            System Roles
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'custom'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Custom Roles ({customRoles.length})
          </button>
          <button
            onClick={() => setActiveTab('assignments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'assignments'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Role Assignments
          </button>
        </nav>
      </div>

      {/* System Roles Tab */}
      {activeTab === 'system' && (
        <div className="space-y-6">
          {/* Role Distribution */}
          {roleDistribution && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">System Role Distribution</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {Object.entries(roleDistribution.roles_distribution).map(([role, count]) => {
                  const roleInfo = SYSTEM_ROLE_HIERARCHY[role as keyof typeof SYSTEM_ROLE_HIERARCHY]
                  const Icon = roleInfo?.icon || Users
                  const percentage = ((count / roleDistribution.total_users) * 100).toFixed(1)
                  
                  return (
                    <div key={role} className="text-center p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-center mb-2">
                        <Icon className={`h-6 w-6 text-${roleInfo?.color || 'gray'}-600`} />
                      </div>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                      <p className="text-sm text-gray-600">{roleInfo?.label || role}</p>
                      <p className="text-xs text-gray-500">{percentage}%</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* System Users Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Users & System Roles</h3>
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <input
                      type="text"
                      placeholder="Search users..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">System Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {u.avatar_url ? (
                              <img className="h-10 w-10 rounded-full" src={u.avatar_url} alt="" />
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                <span className="text-sm font-medium text-gray-600">
                                  {u.first_name.charAt(0)}{u.last_name.charAt(0)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {u.first_name} {u.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(u.role)}`}>
                            {getRoleIcon(u.role)}
                            <span className="ml-1">{SYSTEM_ROLE_HIERARCHY[u.role as keyof typeof SYSTEM_ROLE_HIERARCHY]?.label || u.role}</span>
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(u.status)}`}>
                          {u.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs text-gray-600">
                          {SYSTEM_ROLE_PERMISSIONS[u.role as keyof typeof SYSTEM_ROLE_PERMISSIONS]?.slice(0, 2).map((perm, idx) => (
                            <div key={idx}>• {perm}</div>
                          ))}
                          {(SYSTEM_ROLE_PERMISSIONS[u.role as keyof typeof SYSTEM_ROLE_PERMISSIONS]?.length || 0) > 2 && (
                            <div className="text-gray-400">+ {(SYSTEM_ROLE_PERMISSIONS[u.role as keyof typeof SYSTEM_ROLE_PERMISSIONS]?.length || 0) - 2} more</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {canEditRole(u.role) && u.id !== user?.id && (
                          <button
                            onClick={() => {
                              setSelectedUser(u)
                              setNewSystemRole(u.role)
                              setShowSystemRoleModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-700"
                            data-testid={`edit-system-role-${u.id}`}
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Custom Roles Tab */}
      {activeTab === 'custom' && (
        <div className="space-y-6">
          {/* Custom Roles Table */}
          <div className="bg-white shadow-sm rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Custom Roles</h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Permissions</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Users</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {customRoles.map((role) => (
                    <tr key={role.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{role.display_name}</div>
                          <div className="text-sm text-gray-500">{role.description}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((permission) => (
                            <span key={permission} className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                              {permission.replace(/_/g, ' ')}
                            </span>
                          ))}
                          {role.permissions.length > 3 && (
                            <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              +{role.permissions.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="mr-1 h-4 w-4" />
                          {role.user_count}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          role.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {role.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(role.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => {
                              setSelectedCustomRole(role)
                              setShowAssignModal(true)
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            data-testid={`assign-custom-role-${role.id}`}
                          >
                            <Users className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomRole(role)
                              setShowPermissionModal(true)
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <Shield className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteCustomRole(role.id)}
                            className="text-red-600 hover:text-red-900"
                            data-testid={`delete-custom-role-${role.id}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {customRoles.length === 0 && (
                <div className="text-center py-8">
                  <Shield className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No custom roles</h3>
                  <p className="mt-1 text-sm text-gray-500">Get started by creating a new custom role.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Role Assignments Tab */}
      {activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Assignment Overview</h3>
            <p className="text-gray-600 mb-4">
              This section shows the relationship between users and their assigned roles, both system and custom.
            </p>
            
            {/* Role assignment matrix would go here */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">System Role Assignments</h4>
                <div className="space-y-2">
                  {Object.entries(roleDistribution?.roles_distribution || {}).map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        {SYSTEM_ROLE_HIERARCHY[role as keyof typeof SYSTEM_ROLE_HIERARCHY]?.label || role}
                      </span>
                      <span className="text-sm font-medium text-gray-900">{count} users</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Custom Role Assignments</h4>
                <div className="space-y-2">
                  {customRoles.map((role) => (
                    <div key={role.id} className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">{role.display_name}</span>
                      <span className="text-sm font-medium text-gray-900">{role.user_count} users</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Role Change Modal */}
      {showSystemRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change System Role</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Changing system role for: <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
                </p>
                <p className="text-xs text-gray-500">Current role: {SYSTEM_ROLE_HIERARCHY[selectedUser.role as keyof typeof SYSTEM_ROLE_HIERARCHY]?.label}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New System Role</label>
                <select
                  value={newSystemRole}
                  onChange={(e) => setNewSystemRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(SYSTEM_ROLE_HIERARCHY).map(([role, info]) => {
                    const canAssign = canEditRole(role)
                    return (
                      <option key={role} value={role} disabled={!canAssign}>
                        {info.label} {!canAssign ? '(Insufficient permissions)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {newSystemRole && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Role Permissions:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {SYSTEM_ROLE_PERMISSIONS[newSystemRole as keyof typeof SYSTEM_ROLE_PERMISSIONS]?.map((perm, idx) => (
                      <li key={idx}>• {perm}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowSystemRoleModal(false)
                    setSelectedUser(null)
                    setNewSystemRole('')
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSystemRoleChange}
                  disabled={!newSystemRole || newSystemRole === selectedUser.role}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Role Modal */}
      {showCustomRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleCreateCustomRole}>
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">Create Custom Role</h3>
                  <button
                    type="button"
                    onClick={() => setShowCustomRoleModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="px-6 py-4">
                {/* Template Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Start with a template (optional)
                  </label>
                  <select
                    value={newCustomRole.template}
                    onChange={(e) => applyTemplate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Select a template...</option>
                    {templates.map((template) => (
                      <option key={template.name} value={template.name}>
                        {template.display_name} - {template.department}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role Name *
                    </label>
                    <input
                      type="text"
                      value={newCustomRole.display_name}
                      onChange={(e) => setNewCustomRole({ ...newCustomRole, display_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="e.g., Project Coordinator"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      System Name
                    </label>
                    <input
                      type="text"
                      value={newCustomRole.name || newCustomRole.display_name.toLowerCase().replace(/\s+/g, '_')}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      placeholder="Auto-generated"
                    />
                  </div>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={newCustomRole.description}
                    onChange={(e) => setNewCustomRole({ ...newCustomRole, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    rows={3}
                    placeholder="Describe the role's responsibilities..."
                  />
                </div>

                {/* Permissions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Permissions ({newCustomRole.permissions.length} selected)
                  </label>
                  
                  {Object.entries(permissions).map(([category, categoryPermissions]) => (
                    <div key={category} className="mb-4">
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 capitalize">
                        {category} Permissions
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {categoryPermissions.map((permission) => (
                          <label key={permission.name} className="flex items-center p-2 border rounded-md hover:bg-gray-50">
                            <input
                              type="checkbox"
                              checked={newCustomRole.permissions.includes(permission.name)}
                              onChange={() => togglePermission(permission.name)}
                              className="mr-3 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.display_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCustomRoleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newCustomRole.display_name || newCustomRole.permissions.length === 0}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="submit-create-custom-role"
                >
                  Create Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Custom Role Modal */}
      {showAssignModal && selectedCustomRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  Assign "{selectedCustomRole.display_name}" Role
                </h3>
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select users to assign this role to:
                </label>
                <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
                  {users.map((u) => (
                    <label key={u.id} className="flex items-center p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(u.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedUsers([...selectedUsers, u.id])
                          } else {
                            setSelectedUsers(selectedUsers.filter(id => id !== u.id))
                          }
                        }}
                        className="mr-3 h-4 w-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                      />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {u.first_name} {u.last_name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {u.email} • Current role: {u.role}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="text-sm text-gray-600">
                {selectedUsers.length} user(s) selected
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignCustomRole}
                disabled={selectedUsers.length === 0}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="submit-assign-custom-role"
              >
                Assign Role
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permission Details Modal */}
      {showPermissionModal && selectedCustomRole && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">
                  "{selectedCustomRole.display_name}" Permissions
                </h3>
                <button
                  onClick={() => setShowPermissionModal(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <div className="px-6 py-4">
              <div className="space-y-4">
                {Object.entries(permissions).map(([category, categoryPermissions]) => {
                  const rolePermissionsInCategory = categoryPermissions.filter(p => 
                    selectedCustomRole.permissions.includes(p.name)
                  )
                  
                  if (rolePermissionsInCategory.length === 0) return null
                  
                  return (
                    <div key={category}>
                      <h4 className="text-sm font-semibold text-gray-900 mb-2 capitalize">
                        {category} ({rolePermissionsInCategory.length})
                      </h4>
                      <div className="space-y-2">
                        {rolePermissionsInCategory.map((permission) => (
                          <div key={permission.name} className="flex items-center p-2 bg-green-50 border border-green-200 rounded-md">
                            <Check className="mr-3 h-4 w-4 text-green-600" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {permission.display_name}
                              </div>
                              <div className="text-xs text-gray-500">
                                {permission.description}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default EnhancedRoleManagement