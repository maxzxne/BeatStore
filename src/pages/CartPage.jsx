import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import BeatCard from '../components/BeatCard';
import { api } from '../utils/api';
import { ShoppingCart, Trash2 } from 'lucide-react';

const CartPage = () => {
  const { isAuthenticated } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCart();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/cart');
      setCartItems(response.data);
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (beatId) => {
    try {
      await api.delete(`/beats/${beatId}/cart`);
      setCartItems(cartItems.filter(item => item.id !== beatId));
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  const totalPrice = cartItems.reduce((sum, item) => sum + item.price, 0);

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-dark-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Войдите для просмотра корзины</h1>
          <p className="text-dark-400">Вам нужно войти в систему, чтобы увидеть корзину.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-600">Загрузка корзины...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Корзина</h1>
        <p className="text-dark-400">
          {cartItems.length} товаров в корзине
        </p>
      </div>

      {cartItems.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-16 w-16 text-dark-400 mx-auto mb-4" />
          <div className="text-dark-400 text-lg">Ваша корзина пуста</div>
          <p className="text-dark-500 mt-2">
            Добавьте биты в корзину, чтобы начать
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="space-y-4">
              {cartItems.map(beat => (
                <div key={beat.id} className="card">
                  <div className="card-content py-4">
                    <div className="flex items-center space-x-4 min-h-[80px]">
                      <div className="flex items-center justify-center">
                        {beat.cover_url ? (
                          <img
                            src={`http://localhost:8000${beat.cover_url}`}
                            alt={beat.title}
                            className="w-16 h-16 object-cover rounded"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-300 rounded flex items-center justify-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-black bg-opacity-5"></div>
                            <div className="relative z-10">
                              <span className="text-gray-600 text-xs font-medium">BeatStore</span>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 flex flex-col justify-center">
                        <h3 className="font-semibold text-black">{beat.title}</h3>
                        <p className="text-gray-600 text-sm">{beat.artist}</p>
                        <p className="text-gray-600 text-sm">{beat.genre} • {beat.bpm} BPM</p>
                      </div>
                      
                      <div className="text-right flex flex-col justify-center">
                        <div className="text-lg font-bold text-black">
                          {beat.price === 0 ? 'Бесплатно' : `${beat.price.toFixed(0)} ₽`}
                        </div>
                        <button
                          onClick={() => removeFromCart(beat.id)}
                          className="text-dark-400 hover:text-red-500 mt-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Summary */}
          <div>
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-black">Сводка заказа</h2>
              </div>
              
              <div className="card-content">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Промежуточный итог:</span>
                    <span className="text-black">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span className="text-gray-600">Товаров:</span>
                    <span className="text-black">{cartItems.length}</span>
                  </div>
                  
                  <hr className="border-gray-300" />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span className="text-black">Итого:</span>
                    <span className="text-black">{totalPrice === 0 ? '0 ₽' : `${totalPrice.toFixed(0)} ₽`}</span>
                  </div>
                </div>
              </div>
              
              <div className="card-footer">
                <button
                  className="btn btn-primary w-full"
                  disabled={cartItems.length === 0 || totalPrice > 0}
                  title={totalPrice > 0 ? "Оплата онлайн будет доступна позже" : ""}
                >
                  {totalPrice > 0 ? "Оплата онлайн будет доступна позже" : "Перейти к оплате"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom padding to prevent overlap with mini player */}
      <div className="h-20"></div>
    </div>
  );
};

export default CartPage;
