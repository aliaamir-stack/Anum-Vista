from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from typing import List
from datetime import datetime, date
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


from sqlalchemy import inspect, text

def _ensure_occupant_car_columns() -> None:
    with engine.connect() as conn:
        # PostgreSQL doesn't use PRAGMA. We use SQLAlchemy's inspector to find columns.
        inspector = inspect(engine)
        
        
        existing_columns = [col['name'] for col in inspector.get_columns('occupants')]
        
       
        if "car_count" not in existing_columns:
            conn.execute(
                text(
                    "ALTER TABLE occupants ADD COLUMN car_count INTEGER NOT NULL DEFAULT 1"
                )
            )
            print("Added column: car_count")

        # Check and add 'extra_car_maintenance_fee'
        if "extra_car_maintenance_fee" not in existing_columns:
            conn.execute(
                text(
                    "ALTER TABLE occupants ADD COLUMN extra_car_maintenance_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00"
                )
            )
            print("Added column: extra_car_maintenance_fee")
            
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
def get_transactions(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None, ge=1900, le=2100),
    limit: int | None = Query(default=None, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
):
    """
    If your UI shows fewer rows (e.g. 94/151), it's typically because it is
    filtering by year. This endpoint supports optional year/pagination.
    """
    q = db.query(models.Transaction).order_by(models.Transaction.date.desc())
    if year is not None:
        q = q.filter(func.extract("year", models.Transaction.date) == year)
    if offset:
        q = q.offset(offset)
    if limit is not None:
        q = q.limit(limit)
    transactions = q.all()
    return transactions


@app.get("/api/expense-descriptions", response_model=List[schemas.ExpenseDescriptionOut])
def get_expense_descriptions(db: Session = Depends(get_db)):
    return db.query(models.ExpenseDescription).order_by(models.ExpenseDescription.description.asc()).all()

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

    # Total revenue (INFLOW this month) - excludes TRANSFER
    total_rev = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.INFLOW,
        func.extract('month', models.Transaction.date) == current_month,
        func.extract('year', models.Transaction.date) == current_year
    ).scalar() or Decimal('0.00')

    # Treasury Balance (All inflows - All outflows), ignore TRANSFER (internal movement)
    inflows = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.INFLOW
    ).scalar() or Decimal('0.00')
    outflows = db.query(func.sum(models.Transaction.amount)).filter(
        models.Transaction.type == models.TransactionType.OUTFLOW
    ).scalar() or Decimal('0.00')
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


