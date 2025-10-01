/**
 * Главный компонент приложения BeatStore
 * 
 * BeatStore - это веб-приложение для продажи музыкальных битов (инструменталов).
 * Позволяет пользователям:
 * - Просматривать каталог битов с фильтрацией
 * - Прослушивать демо-версии
 * - Добавлять биты в избранное и корзину
 * - Покупать биты (бесплатные и платные)
 * - Скачивать купленные биты
 * 
 * Администраторы могут:
 * - Загружать новые биты
 * - Просматривать аналитику продаж
 * - Управлять каталогом
 * 
 * Технологии: React, React Router, Context API, Tailwind CSS
 */

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

/**
 * Основной компонент приложения
 * Настраивает провайдеры контекста и маршрутизацию
 */
function App() {
  return (
    // Провайдеры контекста для глобального состояния
    <AuthProvider>                    {/* Управление аутентификацией пользователей и админов */}
      <AudioPlayerProvider>           {/* Глобальный аудио плеер для воспроизведения битов */}
        <NotificationProvider>        {/* Система уведомлений */}
          <Router>
            <Routes>
              {/* Публичные маршруты - доступны всем пользователям */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />                    {/* Главная страница с каталогом битов */}
                <Route path="beat/:id" element={<BeatPage />} />          {/* Страница отдельного бита */}
                <Route path="favorites" element={<FavoritesPage />} />    {/* Избранные биты */}
                <Route path="cart" element={<CartPage />} />              {/* Корзина покупок */}
                <Route path="purchases" element={<PurchasesPage />} />    {/* История покупок */}
                <Route path="success" element={<SuccessPage />} />        {/* Страница успешной покупки */}
              </Route>
              
              {/* Маршруты аутентификации */}
              <Route path="/login" element={<LoginPage />} />             {/* Вход в систему */}
              <Route path="/register" element={<RegisterPage />} />       {/* Регистрация */}
              
              {/* Административные маршруты */}
              <Route path="/admin/login" element={<AdminLogin />} />      {/* Вход для администраторов */}
              <Route path="/admin" element={<Layout admin />}>
                <Route index element={<AdminDashboard />} />              {/* Панель управления */}
                <Route path="dashboard" element={<AdminDashboard />} />   {/* Аналитика и статистика */}
                <Route path="beats" element={<AdminBeats />} />           {/* Управление битами */}
                <Route path="upload" element={<AdminUpload />} />         {/* Загрузка новых битов */}
                <Route path="purchases" element={<AdminPurchases />} />   {/* История всех покупок */}
              </Route>
              
              {/* Обработка ошибок */}
              <Route path="*" element={<ErrorPage />} />                  {/* 404 и другие ошибки */}
            </Routes>
          </Router>
        </NotificationProvider>
      </AudioPlayerProvider>
    </AuthProvider>
  );
}

export default App;
