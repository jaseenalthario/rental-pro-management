from sqlalchemy import Column, String, Integer, Float, DateTime, Text, ForeignKey, Enum as SQLEnum, JSON
from sqlalchemy.orm import relationship
import uuid
import datetime
from database import Base

def generate_uuid():
    return str(uuid.uuid4())

class User(Base):
    __tablename__ = "users"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    username = Column(String(100), unique=True, nullable=False)
    role = Column(String(50), nullable=False)
    lastLogin = Column(String(50), nullable=True)

class Customer(Base):
    __tablename__ = "customers"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    nic = Column(String(50), nullable=False)
    phone = Column(String(50), nullable=False)
    address = Column(Text, nullable=False)
    photoUrl = Column(Text, nullable=True)
    nicFrontUrl = Column(Text, nullable=True)
    nicBackUrl = Column(Text, nullable=True)
    notes = Column(Text, nullable=True)
    createdAt = Column(String(50), nullable=False)

class Item(Base):
    __tablename__ = "items"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    name = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    quantity = Column(Integer, nullable=False)
    available = Column(Integer, nullable=False)
    rentalPrice = Column(Float, nullable=False)
    remarks = Column(Text, nullable=True)
    addedAt = Column(String(50), nullable=False)

class Rental(Base):
    __tablename__ = "rentals"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    customerId = Column(String(50), ForeignKey("customers.id"), nullable=False)
    checkoutDate = Column(String(50), nullable=False)
    expectedReturnDate = Column(String(50), nullable=False)
    actualReturnDate = Column(String(50), nullable=True)
    totalAmount = Column(Float, nullable=False)
    advancePayment = Column(Float, nullable=False)
    paidAmount = Column(Float, nullable=True)
    status = Column(String(50), nullable=False)
    fineAmount = Column(Float, nullable=True)
    fineNotes = Column(Text, nullable=True)
    discountAmount = Column(Float, nullable=True)
    remarks = Column(Text, nullable=True)
    
    # Relationships
    customer = relationship("Customer")
    items = relationship("RentedItem", back_populates="rental", cascade="all, delete")
    paymentHistory = relationship("Payment", back_populates="rental", cascade="all, delete")

class RentedItem(Base):
    __tablename__ = "rented_items"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    rentalId = Column(String(50), ForeignKey("rentals.id"), nullable=False)
    itemId = Column(String(50), ForeignKey("items.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    returnedQuantity = Column(Integer, nullable=False, default=0)
    pricePerDay = Column(Float, nullable=False)
    returnStatus = Column(String(50), nullable=True)

    rental = relationship("Rental", back_populates="items")
    item = relationship("Item")

class Payment(Base):
    __tablename__ = "payments"
    id = Column(String(50), primary_key=True, default=generate_uuid)
    rentalId = Column(String(50), ForeignKey("rentals.id"), nullable=False)
    date = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)

    rental = relationship("Rental", back_populates="paymentHistory")

class Settings(Base):
    __tablename__ = "settings"
    id = Column(String(50), primary_key=True, default="default")
    shopName = Column(String(100), nullable=False)
    logoUrl = Column(Text, nullable=True)
    checkoutTemplate = Column(Text, nullable=False)
    checkinTemplate = Column(Text, nullable=False)
    balanceReminderTemplate = Column(Text, nullable=False)
    whatsAppCountryCode = Column(String(20), nullable=False)
    invoiceCustomText = Column(Text, nullable=False)
