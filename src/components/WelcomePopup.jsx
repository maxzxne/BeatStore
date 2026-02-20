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
      <div className="bg-white dark:bg-neutral-900 rounded-lg p-12 max-w-lg w-full relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
        >
          <X className="h-6 w-6" />
        </button>
        
        <div className="flex flex-col items-center space-y-4 mt-8">
          <button
            onClick={() => handleNavigate('/')}
            className="w-full px-6 py-4 border border-black dark:border-white text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black dark:text-white">
              КАТАЛОГ
            </span>
          </button>
          
          <button
            onClick={() => handleNavigate('/order')}
            className="w-full px-6 py-4 border border-black dark:border-white text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black dark:text-white">
              ЗАКАЗАТЬ
            </span>
          </button>
          
          <button
            onClick={() => handleNavigate('/courses')}
            className="w-full px-6 py-4 border border-black dark:border-white text-black dark:text-white rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none text-center"
          >
            <span className="text-lg font-semibold text-black dark:text-white">
              НАУЧИТЬСЯ
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomePopup;

