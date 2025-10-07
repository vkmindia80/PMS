import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import toast from 'react-hot-toast'
import { DEMO_CREDENTIALS, API_ENDPOINTS } from '../utils/config'

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
  const initStarted = React.useRef(false)

  // Initialize auth state from localStorage
  useEffect(() => {
    // Prevent multiple initializations using ref (survives React Strict Mode remounting)
    if (initStarted.current) {
      console.log('🚫 Skipping auth init - already started')
      return
    }
    
    console.log('🚀 Starting authentication initialization...')
    initStarted.current = true
    
    try {
      const storedTokens = localStorage.getItem('auth_tokens')
      const storedUser = localStorage.getItem('auth_user')
      
      console.log('🔍 Checking stored auth data:', {
        hasTokens: !!storedTokens,
        hasUser: !!storedUser
      })

      if (storedTokens && storedUser) {
        try {
          console.log('🔍 Found stored auth data, parsing...')
          
          const parsedTokens = JSON.parse(storedTokens) as AuthTokens
          const parsedUser = JSON.parse(storedUser) as User
          
          console.log('🔍 Parsed auth data:', {
            hasAccessToken: !!parsedTokens.access_token,
            tokenLength: parsedTokens.access_token?.length,
            userEmail: parsedUser.email,
            userId: parsedUser.id
          })
          
          // Basic validation of stored data
          if (!parsedTokens.access_token || !parsedUser.id) {
            throw new Error('Invalid stored auth data structure')
          }
          
          console.log('✅ Setting auth state from stored data...')
          setTokens(parsedTokens)
          setUser(parsedUser)
          setIsLoading(false)
          
          console.log('✅ Authentication initialized successfully from stored data')
          
        } catch (error) {
          console.error('❌ Failed to parse stored auth:', error)
          clearAuthData()
          setIsLoading(false)
        }
      } else {
        console.log('🚫 No stored authentication data found - showing login')
        setIsLoading(false)
      }
    } catch (error) {
      console.error('❌ Critical auth initialization error:', error)
      setIsLoading(false)
    }
    
    console.log('🏁 Auth initialization complete')
  }, [])

  // Helper function to clear auth data
  const clearAuthData = () => {
    console.log('🧹 Clearing authentication data')
    console.trace('clearAuthData called from:') // This will show us where it's being called from
    setUser(null)
    setTokens(null)
    
    // Clear all possible auth-related localStorage keys
    try {
      localStorage.removeItem('auth_tokens')
      localStorage.removeItem('auth_user')
      // Also clear any other auth-related keys that might exist
      const keysToRemove = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && (key.startsWith('auth_') || key.startsWith('token_') || key.includes('session'))) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
      console.log('🗑️ Cleared localStorage auth keys')
    } catch (error) {
      console.error('Error clearing localStorage:', error)
    }
  }

  // Helper function to store auth data
  const storeAuthData = (tokens: AuthTokens, user: User) => {
    console.log('🔐 Storing auth data to localStorage...', { userId: user.id, tokenLength: tokens.access_token.length })
    setTokens(tokens)
    setUser(user)
    localStorage.setItem('auth_tokens', JSON.stringify(tokens))
    localStorage.setItem('auth_user', JSON.stringify(user))
    console.log('✅ Auth data stored successfully')
  }

  // Fetch user profile
  const fetchUserProfile = async (accessToken: string): Promise<User> => {
    try {
      console.log('👤 Fetching user profile...')
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
      
      const response = await fetch(API_ENDPOINTS.auth.me, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`Failed to fetch user profile: HTTP ${response.status}`)
      }

      const user = await response.json()
      
      // Validate user data
      if (!user || !user.id) {
        throw new Error('Invalid user profile data received')
      }
      
      console.log('✅ User profile fetched successfully:', user.email)
      return user
    } catch (error) {
      console.error('❌ Failed to fetch user profile:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Profile fetch timed out')
      }
      throw error
    }
  }

  // Login function
  const login = async (data: LoginData) => {
    try {
      console.log('🔑 Attempting login for:', data.email)
      
      // Add timeout to login request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout
      
      const response = await fetch(API_ENDPOINTS.auth.login, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)

      if (!response.ok) {
        let errorDetail = `HTTP ${response.status}: ${response.statusText}`
        try {
          const errorData = await response.json()
          errorDetail = errorData.detail || errorDetail
        } catch {
          // If can't parse error JSON, use default message
        }
        throw new Error(errorDetail)
      }

      const result = await response.json()
      
      // Validate response structure
      if (!result.tokens || !result.user) {
        throw new Error('Invalid login response format')
      }
      
      const { tokens, user } = result

      // Validate required fields
      if (!tokens.access_token || !user.id) {
        throw new Error('Invalid authentication data received')
      }

      storeAuthData(tokens, user)
      console.log('✅ Login successful for:', user.email)
      toast.success('Login successful!')
    } catch (error) {
      console.error('❌ Login error:', error)
      
      let message = 'Login failed'
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          message = 'Login request timed out. Please try again.'
        } else {
          message = error.message
        }
      }
      
      toast.error(message)
      throw error
    }
  }

  // Register function
  const register = async (data: RegisterData) => {
    try {
      const response = await fetch(API_ENDPOINTS.auth.register, {
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
      console.log('🚪 Starting logout process...')
      
      if (tokens) {
        try {
          await fetch(API_ENDPOINTS.auth.logout, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Content-Type': 'application/json',
            },
          })
          console.log('✅ Logout API call successful')
        } catch (apiError) {
          console.error('⚠️ Logout API call failed (but continuing):', apiError)
        }
      }
    } catch (error) {
      console.error('❌ Logout process error:', error)
    } finally {
      // Always clear auth data regardless of API call success
      clearAuthData()
      console.log('✅ Logout completed - auth data cleared')
      toast.success('Logged out successfully')
      
      // Force reload to ensure clean state
      window.location.reload()
    }
  }

  // Internal refresh token function
  const refreshTokenInternal = async (refreshTokenValue: string, currentUser: User) => {
    const response = await fetch(API_ENDPOINTS.auth.refresh, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${refreshTokenValue}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Token refresh failed with status ${response.status}`)
    }

    const newTokens = await response.json()
    storeAuthData(newTokens, currentUser)
    return newTokens
  }

  // Public refresh token function
  const refreshToken = async () => {
    if (!tokens?.refresh_token) {
      throw new Error('No refresh token available')
    }

    if (!user) {
      throw new Error('No user data available')
    }

    try {
      console.log('AuthContext: Refreshing token...')
      await refreshTokenInternal(tokens.refresh_token, user)
      console.log('AuthContext: Token refresh successful')
    } catch (error) {
      console.error('AuthContext: Token refresh failed:', error)
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
      const response = await fetch(API_ENDPOINTS.auth.me, {
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
    isAuthenticated: !isLoading && !!user && !!tokens,
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