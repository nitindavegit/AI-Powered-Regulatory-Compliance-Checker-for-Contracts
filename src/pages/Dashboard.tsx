import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import {
  ShieldCheck, AlertTriangle, Clock, FileText,
  Users, Settings, Activity, Database, Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../services/api';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444'];

const iconMap = {
  'System Health': Activity,
  'Total Users': Users,
  'Contracts Stored': Database,
  'Global Compliance': ShieldCheck,
  'Pending Review': Clock,
  'Average Risk': AlertTriangle,
  'Risk Alerts': AlertTriangle,
  'Completed Today': ShieldCheck,
  'My Contracts': FileText,
  'Compliance Score': ShieldCheck,
  'Active Risks': AlertTriangle,
  'Blockchain Verified': ShieldCheck,
} as const;

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const response = await authFetch('/api/dashboard');
        if (!response.ok) {
          const body = await response.json();
          throw new Error(body.error || 'Failed to load dashboard');
        }
        setDashboard(await response.json());
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      }
    };

    loadDashboard();
  }, []);

  const stats = dashboard?.stats || [];
  const monthly = dashboard?.monthly || [];
  const frameworkDistribution = dashboard?.frameworkDistribution || [];
  const logs = dashboard?.logs || [];
  const reviewQueue = dashboard?.reviewQueue || [];
  const contracts = dashboard?.contracts || [];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{user?.role} Dashboard</h1>
          <p className="text-zinc-400 mt-1">
            {user?.role === 'Admin' ? 'System-wide monitoring from the ComplyChain database.' :
             user?.role === 'Legal Reviewer' ? 'Live review workload and compliance findings.' :
             'Your contracts and compliance activity from this application.'}
          </p>
        </div>
        {user?.role === 'Admin' && (
          <button className="px-4 py-2 bg-zinc-900 border border-white/10 rounded-xl text-sm font-bold text-white hover:bg-zinc-800 transition-all flex items-center gap-2">
            <Settings className="w-4 h-4" />
            System Settings
          </button>
        )}
      </header>

      {error && <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat: any) => {
          const Icon = iconMap[stat.label as keyof typeof iconMap] || Info;
          const tone = stat.tone === 'warning' ? 'text-amber-500' : stat.tone === 'neutral' ? 'text-blue-500' : 'text-emerald-500';
          return (
            <div key={stat.label} className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className={`p-2 rounded-lg bg-white/5 ${tone}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className={`text-xs font-bold ${tone}`}>{stat.trend}</div>
              </div>
              <p className="text-zinc-500 text-sm font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-white mt-1">{stat.value}</h3>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {user?.role === 'Admin' ? (
          <div className="lg:col-span-3 bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
            <h3 className="text-lg font-bold text-white mb-6">Contract Activity by Month</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  <Line type="monotone" dataKey="compliant" stroke="#10b981" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="nonCompliant" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <>
            <div className="lg:col-span-2 bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">{user?.role === 'Legal Reviewer' ? 'Review Queue Performance' : 'Compliance Trends'}</h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="name" stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#71717a" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                    <Bar dataKey="compliant" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
                    <Bar dataKey="nonCompliant" fill="#3f3f46" radius={[4, 4, 0, 0]} barSize={30} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-zinc-900/50 border border-white/10 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-white mb-6">Framework Distribution</h3>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={frameworkDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {frameworkDistribution.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 mt-4">
                {frameworkDistribution.map((entry: any, index: number) => (
                  <div key={entry.name} className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm text-zinc-400">{entry.name}</span>
                    </div>
                    <span className="text-sm font-bold text-white">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {user?.role === 'Legal Reviewer' && (
        <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden mb-8">
          <div className="p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">Pending Review Queue</h3>
          </div>
          <div className="divide-y divide-white/5">
            {reviewQueue.map((item: any) => (
              <div key={`${item.name}-${item.createdAt}`} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${item.priority === 'High' ? 'bg-red-500' : item.priority === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                  <div>
                    <p className="text-sm font-bold text-white">{item.name}</p>
                    <p className="text-xs text-zinc-500">{new Date(item.createdAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Risk Score</p>
                  <p className={`text-sm font-bold ${item.score >= 70 ? 'text-red-500' : item.score >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>{Math.round(item.score)}/100</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden mb-8">
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {user?.role === 'Admin' ? 'All Contracts' : user?.role === 'Legal Reviewer' ? 'Shared Contract Workspace' : 'My Contracts'}
          </h3>
          <span className="text-xs text-zinc-500">{contracts.length} records</span>
        </div>
        <div className="divide-y divide-white/5">
          {contracts.map((contract: any) => (
            <div key={contract.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div>
                <p className="text-sm font-bold text-white">{contract.fileName}</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {user?.role !== 'Client' ? `${contract.ownerName} • ` : ''}{new Date(contract.createdAt).toLocaleString()}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    contract.status === 'Approved'
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : contract.status === 'Review finalized'
                        ? 'bg-blue-500/10 text-blue-400'
                        : contract.status === 'Review requested'
                          ? 'bg-amber-500/10 text-amber-400'
                          : 'bg-white/5 text-zinc-300'
                  }`}>
                    {contract.status}
                  </span>
                  <span className="text-xs text-zinc-400">
                    Compliance: <span className="text-zinc-300">{contract.complianceStatus || 'Pending'}</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-xs text-zinc-500">Risk Score</p>
                  <p className={`text-sm font-bold ${contract.riskScore >= 70 ? 'text-red-500' : contract.riskScore >= 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
                    {Math.round(contract.riskScore || 0)}/100
                  </p>
                </div>
                <button
                  className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-white hover:bg-white/10"
                  onClick={() => navigate(`/analysis?contractId=${contract.id}`)}
                >
                  Open Analysis
                </button>
              </div>
            </div>
          ))}
          {contracts.length === 0 && (
            <div className="p-6 text-sm text-zinc-400">No contracts available yet.</div>
          )}
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-white/10 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-lg font-bold text-white">{user?.role === 'Admin' ? 'System Logs' : 'Recent Activity'}</h3>
        </div>
        <div className="divide-y divide-white/5">
          {logs.map((item: any, index: number) => (
            <div key={`${item.title}-${index}`} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-full bg-white/5 text-emerald-500">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">{item.title}</p>
                  <p className="text-xs text-zinc-500">{new Date(item.date).toLocaleString()}</p>
                </div>
              </div>
              <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/5 ${
                item.impact === 'High' ? 'text-red-500' : item.impact === 'Medium' ? 'text-amber-500' : 'text-emerald-500'
              }`}>
                {item.impact}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
