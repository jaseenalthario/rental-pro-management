
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import { Rental, Customer } from '../types';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { SettingsIcon } from '../components/icons';

const formatWhatsAppMessage = (template: string, data: Record<string, string | number>) => {
    let message = template;
    for (const key in data) {
        message = message.replace(new RegExp(`\\[${key}\\]`, 'g'), String(data[key]));
    }
    return message;
};

const BalancePayments: React.FC = () => {
    const { rentals, customers, addPayment, showNotification } = useData();
    const { settings, setSettings } = useSettings();
    const [paymentModalRental, setPaymentModalRental] = useState<Rental | null>(null);
    const [paymentAmount, setPaymentAmount] = useState(0);

    const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
    const [editedTemplate, setEditedTemplate] = useState(settings.balanceReminderTemplate);

    const getBalance = (rental: Rental) => {
        const totalCost = rental.totalAmount + (rental.fineAmount || 0) - (rental.discountAmount || 0);
        const totalPaid = rental.paidAmount || 0;
        return totalCost - totalPaid;
    };

    const rentalsWithBalance = useMemo(() => {
        return rentals
            .map(r => ({ ...r, balance: getBalance(r) }))
            .filter(r => r.balance > 0.01);
    }, [rentals]);

    const handleOpenPaymentModal = (rental: Rental) => {
        setPaymentAmount(getBalance(rental));
        setPaymentModalRental(rental);
    };

    const handleClosePaymentModal = () => {
        setPaymentModalRental(null);
        setPaymentAmount(0);
    };

    const handleSettlePayment = async () => {
        if (paymentModalRental && paymentAmount > 0) {
            const currentBalance = getBalance(paymentModalRental);
            if (paymentAmount !== currentBalance) {
                alert("Please enter the exact full balance amount to settle and remove this record from the list.");
                return;
            }
            await addPayment(paymentModalRental.id, paymentAmount);
            showNotification("Payment Successfully Settled");
            handleClosePaymentModal();
        }
    };

    const handleSendReminder = (rental: Rental, customer: Customer) => {
        if (!customer.phone) {
            alert("Customer does not have a phone number saved.");
            return;
        }
        const cleanedPhone = `${settings.whatsAppCountryCode}${customer.phone.replace(/\D/g, '')}`;
        const messageData = { ShopName: settings.shopName, CustomerName: customer.name, InvoiceID: rental.id.substring(0, 8).toUpperCase(), BalanceDue: getBalance(rental).toFixed(2) };
        const message = formatWhatsAppMessage(settings.balanceReminderTemplate, messageData);
        const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSaveTemplate = () => {
        setSettings(prev => ({ ...prev, balanceReminderTemplate: editedTemplate }));
        showNotification("Reminder Template Successfully Updated");
        setIsTemplateModalOpen(false);
    };

    return (
        <div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 dark:text-white">Outstanding Balance Payments</h2>
                    <Button variant="secondary" size="sm" onClick={() => { setEditedTemplate(settings.balanceReminderTemplate); setIsTemplateModalOpen(true); }} leftIcon={<SettingsIcon className="w-4 h-4" />}>Customize Reminder</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
                            <tr><th scope="col" className="px-6 py-3">Customer</th><th scope="col" className="px-6 py-3">Rental ID</th><th scope="col" className="px-6 py-3">Base Total</th><th scope="col" className="px-6 py-3">Fines/Discounts</th><th scope="col" className="px-6 py-3">Total Paid</th><th scope="col" className="px-6 py-3">Balance Due</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr>
                        </thead>
                        <tbody>
                            {rentalsWithBalance.map(rental => {
                                const customer = customers.find(c => c.id === rental.customerId);
                                if (!customer) return null;
                                const totalPaid = rental.paidAmount || 0;
                                return (
                                    <tr key={rental.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50">
                                        <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{customer.name}</td>
                                        <td className="px-6 py-4 font-mono text-xs">{rental.id.substring(0, 8).toUpperCase()}</td>
                                        <td className="px-6 py-4">Rs. {rental.totalAmount.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-xs">
                                            {(rental.fineAmount || 0) > 0 && <span className="text-red-500 block">+ Rs. {rental.fineAmount?.toFixed(2)} Fine</span>}
                                            {(rental.discountAmount || 0) > 0 && <span className="text-emerald-500 block">- Rs. {rental.discountAmount?.toFixed(2)} Disc</span>}
                                            {!(rental.fineAmount > 0) && !(rental.discountAmount > 0) && <span className="text-slate-400 block">-</span>}
                                        </td>
                                        <td className="px-6 py-4">Rs. {totalPaid.toFixed(2)}</td>
                                        <td className="px-6 py-4 font-bold text-red-600 dark:text-red-400">Rs. {rental.balance.toFixed(2)}</td>
                                        <td className="px-6 py-4 text-right space-x-2"><Button size="sm" variant="secondary" onClick={() => handleSendReminder(rental, customer)}>Send Reminder</Button><Button size="sm" onClick={() => handleOpenPaymentModal(rental)}>Settle Payment</Button></td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {rentalsWithBalance.length === 0 && (<p className="text-center py-8 text-slate-500 dark:text-slate-400">No outstanding balances found. Well done!</p>)}
                </div>
            </div>
            <Modal isOpen={!!paymentModalRental} onClose={handleClosePaymentModal} title={`Settle Payment for #${paymentModalRental?.id.substring(0, 8).toUpperCase()}`}>
                {paymentModalRental && (
                    <div className="space-y-4">
                        <p>Customer: <strong className="font-semibold">{customers.find(c => c.id === paymentModalRental.customerId)?.name}</strong></p>
                        <p>Current Balance Due: <strong className="font-semibold text-red-500">Rs. {getBalance(paymentModalRental).toFixed(2)}</strong></p>
                        <Input id="payment-amount" label="Payment Amount (Rs.)" type="number" value={paymentAmount} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} min="0" max={getBalance(paymentModalRental)} />
                        <div className="flex justify-end space-x-3 pt-4"><Button variant="secondary" onClick={handleClosePaymentModal}>Cancel</Button><Button onClick={handleSettlePayment}>Confirm Payment</Button></div>
                    </div>
                )}
            </Modal>
            <Modal isOpen={isTemplateModalOpen} onClose={() => setIsTemplateModalOpen(false)} title="Customize Balance Reminder Message">
                <div className="space-y-4">
                    <div><label htmlFor="reminderTemplate" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Reminder Template</label><textarea id="reminderTemplate" rows={8} value={editedTemplate} onChange={(e) => setEditedTemplate(e.target.value)} className="block w-full text-sm p-2 border rounded-md dark:bg-slate-900 dark:border-slate-600 font-mono" /></div>
                    <div><p className="text-sm font-medium text-slate-700 dark:text-slate-300">Available Placeholders:</p><div className="flex flex-wrap gap-2 mt-2">{['[ShopName]', '[CustomerName]', '[InvoiceID]', '[BalanceDue]'].map(p => (<code key={p} className="text-xs bg-slate-100 dark:bg-slate-700 p-1 rounded">{p}</code>))}</div></div>
                    <div className="flex justify-end space-x-3 pt-4"><Button variant="secondary" onClick={() => setIsTemplateModalOpen(false)}>Cancel</Button><Button onClick={handleSaveTemplate}>Save Template</Button></div>
                </div>
            </Modal>
        </div>
    );
};

export default BalancePayments;
