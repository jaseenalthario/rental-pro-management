from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List
import datetime

import models
import schemas
from database import SessionLocal, engine, get_db

# Create the database tables
models.Base.metadata.create_all(bind=engine)

import os

app = FastAPI()

# Allow CORS for React app
frontend_url = os.getenv("FRONTEND_URL", "*")
origins = [frontend_url] if frontend_url != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------
# CUSTOMERS
# -----------------
@app.get("/api/customers", response_model=List[schemas.Customer])
def get_customers(db: Session = Depends(get_db)):
    return db.query(models.Customer).all()

@app.post("/api/customers", response_model=schemas.Customer)
def create_customer(customer: schemas.CustomerCreate, db: Session = Depends(get_db)):
    db_customer = models.Customer(**customer.dict())
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

@app.put("/api/customers/{customer_id}", response_model=schemas.Customer)
def update_customer(customer_id: str, customer: schemas.CustomerBase, db: Session = Depends(get_db)):
    db_cust = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    for key, value in customer.dict().items():
        setattr(db_cust, key, value)
    db.commit()
    db.refresh(db_cust)
    return db_cust

@app.delete("/api/customers/{customer_id}")
def delete_customer(customer_id: str, db: Session = Depends(get_db)):
    db_cust = db.query(models.Customer).filter(models.Customer.id == customer_id).first()
    if not db_cust:
        raise HTTPException(status_code=404, detail="Customer not found")
    db.delete(db_cust)
    db.commit()
    return {"success": True, "message": "Customer deleted"}

# -----------------
# ITEMS
# -----------------
@app.get("/api/items", response_model=List[schemas.Item])
def get_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()

@app.post("/api/items", response_model=schemas.Item)
def create_item(item: schemas.ItemCreate, db: Session = Depends(get_db)):
    db_item = models.Item(**item.dict(), available=item.quantity, addedAt=datetime.datetime.now().isoformat())
    db.add(db_item)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.put("/api/items/{item_id}", response_model=schemas.Item)
def update_item(item_id: str, item: schemas.ItemUpdate, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    for key, value in item.dict(exclude={"id"}).items():
        setattr(db_item, key, value)
    db.commit()
    db.refresh(db_item)
    return db_item

@app.delete("/api/items/{item_id}")
def delete_item(item_id: str, db: Session = Depends(get_db)):
    db_item = db.query(models.Item).filter(models.Item.id == item_id).first()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    db.delete(db_item)
    db.commit()
    return {"success": True, "message": "Item deleted"}

# -----------------
# RENTALS
# -----------------
@app.get("/api/rentals", response_model=List[schemas.Rental])
def get_rentals(db: Session = Depends(get_db)):
    rentals = db.query(models.Rental).all()
    # Explicitly ensure child relationships are loaded before returning
    for r in rentals:
        _ = r.items
        _ = r.paymentHistory
    return rentals

@app.post("/api/rentals", response_model=schemas.Rental)
def create_rental(rental: schemas.RentalCreate, db: Session = Depends(get_db)):
    rental_data = rental.dict(exclude={"items", "paymentHistory"})
    db_rental = models.Rental(**rental_data)
    db.add(db_rental)
    db.flush() # flush to get the rental DB ID 
    
    for item in rental.items:
        db_item = models.RentedItem(**item.dict(), rentalId=db_rental.id)
        db.add(db_item)
        
    for payment in rental.paymentHistory:
        db_payment = models.Payment(**payment.dict(), rentalId=db_rental.id)
        db.add(db_payment)
        
    db.commit()
    db.refresh(db_rental)
    return db_rental

@app.put("/api/rentals/{rental_id}", response_model=schemas.Rental)
def update_rental(rental_id: str, rental: schemas.RentalUpdate, db: Session = Depends(get_db)):
    db_rental = db.query(models.Rental).filter(models.Rental.id == rental_id).first()
    if not db_rental:
        raise HTTPException(status_code=404, detail="Rental not found")
        
    # Update main rental attributes
    rental_data = rental.dict(exclude={"items", "paymentHistory"})
    for key, value in rental_data.items():
        setattr(db_rental, key, value)
        
    # Update items: Clear existing and insert new
    db.query(models.RentedItem).filter(models.RentedItem.rentalId == rental_id).delete()
    for item in rental.items:
        db_item = models.RentedItem(**item.dict(), rentalId=rental_id)
        db.add(db_item)
        
    # Update payment history: Clear existing and insert new
    db.query(models.Payment).filter(models.Payment.rentalId == rental_id).delete()
    if rental.paymentHistory:
        for payment in rental.paymentHistory:
            db_payment = models.Payment(**payment.dict(), rentalId=rental_id)
            db.add(db_payment)
            
    db.commit()
    db.refresh(db_rental)
    return db_rental
