from database import SessionLocal
import models
db = SessionLocal()
rentals = db.query(models.Rental).all()
items = db.query(models.Item).all()
rented_amounts = {}
for r in rentals:
    for ri in r.items:
        rented_amounts[ri.itemId] = rented_amounts.get(ri.itemId, 0) + (ri.quantity - ri.returnedQuantity)

for i in items:
    correct_avail = i.quantity - rented_amounts.get(i.id, 0)
    print(f"Item {i.name} correct avail: {correct_avail} (curr: {i.available})")
    i.available = correct_avail

db.commit()
print("Fixed!")
