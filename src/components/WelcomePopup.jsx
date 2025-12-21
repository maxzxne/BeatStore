import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';

const WelcomePopup = () => {
  const [isVisible, setIsVisible] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Проверяем, был ли попап уже закрыт
    const wasClosed = localStorage.getItem('welcomePopupClosed');
    if (!wasClosed) {
      setIsVisible(true);
    }
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    localStorage.setItem('welcomePopupClosed', 'true');
  };

  const handleNavigate = (path) => {
    navigate(path);
    handleClose();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-12 max-w-lg w-full relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-black transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex flex-col items-center space-y-4 mt-8">
          <button
            onClick={() => handleNavigate('/')}
            className="w-full px-6 py-4 border border-black rounded-lg hover:bg-gray-50 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black">
              КАТАЛОГ
            </span>
          </button>
          
          <button
            onClick={() => handleNavigate('/order')}
            className="w-full px-6 py-4 border border-black rounded-lg hover:bg-gray-50 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black">
              ЗАКАЗАТЬ
            </span>
          </button>
          
          <button
            onClick={() => handleNavigate('/courses')}
            className="w-full px-6 py-4 border border-black rounded-lg hover:bg-gray-50 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black">
              НАУЧИТЬСЯ
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;

