import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Shield, UserPlus, Users as UsersIcon, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../services/api';

const Users: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'Client' });
  const [message, setMessage] = useState<string | null>(null);

  const isAdmin = user?.role === 'Admin';

  const loadUsers = async () => {
    if (!isAdmin) return;
    const response = await authFetch('/api/admin/users');
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Failed to load users');
    }
    setUsers(body.items || []);
  };

  useEffect(() => {
    loadUsers().catch((err) => setMessage(err.message));
  }, [isAdmin]);

  if (!user) return null;

  const createUser = async () => {
    setMessage(null);
    const response = await authFetch('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || 'Failed to create user');
    }
    setForm({ name: '', email: '', password: '', role: 'Client' });
    setMessage(`Created ${body.user.name} successfully.`);
    await loadUsers();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UsersIcon className="w-8 h-8 text-emerald-500" />
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight">User Management</h1>
            <p className="text-zinc-400">
              {isAdmin ? 'Manage users directly from the ComplyChain database.' : 'Only administrators can manage users.'}
            </p>
          </div>
        </div>
      </header>

      {!isAdmin ? (
        <div className="bg-zinc-900/60 border border-red-500/30 rounded-3xl p-8 flex items-center gap-4">
          <Lock className="w-8 h-8 text-red-500" />
          <div>
            <h2 className="text-lg font-semibold text-white mb-1">Access restricted</h2>
            <p className="text-sm text-zinc-400">You need admin privileges to view and manage users.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {message && <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-300">{message}</div>}

          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-emerald-500" />
              <div>
                <h2 className="text-lg font-semibold text-white">Create New User</h2>
                <p className="text-sm text-zinc-400">Add admins, legal reviewers, or clients without leaving the app.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} placeholder="Full name" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-500" />
              <input value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} placeholder="Email address" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-500" />
              <input value={form.password} onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))} placeholder="Temporary password" type="password" className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-500" />
              <select value={form.role} onChange={(e) => setForm((current) => ({ ...current, role: e.target.value }))} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-white outline-none focus:border-emerald-500">
                <option value="Client">Client</option>
                <option value="Legal Reviewer">Legal Reviewer</option>
                <option value="Admin">Admin</option>
              </select>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
              onClick={() => createUser().catch((err) => setMessage(err.message))}
            >
              <UserPlus className="w-4 h-4" />
              Create New User
            </motion.button>
          </div>

          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wide mb-4">Organization Directory</h3>
            <div className="space-y-3">
              {users.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between rounded-2xl bg-black/40 border border-white/5 p-4">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.name}</p>
                    <p className="text-xs text-zinc-500 mt-1">{entry.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-emerald-400">{entry.role}</p>
                    <p className="text-xs text-zinc-500 mt-1">{entry.contractCount} contracts</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
