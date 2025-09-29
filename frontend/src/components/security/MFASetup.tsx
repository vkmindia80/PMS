"""
MFA Setup Component
Phase 4.3: Multi-Factor Authentication Interface
"""

import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Key, Copy, CheckCircle, AlertCircle, QrCode } from 'lucide-react';

interface MFASetupProps {
  onComplete?: () => void;
  onCancel?: () => void;
}

interface MFAStatus {
  enabled: boolean;
  primary_method?: string;
  backup_methods: string[];
  backup_codes_remaining: number;
  trusted_devices: number;
}

const MFASetup: React.FC<MFASetupProps> = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState<'method' | 'setup' | 'verify' | 'complete'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'totp' | 'sms' | 'email' | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [trustDevice, setTrustDevice] = useState(false);

  useEffect(() => {
    fetchMFAStatus();
  }, []);

  const fetchMFAStatus = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const backendUrl = import.meta.env.VITE_PROD_API_URL || 
                        import.meta.env.REACT_APP_BACKEND_URL || 
                        import.meta.env.VITE_API_URL || 
                        process.env.REACT_APP_BACKEND_URL ||
                        'https://data-shield-fix.preview.emergentagent.com';
      
      const response = await fetch(`${backendUrl}/api/security/mfa/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const status = await response.json();
        setMfaStatus(status);
      }
    } catch (err) {
      console.error('Failed to fetch MFA status:', err);
    }
  };

  const handleMethodSetup = async () => {
    if (!selectedMethod) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const backendUrl = import.meta.env.VITE_API_URL || 
                        import.meta.env.REACT_APP_BACKEND_URL || 
                        'http://localhost:8001';
      
      const setupData: any = { method: selectedMethod };
      
      if (selectedMethod === 'sms' && phoneNumber) {
        setupData.phone_number = phoneNumber;
      }

      const response = await fetch(`${backendUrl}/api/security/mfa/setup`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(setupData)
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.qr_code) {
          setQrCode(result.qr_code);
        }
        
        setStep('verify');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Setup failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async () => {
    if (!selectedMethod || !verificationCode) return;

    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      const backendUrl = import.meta.env.VITE_API_URL || 
                        import.meta.env.REACT_APP_BACKEND_URL || 
                        'http://localhost:8001';
      
      const response = await fetch(`${backendUrl}/api/security/mfa/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          method: selectedMethod,
          code: verificationCode,
          trust_device: trustDevice
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBackupCodes(result.backup_codes || []);
        setStep('complete');
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Verification failed');
      }
    } catch (err) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    const codesText = backupCodes.join('\n');
    navigator.clipboard.writeText(codesText);
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  if (mfaStatus?.enabled) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">MFA Already Enabled</h3>
          <p className="text-gray-600 mb-4">
            Multi-factor authentication is already set up for your account using {mfaStatus.primary_method?.toUpperCase()}.
          </p>
          <div className="text-sm text-gray-500 space-y-1">
            <p>Backup codes remaining: {mfaStatus.backup_codes_remaining}</p>
            <p>Trusted devices: {mfaStatus.trusted_devices}</p>
          </div>
          <button
            onClick={onCancel}
            className="mt-4 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Shield className="w-8 h-8 text-blue-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Setup Multi-Factor Authentication</h3>
        <p className="text-gray-600 text-sm mt-1">Secure your account with an additional layer of protection</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span className="text-red-700 text-sm">{error}</span>
        </div>
      )}

      {/* Step 1: Method Selection */}
      {step === 'method' && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 mb-3">Choose your authentication method:</h4>
          
          <div className="space-y-2">
            <button
              onClick={() => setSelectedMethod('totp')}
              className={`w-full p-4 border rounded-lg text-left transition-colors ${
                selectedMethod === 'totp' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <QrCode className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">Authenticator App</p>
                  <p className="text-sm text-gray-600">Google Authenticator, Authy, etc.</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('sms')}
              className={`w-full p-4 border rounded-lg text-left transition-colors ${
                selectedMethod === 'sms' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Smartphone className="w-6 h-6 text-green-600" />
                <div>
                  <p className="font-medium text-gray-900">SMS Text Message</p>
                  <p className="text-sm text-gray-600">Receive codes via SMS</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setSelectedMethod('email')}
              className={`w-full p-4 border rounded-lg text-left transition-colors ${
                selectedMethod === 'email' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Mail className="w-6 h-6 text-purple-600" />
                <div>
                  <p className="font-medium text-gray-900">Email</p>
                  <p className="text-sm text-gray-600">Receive codes via email</p>
                </div>
              </div>
            </button>
          </div>

          {selectedMethod === 'sms' && (
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone Number
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div className="flex space-x-3 mt-6">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleMethodSetup}
              disabled={!selectedMethod || (selectedMethod === 'sms' && !phoneNumber) || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Setting up...' : 'Continue'}
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Setup (QR Code for TOTP) */}
      {step === 'setup' && selectedMethod === 'totp' && qrCode && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 mb-3">Scan QR Code</h4>
          <p className="text-sm text-gray-600 mb-4">
            Open your authenticator app and scan this QR code:
          </p>
          
          <div className="text-center">
            <img src={qrCode} alt="MFA QR Code" className="mx-auto border rounded-lg" />
          </div>
          
          <p className="text-xs text-gray-500 text-center">
            Can't scan? Enter the code manually in your app
          </p>
          
          <button
            onClick={() => setStep('verify')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            I've added the account
          </button>
        </div>
      )}

      {/* Step 3: Verification */}
      {step === 'verify' && (
        <div className="space-y-4">
          <h4 className="font-medium text-gray-900 mb-3">Enter Verification Code</h4>
          <p className="text-sm text-gray-600 mb-4">
            Enter the 6-digit code from your {selectedMethod === 'totp' ? 'authenticator app' : selectedMethod === 'sms' ? 'phone' : 'email'}:
          </p>
          
          <input
            type="text"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="w-full px-3 py-2 text-center text-2xl tracking-widest border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            maxLength={6}
          />
          
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="trustDevice"
              checked={trustDevice}
              onChange={(e) => setTrustDevice(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="trustDevice" className="text-sm text-gray-700">
              Trust this device for 30 days
            </label>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={() => setStep(selectedMethod === 'totp' ? 'setup' : 'method')}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleVerification}
              disabled={verificationCode.length !== 6 || loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Complete with Backup Codes */}
      {step === 'complete' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h4 className="font-medium text-gray-900 mb-2">MFA Setup Complete!</h4>
            <p className="text-sm text-gray-600 mb-4">
              Your account is now protected with multi-factor authentication.
            </p>
          </div>

          {backupCodes.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Key className="w-5 h-5 text-yellow-600" />
                <h5 className="font-medium text-yellow-900">Save Your Backup Codes</h5>
              </div>
              <p className="text-sm text-yellow-700 mb-3">
                Store these codes in a safe place. You can use them to access your account if you lose your device.
              </p>
              <div className="bg-white rounded border p-3 font-mono text-sm space-y-1">
                {backupCodes.map((code, index) => (
                  <div key={index}>{code}</div>
                ))}
              </div>
              <button
                onClick={copyBackupCodes}
                className="mt-3 flex items-center space-x-2 text-yellow-700 hover:text-yellow-800 text-sm"
              >
                <Copy className="w-4 h-4" />
                <span>Copy codes</span>
              </button>
            </div>
          )}

          <button
            onClick={handleComplete}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Complete Setup
          </button>
        </div>
      )}
    </div>
  );
};

export default MFASetup;
