import React from 'react';
import type { ToastMessage } from '../types';

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast-card toast-${toast.type}`}>
          <div className="toast-icon">
            {toast.type === 'success' && '✓'}
            {toast.type === 'error' && '✕'}
            {toast.type === 'info' && 'ℹ'}
          </div>
          <div className="toast-content">
            <h5 className="toast-title">{toast.title}</h5>
            {toast.description && <p className="toast-desc">{toast.description}</p>}
            {toast.txHash && (
              <code className="toast-tx">
                Tx: {toast.txHash.substring(0, 10)}...{toast.txHash.substring(toast.txHash.length - 6)}
              </code>
            )}
          </div>
          <button className="toast-close" onClick={() => onDismiss(toast.id)}>
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
