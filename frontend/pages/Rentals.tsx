

import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { RentedItem } from '../types';

const Rentals: React.FC = () => {
    const { customers, items, rentals, addRental } = useData();

    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<RentedItem[]>([]);
    const [returnDate, setReturnDate] = useState('');
    const [advancePayment, setAdvancePayment] = useState(0);

    const filteredCustomers = useMemo(() => 
        customerSearch 
            ? customers.filter(c => 
                c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                c.nic.includes(customerSearch) ||
                c.phone.includes(customerSearch)
              )
            : [],
        [customerSearch, customers]
    );

    const handleItemSelect = (itemId: string, quantity: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;

        setSelectedItems(prev => {
            const existing = prev.find(i => i.itemId === itemId);
            if (quantity > 0) {
                if (existing) {
                    return prev.map(i => i.itemId === itemId ? {...i, quantity} : i);
                }
                // FIX: Added missing `returnedQuantity` property to the new RentedItem object.
                return [...prev, { itemId, quantity, returnedQuantity: 0, pricePerDay: item.rentalPrice }];
            } else {
                return prev.filter(i => i.itemId !== itemId);
            }
        });
    };
    
    const calculateTotal = () => {
        if (!returnDate || selectedItems.length === 0) return 0;
        const checkoutDate = new Date();
        checkoutDate.setHours(0,0,0,0);
        const returnD = new Date(returnDate);
        returnD.setHours(0,0,0,0);
        const durationDays = Math.ceil((returnD.getTime() - checkoutDate.getTime()) / (1000 * 3600 * 24)) + 1;
        if (durationDays <= 0) return 0;
        
        return selectedItems.reduce((total, si) => {
            return total + (si.pricePerDay * si.quantity * durationDays);
        }, 0);
    };

    const handleSubmit = () => {
        if (!selectedCustomerId || selectedItems.length === 0 || !returnDate) {
            alert("Please select a customer, at least one item, and a return date.");
            return;
        }
        const totalAmount = calculateTotal();
        if (advancePayment > totalAmount) {
            alert("Advance payment cannot be greater than the total amount.");
            return;
        }

        addRental({
            customerId: selectedCustomerId,
            items: selectedItems.filter(i => i.quantity > 0),
            checkoutDate: new Date().toISOString(),
            expectedReturnDate: new Date(returnDate).toISOString(),
            totalAmount: totalAmount,
            advancePayment: advancePayment,
            status: 'Rented',
        });
        // Reset form
        setCustomerSearch('');
        setSelectedCustomerId(null);
        setSelectedItems([]);
        setReturnDate('');
        setAdvancePayment(0);
        alert("Rental created successfully!");
    };
    
    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Checkout Form */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">New Rental / Checkout</h2>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Find Customer (Name, NIC, Phone)</label>
                        <input type="text" value={customerSearch} onChange={e => {setCustomerSearch(e.target.value); setSelectedCustomerId(null);}} placeholder="Start typing to search..." className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm dark:bg-slate-700 dark:border-slate-600 dark:text-white dark:placeholder-slate-400 dark:focus:ring-indigo-500 dark:focus:border-indigo-500" />
                         {filteredCustomers.length > 0 && !selectedCustomerId && (
                            <ul className="border border-slate-300 rounded-md mt-1 max-h-40 overflow-y-auto z-10 bg-white dark:bg-slate-700">
                                {filteredCustomers.map(c => <li key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name);}} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-600 cursor-pointer">{c.name} - {c.nic}</li>)}
                            </ul>
                        )}
                        {selectedCustomer && (
                            <div className="mt-2 p-3 bg-indigo-50 dark:bg-indigo-900/50 rounded-md">
                                <p className="font-semibold text-indigo-800 dark:text-indigo-200">Selected: {selectedCustomer.name}</p>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-2">Select Items</h3>
                        <div className="space-y-2 max-h-60 overflow-y-auto p-2 border rounded-md dark:border-slate-600">
                            {items.map(item => {
                                const selectedQty = selectedItems.find(si => si.itemId === item.id)?.quantity || 0;
                                return (
                                <div key={item.id} className="grid grid-cols-12 items-center gap-2">
                                    <span className="col-span-6">{item.name} ({item.model})</span>
                                    <span className="col-span-3 text-sm text-slate-500 dark:text-slate-400">Avail: {item.available}</span>
                                    <span className="col-span-3">
                                      <input type="number" min="0" max={item.available} placeholder="Qty" value={selectedQty} onChange={(e) => handleItemSelect(item.id, parseInt(e.target.value, 10) || 0)} className="w-full px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600"/>
                                    </span>
                                </div>
                            )})}
                        </div>
                    </div>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input type="date" id="returnDate" label="Expected Return Date" value={returnDate} onChange={e => setReturnDate(e.target.value)} min={new Date().toISOString().split('T')[0]}/>
                        <Input type="number" id="advance" label="Advance Payment (Rs.)" value={advancePayment} onChange={e => setAdvancePayment(parseFloat(e.target.value) || 0)} min="0" />
                     </div>
                     <div className="text-right p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                         <p className="text-2xl font-bold text-slate-800 dark:text-white">Total: Rs. {calculateTotal().toFixed(2)}</p>
                         <p className="text-md text-slate-600 dark:text-slate-300">Balance Due: Rs. {(calculateTotal() - advancePayment).toFixed(2)}</p>
                     </div>
                     <Button onClick={handleSubmit} className="w-full" size="lg">Create Rental & Generate Receipt</Button>
                </div>
            </div>

            {/* Active Rentals List */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Active Rentals</h2>
                <div className="space-y-4 max-h-[80vh] overflow-y-auto">
                    {rentals.filter(r => r.status === 'Rented').map(rental => {
                        const customer = customers.find(c => c.id === rental.customerId);
                        const rentedItemsList = rental.items.map(ri => {
                            const item = items.find(i => i.id === ri.itemId);
                            return `${item?.name || 'Unknown Item'} (x${ri.quantity})`;
                        }).join(', ');
                        
                        return (
                            <div key={rental.id} className="p-4 border rounded-lg dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                                <p className="font-bold text-slate-800 dark:text-white">{customer?.name}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400 truncate" title={rentedItemsList}>Items: {rentedItemsList}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Return: {new Date(rental.expectedReturnDate).toLocaleDateString()}</p>
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mt-1">Balance: Rs. {(rental.totalAmount - rental.advancePayment).toFixed(2)}</p>
                                <div className="text-right mt-2">
                                    <Button size="sm">Check In</Button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Rentals;