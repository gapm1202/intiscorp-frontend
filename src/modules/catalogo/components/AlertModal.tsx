import React from 'react';
import { X, AlertCircle, CheckCircle, Info, XCircle } from 'lucide-react';

interface AlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'error' | 'success' | 'warning' | 'info';
}

const AlertModal: React.FC<AlertModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info'
}) => {
  if (!isOpen) return null;

  const typeConfig = {
    error: {
      icon: XCircle,
      iconColor: 'text-red-500',
      bgGradient: 'from-red-50 to-red-100',
      buttonColor: 'from-red-600 to-red-700 hover:from-red-700 hover:to-red-800'
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-500',
      bgGradient: 'from-green-50 to-green-100',
      buttonColor: 'from-green-600 to-green-700 hover:from-green-700 hover:to-green-800'
    },
    warning: {
      icon: AlertCircle,
      iconColor: 'text-yellow-500',
      bgGradient: 'from-yellow-50 to-yellow-100',
      buttonColor: 'from-yellow-600 to-yellow-700 hover:from-yellow-700 hover:to-yellow-800'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-500',
      bgGradient: 'from-blue-50 to-blue-100',
      buttonColor: 'from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
    }
  };

  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all animate-scale-in">
        {/* Header */}
        <div className={`bg-gradient-to-r ${config.bgGradient} p-6 rounded-t-2xl relative`}>
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <Icon className={`w-12 h-12 ${config.iconColor}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">{title}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 text-base leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 flex justify-end">
          <button
            onClick={onClose}
            className={`px-6 py-2.5 bg-gradient-to-r ${config.buttonColor} text-white rounded-lg font-medium shadow-lg transform transition-all hover:scale-105 active:scale-95`}
          >
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertModal;
