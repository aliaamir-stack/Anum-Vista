export type DecimalString = string;

export type TransactionType = "INFLOW" | "OUTFLOW";

export type TransactionCategory =
  | "maintenance"
  | "expense"
  | "ad_revenue"
  | "other";

export interface DashboardMetricsResponse {
  total_revenue: DecimalString;
  treasury_balance: DecimalString;
  total_overdues: DecimalString;
  ad_revenue: DecimalString;
}

export interface Unit {
  id: number;
  unit_no: string;
  type: string;
}

export interface Occupant {
  id: number;
  name: string;
  monthly_maintenance_fee: DecimalString;
  last_paid_month: string | null;
  expected_dues: DecimalString;
  unit: Unit;
}

export interface Transaction {
  id: number;
  occupant_id: number | null;
  receipt_no: string | null;
  date: string;
  amount: DecimalString;
  type: TransactionType;
  category: TransactionCategory;
  notes: string | null;
}

export interface CreateTransactionPayload {
  date: string;
  amount: DecimalString;
  type: TransactionType;
  category: TransactionCategory;
  occupant_id?: number;
  receipt_no?: string;
  notes?: string;
}

/**
 * Decimal values from the API are strings; convert before arithmetic.
 */
export const parseDecimal = (value: DecimalString): number => {
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * Derives whether a tenant is overdue based on last paid month (YYYY-MM).
 */
export const isOverdueFromLastPaidMonth = (
  lastPaidMonth: string | null,
  referenceDate: Date = new Date(),
): boolean => {
  if (!lastPaidMonth) return true;

  const [yearStr, monthStr] = lastPaidMonth.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) return true;

  const paidThrough = new Date(year, month - 1, 1);
  const currentMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    1,
  );

  return paidThrough < currentMonth;
};
