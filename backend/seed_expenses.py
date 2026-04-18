import os
from datetime import datetime
from decimal import Decimal

from sqlalchemy import and_

# Force the requested DB for this seed run.
os.environ["DATABASE_URL"] = "postgresql://postgres:admin@localhost:5432/anum_vista_db"

from database import SessionLocal
import models


EXPENSE_TRANSACTIONS_2026 = [
    # January 2026
    {"date": "2026-01-01", "amount": "265000", "notes": "Salaries + Security Guards - January"},
    {"date": "2026-01-04", "amount": "21300", "notes": "Lift Work + Monthly Maintenance - January"},
    {"date": "2026-01-01", "amount": "15740", "notes": "Petty Cash Expenses - January"},
    {"date": "2026-01-01", "amount": "226381", "notes": "Utilities - K-Electric - January"},
    {"date": "2026-01-01", "amount": "34580", "notes": "Electrical Work Expenses - January"},
    {"date": "2026-01-01", "amount": "11500", "notes": "Generator & Diesel - January"},
    {"date": "2026-01-01", "amount": "18500", "notes": "Building Maintenance Others - January"},
    {"date": "2026-01-31", "amount": "273740", "notes": "Water Machine and Plumbing Work - January"},
    # February 2026
    {"date": "2026-02-15", "amount": "15000", "notes": "Water Tanker - February"},
    {"date": "2026-02-02", "amount": "225800", "notes": "Salaries + Security Guards - February"},
    {"date": "2026-02-02", "amount": "16500", "notes": "Lift Work + Monthly Maintenance - February"},
    {"date": "2026-02-01", "amount": "12560", "notes": "Petty Cash Expenses - February"},
    {"date": "2026-02-01", "amount": "242468", "notes": "Utilities - K-Electric - February"},
    {"date": "2026-02-01", "amount": "3640", "notes": "Electrical Work Expenses - February"},
    {"date": "2026-02-01", "amount": "53600", "notes": "Generator & Diesel - February"},
    {"date": "2026-02-01", "amount": "169450", "notes": "Building Colour - February"},
    {"date": "2026-02-01", "amount": "6600", "notes": "Building Maintenance Others - February"},
    {"date": "2026-02-01", "amount": "83600", "notes": "Water Machine and Plumbing - February"},
    # March 2026
    {"date": "2026-03-01", "amount": "276000", "notes": "Salaries + Security Guards - March"},
    {"date": "2026-03-16", "amount": "33000", "notes": "Lift Work + Monthly Maintenance - March"},
    {"date": "2026-03-01", "amount": "18170", "notes": "Petty Cash Expenses - March"},
    {"date": "2026-03-01", "amount": "224818", "notes": "Utilities - K-Electric - March"},
    {"date": "2026-03-01", "amount": "50110", "notes": "Electrical Work Expenses - March"},
    {"date": "2026-03-01", "amount": "92270", "notes": "Generator & Diesel - March"},
    {"date": "2026-03-01", "amount": "15000", "notes": "Play Area Expense - March"},
    {"date": "2026-03-01", "amount": "6970", "notes": "Building Maintenance Others - March"},
    {"date": "2026-03-01", "amount": "5990", "notes": "Water Machine and Plumbing - March"},
]


def parse_date(value: str) -> datetime:
    return datetime.strptime(value, "%Y-%m-%d")


def seed_expenses() -> None:
    db = SessionLocal()
    seeded_count = 0
    try:
        for row in EXPENSE_TRANSACTIONS_2026:
            tx_date = parse_date(row["date"])
            amount = Decimal(row["amount"])
            notes = row["notes"]

            existing = db.query(models.Transaction).filter(
                and_(
                    models.Transaction.occupant_id.is_(None),
                    models.Transaction.type == models.TransactionType.OUTFLOW,
                    models.Transaction.category == models.TransactionCategory.expense,
                    models.Transaction.date == tx_date,
                    models.Transaction.amount == amount,
                    models.Transaction.notes == notes,
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
                    type=models.TransactionType.OUTFLOW,
                    category=models.TransactionCategory.expense,
                    notes=notes,
                )
            )
            seeded_count += 1

        db.commit()
        print(f"Seeded {seeded_count} expense transactions successfully")
    finally:
        db.close()


if __name__ == "__main__":
    seed_expenses()
