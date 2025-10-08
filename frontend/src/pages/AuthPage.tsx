import React, { useState } from 'react'
import LoginForm from '../components/auth/LoginForm'
import RegisterForm from '../components/auth/RegisterForm'
import { 
  Shield, 
  Users, 
  BarChart3, 
  Settings, 
  Brain, 
  Zap, 
  Lock, 
  TrendingUp,
  CheckCircle,
  Sparkles,
  Rocket,
  Target,
  Calendar,
  FileText,
  Globe
} from 'lucide-react'

const AuthPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<'login' | 'register'>('login')

  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Insights',
      description: 'Leverage advanced AI/ML for predictive analytics and intelligent recommendations',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Real-time collaboration with multi-tenant architecture for seamless teamwork',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive dashboards with real-time metrics and data-driven insights',
      gradient: 'from-green-500 to-emerald-500'
    },
    {
      icon: Shield,
      title: 'Enterprise Security',
      description: 'Role-based access control, MFA, and zero-trust architecture',
      gradient: 'from-red-500 to-orange-500'
    },
    {
      icon: Calendar,
      title: 'Timeline Management',
      description: 'Gantt charts, dependencies, and critical path analysis for project tracking',
      gradient: 'from-indigo-500 to-purple-500'
    },
    {
      icon: Zap,
      title: 'Seamless Integrations',
      description: 'Connect with your favorite tools and platforms effortlessly',
      gradient: 'from-yellow-500 to-orange-500'
    }
  ]

  const stats = [
    { label: 'Projects Managed', value: '10K+', icon: Target },
    { label: 'Active Users', value: '50K+', icon: Users },
    { label: 'Tasks Completed', value: '1M+', icon: CheckCircle },
    { label: 'Uptime', value: '99.9%', icon: TrendingUp }
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-primary-900 to-slate-900 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 flex flex-col lg:flex-row min-h-screen">
        {/* Left Side - Marketing Content */}
        <div className="lg:w-1/2 flex flex-col justify-center items-center px-8 py-12 lg:px-16">
          <div className="max-w-2xl w-full">
            {/* Logo & Tagline */}
            <div className="mb-12">
              <div className="flex items-center mb-6">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-purple-600 rounded-full blur-lg opacity-50"></div>
                  <Shield className="h-14 w-14 text-white relative z-10" />
                </div>
                <div className="ml-4">
                  <h1 className="text-4xl font-bold text-white">Enterprise Portfolio</h1>
                  <p className="text-primary-200 text-sm mt-1">Management System</p>
                </div>
              </div>
              
              <h2 className="text-5xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-white to-primary-100 bg-clip-text text-transparent">
                Transform How You Manage Projects
              </h2>
              
              <p className="text-xl text-gray-300 mb-8 leading-relaxed">
                Enterprise-grade portfolio management powered by AI. Streamline workflows, 
                boost productivity, and make data-driven decisions with confidence.
              </p>

              {/* CTA Badges */}
              <div className="flex flex-wrap gap-3 mb-10">
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Sparkles className="h-4 w-4 text-yellow-400" />
                  <span className="text-white text-sm font-medium">AI-Powered</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Lock className="h-4 w-4 text-green-400" />
                  <span className="text-white text-sm font-medium">Enterprise Secure</span>
                </div>
                <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <span className="text-white text-sm font-medium">Cloud-Based</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              {stats.map((stat, index) => {
                const Icon = stat.icon
                return (
                  <div key={index} className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 hover:bg-white/10 transition-all duration-300">
                    <Icon className="h-6 w-6 text-primary-400 mb-2" />
                    <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                    <div className="text-xs text-gray-400">{stat.label}</div>
                  </div>
                )
              })}
            </div>

            {/* Features Grid */}
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <Rocket className="h-6 w-6 mr-3 text-primary-400" />
                Powerful Features
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {features.map((feature, index) => {
                  const Icon = feature.icon
                  return (
                    <div 
                      key={index} 
                      className="group bg-white/5 backdrop-blur-sm rounded-xl p-5 border border-white/10 hover:bg-white/10 hover:border-primary-500/50 transition-all duration-300 hover:scale-105"
                    >
                      <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.gradient} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <h4 className="font-semibold text-white mb-2">{feature.title}</h4>
                      <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Testimonial / Trust Badge */}
            <div className="mt-10 p-6 bg-gradient-to-r from-primary-600/20 to-purple-600/20 backdrop-blur-sm rounded-xl border border-primary-500/30">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-r from-primary-500 to-purple-600 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white mb-2 flex items-center">
                    Production Ready
                    <span className="ml-2 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full border border-green-500/30">v1.0</span>
                  </h4>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    ✅ Multi-tenant architecture • Real-time collaboration • AI/ML integration<br/>
                    ✅ Advanced analytics • Enterprise security • Timeline management<br/>
                    ✅ Resource optimization • Role-based access • Seamless integrations
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side - Authentication Form */}
        <div className="lg:w-1/2 flex items-center justify-center px-8 py-12 lg:px-16">
          <div className="w-full max-w-md">
            {/* Glass Card Effect */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">
              {currentView === 'login' ? (
                <LoginForm onSwitchToRegister={() => setCurrentView('register')} />
              ) : (
                <RegisterForm 
                  onSwitchToLogin={() => setCurrentView('login')}
                  onSuccess={() => setCurrentView('login')}
                />
              )}
            </div>

            {/* Trust Indicators */}
            <div className="mt-6 text-center">
              <p className="text-gray-400 text-sm mb-3">Trusted by innovative teams worldwide</p>
              <div className="flex justify-center items-center space-x-6 opacity-60">
                <FileText className="h-6 w-6 text-gray-400" />
                <Shield className="h-6 w-6 text-gray-400" />
                <Lock className="h-6 w-6 text-gray-400" />
                <Globe className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AuthPage