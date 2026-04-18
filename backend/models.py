from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Enum, Numeric
from sqlalchemy.orm import relationship
import enum
from database import Base
from datetime import datetime

class UnitType(str, enum.Enum):
    residential = "residential"
    shop = "shop"

class TransactionType(str, enum.Enum):
    INFLOW = "INFLOW"
    OUTFLOW = "OUTFLOW"

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

    occupants = relationship("Occupant", back_populates="unit")


class Occupant(Base):
    __tablename__ = "occupants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    unit_id = Column(Integer, ForeignKey("units.id"))
    monthly_maintenance_fee = Column(Numeric(10, 2), default=0.0)
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

    occupant = relationship("Occupant", back_populates="transactions")


class Advertisement(Base):
    __tablename__ = "advertisements"

    id = Column(Integer, primary_key=True, index=True)
    advertiser_name = Column(String, index=True)
    annual_fee = Column(Numeric(10, 2))
