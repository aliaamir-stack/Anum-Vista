"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import type {
  CreateTransactionPayload,
  Occupant,
  Transaction,
  TransactionCategory,
  TransactionType,
} from "@/lib/types";

const TRANSACTIONS_URL = "http://localhost:8000/api/transactions";
const TENANTS_URL = "http://localhost:8000/api/tenants";

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
};

const formatAmount = (value: string): string =>
  `₨ ${parseFloat(value).toLocaleString()}`;

const formatDate = (value: string): string => {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<TransactionType>("INFLOW");
  const [category, setCategory] = useState<TransactionCategory>("maintenance");
  const [occupantId, setOccupantId] = useState("");
  const [receiptNo, setReceiptNo] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occupantNameMap = useMemo(() => {
    const map = new Map<number, string>();
    tenants.forEach((tenant) => {
      map.set(tenant.id, tenant.name);
    });
    return map;
  }, [tenants]);

  const loadData = async (signal?: AbortSignal) => {
    const [transactionsRes, tenantsRes] = await Promise.all([
      fetch(TRANSACTIONS_URL, { cache: "no-store", signal }),
      fetch(TENANTS_URL, { cache: "no-store", signal }),
    ]);

    if (!transactionsRes.ok) {
      throw new Error(`Failed to fetch transactions (${transactionsRes.status})`);
    }
    if (!tenantsRes.ok) {
      throw new Error(`Failed to fetch tenants (${tenantsRes.status})`);
    }

    const transactionsData = (await transactionsRes.json()) as Transaction[];
    const tenantsData = (await tenantsRes.json()) as Occupant[];

    setTransactions(transactionsData);
    setTenants(tenantsData);
  };

  useEffect(() => {
    const controller = new AbortController();

    const init = async () => {
      try {
        setIsLoading(true);
        setError(null);
        await loadData(controller.signal);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Failed to load transactions.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    init();
    return () => controller.abort();
  }, []);

  const yearCounts = useMemo(() => {
    const counts: Record<YearFilter, number> = {
      2023: 0,
      2024: 0,
      2025: 0,
      2026: 0,
    };
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
      const occupantName = tx.occupant_id
        ? occupantNameMap.get(tx.occupant_id) || ""
        : "General";
      const receipt = tx.receipt_no || "";
      const noteText = tx.notes || "";

      const matchesSearch =
        query.length === 0 ||
        occupantName.toLowerCase().includes(query) ||
        receipt.toLowerCase().includes(query) ||
        noteText.toLowerCase().includes(query);

      const matchesType = filter === "ALL" || tx.type === filter;
      const matchesCategory =
        categoryFilter === "ALL" || tx.category === categoryFilter;

      return (
        matchesYear &&
        matchesSearch &&
        matchesType &&
        matchesCategory
      );
    });
  }, [transactions, filter, categoryFilter, searchQuery, occupantNameMap, selectedYear]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setIsSubmitting(true);
      setError(null);

      const payload: CreateTransactionPayload = {
        date: `${date}T00:00:00`,
        amount: amount.toString(),
        type,
        category,
        occupant_id: occupantId ? Number(occupantId) : undefined,
        receipt_no: receiptNo || undefined,
        notes: notes || undefined,
      };

      const response = await fetch(TRANSACTIONS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to add transaction (${response.status})`);
      }

      await loadData();

      setDate("");
      setAmount("");
      setType("INFLOW");
      setCategory("maintenance");
      setOccupantId("");
      setReceiptNo("");
      setNotes("");

      setSuccessMessage("Transaction added successfully");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError((err as Error).message || "Failed to add transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Transactions</h2>
        <p className="mt-1 text-sm text-slate-600">
          {isLoading ? "Loading transactions..." : `${transactions.length} total count`}
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl bg-white p-6 shadow-md">
        <h3 className="text-lg font-semibold text-slate-900">Add Transaction</h3>

        <form className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Date</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Amount</label>
            <input
              type="number"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TransactionType)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="INFLOW">INFLOW</option>
              <option value="OUTFLOW">OUTFLOW</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TransactionCategory)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="maintenance">maintenance</option>
              <option value="expense">expense</option>
              <option value="ad_revenue">ad_revenue</option>
              <option value="other">other</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-700">Occupant</label>
            <select
              value={occupantId}
              onChange={(e) => setOccupantId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="">None (General)</option>
              {tenants.map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name} - {tenant.unit.unit_no}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Receipt No</label>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            />
          </div>

          <div className="md:col-span-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-[#1e2a3a] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "Saving..." : "Add Transaction"}
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex flex-wrap gap-2">
          {years.map((year) => {
            const isActive = selectedYear === year;
            return (
              <button
                key={year}
                type="button"
                onClick={() => setSelectedYear(year)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#1e2a3a] text-white"
                    : "bg-white text-slate-600 hover:bg-slate-100"
                }`}
                style={!isActive ? { border: "1px solid #e2e8f0" } : undefined}
              >
                {year} ({yearCounts[year]})
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
            <label className="mb-1 block text-sm font-medium text-slate-700">Category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-slate-500"
            >
              <option value="ALL">All</option>
              <option value="maintenance">Maintenance</option>
              <option value="expense">Expense</option>
              <option value="ad_revenue">Ad Revenue</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-6 shadow-md">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">Transaction History</h3>
          <div className="flex gap-2">
            {(["ALL", "INFLOW", "OUTFLOW"] as const).map((item) => {
              const isActive = filter === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-[#1e2a3a] text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>

        <p className="mb-4 text-sm text-slate-600">
          {isLoading
            ? "Loading transactions..."
            : `Showing ${filteredTransactions.length} of ${transactions.length} transactions`}
        </p>

        <div className="overflow-hidden rounded-xl shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead style={{ backgroundColor: "#1e2a3a", color: "#ffffff" }}>
              <tr>
                <th className="px-5 py-3 font-semibold">Date</th>
                <th className="px-5 py-3 font-semibold">Occupant</th>
                <th className="px-5 py-3 font-semibold">Receipt No</th>
                <th className="px-5 py-3 font-semibold">Category</th>
                <th className="px-5 py-3 font-semibold">Type</th>
                <th className="px-5 py-3 font-semibold">Amount</th>
                <th className="px-5 py-3 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, index) => (
                    <tr
                      key={index}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-5 py-4">
                        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
                      </td>
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
                        <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
                      </td>
                      <td className="px-5 py-4">
                        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
                      </td>
                    </tr>
                  ))
                : filteredTransactions.map((tx, index) => (
                    <tr
                      key={tx.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-5 py-4 text-slate-700">{formatDate(tx.date)}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {tx.occupant_id ? occupantNameMap.get(tx.occupant_id) || "Unknown" : "General"}
                      </td>
                      <td className="px-5 py-4 text-slate-700">{tx.receipt_no || "-"}</td>
                      <td className="px-5 py-4">
                        <span style={{ ...badgeBaseStyle, ...categoryBadgeStyles[tx.category] }}>
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span style={{ ...badgeBaseStyle, ...typeBadgeStyles[tx.type] }}>
                          {tx.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatAmount(tx.amount)}</td>
                      <td className="px-5 py-4 text-slate-700">{tx.notes || "-"}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredTransactions.length === 0 ? (
          <p className="mt-4 text-sm text-slate-600">No transactions found</p>
        ) : null}
      </div>
    </section>
  );
}
