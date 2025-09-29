import React from 'react';
import XCircleIcon from './icons/XCircleIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface AlertProps {
  type: 'success' | 'error';
  message: string;
}

const Alert: React.FC<AlertProps> = ({ type, message }) => {
  const isError = type === 'error';

  const config = {
    bgColor: isError ? 'bg-red-100' : 'bg-green-100',
    borderColor: isError ? 'border-red-400' : 'border-green-400',
    textColor: isError ? 'text-red-700' : 'text-green-700',
    icon: isError ? <XCircleIcon className="h-5 w-5" /> : <CheckCircleIcon className="h-5 w-5" />,
  };

  if (!message) return null;

  return (
    <div className={`${config.bgColor} border-l-4 ${config.borderColor} p-4 mb-4 rounded-md`} role="alert">
      <div className="flex">
        <div className="py-1">
          {config.icon}
        </div>
        <div className="ml-3">
          <p className={`text-sm ${config.textColor}`}>{message}</p>
        </div>
      </div>
    </div>
  );
};

export default Alert;
