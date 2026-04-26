export type DecimalString = string;
<<<<<<< HEAD
export type TenantStatus = "Overdue" | "Settled";
=======
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9

export type TransactionType = "INFLOW" | "OUTFLOW";

export type TransactionCategory =
  | "maintenance"
  | "expense"
  | "ad_revenue"
  | "other";

export interface DashboardMetricsResponse {
<<<<<<< HEAD
  total_revenue?: DecimalString;
  treasury_balance?: DecimalString;
  total_overdues?: DecimalString;
  ad_revenue?: DecimalString;
  totalRevenue?: DecimalString;
  treasuryBalance?: DecimalString;
  totalOverdueAmount?: DecimalString;
  allTimeAdRevenue?: DecimalString;
  overdue_units?: string[];
  missingApartments?: string[];
  maintenance_received?: DecimalString;
  total_expected_maintenance?: DecimalString;
  maintenanceReceivedThisMonth?: DecimalString;
  maintenanceExpectedTotal?: DecimalString;
=======
  total_revenue: DecimalString;
  treasury_balance: DecimalString;
  total_overdues: DecimalString;
  ad_revenue: DecimalString;
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
}

export interface Unit {
  id: number;
  unit_no: string;
  type: string;
}

export interface Occupant {
  id: number;
  name: string;
<<<<<<< HEAD
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  monthly_maintenance_fee: DecimalString;
  last_paid_month: string | null;
  due_month?: string | null;
  expected_dues: DecimalString;
  status?: TenantStatus;
  hasPastDues?: boolean;
  unpaidPastMonths?: string[];
  paidMonths?: string[];
  paid_months?: string[];
  unit: Unit;
}

export interface ReceiptPayload {
  occupant_id: number;
  month: string;
  amount: DecimalString;
}

export interface ReceiptResponse {
  id: number;
  receipt_no: string;
}

=======
  monthly_maintenance_fee: DecimalString;
  last_paid_month: string | null;
  expected_dues: DecimalString;
  unit: Unit;
}

>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
export interface Transaction {
  id: number;
  occupant_id: number | null;
  receipt_no: string | null;
  date: string;
  amount: DecimalString;
  type: TransactionType;
  category: TransactionCategory;
  notes: string | null;
<<<<<<< HEAD
  maintenance_month?: string | null;
  maintenanceMonth?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  generated_by?: string | null;
  generatedBy?: string | null;
  source?: string | null;
=======
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
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
