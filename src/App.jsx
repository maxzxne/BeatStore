/**
 * Главный компонент приложения XWinner.beats.please
 *
 * Official beat store for XWinner. Public UI is V2 only
 * (dark OLED + acid green + Syne/Poppins).
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AudioPlayerProvider } from './contexts/AudioPlayerContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SiteSettingsProvider } from './contexts/SiteSettingsContext';
import LayoutV2 from './v2/LayoutV2';
import HomePageV2 from './v2/HomePageV2';
import BeatPageV2 from './v2/BeatPageV2';
import CoursesPageV2 from './v2/CoursesPageV2';
import TelegramInit from './components/TelegramInit';
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

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SiteSettingsProvider>
          <AudioPlayerProvider>
            <NotificationProvider>
              <TelegramInit />
              <Router>
                <Routes>
                  <Route path="/" element={<LayoutV2 />}>
                    <Route index element={<HomePageV2 />} />
                    <Route path="beat/:id" element={<BeatPageV2 />} />
                    <Route path="courses" element={<CoursesPageV2 />} />
                    <Route path="course/:id" element={<CourseDetailPage />} />
                    <Route path="order" element={<OrderPage />} />
                    <Route path="profile" element={<ProfilePage />} />
                    <Route path="favorites" element={<FavoritesPage />} />
                    <Route path="cart" element={<CartPage />} />
                    <Route path="purchases" element={<PurchasesPage />} />
                    <Route path="success" element={<SuccessPage />} />
                    <Route path="test-payment" element={<TestPaymentPage />} />
                    <Route path="payment/success" element={<PaymentSuccessPage />} />
                    <Route path="payment/failure" element={<PaymentFailurePage />} />
                    <Route path="privacy" element={<PrivacyPolicyPage />} />
                    <Route path="terms" element={<TermsOfUsePage />} />
                    <Route path="consent-personal-data" element={<PersonalDataConsentPage />} />
                    <Route path="cookies" element={<CookiesPolicyPage />} />
                  </Route>

                  {/* Full-page auth; html.ui-v2 forced in main.jsx */}
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/register" element={<RegisterPage />} />

                  <Route path="/admin/login" element={<AdminLogin />} />
                  <Route path="/admin" element={<LayoutV2 admin />}>
                    <Route index element={<AdminDashboard />} />
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="beats" element={<AdminBeats />} />
                    <Route path="courses" element={<AdminCourses />} />
                    <Route path="upload" element={<AdminUpload />} />
                    <Route path="purchases" element={<AdminPurchases />} />
                    <Route path="orders" element={<AdminOrders />} />
                    <Route path="revenue" element={<AdminRevenue />} />
                    <Route path="errors" element={<AdminErrors />} />
                    <Route path="oauth-settings" element={<AdminOAuthSettings />} />
                  </Route>

                  <Route path="*" element={<ErrorPage />} />
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
