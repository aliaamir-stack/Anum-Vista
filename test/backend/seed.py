import os
from datetime import datetime
from decimal import Decimal
from sqlalchemy import and_

# Force the requested DB for this seed run.
os.environ["DATABASE_URL"] = "postgresql://postgres:admin@localhost:5432/anum_vista_db"

from database import SessionLocal
import models


RESIDENTS = [
    {"unit_no": "101", "name": "Mr. Rehan", "monthly_fee": "9500", "unit_type": models.UnitType.residential},
    {"unit_no": "102", "name": "Mr. Faisal A. Khan", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "103", "name": "Mrs. Rashid", "monthly_fee": "2500", "unit_type": models.UnitType.residential},
    {"unit_no": "104", "name": "Mr. Dilshad", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "201", "name": "Mr. Ammar", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "202", "name": "Mr. Faisal", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "203", "name": "Mr. Bakshish", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "204", "name": "Mr. Taimur", "monthly_fee": "7500", "unit_type": models.UnitType.residential},
    {"unit_no": "301", "name": "Mr. Zia", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "302", "name": "Mr. Ashraf", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "303", "name": "Mr. Mubeen", "monthly_fee": "9000", "unit_type": models.UnitType.residential},
    {"unit_no": "304", "name": "Mr. Farhan", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "401", "name": "Dr. Nazim", "monthly_fee": "9500", "unit_type": models.UnitType.residential},
    {"unit_no": "402", "name": "Mr. Junaid", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "403", "name": "Mr. Asif Siddiqui", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "404", "name": "Mr. Khalid Ashraf Lari", "monthly_fee": "7500", "unit_type": models.UnitType.residential},
    {"unit_no": "501", "name": "Mr. Tanveer Iqbal", "monthly_fee": "7500", "unit_type": models.UnitType.residential},
    {"unit_no": "502", "name": "Mr. Naveed Ansari", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "503", "name": "Mr. Salman Khan", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "504", "name": "Mr. Nafis", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "601", "name": "Mr. Sohail", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "602", "name": "Mr. Nasir", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "603", "name": "Mr. Shahid", "monthly_fee": "9000", "unit_type": models.UnitType.residential},
    {"unit_no": "604", "name": "Mr. Ashfaque Sb", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "701", "name": "Mr. Owais", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "702", "name": "Mrs. Younus", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "703", "name": "Mr. Yousuf", "monthly_fee": "11000", "unit_type": models.UnitType.residential},
    {"unit_no": "704", "name": "Mr. Taj", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "801", "name": "Mr. Kashif Patel", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "802", "name": "Mr. Munaf", "monthly_fee": "7500", "unit_type": models.UnitType.residential},
    {"unit_no": "803", "name": "Mr. Shamim", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "804", "name": "Mr. Aziz", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "901", "name": "Mr. Fahad Qureshi", "monthly_fee": "4000", "unit_type": models.UnitType.residential},
    {"unit_no": "902", "name": "Mr. Arif 2", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "903", "name": "Mr. Muhammad Arif", "monthly_fee": "7000", "unit_type": models.UnitType.residential},
    {"unit_no": "904", "name": "Mr. Hafeez", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "1001", "name": "Mr. Danish", "monthly_fee": "4000", "unit_type": models.UnitType.residential},
    {"unit_no": "1002", "name": "Dr. Mansoor", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "1003", "name": "Mr. Wajih", "monthly_fee": "9000", "unit_type": models.UnitType.residential},
    {"unit_no": "1004", "name": "Mr. Ali", "monthly_fee": "5500", "unit_type": models.UnitType.residential},
    {"unit_no": "Shop-A", "name": "Shop A", "monthly_fee": "7500", "unit_type": models.UnitType.shop},
]


