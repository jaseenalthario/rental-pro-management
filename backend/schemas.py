from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Users
class UserBase(BaseModel):
    name: str
    username: str
    role: str

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: str
    lastLogin: Optional[str] = None
    
    class Config:
        from_attributes = True

# Customers
class CustomerBase(BaseModel):
    name: str
    nic: str
    phone: str
    address: str
    photoUrl: Optional[str] = None
    nicFrontUrl: Optional[str] = None
    nicBackUrl: Optional[str] = None
    notes: Optional[str] = ""

class CustomerCreate(CustomerBase):
    createdAt: str

class Customer(CustomerBase):
    id: str
    createdAt: str

    class Config:
        from_attributes = True

# Items
class ItemBase(BaseModel):
    name: str
    model: str
    quantity: int
    rentalPrice: float
    remarks: Optional[str] = ""

class ItemCreate(ItemBase):
    pass

class ItemUpdate(ItemBase):
    id: str
    available: int

class Item(ItemBase):
    id: str
    available: int
    addedAt: str

    class Config:
        from_attributes = True

# Rentals and Sub-items
class RentedItemBase(BaseModel):
    itemId: str
    quantity: int
    returnedQuantity: int = 0
    pricePerDay: float
    returnStatus: Optional[str] = None

class RentedItemCreate(RentedItemBase):
    pass

class RentedItem(RentedItemBase):
    class Config:
        from_attributes = True

class PaymentBase(BaseModel):
    date: str
    amount: float

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    class Config:
        from_attributes = True

class RentalBase(BaseModel):
    customerId: str
    checkoutDate: str
    expectedReturnDate: str
    actualReturnDate: Optional[str] = None
    totalAmount: float
    advancePayment: float
    paidAmount: Optional[float] = 0
    status: str
    fineAmount: Optional[float] = 0
    fineNotes: Optional[str] = ""
    discountAmount: Optional[float] = 0
    remarks: Optional[str] = ""

class RentalCreate(RentalBase):
    items: List[RentedItemCreate]
    paymentHistory: Optional[List[PaymentCreate]] = []

class RentalUpdate(RentalBase):
    items: List[RentedItemCreate]
    paymentHistory: Optional[List[PaymentCreate]] = []

class Rental(RentalBase):
    id: str
    items: List[RentedItem] = []
    paymentHistory: List[Payment] = []

    class Config:
        from_attributes = True

# Settings
class SettingsBase(BaseModel):
    shopName: str
    logoUrl: Optional[str] = None
    checkoutTemplate: str
    checkinTemplate: str
    balanceReminderTemplate: str
    whatsAppCountryCode: str
    invoiceCustomText: str

class SettingsUpdate(SettingsBase):
    pass

class Settings(SettingsBase):
    id: str

    class Config:
        from_attributes = True
