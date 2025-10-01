import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { ProjectFilterProvider } from './contexts/ProjectFilterContext'
import Sidebar from './components/layout/Sidebar'
import Dashboard from './pages/Dashboard'
import AuthPage from './pages/AuthPage'
import OrganizationPage from './pages/OrganizationPage'
import TeamsPage from './pages/TeamsPage'
import ProjectsPage from './pages/ProjectsPage'
import TasksPage from './pages/TasksPage'
import PortfolioDashboard from './pages/PortfolioDashboard'
import ResourceManagementPage from './pages/ResourceManagementPage'
import AIMLDashboard from './pages/AIMLDashboard'
import AdvancedAIDashboard from './pages/AdvancedAIDashboard'
import IntegrationsPage from './pages/IntegrationsPage'
import SecurityDashboard from './pages/SecurityDashboard'
import SettingsPage from './pages/SettingsPage'
import TimelinePage from './pages/TimelinePage'
import ProtectedRoute from './components/auth/ProtectedRoute'
import './App.css'

// Main app content component
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Enterprise Portfolio Management...</p>
        </div>
      </div>
    )
  }

  // Show auth page if not authenticated
  if (!isAuthenticated) {
    return <AuthPage />
  }

  // Show authenticated app
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <main className="flex-1 lg:ml-64 p-6 lg:p-8 pt-16 lg:pt-6">
        <Routes>
          <Route 
            path="/" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/organization" 
            element={
              <ProtectedRoute>
                <OrganizationPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/teams" 
            element={
              <ProtectedRoute>
                <TeamsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/projects" 
            element={
              <ProtectedRoute>
                <ProjectsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <ProtectedRoute>
                <TasksPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute>
                <PortfolioDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/resource-management" 
            element={
              <ProtectedRoute>
                <ResourceManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/ai-ml" 
            element={
              <ProtectedRoute>
                <AIMLDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/advanced-ai" 
            element={
              <ProtectedRoute>
                <AdvancedAIDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/integrations" 
            element={
              <ProtectedRoute>
                <IntegrationsPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/security" 
            element={
              <ProtectedRoute>
                <SecurityDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/timeline" 
            element={
              <ProtectedRoute>
                <TimelinePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/timeline/:projectId" 
            element={
              <ProtectedRoute>
                <TimelinePage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/roles" 
            element={
              <ProtectedRoute>
                <RoleManagementPage />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/settings" 
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            } 
          />
          {/* Additional protected routes can be added here */}
        </Routes>
      </main>
    </div>
  )
}

// Main App component
function App() {
  return (
    <AuthProvider>
      <ProjectFilterProvider>
        <Router>
          <div className="min-h-screen">
            <Toaster 
              position="top-right"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10B981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#EF4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
            <AppContent />
          </div>
        </Router>
      </ProjectFilterProvider>
    </AuthProvider>
  )
}

export default App