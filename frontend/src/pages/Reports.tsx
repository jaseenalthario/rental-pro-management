
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import DashboardCard from '../components/ui/DashboardCard';
import { BoxIcon, UsersIcon, DownloadIcon, CircleDollarSignIcon, ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon, AlertTriangleIcon } from '../components/icons';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Rental, Payment } from '../types';
import { useSortableData } from '../hooks/useSortableData';
import { useSettings } from '../context/SettingsContext';

// Type declarations for window-injected libraries from CDNs
declare const jspdf: any;
declare const XLSX: any;
declare const autoTable: any;

const MoneyIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <line x1="12" y1="1" x2="12" y2="23"></line>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
);

const FineIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line>
    </svg>
);

const Reports: React.FC = () => {
    const { rentals, items, customers } = useData();
    const { settings } = useSettings();
    const [searchTerm, setSearchTerm] = useState('');
    const [viewedRental, setViewedRental] = useState<Rental | null>(null);
    const [statusFilter, setStatusFilter] = useState('All');
    const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

    // State for tabs
    const [activeTab, setActiveTab] = useState<'overall' | 'customer'>('overall');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');

    const reportSummary = useMemo(() => {
        let totalRevenue = 0;
        let totalFines = 0;
        let totalDue = 0;
        let totalBalanceCollected = 0;
        // Fix: Corrected typo 'recent payments' to 'recentPayments' to resolve find name error.
        let recentPayments: (Payment & { customerName: string, rentalId: string })[] = [];

        rentals.forEach(rental => {
            totalRevenue += rental.totalAmount;
            totalFines += rental.fineAmount || 0;
            const paid = rental.paidAmount ?? rental.advancePayment;
            const balance = (rental.totalAmount + (rental.fineAmount || 0) - (rental.discountAmount || 0)) - paid;
            if (balance > 0) totalDue += balance;
            if (paid > rental.advancePayment) totalBalanceCollected += paid - rental.advancePayment;
            if (rental.paymentHistory) {
                const customer = customers.find(c => c.id === rental.customerId);
                rental.paymentHistory.forEach(p => {
                    recentPayments.push({ ...p, customerName: customer?.name || 'N/A', rentalId: rental.id });
                });
            }
        });

        const itemPopularity = rentals.flatMap(r => r.items).reduce((acc, ri) => {
            acc[ri.itemId] = (acc[ri.itemId] || 0) + ri.quantity;
            return acc;
        }, {} as Record<string, number>);

        // Fix: Explicitly cast Object.entries to [string, number][] to ensure arithmetic operation types are valid for sorting.
        const top5PopularItems = (Object.entries(itemPopularity) as [string, number][]).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([itemId, count]) => ({
            name: items.find(i => i.id === itemId)?.name || 'Unknown',
            value: count,
        }));

        const monthlyIncome = rentals.reduce((acc, rental) => {
            const month = new Date(rental.checkoutDate).toLocaleString('default', { month: 'short', year: '2-digit' });
            acc[month] = (acc[month] || 0) + rental.totalAmount;
            return acc;
        }, {} as Record<string, number>);

        const monthlyIncomeData = Object.entries(monthlyIncome).map(([name, income]) => {
            const [m, y] = name.split(' ');
            return { name, income, date: new Date(`${m} 1, 20${y}`) };
        }).sort((a, b) => a.date.getTime() - b.date.getTime()).map(({ name, income }) => ({ name, income }));

        // Fix: Updated return object to use the corrected 'recentPayments' variable name.
        return { totalRevenue, totalFines, totalDue, top5PopularItems, monthlyIncomeData, totalBalanceCollected, sortedRecentPayments: recentPayments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) };
    }, [rentals, items, customers]);

    const getBalanceDue = (rental: Rental) => {
        const paid = rental.paidAmount ?? rental.advancePayment;
        const totalCost = rental.totalAmount + (rental.fineAmount || 0) - (rental.discountAmount || 0);
        return totalCost - paid;
    };

    const enrichedRentals = useMemo(() => {
        let filtered = rentals.filter(r => (statusFilter === 'All' || r.status === statusFilter));
        if (dateFilter.start && dateFilter.end) {
            const start = new Date(dateFilter.start); start.setHours(0, 0, 0, 0);
            const end = new Date(dateFilter.end); end.setHours(23, 59, 59, 999);
            filtered = filtered.filter(r => { const d = new Date(r.checkoutDate); return d >= start && d <= end; });
        }
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(r => {
                const c = customers.find(cust => cust.id === r.customerId);
                const iList = r.items.map(ri => items.find(it => it.id === ri.itemId)?.name || '').join(', ');
                return (c?.name.toLowerCase().includes(term) || iList.toLowerCase().includes(term) || r.id.toLowerCase().includes(term));
            });
        }
        return filtered.map(r => ({
            ...r,
            customerName: customers.find(c => c.id === r.customerId)?.name || 'N/A',
            itemsList: r.items.map(ri => items.find(i => i.id === ri.itemId)?.name || '').join(', '),
            balance: getBalanceDue(r),
        }));
    }, [rentals, customers, items, searchTerm, statusFilter, dateFilter]);

    const { items: sortedRentals, requestSort, sortConfig } = useSortableData<any>(enrichedRentals, { key: 'checkoutDate', direction: 'descending' });

    const handleExportPDF = () => {
        const doc = new jspdf.jsPDF();
        const { shopName } = settings;
        doc.setFontSize(18); doc.text(shopName, 14, 15);
        doc.setFontSize(14); doc.text("Rental History Report", 14, 25);
        const tableColumn = ["Customer", "Items", "Checkout", "Return", "Total", "Balance", "Status"];
        const tableRows = sortedRentals.map(r => [r.customerName, r.itemsList, new Date(r.checkoutDate).toLocaleDateString(), r.expectedReturnDate ? new Date(r.expectedReturnDate).toLocaleDateString() : 'Open', r.totalAmount.toFixed(2), r.balance.toFixed(2), r.status]);
        doc.autoTable({
            head: [tableColumn], body: tableRows, startY: 32, didDrawPage: (data: any) => {
                const ph = doc.internal.pageSize.getHeight(); doc.setFontSize(9); doc.setTextColor(150); doc.text('Software Solution by althario.com', 105, ph - 10, { align: 'center' });
            }
        });
        doc.save('rental-report.pdf');
    };

    const handleExportExcel = () => {
        const data = sortedRentals.map(r => ({ 'Customer': r.customerName, 'Items': r.itemsList, 'Checkout': new Date(r.checkoutDate).toLocaleDateString(), 'Return': r.expectedReturnDate || 'Open', 'Total': r.totalAmount, 'Balance': r.balance, 'Status': r.status }));
        const ws = XLSX.utils.json_to_sheet(data); const wb = { Sheets: { 'data': ws }, SheetNames: ['data'] }; XLSX.writeFile(wb, 'rental-history.xlsx');
    };

    const customerReportData = useMemo(() => {
        if (!selectedCustomerId) return null;
        const cRentals = rentals.filter(r => r.customerId === selectedCustomerId);
        let tSpent = 0, tPaid = 0;
        const trans = cRentals.map(r => {
            const total = r.totalAmount + (r.fineAmount || 0) - (r.discountAmount || 0);
            const paid = r.paidAmount ?? r.advancePayment;
            tSpent += total; tPaid += paid;
            const iDetails = r.items.map(ri => { const it = items.find(i => i.id === ri.itemId); return `${it?.name || 'Item'} (x${ri.quantity}) @ Rs.${ri.pricePerDay}`; }).join('\n');
            return { id: r.id, date: r.checkoutDate, items: iDetails, total, paid, balance: total - paid, status: r.status };
        });
        return { totalSpent: tSpent, totalPaid: tPaid, balanceDue: tSpent - tPaid, transactions: trans };
    }, [selectedCustomerId, rentals, items]);

    const { items: sortedTransactions, requestSort: requestTransactionSort, sortConfig: transactionSortConfig } = useSortableData<any>(customerReportData?.transactions || [], { key: 'date', direction: 'descending' });

    const handleExportCustomerPDF = () => {
        if (!customerReportData || !selectedCustomerId) return;
        const customer = customers.find(c => c.id === selectedCustomerId);
        if (!customer) return;
        const doc = new jspdf.jsPDF();
        doc.setFontSize(18); doc.text(settings.shopName, 14, 15);
        doc.setFontSize(16); doc.text(`Full Account Statement: ${customer.name}`, 14, 25);
        doc.setFontSize(11); doc.setTextColor(100); doc.text(`NIC: ${customer.nic} | Phone: ${customer.phone} | Address: ${customer.address}`, 14, 32);
        doc.setTextColor(0); doc.setFontSize(12);
        doc.text(`Lifetime Spent: Rs. ${customerReportData.totalSpent.toFixed(2)}`, 14, 45);
        doc.text(`Lifetime Paid: Rs. ${customerReportData.totalPaid.toFixed(2)}`, 14, 52);
        doc.text(`Current Outstanding: Rs. ${customerReportData.balanceDue.toFixed(2)}`, 14, 59);
        const tableRows = sortedTransactions.map(t => [t.id.substring(0, 8).toUpperCase(), new Date(t.date).toLocaleDateString(), t.items, t.total.toFixed(2), t.paid.toFixed(2), t.balance.toFixed(2), t.status]);
        doc.autoTable({
            head: [["Invoice", "Date", "Item Details", "Total", "Paid", "Balance", "Status"]], body: tableRows, startY: 70, styles: { cellPadding: 2, fontSize: 9 }, didDrawPage: (data: any) => {
                const ph = doc.internal.pageSize.getHeight(); doc.setFontSize(9); doc.setTextColor(150); doc.text('Software Solution by althario.com', 105, ph - 10, { align: 'center' });
            }
        });
        doc.save(`statement-${customer.name.replace(/\s/g, '_')}.pdf`);
    };

    const getSortIndicator = (key: string, config: any) => {
        if (!config || config.key !== key) return <ChevronsUpDownIcon className="w-4 h-4 ml-2 text-slate-400 opacity-50" />;
        return config.direction === 'ascending' ? <ChevronUpIcon className="w-4 h-4 ml-2" /> : <ChevronDownIcon className="w-4 h-4 ml-2" />;
    };

    return (
        <div className="space-y-8">
            <div className="flex border-b border-slate-200 dark:border-slate-700">
                <button onClick={() => setActiveTab('overall')} className={`px-4 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === 'overall' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500'}`}>Overall Reports</button>
                <button onClick={() => setActiveTab('customer')} className={`px-4 py-3 text-sm font-semibold transition-colors duration-200 border-b-2 ${activeTab === 'customer' ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500'}`}>Customer Account History</button>
            </div>

            {activeTab === 'overall' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <DashboardCard title="Total Revenue" value={`Rs. ${reportSummary.totalRevenue.toLocaleString()}`} icon={<MoneyIcon className="h-6 w-6" />} color="text-emerald-500" />
                        <DashboardCard title="Balance Collected" value={`Rs. ${reportSummary.totalBalanceCollected.toLocaleString()}`} icon={<FineIcon className="h-6 w-6" />} color="text-amber-500" />
                        <DashboardCard title="Total Rentals" value={rentals.length} icon={<UsersIcon className="h-6 w-6" />} color="text-blue-500" />
                        <DashboardCard title="Current Outstanding" value={`Rs. ${reportSummary.totalDue.toLocaleString()}`} icon={<CircleDollarSignIcon className="h-6 w-6" />} color="text-red-500" />
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="flex justify-between items-start mb-6">
                            <div><h3 className="text-xl font-bold">Rental History</h3><p className="text-sm text-slate-500">Overview of all transactions</p></div>
                            <div className="flex gap-2"><Button variant="secondary" onClick={handleExportPDF} leftIcon={<DownloadIcon className="w-4 h-4" />}>PDF</Button><Button variant="secondary" onClick={handleExportExcel} leftIcon={<DownloadIcon className="w-4 h-4" />}>Excel</Button></div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <Input id="s" label="" placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="p-2 border rounded-md dark:bg-slate-900 dark:border-slate-700">
                                <option value="All">All Statuses</option><option value="Rented">Rented</option><option value="Partially Returned">Partially Returned</option><option value="Returned">Returned</option>
                            </select>
                            <Input id="sd" label="" type="date" value={dateFilter.start} onChange={e => setDateFilter(p => ({ ...p, start: e.target.value }))} />
                            <Input id="ed" label="" type="date" value={dateFilter.end} onChange={e => setDateFilter(p => ({ ...p, end: e.target.value }))} />
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 uppercase text-xs">
                                    <tr>
                                        <th className="px-6 py-4" onClick={() => requestSort('customerName')}>Customer {getSortIndicator('customerName', sortConfig)}</th>
                                        <th className="px-6 py-4">Items</th>
                                        <th className="px-6 py-4" onClick={() => requestSort('checkoutDate')}>Checkout {getSortIndicator('checkoutDate', sortConfig)}</th>
                                        <th className="px-6 py-4">Total</th>
                                        <th className="px-6 py-4">Balance</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedRentals.map(r => (
                                        <tr key={r.id} className="border-b dark:border-slate-700 hover:bg-slate-50/50">
                                            <td className="px-6 py-4 font-bold">{r.customerName}</td>
                                            <td className="px-6 py-4 truncate max-w-xs">{r.itemsList}</td>
                                            <td className="px-6 py-4">{new Date(r.checkoutDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-4">Rs. {r.totalAmount.toFixed(2)}</td>
                                            <td className={`px-6 py-4 ${r.balance > 0 ? 'text-red-500 font-bold' : 'text-emerald-500'}`}>Rs. {r.balance.toFixed(2)}</td>
                                            <td className="px-6 py-4 text-right"><Button size="sm" variant="secondary" onClick={() => setViewedRental(r)}>View</Button></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'customer' && (
                <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h2 className="text-xl font-bold mb-6">Customer A to Z Financial Account</h2>
                    <div className="max-w-md mb-8 relative">
                        <Input id="cs" label="Search Customer" placeholder="Name, NIC or Phone..." value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(null); }} />
                        {customerSearch && !selectedCustomerId && (
                            <ul className="absolute w-full border dark:border-slate-600 rounded-md mt-1 max-h-48 overflow-y-auto z-10 bg-white dark:bg-slate-800 shadow-xl">
                                {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.nic.includes(customerSearch)).map(c => <li key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="p-3 hover:bg-slate-50 cursor-pointer border-b last:border-0">{c.name} - {c.nic}</li>)}
                            </ul>
                        )}
                    </div>
                    {selectedCustomerId && customerReportData ? (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <DashboardCard title="Total Billing" value={`Rs. ${customerReportData.totalSpent.toFixed(2)}`} icon={<MoneyIcon className="h-6 w-6" />} color="text-blue-500" />
                                <DashboardCard title="Total Payments" value={`Rs. ${customerReportData.totalPaid.toFixed(2)}`} icon={<FineIcon className="h-6 w-6" />} color="text-emerald-500" />
                                <DashboardCard title="Total Balance" value={`Rs. ${customerReportData.balanceDue.toFixed(2)}`} icon={<AlertTriangleIcon className="h-6 w-6" />} color="text-red-500" />
                            </div>
                            <div className="flex justify-between items-center"><h3 className="text-lg font-bold">Transaction History</h3><div className="flex gap-2"><Button variant="secondary" onClick={handleExportCustomerPDF} leftIcon={<DownloadIcon className="w-4 h-4" />}>PDF</Button></div></div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left border rounded-lg overflow-hidden">
                                    <thead className="bg-slate-50 dark:bg-slate-700/50 uppercase text-xs">
                                        <tr>
                                            <th className="px-6 py-4">Invoice</th>
                                            <th className="px-6 py-4">Date</th>
                                            <th className="px-6 py-4">Items & Rates</th>
                                            <th className="px-6 py-4">Total Bill</th>
                                            <th className="px-6 py-4">Paid</th>
                                            <th className="px-6 py-4">Balance</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedTransactions.map(t => (
                                            <tr key={t.id} className="border-b dark:border-slate-700 hover:bg-slate-50/50">
                                                <td className="px-6 py-4 font-mono font-bold text-blue-600">{t.id}</td>
                                                <td className="px-6 py-4">{new Date(t.date).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 whitespace-pre-line text-xs">{t.items}</td>
                                                <td className="px-6 py-4">Rs. {t.total.toFixed(2)}</td>
                                                <td className="px-6 py-4 text-emerald-600 font-bold">Rs. {t.paid.toFixed(2)}</td>
                                                <td className={`px-6 py-4 font-bold ${t.balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>Rs. {t.balance.toFixed(2)}</td>
                                                <td className="px-6 py-4">{t.status}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : customerSearch ? null : (
                        <div className="text-center py-20 border-2 border-dashed rounded-xl border-slate-300">
                            <p className="text-slate-400">Search for a customer to see their full account details.</p>
                        </div>
                    )}
                </div>
            )}
            <Modal isOpen={!!viewedRental} onClose={() => setViewedRental(null)} title={`Rental Overview: #${viewedRental?.id}`}>
                {viewedRental && (
                    <div className="space-y-6">
                        <div className="p-4 bg-slate-50 rounded-lg grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-slate-500">Customer</p><p className="font-bold">{customers.find(c => c.id === viewedRental.customerId)?.name}</p></div>
                            <div className="text-right"><p className="text-xs text-slate-500">Status</p><p className="font-bold">{viewedRental.status}</p></div>
                        </div>
                        <div><h4 className="font-bold mb-2">Item List</h4><div className="space-y-1">{viewedRental.items.map(ri => { const it = items.find(i => i.id === ri.itemId); return <div key={ri.itemId} className="flex justify-between p-2 border rounded"><span>{it?.name} (x{ri.quantity})</span><span>Rs. {(ri.pricePerDay * ri.quantity).toFixed(2)} / day</span></div> })}</div></div>
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between"><span>Current Accumulation</span><span className="font-bold">Rs. {viewedRental.totalAmount.toFixed(2)}</span></div>
                            <div className="flex justify-between text-red-500"><span>Fines/Late Fees</span><span>+ Rs. {(viewedRental.fineAmount || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between text-emerald-500"><span>Discounts</span><span>- Rs. {(viewedRental.discountAmount || 0).toFixed(2)}</span></div>
                            <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Payable Total</span><span>Rs. {(viewedRental.totalAmount + (viewedRental.fineAmount || 0) - (viewedRental.discountAmount || 0)).toFixed(2)}</span></div>
                            <div className="flex justify-between text-emerald-600"><span>Total Paid</span><span>- Rs. {(viewedRental.paidAmount ?? viewedRental.advancePayment).toFixed(2)}</span></div>
                            <div className="flex justify-between border-t border-double pt-2 text-xl font-bold text-red-600"><span>Remaining Balance</span><span>Rs. {getBalanceDue(viewedRental).toFixed(2)}</span></div>
                        </div>
                        <Button className="w-full" variant="secondary" onClick={() => setViewedRental(null)}>Close</Button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default Reports;
