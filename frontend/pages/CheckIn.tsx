
import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useSettings } from '../context/SettingsContext';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Rental, Customer } from '../types';
import Input from '../components/ui/Input';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const formatWhatsAppMessage = (template: string, data: Record<string, string | number>) => {
  let message = template;
  for (const key in data) {
    message = message.replace(new RegExp(`\\[${key}\\]`, 'g'), String(data[key]));
  }
  return message;
};

const CheckIn: React.FC = () => {
  const { rentals, customers, items, returnRental, showNotification } = useData();
  const { settings } = useSettings();
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [itemsToReturn, setItemsToReturn] = useState<Record<string, { quantity: number; status: 'OK' | 'Damaged' | 'Lost' }>>({});
  const [fineAmount, setFineAmount] = useState<number>(0);
  const [fineNotes, setFineNotes] = useState<string>('');
  const [discount, setDiscount] = useState<number>(0);
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState<{ start: string; end: string }>({ start: '', end: '' });

  const [printInvoice, setPrintInvoice] = useState(false);
  const [sendWhatsApp, setSendWhatsApp] = useState(true);

  const activeRentals = useMemo(() => {
    let filtered = rentals.filter(r => r.status === 'Rented' || r.status === 'Partially Returned').filter(r => r.items.some(item => (item.returnedQuantity || 0) < item.quantity));
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(rental => {
        const customer = customers.find(c => c.id === rental.customerId);
        const itemsList = rental.items.map(ri => {
          const item = items.find(i => i.id === ri.itemId);
          const outstandingQty = ri.quantity - (ri.returnedQuantity || 0);
          if (outstandingQty > 0) return item?.name || '';
          return null;
        }).filter(Boolean).join(', ');
        return (customer?.name.toLowerCase().includes(lowercasedFilter) || itemsList.toLowerCase().includes(lowercasedFilter) || rental.id.toLowerCase().includes(lowercasedFilter));
      });
    }
    return filtered;
  }, [rentals, customers, items, searchTerm]);

  const openCheckInModal = (rental: Rental) => {
    setSelectedRental(rental);
    const initialItemsToReturn: Record<string, { quantity: number; status: 'OK' | 'Damaged' | 'Lost' }> = {};
    rental.items.forEach(item => {
      const outstandingQty = item.quantity - (item.returnedQuantity || 0);
      if (outstandingQty > 0) {
        initialItemsToReturn[item.itemId] = { quantity: outstandingQty, status: 'OK' };
      }
    });
    setItemsToReturn(initialItemsToReturn);
    setFineAmount(0);
    setFineNotes('');
    setDiscount(0);
    setPaymentAmount('');
    setPrintInvoice(false);
    setSendWhatsApp(true);
  };

  const generateReturnInvoicePDF = (
    rental: Rental,
    customer: Customer | undefined,
    returnedItems: { itemId: string; quantity: number; status: 'OK' | 'Damaged' | 'Lost' }[],
    paymentDetails: { fineAmount: number; fineNotes: string; discount: number, paidAmountToday: number }
  ) => {
    const doc = new jsPDF();
    const { shopName, logoUrl, invoiceCustomText } = settings;
    if (logoUrl) {
      try {
        const imageType = logoUrl.split(';')[0].split('/')[1].toUpperCase();
        doc.addImage(logoUrl, imageType, 14, 15, 20, 20);
      } catch (e) { console.error("Error adding logo to PDF:", e); }
    }
    doc.setFontSize(20); doc.setFont('helvetica', 'bold'); doc.text(shopName, logoUrl ? 40 : 14, 22);
    doc.setFontSize(14); doc.setFont('helvetica', 'normal'); doc.text('Return Receipt / Invoice', 200, 22, { align: 'right' });
    doc.setFontSize(10); doc.text(`Invoice ID: ${rental.id.substring(0, 8).toUpperCase()}`, 200, 28, { align: 'right' }); doc.text(`Date: ${new Date().toLocaleDateString()}`, 200, 33, { align: 'right' });
    const daysRented = Math.max(1, Math.ceil(Math.abs(new Date().setHours(0, 0, 0, 0) - new Date(rental.checkoutDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)));
    doc.text(`Duration: ${daysRented} Days`, 200, 38, { align: 'right' });
    doc.setLineWidth(0.5); doc.line(14, 42, 200, 42);
    doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Billed To:', 14, 52);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11);
    doc.text(customer?.name || 'N/A', 14, 58); doc.text(customer?.address || '', 14, 63); doc.text(customer?.phone || '', 14, 68);

    let dynamicBaseTotal = 0;

    const tableColumn = ["Item Name & Model", "Quantity Returned", "Status"];
    const tableRows = returnedItems.map(ri => {
      const item = items.find(i => i.id === ri.itemId);
      const rentedItem = rental.items.find(r => r.itemId === ri.itemId);
      if (rentedItem) {
        dynamicBaseTotal += (rentedItem.pricePerDay * ri.quantity) * daysRented;
      }
      return [`${item?.name || 'Unknown'} (${item?.model || 'N/A'})`, ri.quantity, ri.status];
    });
    autoTable(doc, { head: [tableColumn], body: tableRows, startY: 75, theme: 'grid', headStyles: { fillColor: [51, 65, 85] } });
    const finalY = (doc as any).lastAutoTable.finalY || 120;
    const totalPaidSoFar = rental.paidAmount || rental.advancePayment;
    const outstandingBalance = (dynamicBaseTotal + (rental.fineAmount || 0) - (rental.discountAmount || 0)) - totalPaidSoFar;
    const totalPayableToday = outstandingBalance + paymentDetails.fineAmount - paymentDetails.discount;
    const remainingBalance = totalPayableToday - paymentDetails.paidAmountToday;
    const summaryData = [['Outstanding Balance', `Rs. ${outstandingBalance.toFixed(2)}`], ['New Fines / Fees', `+ Rs. ${paymentDetails.fineAmount.toFixed(2)}`], ['Discount Applied', `- Rs. ${paymentDetails.discount.toFixed(2)}`], ['Payment Received', `- Rs. ${paymentDetails.paidAmountToday.toFixed(2)}`],];
    autoTable(doc, { body: summaryData, startY: finalY + 10, theme: 'plain', tableWidth: 80, margin: { left: 110 }, styles: { fontSize: 11, cellPadding: 2 }, columnStyles: { 1: { halign: 'right' } } });
    const summaryY = (doc as any).lastAutoTable.finalY;
    doc.setLineWidth(0.2); doc.line(110, summaryY + 2, 190, summaryY + 2);
    doc.setFontSize(14); doc.setFont('helvetica', 'bold'); doc.text('Remaining Balance', 110, summaryY + 10);
    doc.text(`Rs. ${Math.max(0, remainingBalance).toFixed(2)}`, 190, summaryY + 10, { align: 'right' });
    let currentY = summaryY + 30;
    if (paymentDetails.fineNotes && paymentDetails.fineNotes.trim()) { doc.setFontSize(12); doc.setFont('helvetica', 'bold'); doc.text('Notes:', 14, currentY); doc.setFontSize(10); doc.setFont('helvetica', 'normal'); const notes = doc.splitTextToSize(paymentDetails.fineNotes.trim(), 180); doc.text(notes, 14, currentY + 5); currentY += (notes.length * 4) + 8; }
    if (invoiceCustomText) { doc.setLineWidth(0.2); doc.line(14, currentY - 4, 200, currentY - 4); doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(100); const customTextLines = doc.splitTextToSize(invoiceCustomText, 180); doc.text(customTextLines, 14, currentY); }
    const pageHeight = doc.internal.pageSize.getHeight(); doc.setFontSize(9); doc.setTextColor(150); doc.text('Software Solution by althario.com', 105, pageHeight - 10, { align: 'center' });
    doc.save(`return-invoice-${rental.id.substring(0, 8).toUpperCase()}.pdf`);
  };

  const handleConfirmCheckIn = async () => {
    if (selectedRental && Object.keys(itemsToReturn).length > 0) {
      const paymentValue = paymentAmount === '' ? 0 : parseFloat(paymentAmount) || 0;

      const daysRented = Math.max(1, Math.ceil(Math.abs(new Date().setHours(0, 0, 0, 0) - new Date(selectedRental.checkoutDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)));
      let dynamicBaseTotal = 0;
      Object.entries(itemsToReturn).forEach(([itemId, returnInfo]: [string, any]) => {
        const rentedItem = selectedRental.items.find(ri => ri.itemId === itemId);
        if (rentedItem && returnInfo.quantity > 0) {
          dynamicBaseTotal += (rentedItem.pricePerDay * returnInfo.quantity) * daysRented;
        }
      });

      const totalPaidSoFar = selectedRental.paidAmount || selectedRental.advancePayment;
      const outstandingBalance = (dynamicBaseTotal + (selectedRental.fineAmount || 0) - (selectedRental.discountAmount || 0)) - totalPaidSoFar;
      const totalPayableToday = outstandingBalance + fineAmount - discount;
      const nonPaidAmount = parseFloat(Math.max(0, totalPayableToday).toFixed(2));

      if (paymentValue > nonPaidAmount) {
        alert("Amount paying now cannot be greater than the total amount due.");
        return;
      }

      const itemsToReturnArray = Object.entries(itemsToReturn).map(([itemId, returnInfo]: [string, { quantity: number; status: 'OK' | 'Damaged' | 'Lost' }]) => ({ itemId, quantity: returnInfo.quantity, status: returnInfo.status }));
      const paymentDetails = { fineAmount, fineNotes, discount, paidAmountToday: paymentValue };
      await returnRental(selectedRental.id, itemsToReturnArray, paymentDetails);
      const customer = customers.find(c => c.id === selectedRental.customerId);
      if (printInvoice) {
        try {
          generateReturnInvoicePDF(selectedRental, customer, itemsToReturnArray, paymentDetails);
        } catch (pdfErr) {
          console.error("PDF generation failed:", pdfErr);
        }
      }

      if (sendWhatsApp && customer?.phone) {
        const cleanedPhone = `${settings.whatsAppCountryCode}${customer.phone.replace(/\D/g, '')}`;
        const returnedItemsList = itemsToReturnArray.map(returned => {
          const item = items.find(i => i.id === returned.itemId);
          return `- ${item?.name || 'Unknown'} (x${returned.quantity}) - Status: ${returned.status}`;
        }).join('\n');
        const totalPaidSoFar = selectedRental.paidAmount || selectedRental.advancePayment;
        const outstandingBalance = (dynamicBaseTotal + (selectedRental.fineAmount || 0) - (selectedRental.discountAmount || 0)) - totalPaidSoFar;
        const totalPayableToday = outstandingBalance + fineAmount - discount;
        const remainingBalance = totalPayableToday - paymentValue;
        const messageData = { ShopName: settings.shopName, CustomerName: customer.name, InvoiceID: selectedRental.id.substring(0, 8).toUpperCase(), ItemsList: returnedItemsList, Fines: fineAmount.toFixed(2), Discount: discount.toFixed(2), TotalDueToday: Math.max(0, totalPayableToday).toFixed(2), AmountPaid: paymentValue.toFixed(2), RemainingBalance: Math.max(0, remainingBalance).toFixed(2) };
        const message = formatWhatsAppMessage(settings.checkinTemplate, messageData);
        const whatsappUrl = `https://wa.me/${cleanedPhone}?text=${encodeURIComponent(message)}`;

        setTimeout(() => {
          window.open(whatsappUrl, '_blank');
        }, 500);
      }
      showNotification("Return Successfully Processed");
      setSelectedRental(null);
    }
  };

  const handleReturnItemChange = (itemId: string, field: 'checked' | 'quantity' | 'status', value: boolean | number | string, maxQuantity: number) => {
    setItemsToReturn(prev => {
      const newItems = { ...prev };
      const currentItem = newItems[itemId] || { quantity: 0, status: 'OK' };
      if (field === 'checked') {
        if (value) currentItem.quantity = currentItem.quantity > 0 ? currentItem.quantity : maxQuantity;
        else { delete newItems[itemId]; return newItems; }
      } else if (field === 'quantity') {
        const newQuantity = Math.max(0, Math.min(Number(value), maxQuantity));
        if (newQuantity === 0) { delete newItems[itemId]; return newItems; }
        currentItem.quantity = newQuantity;
      } else if (field === 'status') {
        currentItem.status = value as 'OK' | 'Damaged' | 'Lost';
      }
      newItems[itemId] = currentItem;
      return newItems;
    });
  };

  const getStatusBadge = (status: Rental['status']) => {
    const baseClasses = "px-2.5 py-1 text-xs font-semibold rounded-full inline-block";
    switch (status) {
      case 'Rented': return `bg-amber-500/10 text-amber-600 dark:text-amber-400 ${baseClasses}`;
      case 'Partially Returned': return `bg-blue-500/10 text-blue-600 dark:text-blue-400 ${baseClasses}`;
      case 'Returned': return `bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ${baseClasses}`;
      default: return `bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300 ${baseClasses}`;
    }
  };

  const renderModalContent = () => {
    if (!selectedRental) return null;

    // Calculate basic days rented info
    const daysRented = Math.max(1, Math.ceil(Math.abs(new Date().setHours(0, 0, 0, 0) - new Date(selectedRental.checkoutDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)));

    // Dynamic calculation of base total according to strictly checked items
    let dynamicBaseTotal = 0;
    Object.entries(itemsToReturn).forEach(([itemId, returnInfo]: [string, any]) => {
      const rentedItem = selectedRental.items.find(ri => ri.itemId === itemId);
      if (rentedItem && returnInfo.quantity > 0) {
        dynamicBaseTotal += (rentedItem.pricePerDay * returnInfo.quantity) * daysRented;
      }
    });

    const totalPaidSoFar = selectedRental.paidAmount || selectedRental.advancePayment;
    const outstandingBalance = (dynamicBaseTotal + (selectedRental.fineAmount || 0) - (selectedRental.discountAmount || 0)) - totalPaidSoFar;
    const totalPayableToday = outstandingBalance + fineAmount - discount;
    const paymentValue = paymentAmount === '' ? 0 : parseFloat(paymentAmount) || 0;
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
          <div><p className="text-sm text-slate-500 dark:text-slate-400">Customer</p><p className="font-semibold text-slate-800 dark:text-white">{customers.find(c => c.id === selectedRental.customerId)?.name}</p></div>
          <div className="text-right"><p className="text-sm text-slate-500 dark:text-slate-400">Duration</p><p className="font-semibold text-slate-800 dark:text-white">{daysRented} Days</p></div>
        </div>
        <div>
          <h4 className="font-semibold mb-2">Select items to return:</h4>
          <div className="space-y-2 p-3 border rounded-lg dark:border-slate-700 max-h-60 overflow-y-auto">
            {selectedRental.items.map(rentedItem => {
              const itemInfo = items.find(i => i.id === rentedItem.itemId);
              const outstandingQty = rentedItem.quantity - (rentedItem.returnedQuantity || 0);
              if (outstandingQty <= 0) return null;
              const returnInfo = itemsToReturn[rentedItem.itemId]; const isChecked = !!returnInfo;
              return (
                <div key={rentedItem.itemId} className="grid grid-cols-12 items-center gap-2 p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                  <div className="col-span-1 flex items-center"><input type="checkbox" id={`check-${rentedItem.itemId}`} className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500" checked={isChecked} onChange={e => handleReturnItemChange(rentedItem.itemId, 'checked', e.target.checked, outstandingQty)} /></div>
                  <label htmlFor={`check-${rentedItem.itemId}`} className="col-span-5 cursor-pointer"><span className="font-medium text-slate-800 dark:text-slate-200">{itemInfo?.name}</span><span className="text-sm text-slate-500 dark:text-slate-400"> ({outstandingQty} out)</span></label>
                  <div className="col-span-3"><select value={returnInfo?.status || 'OK'} onChange={e => handleReturnItemChange(rentedItem.itemId, 'status', e.target.value, outstandingQty)} disabled={!isChecked} className="w-full text-xs px-2 py-1 border border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 disabled:opacity-50"><option value="OK">OK</option><option value="Damaged">Damaged</option><option value="Lost">Lost</option></select></div>
                  <div className="col-span-3"><input type="number" min="0" max={outstandingQty} value={returnInfo?.quantity || 0} onChange={e => handleReturnItemChange(rentedItem.itemId, 'quantity', parseInt(e.target.value, 10), outstandingQty)} disabled={!isChecked} className="w-full px-2 py-1 text-center border border-slate-300 rounded-md shadow-sm dark:bg-slate-700 dark:border-slate-600 focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-50" /></div>
                </div>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700">
          <Input id="fineAmount" label="Fine/Fee (Rs.)" type="number" min="0" value={fineAmount} onChange={e => setFineAmount(parseFloat(e.target.value) || 0)} />
          <Input id="discount" label="Discount (Rs.)" type="number" min="0" value={discount} onChange={e => setDiscount(parseFloat(e.target.value) || 0)} />
          <div className="md:col-span-2"><label htmlFor="fineNotes" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Notes for Fine/Discount</label><textarea id="fineNotes" value={fineNotes} onChange={e => setFineNotes(e.target.value)} placeholder="e.g., Screen cracked..." rows={2} className="block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm dark:bg-slate-900 dark:border-slate-700"></textarea></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4 dark:border-slate-700">
          <Input id="paymentAmount" label="Amount Paying Now (Rs.)" type="number" min="0" placeholder="Enter payment amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
          <div className="p-4 bg-slate-100 dark:bg-slate-900/50 rounded-lg text-right space-y-1">
            <p className="text-slate-500 dark:text-slate-400 text-sm">Base Total (Selected Items): Rs. {dynamicBaseTotal.toFixed(2)}</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Advance/Paid (-): <span className="text-emerald-600 dark:text-emerald-400">Rs. {totalPaidSoFar.toFixed(2)}</span></p>
            <div className="pt-1 mt-1 border-t border-slate-200 dark:border-slate-700"></div>
            <p className="text-slate-600 dark:text-slate-300">Remaining Base Balance: <span className="font-semibold">Rs. {outstandingBalance.toFixed(2)}</span></p>
            {fineAmount > 0 && <p className="text-slate-600 dark:text-slate-300">New Fines (+): <span className="font-semibold text-red-500">Rs. {fineAmount.toFixed(2)}</span></p>}
            {discount > 0 && <p className="text-slate-600 dark:text-slate-300">Discount (-): <span className="font-semibold text-emerald-600 dark:text-emerald-400">Rs. {discount.toFixed(2)}</span></p>}
            <p className="text-2xl font-bold text-slate-800 dark:text-white mt-3 pt-2 border-t border-slate-200 dark:border-slate-700">Total Due: Rs. {Math.max(0, totalPayableToday).toFixed(2)}</p>
            <p className={`text-md font-semibold mt-1 ${totalPayableToday - paymentValue > 0 ? 'text-amber-500' : 'text-emerald-500'}`}>Left to Pay Later: Rs. {Math.max(0, totalPayableToday - paymentValue).toFixed(2)}</p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t dark:border-slate-700">
          <div className="flex items-center space-x-6">
            <div className="flex items-center"><input type="checkbox" id="print-invoice-checkin" checked={printInvoice} onChange={(e) => setPrintInvoice(e.target.checked)} className="h-4 w-4 rounded border-slate-400 dark:border-slate-500 text-blue-600 focus:ring-blue-500 bg-transparent dark:bg-slate-800" /><label htmlFor="print-invoice-checkin" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">Print Invoice</label></div>
            <div className="flex items-center"><input type="checkbox" id="send-whatsapp-checkin" checked={sendWhatsApp} onChange={(e) => setSendWhatsApp(e.target.checked)} className="h-4 w-4 rounded border-slate-400 dark:border-slate-500 text-blue-600 focus:ring-blue-500 bg-transparent dark:bg-slate-800" /><label htmlFor="send-whatsapp-checkin" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">Send WhatsApp</label></div>
          </div>
          <div className="flex justify-end space-x-3 mt-4 sm:mt-0"><Button variant="secondary" onClick={() => setSelectedRental(null)}>Cancel</Button><Button variant="primary" onClick={handleConfirmCheckIn} disabled={Object.keys(itemsToReturn).length === 0}>Confirm Return</Button></div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
        <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6">Active Rentals - Check In</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border dark:border-slate-600"><div className="md:col-span-1"><Input id="search-checkin" label="Search" placeholder="Customer, items, ID..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50 dark:bg-slate-700/50 dark:text-slate-400">
              <tr><th scope="col" className="px-6 py-4">Customer</th><th scope="col" className="px-6 py-4">Pending Items</th><th scope="col" className="px-6 py-4">Days Rented</th><th scope="col" className="px-6 py-4">Amount Paid</th><th scope="col" className="px-6 py-4">Current Total</th><th scope="col" className="px-6 py-4">Status</th><th scope="col" className="px-6 py-4 text-right">Actions</th></tr>
            </thead>
            <tbody>
              {activeRentals.map(rental => {
                const customer = customers.find(c => c.id === rental.customerId);
                const outstandingItemsList = rental.items.map(ri => { const item = items.find(i => i.id === ri.itemId); const outstandingQty = ri.quantity - (ri.returnedQuantity || 0); if (outstandingQty > 0) return `${item?.name || 'Item'} (x${outstandingQty})`; return null; }).filter(Boolean).join(', ');
                const daysRented = Math.max(1, Math.ceil(Math.abs(new Date().setHours(0, 0, 0, 0) - new Date(rental.checkoutDate).setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24)));
                const amountPaid = rental.paidAmount ?? rental.advancePayment ?? 0;
                return (
                  <tr key={rental.id} className="bg-white border-b dark:bg-slate-800 dark:border-slate-700 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap dark:text-white">{customer?.name}</td><td className="px-6 py-4 truncate max-w-xs" title={outstandingItemsList}>{outstandingItemsList}</td>
                    <td className="px-6 py-4">{daysRented} Days</td>
                    <td className="px-6 py-4 font-medium text-blue-600 dark:text-blue-400">Rs. {amountPaid.toFixed(2)}</td>
                    <td className="px-6 py-4 font-medium text-emerald-600 dark:text-emerald-400">Rs. {rental.totalAmount.toFixed(2)}</td><td className="px-6 py-4"><span className={getStatusBadge(rental.status)}>{rental.status}</span></td><td className="px-6 py-4 text-right"><Button size="sm" variant="primary" onClick={() => openCheckInModal(rental)}>Check In</Button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {activeRentals.length === 0 && (<p className="text-center text-slate-500 dark:text-slate-400 py-8">No active rentals found matching your criteria.</p>)}
        </div>
      </div>
      <Modal isOpen={!!selectedRental} onClose={() => setSelectedRental(null)} title="Process Return">
        {renderModalContent()}
      </Modal>
    </div>
  );
};

export default CheckIn;
