import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import {
  Shield, Crown, UserCog, Users, Eye, Settings,
  ChevronDown, Check, X, AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

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

interface RoleDistribution {
  organization_id: string
  total_users: number
  roles_distribution: Record<string, number>
}

const ROLE_HIERARCHY = {
  super_admin: { level: 0, label: 'Super Admin', color: 'purple', icon: Crown },
  admin: { level: 1, label: 'Admin', color: 'red', icon: Shield },
  manager: { level: 2, label: 'Manager', color: 'blue', icon: UserCog },
  team_lead: { level: 3, label: 'Team Lead', color: 'green', icon: Users },
  member: { level: 4, label: 'Member', color: 'gray', icon: Users },
  viewer: { level: 5, label: 'Viewer', color: 'yellow', icon: Eye }
}

const ROLE_PERMISSIONS = {
  super_admin: ['All system permissions', 'Cross-organization access', 'System configuration'],
  admin: ['Organization management', 'User management', 'All organization features'],
  manager: ['Team management', 'Project oversight', 'User role assignments'],
  team_lead: ['Team leadership', 'Task assignments', 'Team member management'],
  member: ['Project participation', 'Task management', 'Team collaboration'],
  viewer: ['Read-only access', 'View projects and teams', 'Basic reporting']
}

const RoleManagement: React.FC = () => {
  const { user, tokens } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roleDistribution, setRoleDistribution] = useState<RoleDistribution | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [newRole, setNewRole] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://code-pathway.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const API_URL = getApiUrl()

  useEffect(() => {
    fetchUsers()
    fetchRoleDistribution()
  }, [])

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
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
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

  const handleRoleChange = async () => {
    if (!selectedUser || !newRole) return

    try {
      const response = await fetch(`${API_URL}/api/users/${selectedUser.id}/role`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newRole),
      })

      if (response.ok) {
        toast.success('Role updated successfully!')
        setShowRoleModal(false)
        setSelectedUser(null)
        setNewRole('')
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

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/api/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newStatus),
      })

      if (response.ok) {
        toast.success('Status updated successfully!')
        fetchUsers()
      } else {
        const error = await response.json()
        toast.error(error.detail || 'Failed to update status')
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getRoleIcon = (role: string) => {
    const roleInfo = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY]
    const Icon = roleInfo?.icon || Users
    return <Icon className="h-4 w-4" />
  }

  const getRoleColor = (role: string) => {
    const roleInfo = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY]
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
    
    const userLevel = ROLE_HIERARCHY[user.role as keyof typeof ROLE_HIERARCHY]?.level || 5
    const targetLevel = ROLE_HIERARCHY[targetRole as keyof typeof ROLE_HIERARCHY]?.level || 5
    
    // Can only edit roles at same level or lower (higher number)
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
    <div className="space-y-6">
      {/* Role Distribution Overview */}
      {roleDistribution && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Role Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(roleDistribution.roles_distribution).map(([role, count]) => {
              const roleInfo = ROLE_HIERARCHY[role as keyof typeof ROLE_HIERARCHY]
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

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Role</label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Roles</option>
              {Object.entries(ROLE_HIERARCHY).map(([role, info]) => (
                <option key={role} value={role}>{info.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchUsers}
              className="btn-primary w-full"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Users ({filteredUsers.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Permissions
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
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
                        <span className="ml-1">{ROLE_HIERARCHY[u.role as keyof typeof ROLE_HIERARCHY]?.label || u.role}</span>
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
                      {ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS]?.slice(0, 2).map((perm, idx) => (
                        <div key={idx}>• {perm}</div>
                      ))}
                      {(ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS]?.length || 0) > 2 && (
                        <div className="text-gray-400">+ {(ROLE_PERMISSIONS[u.role as keyof typeof ROLE_PERMISSIONS]?.length || 0) - 2} more</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      {canEditRole(u.role) && u.id !== user?.id && (
                        <button
                          onClick={() => {
                            setSelectedUser(u)
                            setNewRole(u.role)
                            setShowRoleModal(true)
                          }}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                      
                      {u.status === 'active' && canEditRole(u.role) && u.id !== user?.id && (
                        <button
                          onClick={() => handleStatusChange(u.id, 'suspended')}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      
                      {u.status !== 'active' && canEditRole(u.role) && (
                        <button
                          onClick={() => handleStatusChange(u.id, 'active')}
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Change Modal */}
      {showRoleModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Change User Role</h3>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Changing role for: <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>
                </p>
                <p className="text-xs text-gray-500">Current role: {ROLE_HIERARCHY[selectedUser.role as keyof typeof ROLE_HIERARCHY]?.label}</p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">New Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {Object.entries(ROLE_HIERARCHY).map(([role, info]) => {
                    const canAssign = canEditRole(role)
                    return (
                      <option key={role} value={role} disabled={!canAssign}>
                        {info.label} {!canAssign ? '(Insufficient permissions)' : ''}
                      </option>
                    )
                  })}
                </select>
              </div>

              {newRole && (
                <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Role Permissions:</p>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {ROLE_PERMISSIONS[newRole as keyof typeof ROLE_PERMISSIONS]?.map((perm, idx) => (
                      <li key={idx}>• {perm}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRoleModal(false)
                    setSelectedUser(null)
                    setNewRole('')
                  }}
                  className="btn-outline"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRoleChange}
                  disabled={!newRole || newRole === selectedUser.role}
                  className="btn-primary disabled:opacity-50"
                >
                  Update Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoleManagement