import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [adminUser, setAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const adminToken = localStorage.getItem('adminToken');
    
    if (token) {
      fetchUser();
    } else if (adminToken) {
      fetchAdminUser();
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async () => {
    try {
      const response = await api.get('/me');
      setUser(response.data);
    } catch (error) {
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUser = async () => {
    try {
      const response = await api.get('/me', {
        headers: { Authorization: `Bearer ${localStorage.getItem('adminToken')}` }
      });
      if (response.data.is_admin) {
        setAdminUser(response.data);
      } else {
        localStorage.removeItem('adminToken');
        setAdminUser(null);
      }
    } catch (error) {
      localStorage.removeItem('adminToken');
      setAdminUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      const response = await api.post('/login', { username, password });
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      await fetchUser();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Login failed' 
      };
    }
  };

  const adminLogin = async (username, password) => {
    try {
      const response = await api.post('/api/admin/login', { username, password });
      const { access_token } = response.data;
      localStorage.setItem('adminToken', access_token);
      localStorage.removeItem('token'); // Удаляем обычный токен
      setUser(null); // Сбрасываем обычного пользователя
      await fetchAdminUser();
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Admin login failed' 
      };
    }
  };

  const register = async (email, username, password) => {
    try {
      await api.post('/register', { email, username, password });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || 'Registration failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    setUser(null);
    setAdminUser(null);
  };

  const value = {
    user,
    adminUser,
    loading,
    login,
    adminLogin,
    register,
    logout,
    isAuthenticated: !!user,
    isAdminAuthenticated: !!adminUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
