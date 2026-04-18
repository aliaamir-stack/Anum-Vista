from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from decimal import Decimal
from models import UnitType, TransactionType, TransactionCategory

# --- Units ---
class UnitBase(BaseModel):
    unit_no: str
    type: UnitType

class UnitOut(UnitBase):
    id: int

    class Config:
        from_attributes = True

# --- Occupants ---
class OccupantBase(BaseModel):
    name: str
    monthly_maintenance_fee: Decimal

class OccupantOut(OccupantBase):
    id: int
    unit: UnitOut
    last_paid_month: Optional[datetime] = None
    expected_dues: Decimal = Decimal('0.00') # Dynamically calculated field

    class Config:
        from_attributes = True

# --- Transactions ---
class TransactionCreate(BaseModel):
    occupant_id: Optional[int] = None
    receipt_no: Optional[str] = None
    date: datetime
    amount: Decimal
    type: TransactionType
    category: TransactionCategory
    notes: Optional[str] = None

class TransactionOut(TransactionCreate):
    id: int

    class Config:
        from_attributes = True

# --- Dashboard Metrics ---
class DashboardMetrics(BaseModel):
    total_revenue: Decimal
    treasury_balance: Decimal
    total_overdues: Decimal
    ad_revenue: Decimal
