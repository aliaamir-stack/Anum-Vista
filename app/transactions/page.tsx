"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type {
  CreateTransactionPayload,
  Occupant,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/lib/types";
import { api } from "@/lib/api";

type TransactionFilter = "ALL" | TransactionType;
type CategoryFilter = "ALL" | TransactionCategory;
type YearFilter = 2023 | 2024 | 2025 | 2026;

const years: YearFilter[] = [2023, 2024, 2025, 2026];

const badgeBaseStyle: React.CSSProperties = {
  borderRadius: 9999,
  padding: "4px 12px",
  fontSize: "0.75rem",
  fontWeight: 600,
  display: "inline-block",
};

const categoryBadgeStyles: Record<TransactionCategory, React.CSSProperties> = {
  maintenance: { backgroundColor: "#dbeafe", color: "#2563eb" },
  expense: { backgroundColor: "#fee2e2", color: "#dc2626" },
  ad_revenue: { backgroundColor: "#f3e8ff", color: "#9333ea" },
  other: { backgroundColor: "#f3f4f6", color: "#6b7280" },
};

const typeBadgeStyles: Record<TransactionType, React.CSSProperties> = {
  INFLOW: { backgroundColor: "#dcfce7", color: "#16a34a" },
  OUTFLOW: { backgroundColor: "#fee2e2", color: "#dc2626" },
  TRANSFER: { backgroundColor: "#e0f2fe", color: "#0369a1" },
};

