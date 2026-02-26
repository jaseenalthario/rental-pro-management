import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { Rental, Customer } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { ChevronsUpDownIcon, ChevronUpIcon, ChevronDownIcon } from '../components/icons';
import { useSortableData } from '../hooks/useSortableData';

interface OverdueRental extends Rental {
  daysOverdue: number;
  customerName: string;
  outstandingItems: string;
}

const formatWhatsAppMessage = (template: string, data: Record<string, string | number>) => {
  let message = template;
  for (const key in data) {
    message = message.replace(new RegExp(`\\[${key}\\]`, 'g'), String(data[key]));
  }
  return message;
};

const OverdueRentals: React.FC = () => {
  const { rentals, customers, items } = useData();
  const { settings } = useSettings();
  const [searchTerm, setSearchTerm] = useState('');

  // Calculate overdue rentals
  const overdueRentals = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return rentals
      .filter(rental => {
        if ((rental.status === 'Rented' || rental.status === 'Partially Returned') && rental.expectedReturnDate) {
          const returnDate = new Date(rental.expectedReturnDate);
          if (!isNaN(returnDate.getTime()) && returnDate < today) {
            const hasOutstandingItems = rental.items.some(
              item => (item.returnedQuantity || 0) < item.quantity
            );
            return hasOutstandingItems;
          }
        }
        return false;
      })
      .map(rental => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const returnDate = new Date(rental.expectedReturnDate);
        const daysOverdue = Math.floor((today.getTime() - returnDate.getTime()) / (1000 * 3600 * 24));
        const customer = customers.find(c => c.id === rental.customerId);
        const outstandingItems = rental.items
          .filter(ri => (ri.returnedQuantity || 0) < ri.quantity)
          .map(ri => {
            const item = items.find(i => i.id === ri.itemId);
            const outstanding = ri.quantity - (ri.returnedQuantity || 0);
            return `${item?.name || 'Unknown'} (${outstanding}/${ri.quantity})`;
          })
          .join(', ');

        return {
          ...rental,
          daysOverdue,
          customerName: customer?.name || 'Unknown',
          outstandingItems,
        };
      });
  }, [rentals, customers, items]);

  // Filter by search term
  const filteredRentals = useMemo(() => {
    return overdueRentals.filter(r =>
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.outstandingItems.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [overdueRentals, searchTerm]);

  // Sorting
  const { items: sortedRentals, requestSort, sortConfig } = useSortableData<OverdueRental>(
    filteredRentals,
    { key: 'daysOverdue', direction: 'descending' }
  );

  const getSortIndicator = (key: keyof OverdueRental) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ChevronsUpDownIcon className="w-4 h-4 ml-2 text-slate-400 opacity-50 group-hover:opacity-100" />;
    }
    if (sortConfig.direction === 'ascending') {
      return <ChevronUpIcon className="w-4 h-4 ml-2" />;
    }
    return <ChevronDownIcon className="w-4 h-4 ml-2" />;
  };

  const getOverdueSeverity = (daysOverdue: number) => {
    if (daysOverdue > 30) return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300';
    if (daysOverdue > 14) return 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300';
    return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300';
  };

  const handleSendReminder = (rental: OverdueRental) => {
    const customer = customers.find(c => c.id === rental.customerId);
    if (!customer?.phone) {
      alert("Customer phone number not found.");
      return;
    }
    const cleanedPhone = `${settings.whatsAppCountryCode}${customer.phone.replace(/\D/g, '').slice(-9)}`;
    const totalPaidSoFar = rental.paidAmount || rental.advancePayment;
    const outstandingBalance = (rental.totalAmount + (rental.fineAmount || 0) - (rental.discountAmount || 0)) - totalPaidSoFar;

    const warningMessage = `🚨 *OVERDUE RENTAL WARNING* 🚨\n\nHello ${rental.customerName},\nThis is a friendly reminder from *${settings.shopName}*. Your rental (Invoice ID: ${rental.id}) is now *${rental.daysOverdue} days overdue*.\n\n*Pending Items:*\n${rental.outstandingItems}\n\n*Current Balance Due:* Rs. ${outstandingBalance.toFixed(2)}\n\nPlease return the items immediately to avoid further daily late fees and penalties. Contact us if you have any questions.\nThank you!`;

    const text = encodeURIComponent(warningMessage);
    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${text}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Overdue Rentals</h2>
          <Input
            id="search"
            label=""
            placeholder="Search by Customer Name, Rental ID, or Item..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">
                  <button
                    className="flex items-center group"
                    onClick={() => requestSort('customerName')}
                  >
                    Customer Name {getSortIndicator('customerName')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button
                    className="flex items-center group"
                    onClick={() => requestSort('id')}
                  >
                    Rental ID {getSortIndicator('id')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button
                    className="flex items-center group"
                    onClick={() => requestSort('expectedReturnDate')}
                  >
                    Expected Return Date {getSortIndicator('expectedReturnDate')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4">
                  <button
                    className="flex items-center group"
                    onClick={() => requestSort('daysOverdue')}
                  >
                    Days Overdue {getSortIndicator('daysOverdue')}
                  </button>
                </th>
                <th scope="col" className="px-6 py-4">
                  Outstanding Items
                </th>
                <th scope="col" className="px-6 py-4 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedRentals.map(rental => (
                <tr
                  key={rental.id}
                  className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">
                    {rental.customerName}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{rental.id}</td>
                  <td className="px-6 py-4">
                    {new Date(rental.expectedReturnDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full font-semibold text-sm ${getOverdueSeverity(rental.daysOverdue)}`}>
                      {rental.daysOverdue} day{rental.daysOverdue !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                    {rental.outstandingItems}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Button size="sm" variant="secondary" onClick={() => handleSendReminder(rental)}>
                      Send Reminder
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedRentals.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              <p className="text-lg font-medium">No overdue rentals found.</p>
              <p className="text-sm mt-2">All rentals are returned on time or not yet overdue.</p>
            </div>
          )}
        </div>

        {overdueRentals.length > 0 && (
          <div className="mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-300">
              <strong>{overdueRentals.length}</strong> rental{overdueRentals.length !== 1 ? 's' : ''} overdue - immediate follow-up required.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OverdueRentals;
