
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { DataProvider, useData } from './context/DataContext';
import { SettingsProvider } from './context/SettingsContext';
import { UserProvider } from './context/UserContext';
import { Page } from './types';

import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import CheckOut from './pages/CheckOut';
import CheckIn from './pages/CheckIn';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import BalancePayments from './pages/BalancePayments';
import OverdueRentals from './pages/OverdueRentals';
import NotificationModal from './components/ui/NotificationModal';

const AppContent: React.FC = () => {
    const { user } = useAuth();
    const { notification, hideNotification } = useData();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');

    if (!user) {
        return <Login />;
    }

    const renderPage = () => {
        switch (currentPage) {
            case 'dashboard':
                return <Dashboard />;
            case 'customers':
                return <Customers />;
            case 'inventory':
                return <Inventory />;
            case 'check-out':
                return <CheckOut />;
            case 'check-in':
                return <CheckIn />;
            case 'balance-payments':
                return <BalancePayments />;
            case 'overdue-rentals':
                return <OverdueRentals />;
            case 'reports':
                return <Reports />;
            case 'settings':
                return <Settings />;
            default:
                return <Dashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 font-sans">
            <Sidebar currentPage={currentPage} setCurrentPage={setCurrentPage} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header pageTitle={currentPage} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-6 lg:p-8">
                    {renderPage()}
                </main>
            </div>
            
            <NotificationModal 
              isOpen={notification.isOpen} 
              message={notification.message} 
              onClose={hideNotification} 
              type={notification.type}
            />
        </div>
    );
};

const App: React.FC = () => {
    return (
        <DataProvider>
            <SettingsProvider>
                <UserProvider>
                    <AuthProvider>
                        <AppContent />
                    </AuthProvider>
                </UserProvider>
            </SettingsProvider>
        </DataProvider>
    );
};

export default App;
