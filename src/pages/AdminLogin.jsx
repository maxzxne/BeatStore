import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Lock, User } from 'lucide-react';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await adminLogin(username, password);
    
    if (result.success) {
      navigate('/admin/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center transition-colors">
      <div className="max-w-md w-full mx-4">
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-black dark:bg-neutral-700 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Lock className="h-8 w-8 text-white dark:text-white" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white dark:text-white">Вход в админку</h1>
            <p className="text-gray-600 dark:text-neutral-400 dark:text-neutral-400">Войдите для доступа к админ панели</p>
          </div>
          
          <form onSubmit={handleSubmit} className="card-content space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-md">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Имя пользователя
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-300 z-10 pointer-events-none" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input pl-10"
                  placeholder="Введите имя пользователя"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black dark:text-white dark:text-white mb-2">
                Пароль
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 dark:text-neutral-300 z-10 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="Введите пароль"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="btn w-full h-12 text-base bg-black text-white hover:bg-gray-800 dark:bg-neutral-700 dark:text-white dark:hover:bg-neutral-600"
            >
              {loading ? 'Вход...' : 'Войти'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;