@app.get("/api/reports/monthly", response_model=schemas.MonthlyReportOut)
def get_monthly_report(
    year: int = Query(..., ge=1900, le=2100),
    month: int = Query(..., ge=1, le=12),
    db: Session = Depends(get_db),
):
    # Transaction-based totals
    base = db.query(models.Transaction).filter(
        func.extract("year", models.Transaction.date) == year,
        func.extract("month", models.Transaction.date) == month,
    )
    maintenance_received = base.filter(
        models.Transaction.type == models.TransactionType.INFLOW,
        models.Transaction.category == models.TransactionCategory.maintenance,
    ).with_entities(func.coalesce(func.sum(models.Transaction.amount), 0)).scalar() or Decimal("0.00")

    inflow_total = base.filter(models.Transaction.type == models.TransactionType.INFLOW).with_entities(
        func.coalesce(func.sum(models.Transaction.amount), 0)
    ).scalar() or Decimal("0.00")
    outflow_total = base.filter(models.Transaction.type == models.TransactionType.OUTFLOW).with_entities(
        func.coalesce(func.sum(models.Transaction.amount), 0)
    ).scalar() or Decimal("0.00")
    transfer_total = base.filter(models.Transaction.type == models.TransactionType.TRANSFER).with_entities(
        func.coalesce(func.sum(models.Transaction.amount), 0)
    ).scalar() or Decimal("0.00")

    inflow_by_category = {}
    for cat, total in (
        base.filter(models.Transaction.type == models.TransactionType.INFLOW)
        .with_entities(models.Transaction.category, func.sum(models.Transaction.amount))
        .group_by(models.Transaction.category)
        .all()
    ):
        inflow_by_category[str(cat.value if hasattr(cat, "value") else cat)] = total or Decimal("0.00")

    outflow_by_category = {}
    for cat, total in (
        base.filter(models.Transaction.type == models.TransactionType.OUTFLOW)
        .with_entities(models.Transaction.category, func.sum(models.Transaction.amount))
        .group_by(models.Transaction.category)
        .all()
    ):
        outflow_by_category[str(cat.value if hasattr(cat, "value") else cat)] = total or Decimal("0.00")

    # History-based treasury opening/closing if available (from funds_position_entries)
    period = date(year, month, 1)
    treasury_opening = (
        db.query(models.FundsPositionEntry.amount)
        .filter(
            models.FundsPositionEntry.period == period,
            models.FundsPositionEntry.section == "opening_balance",
            models.FundsPositionEntry.label == "Cash in Hand - Opening Balance",
        )
        .scalar()
    )
    treasury_closing = (
        db.query(models.FundsPositionEntry.amount)
        .filter(
            models.FundsPositionEntry.period == period,
            models.FundsPositionEntry.section == "closing_balance",
            models.FundsPositionEntry.label == "Cash in Hand - Closing Balance",
        )
        .scalar()
    )

    return schemas.MonthlyReportOut(
        year=year,
        month=month,
        maintenance_received=maintenance_received,
        inflow_total=inflow_total,
        outflow_total=outflow_total,
        transfer_total=transfer_total,
        treasury_opening=treasury_opening,
        treasury_closing=treasury_closing,
        inflow_by_category=inflow_by_category,
        outflow_by_category=outflow_by_category,
    )


@app.get("/api/treasury/current")
def get_current_treasury_split(db: Session = Depends(get_db)):
    """
    Returns latest known split across the named holders from funds_in_hand_entries.
    """
    holders = ["Naveed", "Asif", "Dilshad", "Ali", "Danish"]
    latest_period = db.query(func.max(models.FundsInHandEntry.period)).scalar()
    if latest_period is None:
        return {"period": None, "holders": {}}
    rows = (
        db.query(models.FundsInHandEntry.person, models.FundsInHandEntry.amount)
        .filter(models.FundsInHandEntry.period == latest_period)
        .filter(models.FundsInHandEntry.person.in_(holders))
        .all()
    )
    return {
        "period": latest_period,
        "holders": {person: str(amount) for person, amount in rows},
    }


@app.get("/api/history/funds-position", response_model=List[schemas.FundsPositionEntryOut])
def get_funds_position_history(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None, ge=1900, le=2100),
):
    q = db.query(models.FundsPositionEntry).order_by(models.FundsPositionEntry.period.asc())
    if year is not None:
        q = q.filter(func.extract("year", models.FundsPositionEntry.period) == year)
    return q.all()


@app.get("/api/history/funds-in-hand", response_model=List[schemas.FundsInHandEntryOut])
def get_funds_in_hand_history(
    db: Session = Depends(get_db),
    year: int | None = Query(default=None, ge=1900, le=2100),
):
    q = db.query(models.FundsInHandEntry).order_by(models.FundsInHandEntry.period.asc(), models.FundsInHandEntry.person.asc())
    if year is not None:
        q = q.filter(func.extract("year", models.FundsInHandEntry.period) == year)
    return q.all()


@app.get("/api/history/outstanding-maintenance", response_model=List[schemas.OutstandingMaintenanceSnapshotOut])
def get_outstanding_maintenance_history(
    db: Session = Depends(get_db),
    as_of: date | None = None,
):
    q = db.query(models.OutstandingMaintenanceSnapshot).order_by(models.OutstandingMaintenanceSnapshot.unit_no.asc())
    if as_of is not None:
        q = q.filter(models.OutstandingMaintenanceSnapshot.as_of == as_of)
    return q.all()
