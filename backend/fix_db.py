import models
from database import SessionLocal, engine

# Create the database tables if not existing
models.Base.metadata.create_all(bind=engine)

db = SessionLocal()

bad_rentals = db.query(models.Rental).filter(models.Rental.totalAmount > 1000000).all()
print(f"Found {len(bad_rentals)} bad rentals. Deleting...")

for r in bad_rentals:
    db.delete(r)

db.commit()
print("Cleaned!")
