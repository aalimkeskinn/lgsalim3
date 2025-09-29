import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      // Allow for fade-out animation before calling onClose
      setTimeout(onClose, 300);
    }, 2700);

    return () => clearTimeout(timer);
  }, [onClose]);
  
  const baseClasses = "fixed top-5 right-5 flex items-center p-4 rounded-lg shadow-lg z-50 transition-all duration-300 transform text-white";
  const typeClasses = {
    success: "bg-green-500",
    error: "bg-red-500",
  };
  const visibilityClasses = visible ? "translate-x-0 opacity-100" : "translate-x-10 opacity-0";

  return (
    <div className={`${baseClasses} ${typeClasses[type]} ${visibilityClasses}`}>
        <span className="material-symbols-outlined">{type === 'success' ? 'check_circle' : 'error'}</span>
        <span className="ml-3 font-medium">{message}</span>
    </div>
  );
};

export default Toast;