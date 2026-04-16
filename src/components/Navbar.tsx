import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, LayoutDashboard, Upload, FileSearch, LogOut, Bell, Settings } from 'lucide-react';

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/upload', icon: Upload, label: 'Upload', roles: ['Client', 'Admin'] },
    { path: '/analysis', icon: FileSearch, label: 'Analysis' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/users', icon: Shield, label: 'User Management', roles: ['Admin'] },
  ];

  return (
    <nav className="fixed left-0 top-0 h-full w-64 bg-[#141414] text-white border-r border-white/10 z-50">
      <div className="p-6 flex items-center gap-3 border-bottom border-white/5">
        <Shield className="w-8 h-8 text-emerald-500" />
        <span className="text-xl font-bold tracking-tight">ComplyChain AI</span>
      </div>

      <div className="mt-8 px-4 space-y-2">
        {navItems.filter(item => !item.roles || item.roles.includes(user.role)).map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              location.pathname === item.path
                ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </div>

      <div className="absolute bottom-0 left-0 w-full p-6 border-t border-white/5">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
            {user.name[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-zinc-500 truncate">{user.role}</p>
          </div>
          <button className="text-zinc-500 hover:text-white">
            <Bell className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-400/5 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
