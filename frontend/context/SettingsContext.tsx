import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { Settings } from '../types';

const defaultCheckoutTemplate = `Dear [CustomerName],

Thank you for renting from [ShopName]!
Here are your rental details:

Invoice ID: [InvoiceID]
Items:
[ItemsList]

Expected Return Date: [ReturnDate]

Total Amount: Rs. [TotalAmount]
Advance Paid: Rs. [AdvancePaid]
Balance Due: Rs. [BalanceDue]

Thank you!`;

const defaultCheckinTemplate = `Dear [CustomerName],

We've processed your return for rental #[InvoiceID] for [ShopName].

Summary:
[ItemsList]

Additional Fines/Fees: Rs. [Fines]
Discount Applied: Rs. [Discount]
Amount Paid Today: Rs. [AmountPaid]
Remaining Balance: Rs. [RemainingBalance]

Thank you for your business!`;

const defaultBalanceReminderTemplate = `Dear [CustomerName],

This is a friendly reminder from [ShopName] regarding your outstanding balance of Rs. [BalanceDue] for rental #[InvoiceID].

Please contact us to settle the payment.

Thank you.`;


const defaultSettings: Settings = {
    shopName: 'RentalPro',
    logoUrl: null,
    checkoutTemplate: defaultCheckoutTemplate,
    checkinTemplate: defaultCheckinTemplate,
    balanceReminderTemplate: defaultBalanceReminderTemplate,
    whatsAppCountryCode: '94',
    invoiceCustomText: 'Thank you for your business! All rented items must be returned in good condition. Fines may apply for damages or late returns.',
};


interface SettingsContextType {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
        const storedSettings = localStorage.getItem('rentalProSettings');
        if (storedSettings) {
            // Merge stored settings with defaults to ensure all keys are present
            const parsedSettings = JSON.parse(storedSettings);
            return { ...defaultSettings, ...parsedSettings };
        }
    } catch (error) {
        console.error("Failed to parse settings from localStorage", error);
    }
    return defaultSettings;
  });

  useEffect(() => {
    try {
        localStorage.setItem('rentalProSettings', JSON.stringify(settings));
    } catch (error) {
        console.error("Failed to save settings to localStorage", error);
    }
  }, [settings]);

  return (
    <SettingsContext.Provider value={{ settings, setSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};