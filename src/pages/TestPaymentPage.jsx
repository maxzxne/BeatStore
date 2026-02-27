import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, CreditCard, Loader } from 'lucide-react';

const TestPaymentPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Получаем параметры из URL
  const type = searchParams.get('type'); // 'cart', 'beat', 'course', 'order'
  const itemId = searchParams.get('item_id'); // ID бита/курса
  const purchaseType = searchParams.get('purchase_type'); // 'mp3', 'wav', 'exclusive' для битов
  const orderId = searchParams.get('order_id'); // ID заказа услуги
  const totalPrice = searchParams.get('total_price'); // Общая сумма

  const handleSuccess = () => {
    // Переходим на страницу успеха с параметрами
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (itemId) params.append('item_id', itemId);
    if (purchaseType) params.append('purchase_type', purchaseType);
    if (orderId) params.append('order_id', orderId);
    if (totalPrice) params.append('total_price', totalPrice);
    
    navigate(`/payment/success?${params.toString()}`);
  };

  const handleFailure = () => {
    // Переходим на страницу неуспеха с параметрами
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (itemId) params.append('item_id', itemId);
    if (purchaseType) params.append('purchase_type', purchaseType);
    if (orderId) params.append('order_id', orderId);
    if (totalPrice) params.append('total_price', totalPrice);
    
    navigate(`/payment/failure?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-yellow-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <CreditCard className="h-10 w-10 text-yellow-600" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Тестовая оплата</h1>
            <p className="text-gray-600 dark:text-neutral-400 text-sm">
              Это временная страница для тестирования процесса оплаты
            </p>
          </div>
          
          <div className="card-content">
            {totalPrice && (
              <div className="mb-6 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-neutral-400 mb-1">Сумма к оплате:</p>
                <p className="text-2xl font-bold text-black dark:text-white">
                  {parseFloat(totalPrice).toLocaleString('ru-RU')} ₽
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              <button
                onClick={handleSuccess}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors h-14 text-base"
              >
                <CheckCircle className="h-5 w-5" />
                Успешная оплата
              </button>
              
              <button
                onClick={handleFailure}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors h-14 text-base"
              >
                <XCircle className="h-5 w-5" />
                Неуспешная оплата
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Внимание:</strong> Это тестовая страница. В будущем здесь будет подключен реальный эквайринг.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestPaymentPage;



