import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import toast from 'react-hot-toast'

// Types
interface User {
  id: string
  email: string
  username: string
  first_name: string
  last_name: string
  role: string
  organization_id: string
  is_active: boolean
  email_verified: boolean
  avatar_url?: string
  created_at: string
}

interface AuthTokens {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

interface LoginData {
  email: string
  password: string
}

interface RegisterData {
  email: string
  username: string
  password: string
  confirm_password: string
  first_name: string
  last_name: string
  organization_id: string
  phone?: string
  bio?: string
}

interface AuthContextType {
  user: User | null
  tokens: AuthTokens | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (data: LoginData) => Promise<void>
  register: (data: RegisterData) => Promise<void>
  logout: () => void
  refreshToken: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<void>
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth provider component
interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [tokens, setTokens] = useState<AuthTokens | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Determine API URL based on environment
  const getApiUrl = () => {
    // Check if we're running in production or preview environment
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://enterprise-roadmap.preview.emergentagent.com/api'
    }
    
    return import.meta.env.VITE_API_URL || 'http://localhost:8001'
  }
  
  const API_URL = getApiUrl()

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      const storedTokens = localStorage.getItem('auth_tokens')
      const storedUser = localStorage.getItem('auth_user')

      if (storedTokens && storedUser) {
        try {
          const parsedTokens = JSON.parse(storedTokens) as AuthTokens
          const parsedUser = JSON.parse(storedUser) as User
          
          setTokens(parsedTokens)
          setUser(parsedUser)
          
          // Verify token is still valid
          await fetchUserProfile(parsedTokens.access_token)
        } catch (error) {
          console.error('Failed to initialize auth:', error)
          clearAuthData()
        }
      }
      
      setIsLoading(false)
    }

    initAuth()
  }, [])

  // Helper function to clear auth data
  const clearAuthData = () => {
    setUser(null)
    setTokens(null)
    localStorage.removeItem('auth_tokens')
    localStorage.removeItem('auth_user')
  }

  // Helper function to store auth data
  const storeAuthData = (tokens: AuthTokens, user: User) => {
    setTokens(tokens)
    setUser(user)
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    localStorage.setItem('auth_user', JSON.stringify(user))
  }

  // Fetch user profile
  const fetchUserProfile = async (accessToken: string): Promise<User> => {
    const response = await fetch(`${API_URL}/api/auth/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user profile')
    }

    return response.json()
  }

  // Login function
  const login = async (data: LoginData) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: `HTTP ${response.status}: ${response.statusText}` }))
        throw new Error(error.detail || `Login failed with status ${response.status}`)
      }

      const result = await response.json()
      const { tokens, user } = result

      storeAuthData(tokens, user)
      toast.success('Login successful!')
    } catch (error) {
      console.error('Login error:', error)
      const message = error instanceof Error ? error.message : 'Login failed'
      toast.error(message)
      throw error
    }
  }

  // Register function
  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Registration failed')
      }

      const result = await response.json()
      toast.success(result.message || 'Registration successful! Please check your email to verify your account.')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  // Logout function
  const logout = async () => {
    try {
      if (tokens) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${tokens.access_token}`,
            'Content-Type': 'application/json',
          },
        })
      }
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      clearAuthData()
      toast.success('Logged out successfully')
    }
  }

  // Refresh token function
  const refreshToken = async () => {
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available')
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tokens.refresh_token}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Token refresh failed')
      }

      const newTokens = await response.json()
      const currentUser = user // Keep current user data
      
      if (currentUser) {
        storeAuthData(newTokens, currentUser)
      }
    } catch (error) {
      clearAuthData()
      throw error
    }
  }

  // Update profile function
  const updateProfile = async (data: Partial<User>) => {
    if (!tokens) {
      throw new Error('Not authenticated')
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${tokens.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.detail || 'Profile update failed')
      }

      const updatedUser = await response.json()
      
      // Update stored user data
      setUser(updatedUser)
      localStorage.setItem('auth_user', JSON.stringify(updatedUser))
      
      toast.success('Profile updated successfully!')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Profile update failed'
      toast.error(message)
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    tokens,
    isAuthenticated: !!user && !!tokens,
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}