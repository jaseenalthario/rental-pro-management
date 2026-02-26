import React from 'react';
import { useData } from '../context/DataContext';
import DashboardCard from '../components/ui/DashboardCard';
import { UsersIcon, BoxIcon, ArrowRightLeftIcon, AlertTriangleIcon } from '../components/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DUMMY_REPORTS_DATA } from '../data/dummyData';

const Dashboard: React.FC = () => {
    const { customers, items, rentals, alerts } = useData();
    const totalItemsRented = rentals.reduce((sum, rental) => sum + rental.items.length, 0);
    
    // Calculate overdue rentals count
    const overdueRentalsCount = rentals.filter(rental => {
        if ((rental.status === 'Rented' || rental.status === 'Partially Returned') && rental.expectedReturnDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const returnDate = new Date(rental.expectedReturnDate);
            if (!isNaN(returnDate.getTime()) && returnDate < today) {
                const hasOutstandingItems = rental.items.some(
                    item => (item.returnedQuantity || 0) < item.quantity
                );
                return hasOutstandingItems;
            }
        }
        return false;
    }).length;

    const alertSeverityClasses = {
        high: 'bg-red-500/10 border-red-500/20 text-red-500 dark:text-red-400',
        medium: 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400',
        low: 'bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400',
    };

    return (
        <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <DashboardCard title="Total Customers" value={customers.length} icon={<UsersIcon className="h-6 w-6"/>} color="text-blue-500" />
                <DashboardCard title="Total Inventory" value={items.reduce((sum, item) => sum + item.quantity, 0)} icon={<BoxIcon className="h-6 w-6"/>} color="text-emerald-500" />
                <DashboardCard title="Items Rented Out" value={totalItemsRented} icon={<ArrowRightLeftIcon className="h-6 w-6"/>} color="text-amber-500" />
                <DashboardCard title="Overdue Rentals" value={overdueRentalsCount} icon={<AlertTriangleIcon className="h-6 w-6"/>} color="text-red-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Monthly Income Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Monthly Income</h3>
                    <div style={{ width: '100%', height: 300 }}>
                        <ResponsiveContainer>
                            <BarChart data={DUMMY_REPORTS_DATA.monthlyIncome}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.1)"/>
                                <XAxis dataKey="name" tick={{ fill: 'rgb(100 116 139)' }} fontSize={12} axisLine={false} tickLine={false}/>
                                <YAxis tick={{ fill: 'rgb(100 116 139)' }} fontSize={12} axisLine={false} tickLine={false}/>
                                <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.1)'}} contentStyle={{ backgroundColor: 'rgb(15 23 42 / 0.8)', border: '1px solid rgb(51 65 85)', borderRadius: '0.75rem' }}/>
                                <Legend wrapperStyle={{fontSize: "14px"}}/>
                                <Bar dataKey="income" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Alerts Panel */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-4">Notifications & Alerts</h3>
                    <div className="space-y-4 max-h-[300px] min-h-[100px] overflow-y-auto pr-2">
                        {alerts.length > 0 ? alerts.map(alert => (
                             <div key={alert.id} className={`p-4 border-l-4 rounded-r-lg ${alertSeverityClasses[alert.severity]}`}>
                                <p className="font-bold text-sm">{alert.type}</p>
                                <p className="text-sm opacity-90">{alert.message}</p>
                            </div>
                        )) : (
                            <div className="flex items-center justify-center h-full text-center text-slate-500 dark:text-slate-400">
                                <p>No active alerts. <br/> Everything looks good!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;