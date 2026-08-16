import React from 'react';
import clsx from 'clsx';

export function Button({ variant = 'primary', className, type = 'button', children, ...props }) {
  return (
    <button
      type={type}
      className={clsx(
        'v3-btn',
        variant === 'primary' && 'v3-btn-primary',
        variant === 'secondary' && 'v3-btn-secondary',
        variant === 'ghost' && 'v3-btn-ghost',
        variant === 'danger' && 'v3-btn-danger',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function IconButton({ className, label, children, ...props }) {
  return (
    <button type="button" className={clsx('v3-icon-btn', className)} aria-label={label} {...props}>
      {children}
    </button>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="block">
      {label && <span className="v3-label mb-2 block">{label}</span>}
      {children}
      {error && <p className="v3-field-error">{error}</p>}
    </label>
  );
}

export function TextInput({ className, ...props }) {
  return <input className={clsx('v3-input', className)} {...props} />;
}

export function EmptyState({ title, action }) {
  return (
    <div className="v3-empty">
      <p>{title}</p>
      {action}
    </div>
  );
}

export function ErrorState({ title, action }) {
  return (
    <div className="v3-error">
      <p>{title}</p>
      {action}
    </div>
  );
}

export function Skeleton({ className, style }) {
  return <div className={clsx('v3-skeleton', className)} style={style} />;
}

export function Modal({ open, onClose, children, labelledBy }) {
  if (!open) return null;
  return (
    <div className="v3-sheet" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <button type="button" className="v3-sheet-overlay" aria-label="Закрыть" onClick={onClose} />
      <div className="v3-sheet-panel">{children}</div>
    </div>
  );
}
