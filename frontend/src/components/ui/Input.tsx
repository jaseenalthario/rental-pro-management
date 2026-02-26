import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  leftIcon?: React.ReactNode;
}

const Input: React.FC<InputProps> = ({ label, id, leftIcon, ...props }) => {
  const hasIcon = !!leftIcon;
  return (
    <div>
      {label && <label htmlFor={id} className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
        {label}
      </label>}
      <div className="relative">
        {hasIcon && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {leftIcon}
            </div>
        )}
        <input
            id={id}
            className={`block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900 ${hasIcon ? 'pl-10' : ''}`}
            {...props}
        />
      </div>
    </div>
  );
};

export default Input;