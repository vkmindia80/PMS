import React, { useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { Shield, Users, BarChart3, Settings } from 'lucide-react'

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-primary-100">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Branding */}
        <div className="lg:w-1/2 flex flex-col justify-center items-center px-8 py-12 bg-primary-600 text-white">
          <div className="max-w-lg text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start mb-8">
              <Shield className="h-12 w-12 mr-3" />
              <h1 className="text-3xl font-bold">Enterprise Portfolio</h1>
            </div>
            
            <h2 className="text-4xl font-bold leading-tight mb-6">
              Manage Your Projects Like Never Before
            </h2>
            
            <p className="text-xl text-primary-100 mb-8">
              A comprehensive SaaS platform for portfolio and project management with 
              advanced features including multi-tenant architecture, real-time collaboration, 
              and AI-powered insights.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex items-center space-x-3">
                <Users className="h-8 w-8 text-primary-200" />
                <div>
                  <h3 className="font-semibold">Team Collaboration</h3>
                  <p className="text-sm text-primary-200">Real-time team management</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-8 w-8 text-primary-200" />
                <div>
                  <h3 className="font-semibold">Advanced Analytics</h3>
                  <p className="text-sm text-primary-200">Data-driven insights</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Shield className="h-8 w-8 text-primary-200" />
                <div>
                  <h3 className="font-semibold">Enterprise Security</h3>
                  <p className="text-sm text-primary-200">Role-based access control</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Settings className="h-8 w-8 text-primary-200" />
                <div>
                  <h3 className="font-semibold">Customizable</h3>
                  <p className="text-sm text-primary-200">Tailored to your needs</p>
                </div>
              </div>
            </div>

            <div className="mt-12 p-6 bg-primary-700 rounded-lg">
              <h3 className="font-bold mb-2">🚀 Phase 1.3: Authentication Complete!</h3>
              <p className="text-primary-100 text-sm">
                ✅ JWT-based authentication<br/>
                ✅ Role-based access control<br/>
                ✅ Secure session management<br/>
                ✅ User registration & profile management
              </p>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="lg:w-1/2 flex items-center justify-center px-8 py-12">
          <div className="w-full max-w-md">
            {currentView === 'login' ? (
              <LoginForm onSwitchToRegister={() => setCurrentView('register')} />
            ) : (
              <RegisterForm 
                onSwitchToLogin={() => setCurrentView('login')}
                onSuccess={() => setCurrentView('login')}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage