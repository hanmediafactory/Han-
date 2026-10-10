import React from 'react';
import { CheckCircle2 } from 'lucide-react';

interface ToastProps {
  message: string;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  return (
    <div className="toast-notification animate-bounce-short">
      <CheckCircle2 size={16} className="text-text-primary" />
      <span>{message}</span>
    </div>
  );
};
