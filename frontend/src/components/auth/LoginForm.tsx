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
  const [isGeneratingDemo, setIsGeneratingDemo] = useState(false)
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

  const generateDemoData = async () => {
    if (isGeneratingDemo) return
    
    setIsGeneratingDemo(true)
    
    try {
      toast.loading('Generating comprehensive demo data...', { 
        id: 'demo-generation',
        duration: 0 // Keep showing until we dismiss it
      })
      
      console.log('🚀 Starting demo data generation...');
      const result = await systemService.generateDemoData()
      
      if (result.success) {
        // Check if it's async (202 status) or completed
        if (result.status === 'processing') {
          toast.success(
            `🎉 Demo data generation started!\n` +
            `⏳ This will take 10-30 seconds to complete.\n` +
            `💡 You can login now and refresh the page in a moment to see all the data.\n\n` +
            `📧 Login: demo@company.com\n` +
            `🔑 Password: demo123456`,
            { 
              id: 'demo-generation',
              duration: 8000,
              style: {
                maxWidth: '550px',
              }
            }
          )
        } else {
          // Completed immediately
          toast.success(
            `🎉 Enhanced demo data generated successfully!\n` +
            `📊 ${result.details?.total_data_points || 0}+ comprehensive data points\n` +
            `👥 ${result.details?.users_created || 0} users, ${result.details?.teams_created || 0} teams, ${result.details?.projects_created || 0} projects\n` +
            `✅ ${result.details?.tasks_created || 0} tasks with dates, dependencies & team members\n\n` +
            `📧 Login: demo@company.com\n` +
            `🔑 Password: demo123456`,
            { 
              id: 'demo-generation',
              duration: 8000,
              style: {
                maxWidth: '550px',
              }
            }
          )
        }
      } else {
        console.error('❌ Demo data generation failed:', result);
        toast.error(`Failed to generate demo data: ${result.message}`, {
          id: 'demo-generation',
          duration: 4000
        })
      }
    } catch (error) {
      console.error('❌ Demo data generation error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      // Provide helpful error messages
      if (errorMessage.includes('502')) {
        toast.error(
          `⚠️ Server timeout - but generation may still be running!\n` +
          `💡 Wait 30 seconds and try logging in.\n` +
          `📧 demo@company.com / 🔑 demo123456`,
          {
            id: 'demo-generation',
            duration: 8000,
            style: {
              maxWidth: '500px',
            }
          }
        )
      } else if (errorMessage.includes('timeout')) {
        toast.error(
          `⏳ Generation is taking longer than expected.\n` +
          `💡 Please wait and try logging in shortly.\n` +
          `📧 demo@company.com / 🔑 demo123456`,
          {
            id: 'demo-generation',
            duration: 6000,
            style: {
              maxWidth: '500px',
            }
          }
        )
      } else {
        toast.error(`Failed to generate demo data: ${errorMessage}`, {
          id: 'demo-generation',
          duration: 4000
        })
      }
    } finally {
      setIsGeneratingDemo(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 mb-4 shadow-lg">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Welcome Back</h2>
          <p className="text-gray-600 mt-2">Sign in to access your enterprise dashboard</p>
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
            className={`w-full py-3 px-4 rounded-lg font-semibold transition-all duration-300 transform ${
              isLoading
                ? 'bg-gray-300 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary-600 to-purple-600 hover:from-primary-700 hover:to-purple-700 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 shadow-lg hover:shadow-xl'
            } text-white`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing In...
              </div>
            ) : (
              <span className="flex items-center justify-center">
                Sign In
                <svg className="ml-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-primary-600 hover:text-primary-500 font-semibold hover:underline transition-colors"
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
                disabled={isLoading || isGeneratingDemo}
              >
                Auto Fill
              </button>
              <button
                type="button"
                onClick={performDemoLogin}
                className="text-xs bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors"
                disabled={isLoading || isGeneratingDemo}
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

          {/* Demo Data Generation */}
          <div className="mt-3 pt-3 border-t border-primary-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Database className="h-4 w-4 text-primary-600" />
                <span className="text-xs text-primary-700 font-medium">
                  Generate Sample Data
                </span>
              </div>
              <button
                type="button"
                onClick={generateDemoData}
                disabled={isLoading || isGeneratingDemo}
                className={`text-xs px-3 py-1 rounded-md font-medium transition-colors flex items-center space-x-1 ${
                  isGeneratingDemo
                    ? 'bg-orange-500 text-white cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
                data-testid="generate-demo-data"
              >
                {isGeneratingDemo ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-3 w-3" />
                    <span>Generate Data</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-primary-600 mt-1">
              🚀 Create 500+ enhanced data points: tasks with start/end dates, dependencies, multiple assignees, and comprehensive project analytics
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginForm