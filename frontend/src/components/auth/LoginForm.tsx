import React, { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { Eye, EyeOff, Mail, Lock, User, Database, Loader2 } from 'lucide-react'
import { DEMO_CREDENTIALS } from '../../utils/config'
import { systemService } from '../../services/systemService'
import toast from 'react-hot-toast'

interface LoginFormProps {
  onSwitchToRegister?: () => void
}

const LoginForm: React.FC<LoginFormProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.email) {
      newErrors.email = 'Email is required'
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    setIsLoading(true)
    try {
      await login(formData)
    } catch (error) {
      // Error handling is done in the auth context
    } finally {
      setIsLoading(false)
    }
  }

  const fillDemoCredentials = () => {
    setFormData({
      email: DEMO_CREDENTIALS.email,
      password: DEMO_CREDENTIALS.password,
    })
    setErrors({})
  }

  const performDemoLogin = async () => {
    setIsLoading(true)
    try {
      await login({
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
      })
    } catch (error) {
      // Error handling is done in the auth context
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to your Enterprise Portfolio account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your email"
                disabled={isLoading}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1">{errors.password}</p>
            )}
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
            } text-white`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-primary-600 hover:text-primary-500 font-medium"
              disabled={isLoading}
            >
              Sign up here
            </button>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-6 p-4 bg-primary-50 border border-primary-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-primary-800 font-medium flex items-center">
              <User className="h-4 w-4 mr-2" />
              Quick Demo Login
            </p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={fillDemoCredentials}
                className="text-xs bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700 transition-colors"
                disabled={isLoading}
              >
                Auto Fill
              </button>
              <button
                type="button"
                onClick={performDemoLogin}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                disabled={isLoading}
                data-testid="quick-demo-login"
              >
                Quick Login
              </button>
            </div>
          </div>
          <div className="text-xs text-primary-700 space-y-1">
            <p>📧 Email: {DEMO_CREDENTIALS.email}</p>
            <p>🔑 Password: {DEMO_CREDENTIALS.password}</p>
            <p className="text-primary-600 font-medium mt-2">
              ✨ Demo account ready with full admin access
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm