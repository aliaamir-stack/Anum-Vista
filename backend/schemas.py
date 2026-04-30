from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime, date
from decimal import Decimal
try:
    from backend.models import UnitType, TransactionType, TransactionCategory
except ImportError:
    from models import UnitType, TransactionType, TransactionCategory

# --- Units ---
class UnitBase(BaseModel):
    unit_no: str
    type: UnitType
    owner_name: Optional[str] = None
    owner_contact: Optional[str] = None

class UnitOut(UnitBase):
    id: int

    class Config:
        from_attributes = True

# --- Occupants ---
class OccupantBase(BaseModel):
    name: str
    monthly_maintenance_fee: Decimal
    cnic: Optional[str] = None
    contact: Optional[str] = None
    car_count: int = 1
    extra_car_maintenance_fee: Decimal = Decimal('0.00')

class OccupantOut(OccupantBase):
    id: int
    unit: UnitOut
    last_paid_month: Optional[datetime] = None
    expected_dues: Decimal = Decimal('0.00') # Dynamically calculated field
    extra_cars: int = 0
    extra_car_charges: Decimal = Decimal('0.00')
    total_monthly_maintenance: Decimal = Decimal('0.00')

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
    expense_description: Optional[str] = None
    expense_details: Optional[str] = None

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


class FundsPositionEntryOut(BaseModel):
    period: date
    section: str
    label: str
    amount: Decimal

    class Config:
        from_attributes = True


class FundsInHandEntryOut(BaseModel):
    period: date
    person: str
    amount: Decimal

    class Config:
        from_attributes = True


class OutstandingMaintenanceSnapshotOut(BaseModel):
    as_of: date
    unit_no: str
    resident_name: str
    annual_maintenance: Decimal
    dues_till_dec_31: Decimal
    maintenance_till_period: Decimal
    received_during_year: Decimal
    dues_till_period: Decimal

    class Config:
        from_attributes = True


class OccupantCarUpdate(BaseModel):
    car_count: int
    extra_car_maintenance_fee: Decimal


class ExpenseDescriptionOut(BaseModel):
    id: int
    description: str

    class Config:
        from_attributes = True


class MonthlyReportOut(BaseModel):
    year: int
    month: int
    maintenance_received: Decimal
    inflow_total: Decimal
    outflow_total: Decimal
    transfer_total: Decimal
    treasury_opening: Optional[Decimal] = None
    treasury_closing: Optional[Decimal] = None
    inflow_by_category: dict[str, Decimal]
    outflow_by_category: dict[str, Decimal]
