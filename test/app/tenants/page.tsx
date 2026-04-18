"use client";

import { useEffect, useMemo, useState } from "react";
import type { Occupant, Transaction } from "@/lib/types";

const TENANTS_URL = "http://localhost:8000/api/tenants";
const TRANSACTIONS_URL = "http://localhost:8000/api/transactions";

type PaymentStatus = "paid" | "overdue" | "never_paid";
type UnitKind = "Residential" | "Shop";
type UnitFilter = "ALL" | UnitKind;
type YearPaymentStatus = "fully_paid" | "partial" | "no_payment";
type StatusFilter = "ALL" | PaymentStatus | YearPaymentStatus;
type TenantTab = "OVERVIEW" | 2023 | 2024 | 2025 | 2026;

const tenantTabs: TenantTab[] = ["OVERVIEW", 2023, 2024, 2025, 2026];

const badgeBaseStyle: React.CSSProperties = {
  borderRadius: 9999,
  padding: "4px 12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  display: "inline-block",
};

const statusBadgeStyles: Record<PaymentStatus, React.CSSProperties> = {
  paid: { backgroundColor: "#dcfce7", color: "#16a34a" },
  overdue: { backgroundColor: "#ffedd5", color: "#ea580c" },
  never_paid: { backgroundColor: "#fee2e2", color: "#dc2626" },
};

const unitBadgeStyles: Record<UnitKind, React.CSSProperties> = {
  Residential: { backgroundColor: "#dbeafe", color: "#2563eb" },
  Shop: { backgroundColor: "#f3e8ff", color: "#9333ea" },
};

const formatAmount = (value: string): string =>
  `₨ ${parseFloat(value).toLocaleString()}`;

