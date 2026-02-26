import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Customer, Item, Rental, Alert } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

interface NotificationState {
    isOpen: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
}

interface DataContextType {
    customers: Customer[];
    items: Item[];
    rentals: Rental[];
    alerts: Alert[];
    notification: NotificationState;
    showNotification: (message: string, type?: 'success' | 'error' | 'info') => void;
    hideNotification: () => void;
    addCustomer: (customer: Omit<Customer, 'id' | 'createdAt'>) => Promise<void>;
    updateCustomer: (customer: Customer) => Promise<void>;
    deleteCustomer: (customerId: string) => Promise<{ success: boolean; message: string }>;
    addItem: (item: Omit<Item, 'id' | 'addedAt' | 'available'>) => Promise<void>;
    updateItem: (item: Item) => Promise<{ success: boolean; message: string }>;
    deleteItem: (itemId: string) => Promise<{ success: boolean; message: string }>;
    addRental: (rental: Omit<Rental, 'id'>) => Promise<Rental>;
    returnRental: (
        rentalId: string,
        itemsToReturn: { itemId: string; quantity: number; status: 'OK' | 'Damaged' | 'Lost' }[],
        paymentDetails: { fineAmount: number; fineNotes: string; discount: number, paidAmountToday: number }
    ) => Promise<void>;
    addPayment: (rentalId: string, amount: number) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [items, setItems] = useState<Item[]>([]);
    const [rentals, setRentals] = useState<Rental[]>([]);
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [notification, setNotification] = useState<NotificationState>({ isOpen: false, message: '', type: 'success' });

