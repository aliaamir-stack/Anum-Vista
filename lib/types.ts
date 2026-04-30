export type DecimalString = string;
export type TenantStatus = "Overdue" | "Settled";

export type TransactionType = "INFLOW" | "OUTFLOW" | "TRANSFER";

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
}

export interface Unit {
  id: number;
  unit_no: string;
  type: string;
  owner_name?: string | null;
  owner_contact?: string | null;
}

export interface Occupant {
  id: number;
  name: string;
  cnic?: string | null;
  contact?: string | null;
  phone?: string | null;
  email?: string | null;
  monthly_maintenance_fee: DecimalString;
  car_count?: number;
  extra_car_maintenance_fee?: DecimalString;
  total_monthly_maintenance?: DecimalString;
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
export interface Transaction {
  id: number;
  occupant_id: number | null;
  receipt_no: string | null;
  date: string;
  amount: DecimalString;
  type: TransactionType;
  category: TransactionCategory;
  notes: string | null;
  expense_description?: string | null;
  expense_details?: string | null;
  maintenance_month?: string | null;
  maintenanceMonth?: string | null;
  created_at?: string | null;
  timestamp?: string | null;
  generated_by?: string | null;
  generatedBy?: string | null;
  source?: string | null;
}

export interface CreateTransactionPayload {
  date: string;
  amount: DecimalString;
  type: TransactionType;
  category: TransactionCategory;
  occupant_id?: number;
  notes?: string;
  generated_by?: "Naveed" | "Dilshad" | "System";
  expense_description?: string;
  expense_details?: string;
}

export interface ExpenseDescription {
  id?: number;
  label: string;
}

export interface TreasuryHolder {
  name: "Naveed" | "Asif" | "Dilshad" | "Ali" | "Danish";
  amount: DecimalString;
}

export interface TreasuryCurrentResponse {
  period: string;
  holders: TreasuryHolder[];
}

export interface MonthlyReportResponse {
  year: number;
  month: number;
  period: string;
  summary: Record<string, unknown>;
  items?: unknown[];
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
