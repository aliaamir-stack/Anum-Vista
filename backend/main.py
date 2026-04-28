from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List
from datetime import datetime
from decimal import Decimal

try:
    from backend import models, schemas
    from backend.database import engine, get_db
except ImportError:
    import models
    import schemas
    from database import engine, get_db

# Create DB tables
models.Base.metadata.create_all(bind=engine)


def _ensure_occupant_car_columns() -> None:
    with engine.connect() as conn:
        columns = {
            row[1]
            for row in conn.execute(text("PRAGMA table_info(occupants)")).fetchall()
        }
        if "car_count" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE occupants ADD COLUMN car_count INTEGER NOT NULL DEFAULT 1"
                )
            )
        if "extra_car_maintenance_fee" not in columns:
            conn.execute(
                text(
                    "ALTER TABLE occupants ADD COLUMN extra_car_maintenance_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00"
                )
            )
        conn.commit()


_ensure_occupant_car_columns()

app = FastAPI(
    title="Property Management API",
    description="Backend API for Anum Vista property management.",
    version="1.0.0"
)

# CORS setup for frontend (Developer B)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, replace with frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def _month_index(year: int, month: int) -> int:
    return year * 12 + month

def _compute_expected_dues(occupant: "models.Occupant", as_of: datetime | None = None) -> Decimal:
    """Estimate outstanding dues using last_paid_month against the current month."""
    reference = as_of or datetime.now()
    base_fee = occupant.monthly_maintenance_fee or Decimal("0.00")
    extra_cars = max(0, int(occupant.car_count or 1) - 1)
    extra_fee = occupant.extra_car_maintenance_fee or Decimal("0.00")
    monthly_fee = base_fee + (extra_fee * extra_cars)

    if monthly_fee <= 0:
        return Decimal("0.00")

    if occupant.last_paid_month is None:
        # No payment history available: treat current month fee as due.
        return monthly_fee

    paid = occupant.last_paid_month
    current_idx = _month_index(reference.year, reference.month)
    paid_idx = _month_index(paid.year, paid.month)
    overdue_months = max(0, current_idx - paid_idx)
    return monthly_fee * overdue_months

@app.get("/")
def read_root():
    return {"message": "Welcome to Anum Vista Property Management API"}

@app.get("/api/tenants", response_model=List[schemas.OccupantOut])
def get_tenants(db: Session = Depends(get_db)):
    occupants = db.query(models.Occupant).all()
    for occupant in occupants:
        extra_cars = max(0, int(occupant.car_count or 1) - 1)
        extra_fee = occupant.extra_car_maintenance_fee or Decimal("0.00")
        base_fee = occupant.monthly_maintenance_fee or Decimal("0.00")
        occupant.extra_cars = extra_cars
        occupant.extra_car_charges = extra_fee * extra_cars
        occupant.total_monthly_maintenance = base_fee + occupant.extra_car_charges
        occupant.expected_dues = _compute_expected_dues(occupant)
    return occupants


@app.patch("/api/tenants/{occupant_id}/cars", response_model=schemas.OccupantOut)
def update_tenant_car_maintenance(
    occupant_id: int,
    payload: schemas.OccupantCarUpdate,
    db: Session = Depends(get_db),
):
    if payload.car_count < 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="car_count cannot be negative")
    if payload.extra_car_maintenance_fee < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="extra_car_maintenance_fee cannot be negative",
        )

    occupant = db.query(models.Occupant).filter(models.Occupant.id == occupant_id).first()
    if not occupant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")

    occupant.car_count = payload.car_count
    occupant.extra_car_maintenance_fee = payload.extra_car_maintenance_fee
    db.add(occupant)
    db.commit()
    db.refresh(occupant)

    extra_cars = max(0, int(occupant.car_count or 1) - 1)
    extra_fee = occupant.extra_car_maintenance_fee or Decimal("0.00")
    base_fee = occupant.monthly_maintenance_fee or Decimal("0.00")
    occupant.extra_cars = extra_cars
    occupant.extra_car_charges = extra_fee * extra_cars
    occupant.total_monthly_maintenance = base_fee + occupant.extra_car_charges
    occupant.expected_dues = _compute_expected_dues(occupant)
    return occupant

@app.get("/api/transactions", response_model=List[schemas.TransactionOut])
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
    return transactions

@app.post("/api/transactions", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_txn = models.Transaction(**transaction.model_dump())
    db.add(db_txn)
    
    # If INFLOW maintenance, advance last_paid_month to the newest paid month.
    if transaction.type == models.TransactionType.INFLOW and transaction.category == models.TransactionCategory.maintenance:
        occupant = db.query(models.Occupant).filter(models.Occupant.id == transaction.occupant_id).first()
        if occupant:
            if occupant.last_paid_month is None or transaction.date > occupant.last_paid_month:
                occupant.last_paid_month = transaction.date
            db.add(occupant)

    db.commit()
    db.refresh(db_txn)
    return db_txn


@app.delete("/api/transactions/{transaction_id}", status_code=status.HTTP_200_OK)
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    txn = db.query(models.Transaction).filter(models.Transaction.id == transaction_id).first()
    if not txn:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Transaction not found")

    db.delete(txn)
    db.commit()
    return {"message": "Transaction deleted successfully", "transaction_id": transaction_id}

@app.get("/api/dashboard/metrics", response_model=schemas.DashboardMetrics)
def get_dashboard_metrics(db: Session = Depends(get_db)):
    current_month = datetime.now().month
    current_year = datetime.now().year

    # Total revenue (INFLOW this month)
    total_rev = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.INFLOW,
        func.extract('month', models.Transaction.date) == current_month,
        func.extract('year', models.Transaction.date) == current_year
    ).scalar() or Decimal('0.00')

    # Treasury Balance (All inflows - All outflows)
    inflows = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.type == models.TransactionType.INFLOW).scalar() or Decimal('0.00')
    outflows = db.query(func.sum(models.Transaction.amount)).filter(models.Transaction.type == models.TransactionType.OUTFLOW).scalar() or Decimal('0.00')
    treasury_balance = inflows - outflows

    # Total overdues derived from tenant expected dues.
    occupants = db.query(models.Occupant).all()
    total_overdues = sum((_compute_expected_dues(occupant) for occupant in occupants), Decimal("0.00"))

    # Ad revenue (All time)
    ad_rev = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.category == models.TransactionCategory.ad_revenue
    ).scalar() or Decimal('0.00')

    return schemas.DashboardMetrics(
        total_revenue=total_rev,
        treasury_balance=treasury_balance,
        total_overdues=total_overdues,
        ad_revenue=ad_rev
    )
