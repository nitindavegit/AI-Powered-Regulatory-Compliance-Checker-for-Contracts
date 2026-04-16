import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Lock, Mail, ChevronRight, User } from 'lucide-react';
import { motion } from 'motion/react';
import { Role } from '../types';

const Login: React.FC = () => {
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<Role>('Client');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login, signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      let authenticatedRole: Role | null = null;

      if (isSignup) {
        // Signup validation
        if (!name.trim()) {
          setError('Name is required');
          setIsLoading(false);
          return;
        }
        if (!email.trim()) {
          setError('Email is required');
          setIsLoading(false);
          return;
        }
        if (!password || password.length < 6) {
          setError('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setIsLoading(false);
          return;
        }

        const user = await signup(name, email, password, role);
        authenticatedRole = user.role;
      } else {
        // Login validation
        if (!email.trim()) {
          setError('Email is required');
          setIsLoading(false);
          return;
        }
        if (!password) {
          setError('Password is required');
          setIsLoading(false);
          return;
        }

        const user = await login(email, password);
        authenticatedRole = user.role;
      }

      const nextPath =
        authenticatedRole === 'Admin'
          ? '/users'
          : authenticatedRole === 'Legal Reviewer'
            ? '/analysis'
            : '/dashboard';

      navigate(nextPath);
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignup(!isSignup);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  const switchMode = (signupMode: boolean) => {
    if (isSignup === signupMode) return;
    setIsSignup(signupMode);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-[#0A0A0A] z-[100] pl-0">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 bg-zinc-900/50 border border-white/10 rounded-2xl backdrop-blur-xl"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mb-4 border border-emerald-500/20">
            <Shield className="w-8 h-8 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">ComplyChain AI</h1>
          <p className="text-zinc-400 mt-2">Regulatory Compliance Intelligence</p>
        </div>

        {/* Tab Toggle */}
        <div className="flex gap-2 mb-6 bg-black/50 p-1 rounded-lg border border-white/10">
          <button
            type="button"
            onClick={() => switchMode(false)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              !isSignup
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode(true)}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              isSignup
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Field - Only for Signup */}
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="text"
                  required={isSignup}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="name@company.com"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          {/* Confirm Password Field - Only for Signup */}
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  required={isSignup}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>
          )}

          {/* Access Role - only relevant for signup (new accounts) */}
          {isSignup && (
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Access Role</label>
              <div className="grid grid-cols-3 gap-3">
                {(['Admin', 'Legal Reviewer', 'Client'] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      role === r
                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                        : 'bg-black/50 border-white/10 text-zinc-500 hover:border-white/20'
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-600 disabled:cursor-not-allowed text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all group mt-6"
          >
            {isLoading ? 'Processing...' : (isSignup ? 'Create Account' : 'Sign In')}
            {!isLoading && <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-500">
            Secure, encrypted access to regulatory data. 
            <br />
            Powered by Gemini 3.1 Pro.
          </p>
        </div>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={toggleMode}
            className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            {isSignup ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
