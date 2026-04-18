import pandas as pd
from datetime import datetime
import os
import math
from decimal import Decimal

# Import DB and models
from database import engine, SessionLocal, Base
import models

def clean_value(val):
    if pd.isna(val) or val == ' ':
        return None
    return val

def run_migration():
    print("Starting migration process...")
    # Optional: Recreate tables for complete refresh during dev
    print("Dropping and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    excel_path = os.path.join(os.path.dirname(__file__), "..", "avfin.xlsx")
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found.")
        return

    print("Reading avfin.xlsx...")
    db = SessionLocal()

    try:
        # Load Recpt 2026 sheet. Skipping first 4 rows to get to the data
        df = pd.read_excel(excel_path, sheet_name='Recpt 2026', skiprows=4)

        # Iterate over rows
        for index, row in df.iterrows():
            name = clean_value(row.iloc[1]) # 'Residents Name' column index 1 in raw printed output (which was unnamed:1 because we skipped headers before differently)
            # Actually, because we skipped 4 rows, the resident name is at index 0 or 1 depending on pandas parsing.
            # Let's use iloc strictly based on our previous prints. The columns are:
            # 0: Unnamed/Empty, 1: Resident Name, 2: Appartment No
            name = str(row.iloc[1]).strip() if clean_value(row.iloc[1]) else None
            unit_no = str(row.iloc[2]).strip() if clean_value(row.iloc[2]) else None

            # Skip empty or summary rows
            if not name or name == 'nan' or name == 'Particulars' or not unit_no or unit_no == 'nan':
                continue

            # 1. Create Unit
            unit = db.query(models.Unit).filter(models.Unit.unit_no == unit_no).first()
            if not unit:
                unit = models.Unit(unit_no=unit_no, type=models.UnitType.residential)
                db.add(unit)
                db.flush() # flush to get unit.id

            # 2. Create Occupant
            occupant = db.query(models.Occupant).filter(
                models.Occupant.name == name, 
                models.Occupant.unit_id == unit.id
            ).first()
            if not occupant:
                occupant = models.Occupant(
                    name=name,
                    unit_id=unit.id,
                    monthly_maintenance_fee=Decimal('7000.00') # Mock estimate, ideally look up from a master layout or another column
                )
                db.add(occupant)
                db.flush() 

            # 3. Unpivot Months (Jan to Mar according to current columns, block is usually 3 columns wide)
            # Col 3: Jan Amount, Col 4: Jan Receipt, Col 5: Jan Date
            # Col 6: Feb Amount, Col 7: Feb Receipt, Col 8: Feb Date...
            # We'll just loop through clusters of 3 until we hit the summary cols (index ~16)
            for month_idx, start_col in enumerate(range(3, 15, 3)):
                amount = clean_value(row.iloc[start_col])
                receipt_no = clean_value(row.iloc[start_col+1])
                date_val = clean_value(row.iloc[start_col+2])

                if amount and str(amount).replace('.','',1).isdigit() and Decimal(str(amount)) > 0:
                    try:
                        parsed_date = pd.to_datetime(date_val) if pd.notnull(date_val) else datetime(2026, month_idx + 1, 1)
                    except Exception:
                        parsed_date = datetime(2026, month_idx + 1, 1)

                    txn = models.Transaction(
                        occupant_id=occupant.id,
                        receipt_no=str(receipt_no) if receipt_no else None,
                        date=parsed_date,
                        amount=Decimal(str(amount)),
                        type=models.TransactionType.INFLOW,
                        category=models.TransactionCategory.maintenance
                    )
                    db.add(txn)
                    
                    # Update last paid month conceptually
                    if not occupant.last_paid_month or parsed_date > occupant.last_paid_month:
                        occupant.last_paid_month = parsed_date

        # Commit all 
        db.commit()
        print("Successfully migrated Receipts!")

    except Exception as e:
        db.rollback()
        print(f"Error during migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
