import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiUrl, describeApiTarget } from '../config/api';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  signup: (name: string, email: string, password: string, role?: Role) => Promise<User>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

console.log('API target configured as:', describeApiTarget());

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/auth/me'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        localStorage.removeItem('auth_token');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      localStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, role?: Role) => {
    setIsLoading(true);
    try {
      const url = apiUrl('/api/auth/signin');
      console.log('Login request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        let errorMsg = 'Login failed';
        try {
          const error = await response.json();
          errorMsg = error.error || errorMsg;
        } catch (e) {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setIsLoading(false);
      return data.user as User;
    } catch (error) {
      setIsLoading(false);
      console.error('Login error:', error);
      if (error instanceof TypeError) {
        throw new Error('Cannot reach the server. Start the backend and try again.');
      }
      throw error;
    }
  };

  const signup = async (name: string, email: string, password: string, role: Role = 'Client') => {
    setIsLoading(true);
    try {
      const url = apiUrl('/api/auth/signup');
      console.log('Signup request to:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, email, password, role }),
      });

      console.log('Signup response status:', response.status);

      if (!response.ok) {
        let errorMsg = 'Signup failed';
        try {
          const error = await response.json();
          errorMsg = error.error || errorMsg;
        } catch (e) {
          errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      localStorage.setItem('auth_token', data.token);
      setUser(data.user);
      setIsLoading(false);
      return data.user as User;
    } catch (error) {
      setIsLoading(false);
      console.error('Signup error:', error);
      if (error instanceof TypeError) {
        throw new Error('Cannot reach the server. Start the backend and try again.');
      }
      throw error;
    }
  };

  const logout = async () => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      try {
        await fetch(apiUrl('/api/auth/signout'), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
      } catch (error) {
        console.error('Logout API call failed:', error);
      }
    }

    localStorage.removeItem('auth_token');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      login,
      signup,
      logout,
      isAuthenticated: !!user,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
