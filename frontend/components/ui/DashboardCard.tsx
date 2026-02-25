import React from 'react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string; // e.g., 'text-blue-500'
}

const DashboardCard: React.FC<DashboardCardProps> = ({ title, value, icon, color }) => {
  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
      <div className="flex justify-between items-start">
        <p className="text-sm text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">{title}</p>
        <div className={color}>{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-800 dark:text-white mt-2">{value}</p>
      </div>
    </div>
  );
};

export default DashboardCard;