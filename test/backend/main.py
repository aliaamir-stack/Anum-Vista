from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
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

@app.get("/")
def read_root():
    return {"message": "Welcome to Anum Vista Property Management API"}

@app.get("/api/tenants", response_model=List[schemas.OccupantOut])
def get_tenants(db: Session = Depends(get_db)):
    # Note: outstanding dues logic will be computed dynamically here
    occupants = db.query(models.Occupant).all()
    # Mock dynamic calculation for now
    for occupant in occupants:
        # Simply mocked for structure right now
        occupant.expected_dues = Decimal('0.00') 
    return occupants

@app.get("/api/transactions", response_model=List[schemas.TransactionOut])
def get_transactions(db: Session = Depends(get_db)):
    transactions = db.query(models.Transaction).order_by(models.Transaction.date.desc()).all()
    return transactions

@app.post("/api/transactions", response_model=schemas.TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(transaction: schemas.TransactionCreate, db: Session = Depends(get_db)):
    db_txn = models.Transaction(**transaction.model_dump())
    db.add(db_txn)
    
    # If INFLOW maintenance, advance last_paid_month logically
    if transaction.type == models.TransactionType.INFLOW and transaction.category == models.TransactionCategory.maintenance:
        occupant = db.query(models.Occupant).filter(models.Occupant.id == transaction.occupant_id).first()
        if occupant:
            # Note: actual month advancing logic to be refined
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

    # Total overdues (simple mock, requires deeper logic)
    total_overdues = Decimal('15000.00') 

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
