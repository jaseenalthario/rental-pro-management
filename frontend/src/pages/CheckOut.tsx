
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { RentedItem, Item, Customer } from '../types';
import { XIcon } from '../components/icons';

// Type declarations for window-injected libraries from CDNs
declare const jspdf: any;
declare const autoTable: any;

const formatWhatsAppMessage = (template: string, data: Record<string, string | number>) => {
    let message = template;
    for (const key in data) {
        message = message.replace(new RegExp(`\\[${key}\\]`, 'g'), String(data[key]));
    }
    return message;
};

const CheckOut: React.FC = () => {
    const { customers, items, addRental, showNotification } = useData();
    const { settings } = useSettings();

    // State for the form
    const [customerSearch, setCustomerSearch] = useState('');
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedItems, setSelectedItems] = useState<RentedItem[]>([]);
    const [advancePayment, setAdvancePayment] = useState<string>('');
    const [remarks, setRemarks] = useState('');
    const [expectedReturnDate, setExpectedReturnDate] = useState('');
    const [printInvoice, setPrintInvoice] = useState(true);
    const [sendWhatsApp, setSendWhatsApp] = useState(true);

    const [itemSearch, setItemSearch] = useState('');

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

    const searchedItems = useMemo(() => {
        if (!itemSearch) return [];
        return items.filter(item =>
            item.available > 0 &&
            (item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
                item.model.toLowerCase().includes(itemSearch.toLowerCase())) &&
            !selectedItems.some(si => si.itemId === item.id)
        );
    }, [itemSearch, items, selectedItems]);

    const handleAddItem = (item: Item) => {
        setSelectedItems(prev => [...prev, { itemId: item.id, quantity: 1, returnedQuantity: 0, pricePerDay: item.rentalPrice }]);
        setItemSearch('');
    };

    const handleUpdateSelectedItem = (itemId: string, newQuantity: number) => {
        const item = items.find(i => i.id === itemId);
        if (!item) return;
        if (newQuantity <= 0) {
            setSelectedItems(prev => prev.filter(i => i.itemId !== itemId));
        } else {
            setSelectedItems(prev => prev.map(i => i.itemId === itemId ? { ...i, quantity: newQuantity } : i));
        }
    };

    const calculateDailyTotal = () => {
        if (selectedItems.length === 0) return 0;
        return selectedItems.reduce((total, si) => {
            return total + (si.pricePerDay * si.quantity);
        }, 0);
    };

    const calculateExpectedTotal = () => {
        if (!expectedReturnDate || selectedItems.length === 0) return 0;
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(expectedReturnDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
        return calculateDailyTotal() * diffDays;
    };

    const resetForm = () => {
        setCustomerSearch('');
        setSelectedCustomerId(null);
        setSelectedItems([]);
        setAdvancePayment('');
        setItemSearch('');
        setRemarks('');
        setExpectedReturnDate('');
    };

    const generateCheckoutInvoicePDF = (rental: any, customer: Customer) => {
        const doc = new jspdf.jsPDF();
        const { shopName, logoUrl, invoiceCustomText } = settings;
        if (logoUrl) {
            try {
                const imageType = logoUrl.split(';')[0].split('/')[1].toUpperCase();
                doc.addImage(logoUrl, imageType, 14, 15, 20, 20);
            } catch (e) { console.error("Error adding logo:", e); }
        }
        doc.setFontSize(22); doc.setFont('helvetica', 'bold'); doc.text(shopName, logoUrl ? 40 : 14, 25);
        doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.text('Rental Checkout Invoice', 200, 25, { align: 'right' });
        doc.setFontSize(10); doc.text(`Invoice ID: ${rental.id.substring(0, 8).toUpperCase()}`, 200, 32, { align: 'right' }); doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 37, { align: 'right' }); doc.text(`Expected Return: ${new Date(expectedReturnDate).toLocaleDateString()}`, 200, 42, { align: 'right' });
        doc.setLineWidth(0.5); doc.line(14, 45, 200, 45);
        doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Customer Details:', 14, 55);
        doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
        doc.text(`Name: ${customer.name}`, 14, 62); doc.text(`Phone: ${customer.phone}`, 14, 68); doc.text(`NIC: ${customer.nic}`, 14, 74); doc.text(`Address: ${customer.address}`, 14, 80);
        const tableColumn = ["Item Name", "Model", "Qty", "Price/Day", "Subtotal/Day"];
        const tableRows = selectedItems.map(si => {
            const item = items.find(i => i.id === si.itemId);
            return [item?.name || 'Unknown', item?.model || 'N/A', si.quantity, `Rs. ${si.pricePerDay.toFixed(2)}`, `Rs. ${(si.pricePerDay * si.quantity).toFixed(2)}`];
        });
        doc.autoTable({ head: [tableColumn], body: tableRows, startY: 90, theme: 'grid', headStyles: { fillColor: [51, 65, 85] } });
        const finalY = (doc as any).lastAutoTable.finalY || 130;
        const expectedTotal = calculateExpectedTotal();
        doc.setFontSize(12); doc.setFont('helvetica', 'bold');
        doc.text(`Daily Rental Rate: Rs. ${calculateDailyTotal().toFixed(2)}`, 140, finalY + 15, { align: 'right' });
        doc.text(`Expected Total: Rs. ${expectedTotal.toFixed(2)}`, 140, finalY + 22, { align: 'right' });
        doc.text(`Advance Payment: Rs. ${parseFloat(advancePayment || '0').toFixed(2)}`, 140, finalY + 29, { align: 'right' });
        const balance = Math.max(0, expectedTotal - parseFloat(advancePayment || '0'));
        doc.setFontSize(13); doc.text(`Balance Due: Rs. ${balance.toFixed(2)}`, 140, finalY + 38, { align: 'right' });

        let remarksY = finalY + 15;
        if (remarks) { doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.text('Remarks:', 14, remarksY); doc.setFont('helvetica', 'normal'); doc.text(doc.splitTextToSize(remarks, 100), 14, remarksY + 5); }
        if (invoiceCustomText) { doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(100); doc.text(doc.splitTextToSize(invoiceCustomText, 180), 14, finalY + 45); }
        const pageHeight = doc.internal.pageSize.getHeight(); doc.setFontSize(9); doc.setTextColor(150); doc.text('Software Solution by althario.com', 105, pageHeight - 10, { align: 'center' });
        doc.save(`checkout-invoice-${rental.id.substring(0, 8).toUpperCase()}.pdf`);
    };

    const handleSubmit = async () => {
        if (!selectedCustomerId || selectedItems.length === 0) {
            alert("Please select a customer and at least one item.");
            return;
        }
        if (!expectedReturnDate) {
            alert("Please select an expected return date.");
            return;
        }

        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(expectedReturnDate);
        end.setHours(0, 0, 0, 0);
        if (end.getTime() < start.getTime()) {
            alert("Expected return date cannot be in the past.");
            return;
        }

        if (end.getFullYear() > 2100) {
            alert("Please select a valid expected return year.");
            return;
        }

        const expectedTotal = calculateExpectedTotal();
        const advanceValue = parseFloat(advancePayment || '0') || 0;

        if (advanceValue > expectedTotal) {
            alert(`Advance payment (Rs. ${advanceValue.toFixed(2)}) cannot exceed the expected total (Rs. ${expectedTotal.toFixed(2)}).`);
            return;
        }

        try {
            const newRentalData = {
                customerId: selectedCustomerId,
                items: selectedItems.filter(i => i.quantity > 0),
                checkoutDate: new Date().toISOString(),
                expectedReturnDate: new Date(expectedReturnDate).toISOString(),
                totalAmount: expectedTotal,
                advancePayment: advanceValue,
                status: 'Rented' as 'Rented',
                remarks: remarks,
            };
            const newRental = await addRental(newRentalData);
            const customer = customers.find(c => c.id === selectedCustomerId);
            if (customer) {
                if (printInvoice) {
                    try {
                        generateCheckoutInvoicePDF(newRental, customer);
                    } catch (pdfError) {
                        console.error("PDF generation error:", pdfError);
                        alert("Failed to generate PDF. Check console for details.");
                    }
                }

                if (sendWhatsApp && customer.phone) {
                    const cleanedPhone = `${settings.whatsAppCountryCode}${customer.phone.replace(/\D/g, '').slice(-9)}`;
                    const itemsList = selectedItems.map(si => {
                        const item = items.find(i => i.id === si.itemId);
                        return `- ${item?.name || 'Unknown'} (x${si.quantity})`;
                    }).join('\n');
                    const balance = Math.max(0, expectedTotal - advanceValue);
                    const messageData = { ShopName: settings.shopName, CustomerName: customer.name, InvoiceID: newRental.id.substring(0, 8).toUpperCase(), ItemsList: itemsList, ReturnDate: new Date(expectedReturnDate).toLocaleDateString(), TotalAmount: expectedTotal.toFixed(2), AdvancePaid: advanceValue.toFixed(2), BalanceDue: balance.toFixed(2) };
                    const message = formatWhatsAppMessage(settings.checkoutTemplate, messageData);
                    const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;

                    // Small delay to ensure PDF download triggers before window unloads focus
                    setTimeout(() => {
                        window.open(whatsappUrl, '_blank');
                    }, 500);
                }
            }
            showNotification("Rental Successfully Saved");
            resetForm();
        } catch (error) {
            console.error("Checkout failed:", error);
            alert("An error occurred while saving the rental.");
        }
    };

    const selectedCustomer = customers.find(c => c.id === selectedCustomerId);
    const isButtonDisabled = !selectedCustomerId || selectedItems.length === 0;

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">New Rental / Checkout</h2>
                <div className="space-y-8">
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">1. Find Customer</label>
                        <input type="text" value={customerSearch} onChange={e => { setCustomerSearch(e.target.value); setSelectedCustomerId(null); }} placeholder="Search by Name, NIC, or Phone..." className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900" />
                        {filteredCustomers.length > 0 && !selectedCustomerId && (
                            <ul className="border border-slate-300 dark:border-slate-700 rounded-md mt-1 max-h-40 overflow-y-auto z-10 bg-white dark:bg-slate-800 shadow-lg">
                                {filteredCustomers.map(c => <li key={c.id} onClick={() => { setSelectedCustomerId(c.id); setCustomerSearch(c.name); }} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer text-sm border-b last:border-0 dark:border-slate-700">{c.name} - {c.nic}</li>)}
                            </ul>
                        )}
                        {selectedCustomer && (
                            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/50 rounded-md border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                                <p className="font-semibold text-blue-800 dark:text-blue-200 text-sm">Selected: {selectedCustomer.name}</p>
                                <button onClick={() => { setSelectedCustomerId(null); setCustomerSearch(''); }} className="text-xs text-blue-600 dark:text-blue-400 hover:underline">Change</button>
                            </div>
                        )}
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">2. Select Items</h3>
                        <div className="relative">
                            <Input id="itemSearch" label="" placeholder="Search for an item to add..." value={itemSearch} onChange={e => setItemSearch(e.target.value)} />
                            {searchedItems.length > 0 && (
                                <ul className="absolute w-full border border-slate-300 dark:border-slate-700 rounded-md mt-1 max-h-48 overflow-y-auto z-20 bg-white dark:bg-slate-800 shadow-lg">
                                    {searchedItems.map(item => (
                                        <li key={item.id} onClick={() => handleAddItem(item)} className="p-3 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-b last:border-0 dark:border-slate-700">
                                            <div>
                                                <p className="font-semibold text-sm">{item.name} <span className="text-slate-500 dark:text-slate-400 font-normal">({item.model})</span></p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Available: {item.available} | Rate: Rs. {item.rentalPrice.toFixed(2)}/day</p>
                                            </div>
                                            <Button size="sm" type="button" onClick={(e) => { e.stopPropagation(); handleAddItem(item); }}>Add</Button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <div className="mt-4 space-y-2">
                            {selectedItems.length > 0 ? (
                                selectedItems.map(si => {
                                    const item = items.find(i => i.id === si.itemId);
                                    if (!item) return null;
                                    return (
                                        <div key={item.id} className="grid grid-cols-12 items-center gap-2 p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border dark:border-slate-600">
                                            <div className="col-span-5 md:col-span-6">
                                                <p className="font-medium text-sm text-slate-800 dark:text-white">{item.name}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">Rs. {item.rentalPrice.toFixed(2)} / day</p>
                                            </div>
                                            <div className="col-span-4 md:col-span-3">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs text-slate-500">Qty:</span>
                                                    <input id={`qty-${item.id}`} type="number" min="1" value={si.quantity} onChange={(e) => handleUpdateSelectedItem(item.id, parseInt(e.target.value, 10) || 0)} className="w-full px-2 py-1 text-center border border-slate-300 rounded-md shadow-sm dark:bg-slate-900 dark:border-slate-700 focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                                                </div>
                                            </div>
                                            <div className="col-span-2 md:col-span-2 text-right text-sm font-semibold">Rs. {(item.rentalPrice * si.quantity).toFixed(2)}</div>
                                            <div className="col-span-1 text-right"><button onClick={() => handleUpdateSelectedItem(item.id, 0)} className="text-slate-400 hover:text-red-500 p-1"><XIcon className="w-5 h-5" /></button></div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-slate-500 py-10 border-2 border-dashed rounded-xl border-slate-300 dark:border-slate-600 bg-slate-50/50 dark:bg-transparent">
                                    <p className="text-sm">No items added to this rental yet.</p>
                                    <p className="text-xs mt-1 text-slate-400">Search for inventory items above to begin.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Input type="number" id="advance" label="3. Advance Payment (Rs.)" value={advancePayment} onChange={e => setAdvancePayment(e.target.value)} min="0" placeholder="0.00" />
                        <Input type="date" id="expectedReturnDate" label="4. Expected Return Date" value={expectedReturnDate} min={new Date().toISOString().split('T')[0]} onChange={e => setExpectedReturnDate(e.target.value)} required />
                        <div>
                            <label htmlFor="checkout-remarks" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">5. Remarks (Optional)</label>
                            <textarea id="checkout-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} rows={2} placeholder="Any specific notes or terms..." className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-slate-900 dark:border-slate-700 dark:text-white dark:placeholder-slate-500 dark:focus:ring-blue-400 dark:focus:ring-offset-slate-900" />
                        </div>
                    </div>
                    <div className="flex items-center space-x-6 py-2 border-t dark:border-slate-700">
                        <div className="flex items-center"><input type="checkbox" id="print-invoice" checked={printInvoice} onChange={(e) => setPrintInvoice(e.target.checked)} className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 bg-transparent" /><label htmlFor="print-invoice" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 font-medium">Generate PDF Invoice</label></div>
                        <div className="flex items-center"><input type="checkbox" id="send-whatsapp" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="h-4 w-4 rounded border-slate-400 text-blue-600 focus:ring-blue-500 bg-transparent" /><label htmlFor="send-whatsapp" className="ml-2 block text-sm text-slate-700 dark:text-slate-300 font-medium">Send WhatsApp Alert</label></div>
                    </div>
                    <div className="p-5 bg-slate-50 dark:bg-slate-700/50 rounded-xl border dark:border-slate-600">
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600 dark:text-slate-400 font-medium">Daily Rental Rate:</span><span className="text-xl font-semibold text-slate-800 dark:text-white">Rs. {calculateDailyTotal().toFixed(2)}</span></div>
                        <div className="flex justify-between items-center mb-1"><span className="text-slate-600 dark:text-slate-400 font-medium">Expected Total Amount:</span><span className="text-2xl font-bold text-blue-600 dark:text-blue-400">Rs. {calculateExpectedTotal().toFixed(2)}</span></div>

                        {advancePayment !== '' && expectedReturnDate && selectedItems.length > 0 && (
                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                                <span className="text-slate-700 dark:text-slate-300 font-semibold">Remaining Balance to Collect at Check In:</span>
                                <span className={`text-xl font-bold ${calculateExpectedTotal() - (parseFloat(advancePayment) || 0) < 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
                                    Rs. {(calculateExpectedTotal() - (parseFloat(advancePayment) || 0)).toFixed(2)}
                                </span>
                            </div>
                        )}

                        <p className="text-xs text-slate-500 dark:text-slate-400 text-right mt-2 mb-6">Rent will increase automatically if items are returned late.</p>

                        {/* New Industry-Standard CTA Button Design */}
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isButtonDisabled}
                            className={`
                                relative w-full overflow-hidden flex items-center justify-center gap-2 py-4 px-6 rounded-xl font-bold text-lg text-white shadow-xl transition-all duration-300
                                ${isButtonDisabled
                                    ? 'bg-slate-300 cursor-not-allowed opacity-70 shadow-none'
                                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-2xl hover:-translate-y-1 active:translate-y-0 active:shadow-md cursor-pointer'}
                            `}
                        >
                            {/* Animated Shine Effect (only when enabled) */}
                            {!isButtonDisabled && (
                                <div className="absolute inset-0 w-full h-full bg-white opacity-20 transform -rotate-45 translate-x-[-150%] transition-transform duration-[1.5s] ease-in-out hover:translate-x-[150%]"></div>
                            )}

                            {/* Icon & Text */}
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Confirm Rental & Checkout
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckOut;