const parseMonthString = (value: string): Date | null => {
  const [yearStr, monthStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  if (!year || !month || month < 1 || month > 12) return null;
  return new Date(year, month - 1, 1);
};

const formatLastPaid = (value: string | null): string => {
  if (!value) return "Never";
  const parsed = parseMonthString(value);
  if (!parsed) return "Never";

  return parsed.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
};

const getStatus = (value: string | null): PaymentStatus => {
  if (!value) return "never_paid";

  const parsed = parseMonthString(value);
  if (!parsed) return "never_paid";

  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  if (parsed.getTime() === currentMonth.getTime()) return "paid";
  if (parsed < currentMonth) return "overdue";
  return "paid";
};

const getUnitKind = (unitType: string): UnitKind =>
  unitType.toLowerCase() === "shop" ? "Shop" : "Residential";

const getYearlyStatus = (totalPaid: number, monthlyFee: number): YearPaymentStatus => {
  const yearlyExpected = monthlyFee * 12;
  if (totalPaid >= yearlyExpected) return "fully_paid";
  if (totalPaid > 0) return "partial";
  return "no_payment";
};

const yearlyStatusBadgeStyles: Record<YearPaymentStatus, React.CSSProperties> = {
  fully_paid: { backgroundColor: "#dcfce7", color: "#16a34a" },
  partial: { backgroundColor: "#ffedd5", color: "#ea580c" },
  no_payment: { backgroundColor: "#fee2e2", color: "#dc2626" },
};

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Occupant[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [unitFilter, setUnitFilter] = useState<UnitFilter>("ALL");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [activeTab, setActiveTab] = useState<TenantTab>("OVERVIEW");

  useEffect(() => {
    const controller = new AbortController();

    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [tenantsRes, transactionsRes] = await Promise.all([
          fetch(TENANTS_URL, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(TRANSACTIONS_URL, {
            method: "GET",
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!tenantsRes.ok) {
          throw new Error(`Failed to fetch tenants (${tenantsRes.status})`);
        }
        if (!transactionsRes.ok) {
          throw new Error(
            `Failed to fetch transactions (${transactionsRes.status})`,
          );
        }

        const tenantsData = (await tenantsRes.json()) as Occupant[];
        const transactionsData = (await transactionsRes.json()) as Transaction[];

        setTenants(tenantsData);
        setTransactions(transactionsData);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Failed to load tenants.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    return () => controller.abort();
  }, []);

  const filteredRows = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return tenants
      .map((tenant) => {
        const unitKind = getUnitKind(tenant.unit.type);
        const status = getStatus(tenant.last_paid_month);
        const monthlyFee = parseFloat(tenant.monthly_maintenance_fee);

        if (activeTab === "OVERVIEW") {
          return {
            tenant,
            unitKind,
            monthlyFee,
            overviewStatus: status,
            yearlyTotal: null as number | null,
            yearlyStatus: null as YearPaymentStatus | null,
          };
        }

        const yearlyTotal = transactions
          .filter((tx) => {
            if (tx.occupant_id !== tenant.id) return false;
            if (tx.type !== "INFLOW") return false;
            const year = new Date(tx.date).getFullYear();
            return year === activeTab;
          })
          .reduce((sum, tx) => sum + parseFloat(tx.amount), 0);

        const yearlyStatus = getYearlyStatus(yearlyTotal, monthlyFee);
        return {
          tenant,
          unitKind,
          monthlyFee,
          overviewStatus: status,
          yearlyTotal,
          yearlyStatus,
        };
      })
      .filter((row) => {
        const tenant = row.tenant;
      const unitKind = getUnitKind(tenant.unit.type);

      const matchesSearch =
        query.length === 0 ||
        tenant.name.toLowerCase().includes(query) ||
        tenant.unit.unit_no.toLowerCase().includes(query);
      const matchesUnit = unitFilter === "ALL" || unitKind === unitFilter;
      const matchesStatus =
        statusFilter === "ALL" ||
        (activeTab === "OVERVIEW"
          ? row.overviewStatus === statusFilter
          : row.yearlyStatus === statusFilter);

      return matchesSearch && matchesUnit && matchesStatus;
    });
  }, [tenants, transactions, searchQuery, unitFilter, statusFilter, activeTab]);

  return (
    <section className="space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Tenants & Shops</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isLoading ? "Loading occupants..." : `${tenants.length} total count`}
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex flex-wrap gap-2">
          {tenantTabs.map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setStatusFilter("ALL");
                }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1e2a3a] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                style={!isActive ? { border: "1px solid #e2e8f0" } : undefined}
              >
                {tab === "OVERVIEW" ? "Overview" : tab}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Search</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={unitFilter}
              onChange={(e) => setUnitFilter(e.target.value as UnitFilter)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="ALL">All</option>
              <option value="Residential">Residential</option>
              <option value="Shop">Shop</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="ALL">All</option>
              {activeTab === "OVERVIEW" ? (
                <>
                  <option value="paid">Paid</option>
                  <option value="overdue">Overdue</option>
                  <option value="never_paid">Never Paid</option>
                </>
              ) : (
                <>
                  <option value="fully_paid">Fully Paid</option>
                  <option value="partial">Partial</option>
                  <option value="no_payment">No Payment</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead style={{ backgroundColor: "#1e2a3a", color: "#ffffff" }}>
            <tr>
              <th className="px-5 py-3 font-semibold">Name</th>
              <th className="px-5 py-3 font-semibold">Unit</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Monthly Fee</th>
              <th className="px-5 py-3 font-semibold">
                {activeTab === "OVERVIEW" ? "Last Paid" : "Total Paid"}
              </th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 5 }).map((_, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-5 py-4">
                      <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                    </td>
                    <td className="px-5 py-4">
                      <div className="h-6 w-24 animate-pulse rounded-full bg-slate-200" />
                    </td>
                  </tr>
                ))
              : filteredRows.map((row, index) => {
                  const tenant = row.tenant;
                  const status = row.overviewStatus;
                  const unitKind = row.unitKind;

                  return (
                    <tr
                      key={tenant.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-5 py-4 font-medium text-slate-800">{tenant.name}</td>
                      <td className="px-5 py-4 text-slate-700">{tenant.unit.unit_no}</td>
                      <td className="px-5 py-4">
                        <span style={{ ...badgeBaseStyle, ...unitBadgeStyles[unitKind] }}>
                          {unitKind}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatAmount(tenant.monthly_maintenance_fee)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {activeTab === "OVERVIEW"
                          ? formatLastPaid(tenant.last_paid_month)
                          : formatAmount(String(row.yearlyTotal ?? 0))}
                      </td>
                      <td className="px-5 py-4">
                        {activeTab === "OVERVIEW" ? (
                          <span style={{ ...badgeBaseStyle, ...statusBadgeStyles[status] }}>
                            {status === "paid"
                              ? "Paid"
                              : status === "overdue"
                                ? "Overdue"
                                : "Never Paid"}
                          </span>
                        ) : (
                          <span
                            style={{
                              ...badgeBaseStyle,
                              ...yearlyStatusBadgeStyles[row.yearlyStatus ?? "no_payment"],
                            }}
                          >
                            {row.yearlyStatus === "fully_paid"
                              ? "Fully Paid"
                              : row.yearlyStatus === "partial"
                                ? "Partial"
                                : "No Payment"}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-600">
        {isLoading
          ? "Loading tenants..."
          : `Showing ${filteredRows.length} of ${tenants.length} tenants`}
      </p>
    </section>
  );
}
