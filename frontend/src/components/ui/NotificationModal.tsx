
import React from 'react';
import Button from './Button';

interface NotificationModalProps {
  isOpen: boolean;
  message: string;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}

const NotificationModal: React.FC<NotificationModalProps> = ({ isOpen, message, onClose, type = 'success' }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center animate-in zoom-in-95 slide-in-from-bottom-10 duration-300" onClick={(e) => e.stopPropagation()}>
        <div className="mb-6">
          <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Awesome!</h3>
          <p className="text-slate-600 dark:text-slate-400 font-medium">{message}</p>
        </div>
        <Button onClick={onClose} className="w-full text-lg py-4" variant="primary">
          OKAY
        </Button>
      </div>
    </div>
  );
};

export default NotificationModal;
