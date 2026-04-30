from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Enum, Numeric
from sqlalchemy.orm import relationship
import enum
try:
    from backend.database import Base
except ImportError:
    from database import Base
from datetime import datetime
from decimal import Decimal

class UnitType(str, enum.Enum):
    residential = "residential"
    shop = "shop"

class TransactionType(str, enum.Enum):
    INFLOW = "INFLOW"
    OUTFLOW = "OUTFLOW"
    TRANSFER = "TRANSFER"

class TransactionCategory(str, enum.Enum):
    maintenance = "maintenance"
    expense = "expense"
    ad_revenue = "ad_revenue"
    other = "other"

class Unit(Base):
    __tablename__ = "units"

    id = Column(Integer, primary_key=True, index=True)
    unit_no = Column(String, unique=True, index=True) # e.g., '101', 'Shop-2'
    type = Column(Enum(UnitType), default=UnitType.residential)
    owner_name = Column(String, nullable=True)
    owner_contact = Column(String, nullable=True)

    occupants = relationship("Occupant", back_populates="unit")


class Occupant(Base):
    __tablename__ = "occupants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    monthly_maintenance_fee = Column(Numeric(10, 2), default=0.0)
    cnic = Column(String, nullable=True)
    contact = Column(String, nullable=True)
    car_count = Column(Integer, nullable=False, default=1)
    extra_car_maintenance_fee = Column(Numeric(10, 2), nullable=False, default=0.0)
    last_paid_month = Column(DateTime, nullable=True) # Tracks the latest month they have fully paid till

    unit = relationship("Unit", back_populates="occupants")
    transactions = relationship("Transaction", back_populates="occupant")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    occupant_id = Column(Integer, ForeignKey("occupants.id"), nullable=True)
    receipt_no = Column(String, index=True, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    amount = Column(Numeric(10, 2), nullable=False)
    type = Column(Enum(TransactionType), nullable=False)
    category = Column(Enum(TransactionCategory), nullable=False)
    notes = Column(String, nullable=True)
    expense_description = Column(String, nullable=True)
    expense_details = Column(String, nullable=True)

    occupant = relationship("Occupant", back_populates="transactions")

class ExpenseDescription(Base):
    __tablename__ = "expense_descriptions"

    id = Column(Integer, primary_key=True, index=True)
    description = Column(String, unique=True, index=True)


class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_name = Column(String, index=True)
    annual_fee = Column(Numeric(10, 2))


class FundsPositionEntry(Base):
    """
    Raw line items from the 'Summary Sheet / Funds Position' tabs.
    Stored as (period, section, label, amount) so we can preserve history
    and avoid losing detail when the spreadsheet structure changes slightly.
    """

    __tablename__ = "funds_position_entries"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(Date, index=True)  # first day of month
    section = Column(String, index=True)  # e.g. opening_balance, inflow, outflow, closing_balance
    label = Column(String, index=True)  # e.g. Maintenance, Utilities - Kelectric
    amount = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))


class FundsInHandEntry(Base):
    __tablename__ = "funds_in_hand_entries"

    id = Column(Integer, primary_key=True, index=True)
    period = Column(Date, index=True)  # first day of month
    person = Column(String, index=True)
    amount = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))


class OutstandingMaintenanceSnapshot(Base):
    """
    Snapshot rows from the consolidated outstanding maintenance table.
    In the dataset this is 'as of Jan 31, 2026' (but stored generically).
    """

    __tablename__ = "outstanding_maintenance_snapshots"

    id = Column(Integer, primary_key=True, index=True)
    as_of = Column(Date, index=True)
    unit_no = Column(String, index=True)
    resident_name = Column(String, index=True)
    annual_maintenance = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    dues_till_dec_31 = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    maintenance_till_period = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    received_during_year = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
    dues_till_period = Column(Numeric(14, 2), nullable=False, default=Decimal("0.00"))
