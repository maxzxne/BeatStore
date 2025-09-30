import React from 'react';
import { BrowserRouter as Router, Routes, Route, useRouteError } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import { NotificationProvider } from './contexts/NotificationContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import BeatPage from './pages/BeatPage';
import FavoritesPage from './pages/FavoritesPage';
import CartPage from './pages/CartPage';
import PurchasesPage from './pages/PurchasesPage';
import SuccessPage from './pages/SuccessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminBeats from './pages/AdminBeats';
import AdminUpload from './pages/AdminUpload';
import AdminPurchases from './pages/AdminPurchases';
import ErrorPage from './pages/ErrorPage';

function App() {
  return (
    <AuthProvider>
      <AudioPlayerProvider>
        <NotificationProvider>
          <Router>
            <Routes>
          {/* Public routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="beat/:id" element={<BeatPage />} />
            <Route path="favorites" element={<FavoritesPage />} />
            <Route path="cart" element={<CartPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="success" element={<SuccessPage />} />
          </Route>
          
          {/* Auth routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          
          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<Layout admin />}>
            <Route index element={<AdminDashboard />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="beats" element={<AdminBeats />} />
            <Route path="upload" element={<AdminUpload />} />
            <Route path="purchases" element={<AdminPurchases />} />
          </Route>
          
          {/* Error page */}
          <Route path="*" element={<ErrorPage />} />
            </Routes>
          </Router>
        </NotificationProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}

export default App;
