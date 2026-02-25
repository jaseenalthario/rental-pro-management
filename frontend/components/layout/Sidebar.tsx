import React from 'react';
import { Page, UserRole } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useSettings } from '../../context/SettingsContext';
import { DashboardIcon, UsersIcon, BoxIcon, CheckInIcon, CheckOutIcon, ChartIcon, LogoutIcon, LogoIcon, SettingsIcon, CircleDollarSignIcon, AlertTriangleIcon } from '../icons';

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

const NavLink: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors duration-200 group ${
      isActive
        ? 'bg-blue-500/10 text-blue-400'
        : 'text-slate-400 hover:bg-slate-700 hover:text-slate-200'
    }`}
  >
    <div className={` ${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>{icon}</div>
    <span className="ml-4">{label}</span>
  </button>
);

const Sidebar: React.FC<SidebarProps> = ({ currentPage, setCurrentPage }) => {
  const { user, logout } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <DashboardIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'customers', label: 'Customers', icon: <UsersIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'inventory', label: 'Inventory', icon: <BoxIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'check-out', label: 'Item Out (Checkout)', icon: <CheckOutIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'check-in', label: 'Item In (Checkin)', icon: <CheckInIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'overdue-rentals', label: 'Overdue Rentals', icon: <AlertTriangleIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
    { id: 'balance-payments', label: 'Balance Payments', icon: <CircleDollarSignIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'reports', label: 'Reports', icon: <ChartIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER] },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-5 h-5" />, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.STAFF] },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-800 text-white flex flex-col p-4 border-r border-slate-700">
      <div className="flex items-center gap-3 text-2xl font-black mb-10 px-2 tracking-wider text-slate-200">
        {settings.logoUrl ? (
          <img src={settings.logoUrl} alt="Shop Logo" className="w-8 h-8 rounded-md object-contain"/>
        ) : (
          <LogoIcon className="w-8 h-8 text-blue-400"/>
        )}
        {settings.shopName}
      </div>
      <nav className="flex-1 space-y-2">
        {navItems.filter(item => user && item.roles.includes(user.role)).map((item) => (
          <NavLink
            key={item.id}
            icon={item.icon}
            label={item.label}
            isActive={currentPage === item.id}
            onClick={() => setCurrentPage(item.id as Page)}
          />
        ))}
      </nav>
      <div className="mt-auto">
         <button
            onClick={logout}
            className="w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors duration-200 group"
        >
            <LogoutIcon className="w-5 h-5 text-slate-500 group-hover:text-rose-400" />
            <span className="ml-4">Logout</span>
        </button>
        <div className="text-center text-xs text-slate-500 pt-6">
            Software Created by : <a href="https://althario.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-400 hover:text-slate-300">
                Al Thario
            </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;