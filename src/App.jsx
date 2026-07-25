/**
 * Главный компонент приложения XWinner.beats.please
 * 
 * XWinner.beats.please - это веб-приложение для продажи музыкальных битов (инструменталов).
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
import { ThemeProvider } from './contexts/ThemeContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import Layout from './components/Layout';
import TelegramInit from './components/TelegramInit';
import HomePage from './pages/HomePage';
import BeatPage from './pages/BeatPage';
import CoursesPage from './pages/CoursesPage';
import CourseDetailPage from './pages/CourseDetailPage';
import OrderPage from './pages/OrderPage';
import ProfilePage from './pages/ProfilePage';
import FavoritesPage from './pages/FavoritesPage';
import CartPage from './pages/CartPage';
import PurchasesPage from './pages/PurchasesPage';
import SuccessPage from './pages/SuccessPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import AdminBeats from './pages/AdminBeats';
import AdminErrors from './pages/AdminErrors';
import AdminCourses from './pages/AdminCourses';
import AdminUpload from './pages/AdminUpload';
import AdminPurchases from './pages/AdminPurchases';
import AdminOrders from './pages/AdminOrders';
import AdminOAuthSettings from './pages/AdminOAuthSettings';
import AdminRevenue from './pages/AdminRevenue';
import TestPaymentPage from './pages/TestPaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PaymentFailurePage from './pages/PaymentFailurePage';
import ErrorPage from './pages/ErrorPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfUsePage from './pages/TermsOfUsePage';
import PersonalDataConsentPage from './pages/PersonalDataConsentPage';
import CookiesPolicyPage from './pages/CookiesPolicyPage';

/**
 * Основной компонент приложения
 * Настраивает провайдеры контекста и маршрутизацию
 */
function App() {
  return (
    // Провайдеры контекста для глобального состояния
    <ThemeProvider>                   {/* Управление темой (тёмная/светлая) */}
      <AuthProvider>                    {/* Управление аутентификацией пользователей и админов */}
        <SiteSettingsProvider>          {/* Настройки сайта (видимость разделов) */}
        <AudioPlayerProvider>           {/* Глобальный аудио плеер для воспроизведения битов */}
          <NotificationProvider>        {/* Система уведомлений */}
            <TelegramInit />            {/* Инициализация Telegram Web App */}
            <Router>
            <Routes>
              {/* Публичные маршруты - доступны всем пользователям */}
              <Route path="/" element={<Layout />}>
                <Route index element={<HomePage />} />                    {/* Главная страница с каталогом битов */}
                <Route path="beat/:id" element={<BeatPage />} />          {/* Страница отдельного бита */}
                <Route path="courses" element={<CoursesPage />} />       {/* Страница курсов */}
                <Route path="course/:id" element={<CourseDetailPage />} /> {/* Страница детального просмотра курса */}
                <Route path="order" element={<OrderPage />} />           {/* Форма заказа услуг */}
                <Route path="profile" element={<ProfilePage />} />       {/* Личный кабинет */}
                <Route path="favorites" element={<FavoritesPage />} />    {/* Избранные биты */}
                <Route path="cart" element={<CartPage />} />              {/* Корзина покупок */}
                <Route path="purchases" element={<PurchasesPage />} />    {/* История покупок */}
                <Route path="success" element={<SuccessPage />} />        {/* Страница успешной покупки */}
                <Route path="test-payment" element={<TestPaymentPage />} />
                <Route path="payment/success" element={<PaymentSuccessPage />} />
                <Route path="payment/failure" element={<PaymentFailurePage />} />
                <Route path="privacy" element={<PrivacyPolicyPage />} />
                <Route path="terms" element={<TermsOfUsePage />} />
                <Route path="consent-personal-data" element={<PersonalDataConsentPage />} />
                <Route path="cookies" element={<CookiesPolicyPage />} />
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
                <Route path="courses" element={<AdminCourses />} />       {/* Управление курсами */}
                <Route path="upload" element={<AdminUpload />} />         {/* Загрузка новых битов и курсов */}
                <Route path="purchases" element={<AdminPurchases />} />   {/* История всех покупок */}
                <Route path="orders" element={<AdminOrders />} />         {/* Заявки на услуги */}
                <Route path="revenue" element={<AdminRevenue />} />       {/* Доходы */}
                <Route path="errors" element={<AdminErrors />} />         {/* Мониторинг ошибок */}
                <Route path="oauth-settings" element={<AdminOAuthSettings />} /> {/* Настройки OAuth */}
              </Route>
              
              {/* Обработка ошибок */}
              <Route path="*" element={<ErrorPage />} />                  {/* 404 и другие ошибки */}
            </Routes>
            </Router>
          </NotificationProvider>
        </AudioPlayerProvider>
        </SiteSettingsProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

