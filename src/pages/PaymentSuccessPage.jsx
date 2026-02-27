import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, ShoppingBag, Home, Download, XCircle } from 'lucide-react';
import { api } from '../utils/api';

const PaymentSuccessPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState(null);
  
  const type = searchParams.get('type');
  const itemId = searchParams.get('item_id');
  const purchaseType = searchParams.get('purchase_type');
  const orderId = searchParams.get('order_id');
  const totalPrice = searchParams.get('total_price');

  useEffect(() => {
    // Обрабатываем успешную оплату
    const processPayment = async () => {
      try {
        setProcessing(true);
        
        if (type === 'cart') {
          // Покупка из корзины - обрабатываем все товары
          await api.post('/payment/process-cart', {
            success: true
          });
        } else if (type === 'beat' && itemId) {
          // Покупка бита
          const formData = new FormData();
          formData.append('purchase_type', purchaseType || 'mp3');
          formData.append('payment_success', 'true');
          
          await api.post(`/beats/${itemId}/purchase`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else if (type === 'course' && itemId) {
          // Покупка курса
          const formData = new FormData();
          formData.append('payment_success', 'true');
          await api.post(`/courses/${itemId}/purchase`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
        } else if (type === 'order' && orderId) {
          // Оплата заказа услуги
          await api.post(`/service-orders/${orderId}/payment`, {
            success: true
          });
        }
        
        setProcessing(false);
      } catch (err) {
        console.error('Error processing payment:', err);
        // Преобразуем ошибку в строку, чтобы избежать проблем с рендерингом объектов
        let errorMessage = 'Ошибка обработки оплаты';
        if (err.response?.data) {
          if (typeof err.response.data.detail === 'string') {
            errorMessage = err.response.data.detail;
          } else if (Array.isArray(err.response.data.detail)) {
            // Ошибки валидации Pydantic
            errorMessage = err.response.data.detail.map(e => e.msg || JSON.stringify(e)).join(', ');
          } else if (typeof err.response.data.detail === 'object') {
            errorMessage = JSON.stringify(err.response.data.detail);
          }
        }
        setError(errorMessage);
        setProcessing(false);
      }
    };

    processPayment();
  }, [type, itemId, purchaseType, orderId]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-neutral-400">Обработка оплаты...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-neutral-800 flex items-center justify-center px-4">
        <div className="max-w-md w-full card">
          <div className="card-content text-center">
            <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Ошибка</h1>
            <p className="text-gray-600 dark:text-neutral-400 mb-6">{error}</p>
            <Link to="/" className="btn btn-primary">
              На главную
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-green-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Оплата успешна!</h1>
            <p className="text-gray-600 dark:text-neutral-400">
              Спасибо за ваш заказ
            </p>
          </div>
          
          <div className="card-content">
            {totalPrice && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg text-center">
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Оплачено:</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {parseFloat(totalPrice).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <Link
                to="/purchases"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors h-14 text-base"
              >
                <ShoppingBag className="h-5 w-5" />
                Мои покупки
              </Link>
              
              <Link
                to="/"
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gray-200 hover:bg-gray-300 text-black dark:text-white rounded-lg font-medium transition-colors h-14 text-base"
              >
                <Home className="h-5 w-5" />
                На главную
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccessPage;



