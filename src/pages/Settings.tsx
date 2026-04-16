import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import {
  Settings as SettingsIcon,
  User,
  Shield,
  Bell,
  Key,
  Save,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    riskNotifications: true,
    complianceUpdates: false,
  });
  const [security, setSecurity] = useState({
    twoFactorEnabled: false,
    sessionTimeout: '24',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus('idle');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSaveStatus('success');
    } catch (error) {
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user) return null;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <SettingsIcon className="w-8 h-8 text-zinc-400" />
          <h1 className="text-3xl font-bold text-white tracking-tight">Settings</h1>
        </div>
        <p className="text-zinc-400">Manage your account preferences and security settings.</p>
      </header>

      <div className="space-y-8">
        {/* Profile Section */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-bold text-white">Profile Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
              <input
                type="text"
                value={user.name}
                readOnly
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
              <input
                type="email"
                value={user.email}
                readOnly
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Role</label>
              <input
                type="text"
                value={user.role}
                readOnly
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">User ID</label>
              <input
                type="text"
                value={user.id}
                readOnly
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-zinc-500 placeholder:text-zinc-600 font-mono text-sm"
              />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-bold text-white">Notifications</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Email Alerts</p>
                <p className="text-xs text-zinc-500">Receive notifications about system updates</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.emailAlerts}
                onChange={(e) => setNotifications(prev => ({ ...prev, emailAlerts: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Risk Notifications</p>
                <p className="text-xs text-zinc-500">Get alerted when high-risk contracts are detected</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.riskNotifications}
                onChange={(e) => setNotifications(prev => ({ ...prev, riskNotifications: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Compliance Updates</p>
                <p className="text-xs text-zinc-500">Stay informed about regulatory changes</p>
              </div>
              <input
                type="checkbox"
                checked={notifications.complianceUpdates}
                onChange={(e) => setNotifications(prev => ({ ...prev, complianceUpdates: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
            </label>
          </div>
        </div>

        {/* Security Section */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-bold text-white">Security</h3>
          </div>

          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
              <div>
                <p className="text-sm font-medium text-white">Two-Factor Authentication</p>
                <p className="text-xs text-zinc-500">Add an extra layer of security to your account</p>
              </div>
              <input
                type="checkbox"
                checked={security.twoFactorEnabled}
                onChange={(e) => setSecurity(prev => ({ ...prev, twoFactorEnabled: e.target.checked }))}
                className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-emerald-500 focus:ring-emerald-500"
              />
            </label>

            <div className="p-4 bg-black/30 rounded-xl border border-white/5">
              <label className="block text-sm font-medium text-white mb-2">Session Timeout (hours)</label>
              <select
                value={security.sessionTimeout}
                onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: e.target.value }))}
                className="w-full bg-black/50 border border-white/10 rounded-lg py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <option value="1">1 hour</option>
                <option value="4">4 hours</option>
                <option value="12">12 hours</option>
                <option value="24">24 hours</option>
                <option value="168">1 week</option>
              </select>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-white">API Keys</h3>
          </div>

          <div className="p-4 bg-black/30 rounded-xl border border-white/5">
            <p className="text-sm text-zinc-400 mb-4">
              API keys are managed server-side for security. Contact your administrator to manage API access.
            </p>
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Key className="w-4 h-4" />
              <span>Gemini API: Configured on backend</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-between pt-6 border-t border-white/5">
          <div className="flex items-center gap-2">
            {saveStatus === 'success' && (
              <>
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-500">Settings saved successfully</span>
              </>
            )}
            {saveStatus === 'error' && (
              <>
                <AlertCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm text-red-500">Failed to save settings</span>
              </>
            )}
          </div>

          <motion.button
            onClick={handleSave}
            disabled={isSaving}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Settings;