MAINTENANCE_TRANSACTIONS = [
    {"name": "Mr. Rehan", "unit_no": "101", "amount": "28500", "receipt_no": "229", "date": "2026-01-06"},
    {"name": "Mr. Faisal A. Khan", "unit_no": "102", "amount": "14000", "receipt_no": "239", "date": "2026-01-08"},
    {"name": "Mr. Faisal A. Khan", "unit_no": "102", "amount": "7000", "receipt_no": "263", "date": "2026-02-05"},
    {"name": "Mr. Faisal A. Khan", "unit_no": "102", "amount": "7000", "receipt_no": "287", "date": "2026-03-04"},
    {"name": "Mr. Dilshad", "unit_no": "104", "amount": "7000", "receipt_no": "237", "date": "2026-01-07"},
    {"name": "Mr. Dilshad", "unit_no": "104", "amount": "7000", "receipt_no": "254", "date": "2026-02-02"},
    {"name": "Mr. Dilshad", "unit_no": "104", "amount": "7000", "receipt_no": "285", "date": "2026-03-02"},
    {"name": "Mr. Ammar", "unit_no": "201", "amount": "5500", "receipt_no": "235", "date": "2026-01-06"},
    {"name": "Mr. Ammar", "unit_no": "201", "amount": "5500", "receipt_no": "255", "date": "2026-02-02"},
    {"name": "Mr. Ammar", "unit_no": "201", "amount": "5500", "receipt_no": "284", "date": "2026-03-01"},
    {"name": "Mr. Ammar", "unit_no": "201", "amount": "5500", "receipt_no": "308", "date": "2026-04-02"},
    {"name": "Mr. Faisal", "unit_no": "202", "amount": "21000", "receipt_no": "245", "date": "2026-01-12"},
    {"name": "Mr. Bakshish", "unit_no": "203", "amount": "7000", "receipt_no": "241", "date": "2026-01-08"},
    {"name": "Mr. Taimur", "unit_no": "204", "amount": "7500", "receipt_no": "251", "date": "2026-01-30"},
    {"name": "Mr. Taimur", "unit_no": "204", "amount": "7500", "receipt_no": "281", "date": "2026-02-26"},
    {"name": "Mr. Taimur", "unit_no": "204", "amount": "7500", "receipt_no": "302", "date": "2026-03-20"},
    {"name": "Mr. Zia", "unit_no": "301", "amount": "5500", "receipt_no": "233", "date": "2026-01-05"},
    {"name": "Mr. Zia", "unit_no": "301", "amount": "5500", "receipt_no": "264", "date": "2026-02-06"},
    {"name": "Mr. Zia", "unit_no": "301", "amount": "5500", "receipt_no": "294", "date": "2026-03-07"},
    {"name": "Mr. Ashraf", "unit_no": "302", "amount": "33000", "receipt_no": "279", "date": "2026-02-26"},
    {"name": "Mr. Mubeen", "unit_no": "303", "amount": "9000", "receipt_no": "236", "date": "2026-01-06"},
    {"name": "Mr. Mubeen", "unit_no": "303", "amount": "9000", "receipt_no": "269", "date": "2026-02-09"},
    {"name": "Mr. Mubeen", "unit_no": "303", "amount": "9000", "receipt_no": "288", "date": "2026-03-04"},
    {"name": "Mr. Farhan", "unit_no": "304", "amount": "5500", "receipt_no": "234", "date": "2026-01-06"},
    {"name": "Mr. Farhan", "unit_no": "304", "amount": "5500", "receipt_no": "261", "date": "2026-02-05"},
    {"name": "Mr. Farhan", "unit_no": "304", "amount": "5500", "receipt_no": "293", "date": "2026-03-07"},
    {"name": "Dr. Nazim", "unit_no": "401", "amount": "9500", "receipt_no": "230", "date": "2026-01-04"},
    {"name": "Dr. Nazim", "unit_no": "401", "amount": "9500", "receipt_no": "257", "date": "2026-02-05"},
    {"name": "Dr. Nazim", "unit_no": "401", "amount": "9500", "receipt_no": "289", "date": "2026-03-04"},
    {"name": "Mr. Junaid", "unit_no": "402", "amount": "33000", "receipt_no": "227", "date": "2026-01-01"},
    {"name": "Mr. Naveed Ansari", "unit_no": "502", "amount": "16500", "receipt_no": "266", "date": "2026-03-31"},
    {"name": "Mr. Nafis", "unit_no": "504", "amount": "5500", "receipt_no": "228", "date": "2026-01-05"},
    {"name": "Mr. Nafis", "unit_no": "504", "amount": "5500", "receipt_no": "259", "date": "2026-02-05"},
    {"name": "Mr. Nafis", "unit_no": "504", "amount": "5500", "receipt_no": "290", "date": "2026-03-06"},
    {"name": "Mr. Sohail", "unit_no": "601", "amount": "5500", "receipt_no": "258", "date": "2026-01-26"},
    {"name": "Mr. Sohail", "unit_no": "601", "amount": "5500", "receipt_no": "280", "date": "2026-02-27"},
    {"name": "Mr. Sohail", "unit_no": "601", "amount": "5500", "receipt_no": "304", "date": "2026-03-28"},
    {"name": "Mr. Nasir", "unit_no": "602", "amount": "5500", "receipt_no": "243", "date": "2026-01-15"},
    {"name": "Mr. Nasir", "unit_no": "602", "amount": "5500", "receipt_no": "273", "date": "2026-02-07"},
    {"name": "Mr. Nasir", "unit_no": "602", "amount": "5500", "receipt_no": "298", "date": "2026-03-11"},
    {"name": "Mr. Shahid", "unit_no": "603", "amount": "18000", "receipt_no": "267", "date": "2026-02-08"},
    {"name": "Mr. Ashfaque Sb", "unit_no": "604", "amount": "5500", "receipt_no": "260", "date": "2026-01-29"},
    {"name": "Mr. Ashfaque Sb", "unit_no": "604", "amount": "5500", "receipt_no": "292", "date": "2026-02-28"},
    {"name": "Mr. Owais", "unit_no": "701", "amount": "5500", "receipt_no": "244", "date": "2026-01-11"},
    {"name": "Mr. Owais", "unit_no": "701", "amount": "11000", "receipt_no": "286", "date": "2026-03-04"},
    {"name": "Mrs. Younus", "unit_no": "702", "amount": "21500", "receipt_no": "268", "date": "2026-02-08"},
    {"name": "Mrs. Younus", "unit_no": "702", "amount": "5500", "receipt_no": "303", "date": "2026-03-16"},
    {"name": "Mr. Yousuf", "unit_no": "703", "amount": "11000", "receipt_no": "247", "date": "2026-01-13"},
    {"name": "Mr. Yousuf", "unit_no": "703", "amount": "11000", "receipt_no": "271", "date": "2026-02-12"},
    {"name": "Mr. Yousuf", "unit_no": "703", "amount": "11000", "receipt_no": "295", "date": "2026-03-08"},
    {"name": "Mr. Taj", "unit_no": "704", "amount": "13000", "receipt_no": "248/242", "date": "2026-01-13"},
    {"name": "Mr. Taj", "unit_no": "704", "amount": "5500", "receipt_no": "275", "date": "2026-02-16"},
    {"name": "Mr. Taj", "unit_no": "704", "amount": "5500", "receipt_no": "299", "date": "2026-03-15"},
    {"name": "Mr. Kashif Patel", "unit_no": "801", "amount": "11000", "receipt_no": "274", "date": "2026-02-15"},
    {"name": "Mr. Kashif Patel", "unit_no": "801", "amount": "5500", "receipt_no": "296", "date": "2026-03-07"},
    {"name": "Mr. Munaf", "unit_no": "802", "amount": "7500", "receipt_no": "232", "date": "2026-01-04"},
    {"name": "Mr. Munaf", "unit_no": "802", "amount": "7500", "receipt_no": "270", "date": "2026-02-12"},
    {"name": "Mr. Munaf", "unit_no": "802", "amount": "5500", "receipt_no": "305", "date": "2026-03-30"},
    {"name": "Mr. Shamim", "unit_no": "803", "amount": "7000", "receipt_no": "231", "date": "2026-01-04"},
    {"name": "Mr. Shamim", "unit_no": "803", "amount": "7000", "receipt_no": "256", "date": "2026-02-04"},
    {"name": "Mr. Shamim", "unit_no": "803", "amount": "7000", "receipt_no": "301", "date": "2026-03-17"},
    {"name": "Mr. Aziz", "unit_no": "804", "amount": "5500", "receipt_no": "224", "date": "2026-01-01"},
    {"name": "Mr. Aziz", "unit_no": "804", "amount": "5500", "receipt_no": "252", "date": "2026-02-01"},
    {"name": "Mr. Aziz", "unit_no": "804", "amount": "5500", "receipt_no": "283", "date": "2026-03-01"},
    {"name": "Mr. Aziz", "unit_no": "804", "amount": "5500", "receipt_no": "307", "date": "2026-04-01"},
    {"name": "Mr. Arif 2", "unit_no": "902", "amount": "5500", "receipt_no": "250", "date": "2026-01-17"},
    {"name": "Mr. Arif 2", "unit_no": "902", "amount": "5500", "receipt_no": "278", "date": "2026-02-26"},
    {"name": "Mr. Muhammad Arif", "unit_no": "903", "amount": "7000", "receipt_no": "249", "date": "2026-01-17"},
    {"name": "Mr. Muhammad Arif", "unit_no": "903", "amount": "7000", "receipt_no": "277", "date": "2026-02-26"},
    {"name": "Mr. Hafeez", "unit_no": "904", "amount": "5500", "receipt_no": "246", "date": "2026-01-12"},
    {"name": "Mr. Hafeez", "unit_no": "904", "amount": "5500", "receipt_no": "276", "date": "2026-02-17"},
    {"name": "Mr. Hafeez", "unit_no": "904", "amount": "5500", "receipt_no": "300", "date": "2026-03-15"},
    {"name": "Mr. Danish", "unit_no": "1001", "amount": "12000", "receipt_no": "309", "date": "2026-04-04"},
    {"name": "Dr. Mansoor", "unit_no": "1002", "amount": "5500", "receipt_no": "223", "date": "2026-01-01"},
    {"name": "Dr. Mansoor", "unit_no": "1002", "amount": "5500", "receipt_no": "253", "date": "2026-02-01"},
    {"name": "Dr. Mansoor", "unit_no": "1002", "amount": "5500", "receipt_no": "282", "date": "2026-03-01"},
    {"name": "Dr. Mansoor", "unit_no": "1002", "amount": "5500", "receipt_no": "306", "date": "2026-04-01"},
    {"name": "Mr. Wajih", "unit_no": "1003", "amount": "9000", "receipt_no": "238", "date": "2026-01-08"},
    {"name": "Mr. Wajih", "unit_no": "1003", "amount": "9000", "receipt_no": "262", "date": "2026-02-05"},
    {"name": "Mr. Wajih", "unit_no": "1003", "amount": "9000", "receipt_no": "291", "date": "2026-03-06"},
    {"name": "Mr. Ali", "unit_no": "1004", "amount": "5500", "receipt_no": "240", "date": "2026-01-08"},
    {"name": "Mr. Ali", "unit_no": "1004", "amount": "5500", "receipt_no": "272", "date": "2026-02-12"},
    {"name": "Mr. Ali", "unit_no": "1004", "amount": "5500", "receipt_no": "297", "date": "2026-03-09"},
]


