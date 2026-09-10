import React, { createContext, useContext, useState } from 'react';
import Notification from '../components/Notification';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const showNotification = (message, type = 'info', duration = 5000) => {
    const id = Date.now() + Math.random();
    const notification = { id, message, type, duration };
    
    setNotifications(prev => [...prev, notification]);
    
    return id;
  };

  const hideNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  const showSuccess = (message, duration) => showNotification(message, 'success', duration);
  const showError = (message, duration) => showNotification(message, 'error', duration);
  const showWarning = (message, duration) => showNotification(message, 'warning', duration);
  const showInfo = (message, duration) => showNotification(message, 'info', duration);

  return (
    <NotificationContext.Provider value={{
      showNotification,
      hideNotification,
      showSuccess,
      showError,
      showWarning,
      showInfo
    }}>
      {children}

      {notifications.length > 0 && (
        <div
          className="pointer-events-none fixed inset-x-0 z-40 flex flex-col items-end gap-2 px-4"
          style={{ top: 'calc(var(--header-h, 4.5rem) + 0.75rem)' }}
          aria-live="polite"
        >
          {notifications.map(notification => (
            <Notification
              key={notification.id}
              message={notification.message}
              type={notification.type}
              duration={notification.duration}
              onClose={() => hideNotification(notification.id)}
            />
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
};

