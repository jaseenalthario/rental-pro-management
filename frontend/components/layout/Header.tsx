import React, { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
// FIX: Removed unused imports for SunIcon and MoonIcon to resolve build errors, as they are not exported from the icons module.

const Header: React.FC<{ pageTitle: string }> = ({ pageTitle }) => {
  const { user } = useAuth();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good Morning');
    else if (hour < 18) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, []);

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 p-4 flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white capitalize">{pageTitle.replace('-', ' ')}</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">{greeting}, {user?.name || 'User'}</p>
      </div>
      <div className="flex items-center space-x-4">
        <div className="text-right hidden sm:block">
            <p className="font-semibold text-sm text-slate-800 dark:text-white">{user?.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user?.role}</p>
        </div>
        <div className="w-10 h-10 rounded-full bg-blue-500/20 text-blue-500 dark:text-blue-300 flex items-center justify-center font-bold text-lg ring-2 ring-white dark:ring-slate-900">
            {user?.name?.charAt(0)}
        </div>
      </div>
    </header>
  );
};

export default Header;