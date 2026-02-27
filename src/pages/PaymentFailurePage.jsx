import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { XCircle, Home, RefreshCw } from 'lucide-react';

const PaymentFailurePage = () => {
  const [searchParams] = useSearchParams();
  
  const type = searchParams.get('type');
  const itemId = searchParams.get('item_id');
  const purchaseType = searchParams.get('purchase_type');
  const orderId = searchParams.get('order_id');
  const totalPrice = searchParams.get('total_price');

  // Формируем URL для повторной попытки оплаты
  const getRetryUrl = () => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (itemId) params.append('item_id', itemId);
    if (purchaseType) params.append('purchase_type', purchaseType);
    if (orderId) params.append('order_id', orderId);
    if (totalPrice) params.append('total_price', totalPrice);
    
    return `/test-payment?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-neutral-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="card">
          <div className="card-header text-center">
            <div className="bg-red-100 rounded-full p-4 w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <XCircle className="h-10 w-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-black dark:text-white mb-2">Оплата не прошла</h1>
            <p className="text-gray-600 dark:text-neutral-400">
              К сожалению, произошла ошибка при обработке платежа
            </p>
          </div>
          
          <div className="card-content">
            <div className="mb-6 p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                Возможные причины:
              </p>
              <ul className="text-xs text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>Недостаточно средств на карте</li>
                <li>Ошибка банка</li>
                <li>Превышен лимит операции</li>
                <li>Технические проблемы</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <Link
                to={getRetryUrl()}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-black hover:bg-gray-800 text-white rounded-lg font-medium transition-colors h-14 text-base"
              >
                <RefreshCw className="h-5 w-5" />
                Попробовать снова
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

export default PaymentFailurePage;



