import pandas as pd
from datetime import datetime, date
import os
from decimal import Decimal

# Import DB and models
from database import engine, SessionLocal, Base
import models

def clean_value(val):
    if pd.isna(val) or val == ' ' or str(val).strip() == '':
        return None
    return val

def clean_amount(val):
    if pd.isna(val) or val == ' ' or str(val).strip() == '':
        return Decimal('0')
    try:
        val_str = str(val).replace(',', '').strip()
        return Decimal(val_str)
    except Exception:
        return Decimal('0')

def run_migration():
    print("Starting extended migration process...")
    print("Dropping and recreating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    excel_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "avfin.xlsx"))
    if not os.path.exists(excel_path):
        print(f"Error: {excel_path} not found.")
        return

    db = SessionLocal()
    try:
        print("Parsing Funds Breakup...")
        df_funds = pd.read_excel(excel_path, sheet_name='Funds Breakup', nrows=20) 
        for index, row in df_funds.iterrows():
            particulars = clean_value(row.iloc[1]) 
            amount = clean_amount(row.iloc[2]) 
            
            if particulars and 'Opening' in str(particulars) and amount > 0:
                txn = models.Transaction(
                    date=datetime(2024, 1, 1), 
                    amount=amount,
                    type=models.TransactionType.INFLOW,
                    category=models.TransactionCategory.other,
                    notes=str(particulars)
                )
                db.add(txn)
            elif particulars and 'Maintenance amount received' in str(particulars) and amount > 0:
                txn = models.Transaction(
                    date=datetime(2024, 1, 1),
                    amount=amount,
                    type=models.TransactionType.INFLOW,
                    category=models.TransactionCategory.other,
                    notes=str(particulars)
                )
                db.add(txn)
        db.commit()

        print("Parsing Advertisment...")
        df_adv = pd.read_excel(excel_path, sheet_name='Advertisment', skiprows=2)
        for index, row in df_adv.iterrows():
            duration = clean_value(row.iloc[1]) 
            name = clean_value(row.iloc[2]) 
            amount = clean_amount(row.iloc[3]) 
            
            if name and str(name).lower() != 'name' and str(name) != 'nan' and amount > 0:
                adv = db.query(models.Advertisement).filter(models.Advertisement.advertiser_name == str(name)).first()
                if not adv:
                    adv = models.Advertisement(advertiser_name=str(name), annual_fee=amount)
                    db.add(adv)
                    db.flush()
                
                txn = models.Transaction(
                    date=datetime(2021, 6, 1), 
                    amount=amount,
                    type=models.TransactionType.INFLOW,
                    category=models.TransactionCategory.ad_revenue,
                    notes=f"{name} - {duration}" if duration else str(name)
                )
                db.add(txn)
        db.commit()

        print("Parsing Recpt 2026...")
        df_recpt = pd.read_excel(excel_path, sheet_name='Recpt 2026', skiprows=4)
        for index, row in df_recpt.iterrows():
            name = str(row.iloc[1]).strip() if clean_value(row.iloc[1]) else None
            unit_no = str(row.iloc[2]).strip() if clean_value(row.iloc[2]) else None

            if not name or name == 'nan' or name == 'Particulars' or not unit_no or unit_no == 'nan':
                continue

            unit = db.query(models.Unit).filter(models.Unit.unit_no == unit_no).first()
            if not unit:
                unit = models.Unit(unit_no=unit_no, type=models.UnitType.residential)
                db.add(unit)
                db.flush()

            occupant = db.query(models.Occupant).filter(
                models.Occupant.name == name, 
                models.Occupant.unit_id == unit.id
            ).first()
            if not occupant:
                occupant = models.Occupant(
                    name=name,
                    unit_id=unit.id,
                    monthly_maintenance_fee=Decimal('7000.00')
                )
                db.add(occupant)
                db.flush()

            for month_idx, start_col in enumerate(range(3, 15, 3)):
                amount = clean_amount(row.iloc[start_col])
                receipt_no = clean_value(row.iloc[start_col+1])
                date_val = clean_value(row.iloc[start_col+2])

                if amount > 0:
                    try:
                        parsed_date = pd.to_datetime(date_val) if pd.notnull(date_val) else datetime(2026, month_idx + 1, 1)
                    except Exception:
                        parsed_date = datetime(2026, month_idx + 1, 1)

                    txn = models.Transaction(
                        occupant_id=occupant.id,
                        receipt_no=str(receipt_no) if receipt_no else None,
                        date=parsed_date,
                        amount=amount,
                        type=models.TransactionType.INFLOW,
                        category=models.TransactionCategory.maintenance
                    )
                    db.add(txn)
                    
                    if not occupant.last_paid_month or parsed_date > occupant.last_paid_month:
                        occupant.last_paid_month = parsed_date
        db.commit()

        print("Parsing Exp 2026...")
        df_exp = pd.read_excel(excel_path, sheet_name='Exp 2026', skiprows=3)
        for index, row in df_exp.iterrows():
            desc = clean_value(row.iloc[1])
            left_amount = clean_amount(row.iloc[4])
            left_date_val = clean_value(row.iloc[5])

            if desc and str(desc).lower() != 'discription' and str(desc) != 'nan' and left_amount > 0:
                try:
                    left_parsed_date = pd.to_datetime(left_date_val) if pd.notnull(left_date_val) else datetime(2026, 1, 1)
                except:
                    left_parsed_date = datetime(2026, 1, 1)
                
                txn_left = models.Transaction(
                    date=left_parsed_date,
                    amount=left_amount,
                    type=models.TransactionType.OUTFLOW,
                    category=models.TransactionCategory.expense,
                    notes=str(desc)
                )
                db.add(txn_left)
            
            try:
                petty_desc = clean_value(row.iloc[12])
                petty_date_val = clean_value(row.iloc[13])
                petty_amount = clean_amount(row.iloc[14])

                if petty_desc and str(petty_desc).lower() != 'particulors' and str(petty_desc) != 'nan' and petty_amount > 0:
                    try:
                        right_parsed_date = pd.to_datetime(petty_date_val) if pd.notnull(petty_date_val) else datetime(2026, 1, 1)
                    except:
                        right_parsed_date = datetime(2026, 1, 1)
                    
                    txn_right = models.Transaction(
                        date=right_parsed_date,
                        amount=petty_amount,
                        type=models.TransactionType.OUTFLOW,
                        category=models.TransactionCategory.expense,
                        notes=f"Petty: {petty_desc}"
                    )
                    db.add(txn_right)
            except IndexError:
                pass 

        db.commit()
        print("Successfully completed extended migration!")

    except Exception as e:
        db.rollback()
        print(f"Error during extended migration: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    run_migration()