AD_TRANSACTIONS = [
    {"date": "2026-01-01", "amount": "500000", "notes": "Advertisement Jan 2026"},
    {"date": "2026-02-01", "amount": "700000", "notes": "Advertisement Feb 2026"},
    {"date": "2026-03-01", "amount": "1200000", "notes": "Advertisement Mar 2026"},
]


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d")


def find_or_create_unit(db, unit_no: str, unit_type):
    unit = db.query(models.Unit).filter(models.Unit.unit_no == unit_no).first()
    if unit:
        unit.type = unit_type
        return unit
    unit = models.Unit(unit_no=unit_no, type=unit_type)
    db.add(unit)
    db.flush()
    return unit


def find_or_create_occupant(db, unit_id: int, name: str, monthly_fee: Decimal):
    occupant = db.query(models.Occupant).filter(models.Occupant.unit_id == unit_id).first()
    if occupant:
        occupant.name = name
        occupant.monthly_maintenance_fee = monthly_fee
        return occupant
    occupant = models.Occupant(
        name=name,
        unit_id=unit_id,
        monthly_maintenance_fee=monthly_fee,
        last_paid_month=None,
    )
    db.add(occupant)
    db.flush()
    return occupant


def seed_units_and_occupants(db):
    occupants_by_unit = {}
    for resident in RESIDENTS:
        unit = find_or_create_unit(db, resident["unit_no"], resident["unit_type"])
        occupant = find_or_create_occupant(
            db=db,
            unit_id=unit.id,
            name=resident["name"],
            monthly_fee=Decimal(resident["monthly_fee"]),
        )
        occupants_by_unit[resident["unit_no"]] = occupant

    db.commit()
    return occupants_by_unit


