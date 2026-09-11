import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Notification = ({ message, type = 'info', onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose?.();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      default:
        return <Info className="h-5 w-5 text-[#22c55e]" />;
    }
  };

  const getBgColor = () => {
    switch (type) {
      case 'success':
        return 'bg-[#0a0a0a] border-[#22c55e]/35';
      case 'error':
        return 'bg-[#0a0a0a] border-red-500/40';
      case 'warning':
        return 'bg-[#0a0a0a] border-yellow-500/35';
      default:
        return 'bg-[#0a0a0a] border-white/10';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      role="status"
      className={`pointer-events-auto max-w-sm w-full ${getBgColor()} border rounded-lg shadow-lg transition-all duration-300`}
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            {getIcon()}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium text-white">
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleClose}
              className="inline-flex text-white/40 hover:text-white focus:outline-none focus:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Notification;

