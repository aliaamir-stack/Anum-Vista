"use client";

import { useEffect, useMemo, useState } from "react";
<<<<<<< HEAD
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Occupant } from "@/lib/types";

const monthOptions = [
  "2026-01",
  "2026-02",
  "2026-03",
  "2026-04",
  "2026-05",
  "2026-06",
  "2026-07",
  "2026-08",
  "2026-09",
  "2026-10",
  "2026-11",
  "2026-12",
];

const formatAmount = (value: string): string =>
  `₨ ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

const prettyMonth = (value: string): string => {
  const [year, month] = value.split("-");
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("en-US", {
    month: "long",
=======
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
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
    year: "numeric",
  });
};

<<<<<<< HEAD
const getTenantStatus = (tenant: Occupant): "Overdue" | "Settled" => {
  if (tenant.status === "Overdue" || tenant.status === "Settled") return tenant.status;
  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return tenant.last_paid_month === currentMonth ? "Settled" : "Overdue";
};

const getDueMonth = (tenant: Occupant): string => {
  if (tenant.due_month) return tenant.due_month;
  const paid = tenant.last_paid_month;
  if (!paid) return `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [year, month] = paid.split("-").map(Number);
  const next = new Date(year, month, 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`;
};

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [expandedTenantId, setExpandedTenantId] = useState<number | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Occupant | null>(null);
  const [selectedMonth, setSelectedMonth] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERDUE" | "SETTLED">("ALL");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants,
  });

  const createReceiptMutation = useMutation({
    mutationFn: api.createReceipt,
    onSuccess: () => {
      setToast({ type: "success", message: "Receipt generated successfully." });
      setSelectedTenant(null);
      setSelectedMonth("");
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
    },
    onError: (err) => {
      setToast({
        type: "error",
        message: (err as Error).message || "Failed to generate receipt.",
      });
    },
  });

  const monthChoices = useMemo(() => {
    if (!selectedTenant) return [];
    const paidMonths = new Set(selectedTenant.paidMonths ?? selectedTenant.paid_months ?? []);
    return monthOptions.filter((month) => !paidMonths.has(month));
  }, [selectedTenant]);

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const name = tenant.name.toLowerCase();
      const unit = tenant.unit.unit_no.toLowerCase();
      const status = getTenantStatus(tenant);
      const matchesSearch = query.length === 0 || name.includes(query) || unit.includes(query);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OVERDUE" && status === "Overdue") ||
        (statusFilter === "SETTLED" && status === "Settled");
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tenants]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Tenants & Collections</h2>
        <p className="mt-1 text-sm text-slate-500">
          Expand each tenant to review dues and generate receipts instantly.
=======
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
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
        </p>
      </div>

      {error ? (
<<<<<<< HEAD
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="sticky top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by tenant name or apartment number..."
            className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-500 md:max-w-xl"
          />
          <div className="flex items-center gap-2">
            {[
              { id: "ALL", label: "All" },
              { id: "OVERDUE", label: "Overdue" },
              { id: "SETTLED", label: "Settled" },
            ].map((option) => {
              const active = statusFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatusFilter(option.id as "ALL" | "OVERDUE" | "SETTLED")}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
=======
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
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => {
            const status = getTenantStatus(tenant);
            const isExpanded = expandedTenantId === tenant.id;
            const hasPastDues = tenant.hasPastDues ?? false;
            const unpaidPastMonths = tenant.unpaidPastMonths ?? [];
            return (
              <motion.article
                key={tenant.id}
                layout
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setExpandedTenantId(isExpanded ? null : tenant.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold text-slate-900">{tenant.unit.unit_no}</p>
                      {hasPastDues ? (
                        <span className="relative inline-flex h-3 w-3">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                        </span>
                      ) : null}
                    </div>
                    <p className="truncate text-sm text-slate-600">{tenant.name}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      status === "Overdue"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {status}
                  </span>
                </button>

                <AnimatePresence>
                  {isExpanded ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="border-t border-slate-100 px-5 py-4"
                    >
                      <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">Contact:</span>{" "}
                          {tenant.contact ?? tenant.phone ?? tenant.email ?? "Not provided"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Monthly Maintenance:</span>{" "}
                          {formatAmount(tenant.monthly_maintenance_fee)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Current Due Month:</span>{" "}
                          {prettyMonth(getDueMonth(tenant))}
                        </p>
                      </div>

                      {unpaidPastMonths.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Past Dues Alert
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {unpaidPastMonths.map((month) => (
                              <span
                                key={month}
                                className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                              >
                                {prettyMonth(month)}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTenant(tenant);
                          setSelectedMonth(getDueMonth(tenant));
                        }}
                        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Generate Receipt
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {selectedTenant ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 md:items-center"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-xl rounded-t-2xl bg-white p-6 shadow-xl md:rounded-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Generate Receipt</h3>
                  <p className="text-sm text-slate-500">
                    Auto-filled details from selected tenant.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedTenant(null)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <form
                className="space-y-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (!selectedMonth) {
                    setToast({ type: "error", message: "Please select a valid unpaid month." });
                    return;
                  }
                  createReceiptMutation.mutate({
                    occupant_id: selectedTenant.id,
                    month: selectedMonth,
                    amount: selectedTenant.monthly_maintenance_fee,
                  });
                }}
              >
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                      Tenant Name
                    </label>
                    <input
                      value={selectedTenant.name}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                      Apartment
                    </label>
                    <input
                      value={selectedTenant.unit.unit_no}
                      readOnly
                      className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Maintenance Amount
                  </label>
                  <input
                    value={formatAmount(selectedTenant.monthly_maintenance_fee)}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Month of Maintenance
                  </label>
                  <select
                    required
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {monthChoices.length === 0 ? (
                      <option value="">No unpaid months available</option>
                    ) : null}
                    {monthChoices.map((month) => (
                      <option key={month} value={month}>
                        {prettyMonth(month)}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createReceiptMutation.isPending || monthChoices.length === 0}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {createReceiptMutation.isPending ? "Generating..." : "Submit Receipt"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {toast ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className={`fixed bottom-6 right-6 z-50 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-emerald-100 text-emerald-800"
                : "bg-rose-100 text-rose-800"
            }`}
          >
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
=======
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
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
    </section>
  );
}
