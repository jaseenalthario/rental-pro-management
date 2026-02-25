export enum UserRole {
  ADMIN = 'Admin',
  MANAGER = 'Manager',
  STAFF = 'Staff',
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  username: string;
  lastLogin?: string;
}

export interface Customer {
  id: string;
  name: string;
  nic: string;
  phone: string;
  address: string;
  photoUrl?: string;
  nicFrontUrl?: string;
  nicBackUrl?: string;
  notes: string;
  createdAt: string;
}

export enum ItemStatus {
  AVAILABLE = 'Available',
  RENTED = 'Rented',
  MAINTENANCE = 'Maintenance',
  DAMAGED = 'Damaged',
  LOST = 'Lost',
}

export interface Item {
  id: string;
  name: string;
  model: string;
  quantity: number;
  available: number;
  rentalPrice: number;
  remarks: string;
  addedAt: string;
}

export interface RentedItem {
    itemId: string;
    quantity: number;
    returnedQuantity: number;
    pricePerDay: number;
    returnStatus?: 'OK' | 'Damaged' | 'Lost';
}

export interface Payment {
    date: string;
    amount: number;
}

export interface Rental {
    id: string;
    customerId: string;
    items: RentedItem[];
    checkoutDate: string;
    expectedReturnDate: string;
    actualReturnDate?: string;
    totalAmount: number;
    advancePayment: number;
    paidAmount?: number;
    status: 'Rented' | 'Returned' | 'Partially Returned';
    fineAmount?: number;
    fineNotes?: string;
    discountAmount?: number;
    remarks?: string;
    paymentHistory?: Payment[];
}

export interface Alert {
    id: string;
    type: 'Overdue' | 'Low Stock' | 'Pending Payment';
    message: string;
    severity: 'high' | 'medium' | 'low';
}

export type Page = 'dashboard' | 'customers' | 'inventory' | 'check-out' | 'check-in' | 'reports' | 'settings' | 'balance-payments' | 'overdue-rentals';

export interface Settings {
    shopName: string;
    logoUrl: string | null;
    checkoutTemplate: string;
    checkinTemplate: string;
    balanceReminderTemplate: string;
    whatsAppCountryCode: string;
    invoiceCustomText: string;
}