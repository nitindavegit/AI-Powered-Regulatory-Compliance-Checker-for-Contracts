import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

const Login = lazy(() => import('./pages/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Upload = lazy(() => import('./pages/Upload'));
const Analysis = lazy(() => import('./pages/Analysis'));
const Settings = lazy(() => import('./pages/Settings'));
const Users = lazy(() => import('./pages/Users'));

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-[#0A0A0A] text-zinc-100 font-sans">
          <Navbar />
          <main className="pl-64 min-h-screen">
            <Suspense fallback={<div className="p-6 text-sm text-zinc-400">Loading...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/upload"
                  element={
                    <ProtectedRoute>
                      <Upload />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analysis"
                  element={
                    <ProtectedRoute>
                      <Analysis />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <ProtectedRoute>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route path="/" element={<Navigate to="/dashboard" />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </Router>
    </AuthProvider>
  );
}
