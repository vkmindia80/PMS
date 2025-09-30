import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation, useNavigate } from 'react-router-dom'
import { 
  Shield, 
  User, 
  LogOut, 
  Settings, 
  ChevronDown, 
  Building2, 
  Users, 
  BarChart3, 
  FolderOpen, 
  CheckSquare, 
  Brain, 
  Cpu, 
  Zap,
  Menu,
  X
} from 'lucide-react'

const Sidebar: React.FC = () => {
  const { user, logout, isAuthenticated } = useAuth()
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = async () => {
    await logout()
    setIsDropdownOpen(false)
  }

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const navigationItems = [
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3 },
    { name: 'Organization', path: '/organization', icon: Building2 },
    { name: 'Teams', path: '/teams', icon: Users },
    { name: 'Projects', path: '/projects', icon: FolderOpen },
    { name: 'Tasks', path: '/tasks', icon: CheckSquare },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Resources', path: '/resource-management', icon: Brain },
    { name: 'AI/ML', path: '/ai-ml', icon: Cpu },
    { name: 'Advanced AI', path: '/advanced-ai', icon: Brain },
    { name: 'Security', path: '/security', icon: Shield },
    { name: 'Integrations', path: '/integrations', icon: Zap },
  ]

  const handleNavigation = (path: string) => {
    navigate(path)
    // Close mobile sidebar on navigation
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false)
    }
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white border border-gray-200 rounded-md shadow-md hover:bg-gray-50 transition-colors"
        data-testid="mobile-menu-toggle"
      >
        {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-50 transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 w-64 flex flex-col`}
        data-testid="sidebar"
      >
        {/* Logo/Brand */}
        <div className="flex items-center space-x-2 p-6 border-b border-gray-200">
          <Shield className="h-8 w-8 text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">
            Enterprise Portfolio
          </h1>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <button
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-primary-600 bg-primary-50 border-r-2 border-primary-600'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
                data-testid={`nav-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </button>
            )
          })}
        </nav>

        {/* User Profile Section */}
        {user && (
          <div className="border-t border-gray-200 p-4">
            {/* User Role Badge */}
            <div className="mb-3">
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                user.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
                user.role === 'admin' ? 'bg-red-100 text-red-800' :
                user.role === 'manager' ? 'bg-blue-100 text-blue-800' :
                user.role === 'team_lead' ? 'bg-green-100 text-green-800' :
                user.role === 'member' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            {/* User Dropdown */}
            <div className="relative">
              <button
                onClick={toggleDropdown}
                className="w-full flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-3 transition-colors"
                data-testid="user-profile-dropdown"
              >
                <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-sm font-medium">
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </span>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.first_name} {user.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
              </button>

              {/* Dropdown Menu */}
              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                  <div className="py-1">
                    {/* User Info */}
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">
                        {user.first_name} {user.last_name}
                      </p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {user.role.replace('_', ' ')} • {user.organization_id}
                      </p>
                    </div>

                    {/* Menu Items */}
                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      data-testid="profile-settings-btn"
                    >
                      <User className="h-4 w-4 mr-3" />
                      Profile Settings
                      <span className="ml-auto text-xs text-gray-400">Coming Soon</span>
                    </button>

                    <button
                      onClick={() => setIsDropdownOpen(false)}
                      className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      data-testid="account-settings-btn"
                    >
                      <Settings className="h-4 w-4 mr-3" />
                      Account Settings
                      <span className="ml-auto text-xs text-gray-400">Coming Soon</span>
                    </button>

                    <div className="border-t border-gray-100">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        data-testid="logout-btn"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default Sidebar