def seed_maintenance_transactions(db, occupants_by_unit) -> None:
    for row in MAINTENANCE_TRANSACTIONS:
        occupant = occupants_by_unit[row["unit_no"]]
        tx_date = parse_date(row["date"])
        amount = Decimal(row["amount"])
        receipt_no = row["receipt_no"]

        existing = db.query(models.Transaction).filter(
            and_(
                models.Transaction.occupant_id == occupant.id,
                models.Transaction.receipt_no == receipt_no,
                models.Transaction.date == tx_date,
                models.Transaction.amount == amount,
                models.Transaction.type == models.TransactionType.INFLOW,
                models.Transaction.category == models.TransactionCategory.maintenance,
            )
        ).first()

        if existing:
            continue

        db.add(
            models.Transaction(
                occupant_id=occupant.id,
                receipt_no=receipt_no,
                date=tx_date,
                amount=amount,
                type=models.TransactionType.INFLOW,
                category=models.TransactionCategory.maintenance,
                notes=f"Maintenance for {row['name']} ({row['unit_no']})",
            )
        )

    db.flush()
    db.commit()

    for occupant in occupants_by_unit.values():
        latest = (
            db.query(models.Transaction)
            .filter(
                models.Transaction.occupant_id == occupant.id,
                models.Transaction.type == models.TransactionType.INFLOW,
                models.Transaction.category == models.TransactionCategory.maintenance,
            )
            .order_by(models.Transaction.date.desc())
            .first()
        )
        occupant.last_paid_month = latest.date if latest else None
    db.commit()


def seed_advertisement_transactions(db) -> None:
    for row in AD_TRANSACTIONS:
        tx_date = parse_date(row["date"])
        amount = Decimal(row["amount"])
        existing = db.query(models.Transaction).filter(
            and_(
                models.Transaction.occupant_id.is_(None),
                models.Transaction.receipt_no.is_(None),
                models.Transaction.date == tx_date,
                models.Transaction.amount == amount,
                models.Transaction.type == models.TransactionType.INFLOW,
                models.Transaction.category == models.TransactionCategory.ad_revenue,
                models.Transaction.notes == row["notes"],
            )
        ).first()
        if existing:
            continue

        db.add(
            models.Transaction(
                occupant_id=None,
                receipt_no=None,
                date=tx_date,
                amount=amount,
                type=models.TransactionType.INFLOW,
                category=models.TransactionCategory.ad_revenue,
                notes=row["notes"],
            )
        )
    db.commit()


def main() -> None:
    db = SessionLocal()
    try:
        occupants_by_unit = seed_units_and_occupants(db)
        seed_maintenance_transactions(db, occupants_by_unit)
        seed_advertisement_transactions(db)
        print("Additive seeding completed successfully.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