const formatAmount = (value: string): string =>
  `₨ ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [tenants, setTenants] = useState<Occupant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<TransactionFilter>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedYear, setSelectedYear] = useState<YearFilter>(2026);

  // Form State
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("INFLOW");
  const [category, setCategory] = useState<TransactionCategory>("expense");
  const [occupantId, setOccupantId] = useState("");
  const [notes, setNotes] = useState("");
  const [generatedBy, setGeneratedBy] = useState<"Naveed" | "Dilshad" | "System">("System");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDetails, setExpenseDetails] = useState("");
  const [expenseDescriptions, setExpenseDescriptions] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const loadData = async (signal?: AbortSignal) => {
    const [transactionsData, tenantsData] = await Promise.all([
      api.getTransactions(),
      api.getTenants(),
    ]);
    if (signal?.aborted) return;
    setTransactions(transactionsData);
    setTenants(tenantsData);
  };

  useEffect(() => {
    const controller = new AbortController();
    const init = async () => {
      try {
        setIsLoading(true);
        await loadData(controller.signal);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError("Failed to load transactions.");
      } finally {
        setIsLoading(false);
      }
    };
    init();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let mounted = true;
    api
      .getExpenseDescriptions()
      .then((items) => {
        if (!mounted) return;
        setExpenseDescriptions(items.map((i) => i.label));
      })
      .catch(() => {
        // optional; expense creation can still work without these
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const showExpenseFields = type === "OUTFLOW" || category === "expense";
    if (!showExpenseFields) {
      setExpenseDescription("");
      setExpenseDetails("");
    }
  }, [type, category]);

  const occupantNameMap = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((t) => map.set(t.id, `${t.name} - ${t.unit.unit_no}`));
    return map;
  }, [tenants]);

  const yearCounts = useMemo(() => {
    const counts: Record<YearFilter, number> = { 2023: 0, 2024: 0, 2025: 0, 2026: 0 };
    transactions.forEach((tx) => {
      const year = new Date(tx.date).getFullYear() as YearFilter;
      if (year in counts) counts[year] += 1;
    });
    return counts;
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((tx) => {
      const txDate = new Date(tx.date);
      const matchesYear = txDate.getFullYear() === selectedYear;
      const occupantName = tx.occupant_id ? occupantNameMap.get(tx.occupant_id) || "" : "General";
      const matchesSearch = query === "" || 
        occupantName.toLowerCase().includes(query) || 
        (tx.notes || "").toLowerCase().includes(query);
      const matchesType = filter === "ALL" || tx.type === filter;
      const matchesCategory = categoryFilter === "ALL" || tx.category === categoryFilter;
      return matchesYear && matchesSearch && matchesType && matchesCategory;
    });
  }, [transactions, filter, categoryFilter, searchQuery, occupantNameMap, selectedYear]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setIsSubmitting(true);
      const showExpenseFields = type === "OUTFLOW" || category === "expense";
      const payload: CreateTransactionPayload = {
        date: `${date}T00:00:00`,
        amount,
        type,
        category,
        occupant_id: occupantId ? Number(occupantId) : undefined,
        generated_by: generatedBy,
        notes: notes || undefined,
        expense_description: showExpenseFields ? expenseDescription || undefined : undefined,
        expense_details: showExpenseFields ? expenseDetails || undefined : undefined,
      };

      const res = await api.createTransaction(payload);

      await loadData();
      setSuccessMessage("Transaction added successfully");
      setDate(""); setAmount(""); setOccupantId(""); setNotes(""); setGeneratedBy("System");
      setExpenseDescription(""); setExpenseDetails("");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 p-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">Expenses</h2>
          <p className="text-sm text-slate-600">{isLoading ? "Loading..." : `${transactions.length} total count`}</p>
        </div>
      </div>

      {successMessage && <div className="p-3 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">{successMessage}</div>}
      {error && <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>}

      <div className="sticky top-4 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center">
            <input
              type="text"
              placeholder="Search by tenant / apartment / notes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none transition focus:border-slate-500 md:max-w-xl"
            />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value) as YearFilter)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} ({yearCounts[y]})
                </option>
              ))}
            </select>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="maintenance">Maintenance</option>
              <option value="expense">Expense</option>
              <option value="ad_revenue">Ad Revenue</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            {["ALL", "INFLOW", "OUTFLOW", "TRANSFER"].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f as TransactionFilter)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                  filter === f ? "bg-[#1e2a3a] text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {f === "ALL" ? "All" : f === "INFLOW" ? "Inflow" : f === "OUTFLOW" ? "Outflow" : "Transfer"}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
            >
              New Expense
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b">
          <h3 className="font-semibold">History</h3>
          <p className="text-xs font-semibold text-slate-500">
            Showing {filteredTransactions.length} / {transactions.length}
          </p>
        </div>
        <div className="p-4 space-y-3">
          {isLoading ? (
            Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-20 animate-pulse rounded-2xl bg-slate-200" />
            ))
          ) : filteredTransactions.length === 0 ? (
            <p className="text-sm text-slate-600">No transactions found.</p>
          ) : (
            filteredTransactions.map((tx) => {
              const isExpanded = expandedId === tx.id;
              const occupantLabel = tx.occupant_id
                ? occupantNameMap.get(tx.occupant_id) || "Unknown"
                : "General";

              const maintenanceMonth = tx.maintenance_month ?? tx.maintenanceMonth;
              const timestamp = tx.timestamp ?? tx.created_at ?? tx.date;
              const generatedBy = tx.generated_by ?? tx.generatedBy ?? "System";

              return (
                <motion.article
                  key={tx.id}
                  layout
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-500">{formatDate(tx.date)}</p>
                      <p className="truncate text-base font-semibold text-slate-900">
                        {occupantLabel}
                      </p>
                    </div>
                    <p
                      className={`text-lg font-bold ${
                        tx.type === "INFLOW"
                          ? "text-green-500"
                          : tx.type === "OUTFLOW"
                            ? "text-red-500"
                            : "text-sky-700"
                      }`}
                    >
                      {tx.type === "INFLOW" ? "+" : tx.type === "OUTFLOW" ? "-" : "↔"}
                      {formatAmount(tx.amount)}
                    </p>
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
                            <span className="font-semibold text-slate-800">Category:</span>{" "}
                            <span style={{ ...badgeBaseStyle, ...categoryBadgeStyles[tx.category] }}>
                              {tx.category}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Type:</span>{" "}
                            <span style={{ ...badgeBaseStyle, ...typeBadgeStyles[tx.type] }}>
                              {tx.type}
                            </span>
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Maintenance Month:</span>{" "}
                            {maintenanceMonth || "N/A"}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Exact Timestamp:</span>{" "}
                            {formatDateTime(timestamp)}
                          </p>
                          <p>
                            <span className="font-semibold text-slate-800">Generated By:</span>{" "}
                            {generatedBy}
                          </p>
                          <p className="md:col-span-2">
                            <span className="font-semibold text-slate-800">Notes:</span>{" "}
                            {tx.notes || "-"}
                          </p>
                          {tx.expense_description ? (
                            <p className="md:col-span-2">
                              <span className="font-semibold text-slate-800">
                                Expense description:
                              </span>{" "}
                              {tx.expense_description}
                            </p>
                          ) : null}
                          {tx.expense_details ? (
                            <p className="md:col-span-2">
                              <span className="font-semibold text-slate-800">Expense details:</span>{" "}
                              {tx.expense_details}
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.article>
              );
            })
          )}
        </div>
      </div>

      <AnimatePresence>
        {createOpen ? (
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
              className="w-full max-w-2xl rounded-t-2xl bg-white p-6 shadow-xl md:rounded-2xl"
            >
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900">Create Expense</h3>
                  <p className="text-sm text-slate-500">
                    Quick entry for inflow/outflow with occupant mapping.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="text-sm font-semibold text-slate-500 hover:text-slate-700"
                >
                  Close
                </button>
              </div>

              <form
                className="grid grid-cols-1 gap-4 md:grid-cols-2"
                onSubmit={async (event) => {
                  await handleSubmit(event);
                  setCreateOpen(false);
                }}
              >
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Amount
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="Amount"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Type
                  </label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as TransactionType)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  >
                    <option value="INFLOW">INFLOW</option>
                    <option value="OUTFLOW">OUTFLOW</option>
                    <option value="TRANSFER">TRANSFER</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as TransactionCategory)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  >
                    <option value="expense">Expense</option>
                    <option value="ad_revenue">Ad Revenue</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Occupant
                  </label>
                  <select
                    value={occupantId}
                    onChange={(e) => setOccupantId(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  >
                    <option value="">General</option>
                    {tenants.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.unit.unit_no} — {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Notes (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                    Generated By
                  </label>
                  <select
                    value={generatedBy}
                    onChange={(e) =>
                      setGeneratedBy(e.target.value as "Naveed" | "Dilshad" | "System")
                    }
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                  >
                    <option value="Naveed">Naveed</option>
                    <option value="Dilshad">Dilshad</option>
                    <option value="System">System</option>
                  </select>
                </div>

                {type === "OUTFLOW" || category === "expense" ? (
                  <>
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                        Description
                      </label>
                      <select
                        value={expenseDescription}
                        onChange={(e) => setExpenseDescription(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none"
                      >
                        <option value="">Select...</option>
                        {expenseDescriptions.map((label) => (
                          <option key={label} value={label}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                        Expense details
                      </label>
                      <input
                        type="text"
                        placeholder="Optional details..."
                        value={expenseDetails}
                        onChange={(e) => setExpenseDetails(e.target.value)}
                        disabled={!expenseDescription}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none disabled:bg-slate-50"
                      />
                    </div>
                  </>
                ) : null}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="md:col-span-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Create"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}