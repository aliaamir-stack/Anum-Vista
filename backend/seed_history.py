import os
from datetime import datetime
from decimal import Decimal, InvalidOperation

import pandas as pd
from sqlalchemy import and_

# Force the requested DB for this seed run.
os.environ["DATABASE_URL"] = "postgresql://postgres:admin@localhost:5432/anum_vista_db"

from database import SessionLocal
import models


EXCEL_PATH = "D:/Anum-Vista-main/avfin.xlsx"
SHEET_NAME = "Recpt 2025"
START_TRIPLET_COL = 3
TRIPLET_SIZE = 3
MIN_VALID_MAINTENANCE_AMOUNT = Decimal("2000")


def is_valid_numeric_unit(unit_value) -> bool:
    if pd.isna(unit_value):
        return False
    try:
        int(str(unit_value).strip())
        return True
    except ValueError:
        return False


def to_decimal(value):
    if pd.isna(value):
        return None
    try:
        amount = Decimal(str(value).strip())
    except (InvalidOperation, ValueError):
        return None
    return amount


def to_receipt_str(value):
    if pd.isna(value):
        return None
    return str(value).strip()


def parse_transaction_date(date_value):
    if pd.isna(date_value):
        return None

    if isinstance(date_value, pd.Timestamp):
        dt = date_value.to_pydatetime()
    elif isinstance(date_value, datetime):
        dt = date_value
    elif isinstance(date_value, (int, float)):
        # Source file stores some dates as timestamp-like numeric values.
        dt = pd.Timestamp(date_value).to_pydatetime()
    elif isinstance(date_value, str):
        raw = date_value.strip()
        if not raw:
            return None
        try:
            dt = datetime.strptime(raw, "%Y-%m-%d")
        except ValueError:
            return None
    else:
        return None

    if dt.year < 2020 or dt.year > 2030:
        return None
    return dt


def parse_triplet_values(v1, v2, v3):
    values = [v1, v2, v3]
    date_idx = None
    tx_date = None

    for idx, val in enumerate(values):
        parsed = parse_transaction_date(val)
        if parsed is not None:
            date_idx = idx
            tx_date = parsed
            break

    if tx_date is None:
        return None, None, None

    remaining = [(idx, values[idx]) for idx in range(3) if idx != date_idx]
    numeric_candidates = []
    text_candidates = []
    for idx, val in remaining:
        parsed = to_decimal(val)
        if parsed is not None and parsed > 0:
            numeric_candidates.append((idx, parsed))
        else:
            text_candidates.append((idx, val))

    amount = None
    receipt_no = None

    if len(numeric_candidates) == 2:
        # In mixed sheets, receipt and amount can swap positions.
        # Receipt numbers are generally smaller than maintenance amounts.
        numeric_candidates.sort(key=lambda item: item[1])
        receipt_no = str(numeric_candidates[0][1].quantize(Decimal("1")))
        amount = numeric_candidates[1][1]
    elif len(numeric_candidates) == 1:
        amount = numeric_candidates[0][1]
        if text_candidates:
            receipt_no = to_receipt_str(text_candidates[0][1])
    else:
        # Both non-numeric -> can't trust this triplet.
        return None, None, None

    if receipt_no is None and text_candidates:
        receipt_no = to_receipt_str(text_candidates[0][1])

    return amount, receipt_no, tx_date


def clear_previous_historical_transactions(db) -> None:
    keep_receipts = {str(i) for i in range(223, 310)}
    historical_rows = (
        db.query(models.Transaction)
        .filter(
            models.Transaction.type == models.TransactionType.INFLOW,
            models.Transaction.category == models.TransactionCategory.maintenance,
            models.Transaction.notes.like("Historical - %"),
        )
        .all()
    )

    deleted_count = 0
    for tx in historical_rows:
        receipt = (tx.receipt_no or "").strip()
        if receipt not in keep_receipts:
            db.delete(tx)
            deleted_count += 1

    db.commit()
    print(f"Cleared {deleted_count} historical transactions before reseed")


def seed_history() -> None:
    db = SessionLocal()
    seeded_tx_count = 0
    touched_residents = set()

    try:
        df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=None)
        clear_previous_historical_transactions(db)

        for _, row in df.iterrows():
            unit_raw = row.iloc[2] if len(row) > 2 else None
            if not is_valid_numeric_unit(unit_raw):
                continue

            unit_no = str(int(str(unit_raw).strip()))
            occupant = (
                db.query(models.Occupant)
                .join(models.Unit, models.Occupant.unit_id == models.Unit.id)
                .filter(models.Unit.unit_no == unit_no)
                .first()
            )
            if not occupant:
                continue

            col_idx = START_TRIPLET_COL
            while col_idx + 2 < len(row):
                try:
                    v1 = row.iloc[col_idx]
                    v2 = row.iloc[col_idx + 1]
                    v3 = row.iloc[col_idx + 2]

                    amount, receipt_no, tx_date_python = parse_triplet_values(v1, v2, v3)
                    if amount is None or tx_date_python is None:
                        col_idx += TRIPLET_SIZE
                        continue
                    if amount < MIN_VALID_MAINTENANCE_AMOUNT:
                        col_idx += TRIPLET_SIZE
                        continue

                    print(f"Processing: {occupant.name} {unit_no} {tx_date_python.date()} {amount}")

                    existing = None
                    if receipt_no:
                        existing = db.query(models.Transaction).filter(
                            and_(
                                models.Transaction.receipt_no == receipt_no,
                                models.Transaction.occupant_id == occupant.id,
                                models.Transaction.type == models.TransactionType.INFLOW,
                                models.Transaction.category == models.TransactionCategory.maintenance,
                            )
                        ).first()
                    else:
                        existing = db.query(models.Transaction).filter(
                            and_(
                                models.Transaction.occupant_id == occupant.id,
                                models.Transaction.date == tx_date_python,
                                models.Transaction.amount == amount,
                                models.Transaction.type == models.TransactionType.INFLOW,
                                models.Transaction.category == models.TransactionCategory.maintenance,
                            )
                        ).first()

                    if existing:
                        col_idx += TRIPLET_SIZE
                        continue

                    db.add(
                        models.Transaction(
                            occupant_id=occupant.id,
                            receipt_no=receipt_no,
                            date=tx_date_python,
                            amount=amount,
                            type=models.TransactionType.INFLOW,
                            category=models.TransactionCategory.maintenance,
                            notes=f"Historical - {occupant.name}",
                        )
                    )
                    seeded_tx_count += 1
                    touched_residents.add(occupant.id)
                except Exception:
                    # Skip malformed triplet and continue processing.
                    pass
                finally:
                    col_idx += TRIPLET_SIZE

        db.commit()
        print(f"Seeded {seeded_tx_count} transactions for {len(touched_residents)} residents")
    finally:
        db.close()


if __name__ == "__main__":
    seed_history()