    // Initial Data Fetch
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [cRes, iRes, rRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/customers`),
                    fetch(`${API_BASE_URL}/items`),
                    fetch(`${API_BASE_URL}/rentals`),
                ]);
                if (cRes.ok) setCustomers(await cRes.json());
                if (iRes.ok) setItems(await iRes.json());
                if (rRes.ok) setRentals(await rRes.json());
            } catch (err) {
                console.error("Failed to fetch initial data", err);
            }
        };
        fetchData();
    }, []);

    const showNotification = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setNotification({ isOpen: true, message, type });
    };

    const hideNotification = () => {
        setNotification({ isOpen: false, message: '', type: 'success' });
    };

    useEffect(() => {
        const updateCosts = async () => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            let hasChanges = false;

            const updatedRentals = [...rentals];
            for (let i = 0; i < updatedRentals.length; i++) {
                const rental = updatedRentals[i];
                if (rental.status === 'Rented') {
                    const checkoutDate = new Date(rental.checkoutDate);
                    checkoutDate.setHours(0, 0, 0, 0);

                    const expectedDate = new Date(rental.expectedReturnDate);
                    expectedDate.setHours(0, 0, 0, 0);
                    const expectedDiff = Math.abs(expectedDate.getTime() - checkoutDate.getTime());
                    const expectedDays = Math.max(1, Math.ceil(expectedDiff / (1000 * 60 * 60 * 24)));

                    const diffTime = Math.abs(today.getTime() - checkoutDate.getTime());
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const daysToCharge = Math.max(expectedDays, Math.max(1, diffDays));

                    const dailyRate = rental.items.reduce((sum, item) => sum + (item.pricePerDay * item.quantity), 0);
                    const newTotal = dailyRate * daysToCharge;

                    if (newTotal !== rental.totalAmount) {
                        hasChanges = true;
                        updatedRentals[i] = { ...rental, totalAmount: newTotal };

                        // Fire-and-forget background sync
                        fetch(`${API_BASE_URL}/rentals/${rental.id}`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(updatedRentals[i]),
                        }).catch(console.error);
                    }
                }
            }

            if (hasChanges) setRentals(updatedRentals);
        };

        if (rentals.length > 0) {
            updateCosts();
        }
    }, [rentals.length]); // Running once per rentals list change is fine vs every render.

    useEffect(() => {
        const newAlerts: Alert[] = [];
        let alertIdCounter = 1;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        rentals.forEach(rental => {
            if ((rental.status === 'Rented' || rental.status === 'Partially Returned') && rental.expectedReturnDate) {
                const returnDate = new Date(rental.expectedReturnDate);
                if (!isNaN(returnDate.getTime()) && returnDate < today) {
                    const daysOverdue = Math.floor((today.getTime() - returnDate.getTime()) / (1000 * 3600 * 24));
                    if (daysOverdue > 0) {
                        const customer = customers.find(c => c.id === rental.customerId);
                        const outstandingItems = rental.items
                            .filter(ri => (ri.returnedQuantity || 0) < ri.quantity)
                            .map(ri => items.find(i => i.id === ri.itemId)?.name || 'Unknown Item')
                            .join(', ');

                        newAlerts.push({
                            id: `a${alertIdCounter++}`,
                            type: 'Overdue',
                            message: `Rental for ${customer?.name || 'Unknown'} (${outstandingItems}) is overdue by ${daysOverdue} day(s).`,
                            severity: 'high',
                        });
                    }
                }
            }
        });

        const LOW_STOCK_THRESHOLD = 2;
        items.forEach(item => {
            if (item.quantity > 0 && item.available <= LOW_STOCK_THRESHOLD && item.available < item.quantity) {
                newAlerts.push({
                    id: `a${alertIdCounter++}`,
                    type: 'Low Stock',
                    message: `${item.name} has only ${item.available} unit(s) available.`,
                    severity: item.available <= 1 ? 'medium' : 'low',
                });
            }
        });

        rentals.forEach(rental => {
            const paid = rental.paidAmount ?? rental.advancePayment;
            const totalCost = rental.totalAmount + (rental.fineAmount || 0) - (rental.discountAmount || 0);
            const balance = totalCost - paid;
            if (balance > 100 && rental.status !== 'Returned') {
                const customer = customers.find(c => c.id === rental.customerId);
                newAlerts.push({
                    id: `a${alertIdCounter++}`,
                    type: 'Pending Payment',
                    message: `${customer?.name || 'Unknown'} has a pending balance of Rs. ${balance.toFixed(2)}.`,
                    severity: 'medium',
                });
            }
        });

        setAlerts(newAlerts);
    }, [rentals, items, customers]);

    const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
        const custObject = { ...customer, createdAt: new Date().toISOString() };
        const res = await fetch(`${API_BASE_URL}/customers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(custObject),
        });
        if (res.ok) {
            const newCustomer = await res.json();
            setCustomers(prev => [...prev, newCustomer]);
        }
    };

    const updateCustomer = async (updatedCustomer: Customer) => {
        const res = await fetch(`${API_BASE_URL}/customers/${updatedCustomer.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedCustomer),
        });
        if (res.ok) {
            const updated = await res.json();
            setCustomers(prev => prev.map(c => c.id === updated.id ? updated : c));
        }
    };

    const deleteCustomer = async (customerId: string): Promise<{ success: boolean; message: string }> => {
        const hasRentals = rentals.some(rental => rental.customerId === customerId);
        if (hasRentals) return { success: false, message: 'Cannot delete customer with active or past rentals.' };

        const res = await fetch(`${API_BASE_URL}/customers/${customerId}`, { method: 'DELETE' });
        if (res.ok) {
            setCustomers(prev => prev.filter(c => c.id !== customerId));
            return { success: true, message: 'Customer deleted successfully.' };
        }
        return { success: false, message: 'Failed to delete customer natively.' };
    };

    const addItem = async (item: Omit<Item, 'id' | 'addedAt' | 'available'>) => {
        const res = await fetch(`${API_BASE_URL}/items`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item),
        });
        if (res.ok) {
            const newItem = await res.json();
            setItems(prev => [...prev, newItem]);
        }
    };

    const updateItem = async (updatedItem: Item): Promise<{ success: boolean; message: string }> => {
        const currentItem = items.find(i => i.id === updatedItem.id);
        if (!currentItem) return { success: false, message: 'Item not found locally.' };

        const currentlyRented = currentItem.quantity - currentItem.available;
        if (updatedItem.quantity < currentlyRented) {
            return { success: false, message: `Cannot reduce total quantity below currently rented amount (${currentlyRented}).` };
        }

        const itemPayload = { ...updatedItem, available: updatedItem.quantity - currentlyRented };
        const res = await fetch(`${API_BASE_URL}/items/${updatedItem.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(itemPayload),
        });

        if (res.ok) {
            const data = await res.json();
            setItems(prev => prev.map(i => i.id === data.id ? data : i));
            return { success: true, message: 'Item updated successfully.' };
        }
        return { success: false, message: 'Network failed.' };
    };

    const deleteItem = async (itemId: string): Promise<{ success: boolean; message: string }> => {
        const hasRentals = rentals.some(rental => rental.items.some(item => item.itemId === itemId));
        if (hasRentals) return { success: false, message: 'Cannot delete item with active or past rentals.' };

        const res = await fetch(`${API_BASE_URL}/items/${itemId}`, { method: 'DELETE' });
        if (res.ok) {
            setItems(prev => prev.filter(i => i.id !== itemId));
            return { success: true, message: 'Item deleted successfully.' };
        }
        return { success: false, message: 'Failed to delete item.' };
    };

    const addRental = async (rental: Omit<Rental, 'id'>): Promise<Rental> => {
        const newRentalPayload = {
            ...rental,
            fineAmount: 0,
            fineNotes: '',
            discountAmount: 0,
            paidAmount: rental.advancePayment,
            paymentHistory: rental.advancePayment > 0 ? [{ date: new Date().toISOString(), amount: rental.advancePayment }] : [],
        };

        const res = await fetch(`${API_BASE_URL}/rentals`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRentalPayload)
        });

        if (!res.ok) {
            throw new Error('Failed to create rental');
        }

        const newRentalData = await res.json();
        setRentals(prev => [...prev, newRentalData]);
        setItems(prevItems => prevItems.map(item => {
            const rentedItem = newRentalData.items.find((ri: any) => ri.itemId === item.id);
            if (rentedItem) return { ...item, available: item.available - rentedItem.quantity };
            return item;
        }));

        // Optimistically update all items quantities properly backend
        for (const ri of newRentalData.items) {
            const fullItemObj = items.find(i => i.id === ri.itemId);
            if (fullItemObj) {
                await fetch(`${API_BASE_URL}/items/${ri.itemId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...fullItemObj, available: fullItemObj.available - ri.quantity })
                }).catch(e => console.error(e));
            }
        }

        return newRentalData;
    };

    const returnRental = async (
        rentalId: string,
        itemsToReturn: { itemId: string; quantity: number; status: 'OK' | 'Damaged' | 'Lost' }[],
        paymentDetails: { fineAmount: number; fineNotes: string; discount: number; paidAmountToday: number }
    ) => {

        const rental = rentals.find(r => r.id === rentalId);
        if (!rental) return;

        const updatedItems = rental.items.map(rentedItem => {
            const itemToReturn = itemsToReturn.find(i => i.itemId === rentedItem.itemId);
            if (itemToReturn) {
                return {
                    ...rentedItem,
                    returnedQuantity: (rentedItem.returnedQuantity || 0) + itemToReturn.quantity,
                    returnStatus: itemToReturn.status,
                };
            }
            return rentedItem;
        });

        const isFullyReturned = updatedItems.every(
            item => item.quantity === item.returnedQuantity
        );

        const hasReturnedItems = updatedItems.some(item => (item.returnedQuantity || 0) > 0);
        const updatedPaidAmount = (rental.paidAmount || 0) + paymentDetails.paidAmountToday;
        const totalCost = rental.totalAmount + (rental.fineAmount || 0) + paymentDetails.fineAmount - (rental.discountAmount || 0) - paymentDetails.discount;
        const isFullyPaid = updatedPaidAmount >= totalCost - 0.01;
        const newPaymentHistory = [...(rental.paymentHistory || [])];
        if (paymentDetails.paidAmountToday > 0) {
            newPaymentHistory.push({ date: new Date().toISOString(), amount: paymentDetails.paidAmountToday });
        }

        const updatedRentalBody = {
            ...rental,
            items: updatedItems,
            status: isFullyReturned && isFullyPaid ? 'Returned' : hasReturnedItems ? 'Partially Returned' : 'Rented',
            actualReturnDate: isFullyReturned && isFullyPaid ? new Date().toISOString() : rental.actualReturnDate,
            fineAmount: (rental.fineAmount || 0) + paymentDetails.fineAmount,
            fineNotes: `${rental.fineNotes || ''}\n${new Date().toLocaleDateString()}: ${paymentDetails.fineNotes}`.trim(),
            discountAmount: (rental.discountAmount || 0) + paymentDetails.discount,
            paidAmount: updatedPaidAmount,
            paymentHistory: newPaymentHistory,
        };

        const res = await fetch(`${API_BASE_URL}/rentals/${rentalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRentalBody)
        });

        if (res.ok) {
            const serverRental = await res.json();
            setRentals(prev => prev.map(r => r.id === rentalId ? serverRental : r));

            // Also update Item Stock remotely
            const updatedLocalItems = [...items];
            itemsToReturn.forEach(returned => {
                const itIdx = updatedLocalItems.findIndex(i => i.id === returned.itemId);
                if (itIdx > -1) {
                    let newAvailable = updatedLocalItems[itIdx].available;
                    let newQuantity = updatedLocalItems[itIdx].quantity;
                    if (returned.status === 'OK') {
                        newAvailable += returned.quantity;
                    } else if (returned.status === 'Lost') {
                        newQuantity -= returned.quantity;
                    }
                    if (newAvailable > newQuantity) newAvailable = newQuantity;
                    updatedLocalItems[itIdx] = { ...updatedLocalItems[itIdx], available: newAvailable, quantity: newQuantity < 0 ? 0 : newQuantity };

                    // Fire network update for stock
                    fetch(`${API_BASE_URL}/items/${returned.itemId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(updatedLocalItems[itIdx])
                    }).catch(console.error);
                }
            });
            setItems(updatedLocalItems);
        }
    };

    const addPayment = async (rentalId: string, amount: number) => {
        const rental = rentals.find(r => r.id === rentalId);
        if (!rental || amount <= 0) return;

        const updatedPaidAmount = (rental.paidAmount || 0) + amount;
        const newPaymentHistory = [
            ...(rental.paymentHistory || []),
            { date: new Date().toISOString(), amount: amount },
        ];

        const updatedRentalBody = { ...rental, paidAmount: updatedPaidAmount, paymentHistory: newPaymentHistory };

        const res = await fetch(`${API_BASE_URL}/rentals/${rentalId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedRentalBody)
        });

        if (res.ok) {
            const serverRental = await res.json();
            setRentals(prev => prev.map(r => r.id === rentalId ? serverRental : r));
        }
    };

    return (
        <DataContext.Provider value={{
            customers, items, rentals, alerts,
            notification, showNotification, hideNotification,
            addCustomer, updateCustomer, deleteCustomer,
            addItem, updateItem, deleteItem,
            addRental, returnRental, addPayment
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
