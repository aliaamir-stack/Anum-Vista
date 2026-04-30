"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Occupant } from "@/lib/types";

const monthLabels = [
  { label: "January", value: "01" },
  { label: "February", value: "02" },
  { label: "March", value: "03" },
  { label: "April", value: "04" },
  { label: "May", value: "05" },
  { label: "June", value: "06" },
  { label: "July", value: "07" },
  { label: "August", value: "08" },
  { label: "September", value: "09" },
  { label: "October", value: "10" },
  { label: "November", value: "11" },
  { label: "December", value: "12" },
] as const;

const formatAmount = (value: string): string =>
  `₨ ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

const toMonthKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const parseBackendDate = (value: string | null): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const prettyMonth = (value: string): string => {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
};

const computeTenantStatus = (tenant: Occupant): "Overdue" | "Settled" => {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPaid = parseBackendDate(tenant.last_paid_month);
  if (!lastPaid) return "Overdue";
  const paidMonth = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), 1);
  return paidMonth >= currentMonth ? "Settled" : "Overdue";
};

const computeUnpaidPastMonths = (tenant: Occupant): string[] => {
  const now = new Date();
  const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPaid = parseBackendDate(tenant.last_paid_month);

  // If never paid, show current month as due (and treat previous months as unknown).
  if (!lastPaid) return [toMonthKey(currentMonth)];

  const paidMonth = new Date(lastPaid.getFullYear(), lastPaid.getMonth(), 1);
  const months: string[] = [];
  const cursor = new Date(paidMonth.getFullYear(), paidMonth.getMonth() + 1, 1);
  while (cursor <= currentMonth) {
    months.push(toMonthKey(cursor));
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return months;
};

const RENTAL_APARTMENTS = new Set([102, 202, 204, 402, 501, 504, 604, 704, 802, 804, 1003]);

const getApartmentNumeric = (unitNo: string): number | null => {
  const match = unitNo.match(/\d+/g);
  if (!match) return null;
  const numeric = Number(match.join(""));
  return Number.isFinite(numeric) ? numeric : null;
};

export default function TenantsPage() {
  const queryClient = useQueryClient();
  const [expandedTenantId, setExpandedTenantId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OVERDUE" | "SETTLED">("ALL");

  const [selectedTenant, setSelectedTenant] = useState<Occupant | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [generatedBy, setGeneratedBy] = useState<"Naveed" | "Dilshad" | "System">("System");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(
    null,
  );

  const { data: tenants = [], isLoading, error } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants,
  });

  const createMaintenanceReceipt = useMutation({
    mutationFn: api.createTransaction,
    onSuccess: () => {
      setToast({ type: "success", message: "Receipt generated (maintenance inflow recorded)." });
      setSelectedTenant(null);
      setSelectedMonth("");
      queryClient.invalidateQueries({ queryKey: ["tenants"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
    onError: (err) => {
      setToast({
        type: "error",
        message: (err as Error).message || "Failed to generate receipt.",
      });
    },
  });

  const filteredTenants = useMemo(() => {
    const query = search.trim().toLowerCase();
    return tenants.filter((tenant) => {
      const matchesSearch =
        query.length === 0 ||
        tenant.name.toLowerCase().includes(query) ||
        tenant.unit.unit_no.toLowerCase().includes(query);

      const status = computeTenantStatus(tenant);
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "OVERDUE" && status === "Overdue") ||
        (statusFilter === "SETTLED" && status === "Settled");

      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter, tenants]);

  const availableMonths = useMemo(() => {
    if (!selectedTenant) return [];
    const lastPaid = parseBackendDate(selectedTenant.last_paid_month);
    const current = new Date();
    const year = current.getFullYear();
    const lastPaidKey = lastPaid ? toMonthKey(new Date(lastPaid.getFullYear(), lastPaid.getMonth(), 1)) : null;

    return monthLabels.map((month) => {
      const monthKey = `${year}-${month.value}`;
      const disabled = lastPaidKey ? monthKey <= lastPaidKey : false;
      return { ...month, year, monthKey, disabled };
    });
  }, [selectedTenant]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 2200);
    return () => window.clearTimeout(id);
  }, [toast]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Residents & Collections</h2>
        <p className="mt-1 text-sm text-slate-500">
          Expand residents, review dues, and generate maintenance receipts (FastAPI).
        </p>
      </div>

      {error ? (
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
                    active ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTenants.map((tenant) => {
            const status = computeTenantStatus(tenant);
            const isExpanded = expandedTenantId === tenant.id;
            const unpaidPastMonths = computeUnpaidPastMonths(tenant);
            const hasPastDues = unpaidPastMonths.length > 1;
            const unitNumber = getApartmentNumeric(tenant.unit.unit_no);
            const isRental = unitNumber ? RENTAL_APARTMENTS.has(unitNumber) : false;

            return (
              <motion.article
                key={tenant.id}
                layout
                className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  isRental ? "border-violet-200 ring-1 ring-violet-100" : "border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setExpandedTenantId(isExpanded ? null : tenant.id)}
                  className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
                    isRental ? "hover:bg-violet-50/50" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-2xl font-semibold text-slate-900">{tenant.unit.unit_no}</p>
                      {isRental ? (
                        <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-semibold text-violet-700">
                          Rental
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">
                          Permanent
                        </span>
                      )}
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
                      status === "Overdue" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
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
                          <span className="font-semibold text-slate-800">Monthly (base):</span>{" "}
                          {formatAmount(tenant.monthly_maintenance_fee)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Total Monthly:</span>{" "}
                          {tenant.total_monthly_maintenance
                            ? formatAmount(tenant.total_monthly_maintenance)
                            : formatAmount(tenant.monthly_maintenance_fee)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Contact:</span>{" "}
                          {tenant.contact || tenant.phone || tenant.email || "—"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">CNIC:</span>{" "}
                          {tenant.cnic || "—"}
                        </p>
                        <p className="md:col-span-2">
                          <span className="font-semibold text-slate-800">Expected dues:</span>{" "}
                          {formatAmount(tenant.expected_dues)}
                        </p>
                      </div>

                      {isRental ? (
                        <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
                            Owner
                          </p>
                          <div className="mt-2 grid gap-2 text-sm text-slate-700 md:grid-cols-2">
                            <p>
                              <span className="font-semibold text-slate-800">Name:</span>{" "}
                              {tenant.unit.owner_name || "—"}
                            </p>
                            <p>
                              <span className="font-semibold text-slate-800">Contact:</span>{" "}
                              {tenant.unit.owner_contact || "—"}
                            </p>
                          </div>
                        </div>
                      ) : null}

                      {unpaidPastMonths.length > 0 ? (
                        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                            Unpaid months (derived)
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
                          const now = new Date();
                          setSelectedMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`);
                        }}
                        className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                      >
                        Generate Receipt (Creates Transaction)
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}

          {!isLoading && filteredTenants.length === 0 ? (
            <p className="text-sm text-slate-600">No tenants match your filters.</p>
          ) : null}
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
                    This will create a FastAPI maintenance transaction.
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
                    setToast({ type: "error", message: "Please select a month." });
                    return;
                  }
                  const amount =
                    selectedTenant.total_monthly_maintenance ?? selectedTenant.monthly_maintenance_fee;
                  createMaintenanceReceipt.mutate({
                    occupant_id: selectedTenant.id,
                    date: `${selectedMonth}-01T00:00:00`,
                    amount,
                    type: "INFLOW",
                    category: "maintenance",
                    generated_by: generatedBy,
                    notes: `Maintenance receipt for ${prettyMonth(selectedMonth)} (${selectedTenant.unit.unit_no})`,
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
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Amount
                  </label>
                  <input
                    value={formatAmount(
                      selectedTenant.total_monthly_maintenance ?? selectedTenant.monthly_maintenance_fee,
                    )}
                    readOnly
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Month of Maintenance (already-paid months disabled)
                  </label>
                  <select
                    required
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    {availableMonths.map((month) => (
                      <option key={month.monthKey} value={month.monthKey} disabled={month.disabled}>
                        {month.label} {month.year} {month.disabled ? "(paid)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Generated By
                  </label>
                  <select
                    value={generatedBy}
                    onChange={(event) =>
                      setGeneratedBy(event.target.value as "Naveed" | "Dilshad" | "System")
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
                  >
                    <option value="Naveed">Naveed</option>
                    <option value="Dilshad">Dilshad</option>
                    <option value="System">System</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={createMaintenanceReceipt.isPending}
                  className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {createMaintenanceReceipt.isPending ? "Generating..." : "Submit Receipt"}
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
              toast.type === "success" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
            }`}
          >
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}