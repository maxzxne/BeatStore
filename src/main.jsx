import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './v2/v2.css'
import './v3/v3.css'

// Предотвращаем фокус на неинтерактивных элементах
document.addEventListener('mousedown', (e) => {
  const target = e.target;
  // Если кликнули на элемент, который не должен получать фокус
  if (
    target.tagName !== 'INPUT' &&
    target.tagName !== 'TEXTAREA' &&
    target.tagName !== 'SELECT' &&
    target.tagName !== 'BUTTON' &&
    target.tagName !== 'A' &&
    !target.closest('input') &&
    !target.closest('textarea') &&
    !target.closest('select') &&
    !target.closest('button') &&
    !target.closest('a') &&
    target.getAttribute('contenteditable') !== 'true' &&
    !target.closest('[contenteditable="true"]') &&
    target.getAttribute('tabindex') !== '0' &&
    !target.closest('[tabindex="0"]')
  ) {
    // Убираем фокус с текущего элемента, если он не интерактивный
    if (document.activeElement && 
        document.activeElement.tagName !== 'INPUT' &&
        document.activeElement.tagName !== 'TEXTAREA' &&
        document.activeElement.tagName !== 'SELECT' &&
        document.activeElement.tagName !== 'BUTTON' &&
        document.activeElement.tagName !== 'A' &&
        document.activeElement.getAttribute('contenteditable') !== 'true' &&
        document.activeElement.getAttribute('tabindex') !== '0') {
      document.activeElement.blur();
    }
  }
}, true);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

