import React, { useState, useEffect } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { 
  X, Plus, Trash2, Mail, UserPlus, 
  AlertCircle, CheckCircle, Loader
} from 'lucide-react'
import toast from 'react-hot-toast'

interface InviteEmail {
  id: string
  email: string
  role: 'admin' | 'manager' | 'team_lead' | 'member' | 'viewer'
}

interface InviteMembersModalProps {
  isOpen: boolean
  onClose: () => void
  organizationId?: string
  onMembersInvited?: () => void
}

const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  isOpen,
  onClose,
  organizationId,
  onMembersInvited
}) => {
  const { user, tokens } = useAuth()
  const [emails, setEmails] = useState<InviteEmail[]>([
    { id: '1', email: '', role: 'member' }
  ])
  const [loading, setLoading] = useState(false)
  const [inviteMessage, setInviteMessage] = useState('')

  const getApiUrl = () => {
    const isPreview = window.location.hostname.includes('emergentagent.com')
    const isProd = import.meta.env.PROD || isPreview
    
    if (isProd || isPreview) {
      return import.meta.env.VITE_PROD_API_URL || 'https://modern-ecosystem.preview.emergentagent.com'
    }
    
    return import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8001'
  }

  const roles = [
    { value: 'viewer', label: 'Viewer', description: 'Can view projects and tasks' },
    { value: 'member', label: 'Member', description: 'Can work on assigned tasks' },
    { value: 'team_lead', label: 'Team Lead', description: 'Can manage team tasks and members' },
    { value: 'manager', label: 'Manager', description: 'Can manage projects and teams' },
    { value: 'admin', label: 'Admin', description: 'Full access to organization' }
  ]

  const addEmailField = () => {
    const newId = (emails.length + 1).toString()
    setEmails([...emails, { id: newId, email: '', role: 'member' }])
  }

  const removeEmailField = (id: string) => {
    if (emails.length > 1) {
      setEmails(emails.filter(email => email.id !== id))
    }
  }

  const updateEmail = (id: string, field: keyof InviteEmail, value: string) => {
    setEmails(emails.map(email => 
      email.id === id ? { ...email, [field]: value } : email
    ))
  }

  const validateEmails = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = emails.filter(email => 
      email.email.trim() && emailRegex.test(email.email)
    )
    
    if (validEmails.length === 0) {
      toast.error('Please enter at least one valid email address')
      return false
    }

    // Check for duplicates
    const emailAddresses = validEmails.map(e => e.email.toLowerCase())
    const uniqueEmails = new Set(emailAddresses)
    if (uniqueEmails.size !== emailAddresses.length) {
      toast.error('Please remove duplicate email addresses')
      return false
    }

    return validEmails
  }

  const sendInvitations = async () => {
    const validEmails = validateEmails()
    if (!validEmails || !tokens?.access_token) return

    setLoading(true)
    try {
      const invitations = validEmails.map(email => ({
        email: email.email.trim(),
        role: email.role,
        message: inviteMessage.trim()
      }))

      const response = await fetch(`${getApiUrl()}/api/organizations/invite-members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tokens.access_token}`
        },
        body: JSON.stringify({
          organization_id: organizationId || user?.organization_id,
          invitations
        })
      })

      if (response.ok) {
        const result = await response.json()
        toast.success(`Successfully sent ${validEmails.length} invitation${validEmails.length > 1 ? 's' : ''}!`)
        
        // Reset form
        setEmails([{ id: '1', email: '', role: 'member' }])
        setInviteMessage('')
        
        if (onMembersInvited) {
          onMembersInvited()
        }
        onClose()
      } else {
        const error = await response.json()
        throw new Error(error.detail || 'Failed to send invitations')
      }
    } catch (error: any) {
      console.error('Error sending invitations:', error)
      toast.error(error.message || 'Failed to send invitations')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setEmails([{ id: '1', email: '', role: 'member' }])
      setInviteMessage('')
      onClose()
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendInvitations()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-100 rounded-lg">
              <UserPlus className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Invite Team Members</h2>
              <p className="text-sm text-gray-600">Send invitations to join your organization</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[calc(90vh-140px)] overflow-y-auto">
          {/* Email Invitations */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Addresses</h3>
              <button
                type="button"
                onClick={addEmailField}
                disabled={loading}
                className="btn-outline btn-sm flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Email
              </button>
            </div>

            {emails.map((emailData) => (
              <div key={emailData.id} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={emailData.email}
                      onChange={(e) => updateEmail(emailData.id, 'email', e.target.value)}
                      placeholder="colleague@company.com"
                      disabled={loading}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                      required
                    />
                    <select
                      value={emailData.role}
                      onChange={(e) => updateEmail(emailData.id, 'role', e.target.value)}
                      disabled={loading}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
                    >
                      {roles.map(role => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 ml-7">
                    {roles.find(r => r.value === emailData.role)?.description}
                  </p>
                </div>
                {emails.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEmailField(emailData.id)}
                    disabled={loading}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Invitation Message */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              Personal Message (Optional)
            </label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              disabled={loading}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-100"
              placeholder="Add a personal message to your invitation..."
            />
            <p className="text-xs text-gray-500">
              This message will be included in the invitation email
            </p>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  What happens next?
                </h3>
                <ul className="text-sm text-blue-700 mt-1 list-disc list-inside space-y-1">
                  <li>Invitation emails will be sent to the specified addresses</li>
                  <li>Recipients can click the invitation link to join your organization</li>
                  <li>They'll be assigned the selected role upon accepting</li>
                  <li>You can track invitation status in the Members section</li>
                </ul>
              </div>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="btn-secondary disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={sendInvitations}
            disabled={loading || emails.every(e => !e.email.trim())}
            className="btn-primary flex items-center disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Sending Invitations...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send Invitations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default InviteMembersModal