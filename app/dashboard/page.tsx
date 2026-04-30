"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Occupant } from "@/lib/types";
import type { DashboardMetricsResponse } from "@/lib/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatPkrAmount = (value: string): string =>
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

export default function DashboardPage() {
  const [overdueOpen, setOverdueOpen] = useState(false);

  const {
    data: metrics,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["dashboard-metrics"],
    queryFn: () => api.getDashboardMetrics(),
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants,
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.getTransactions,
  });

  const overdueResidents = useMemo(() => {
    return tenants
      .map((tenant) => {
        const status = computeTenantStatus(tenant);
        if (status !== "Overdue") return null;
        const unpaid = computeUnpaidPastMonths(tenant);
        const dueMonth = unpaid[0] ?? toMonthKey(new Date());
        return {
          id: tenant.id,
          name: tenant.name,
          unit: tenant.unit.unit_no,
          dueMonth,
          remainingDue: tenant.expected_dues,
        };
      })
      .filter(Boolean) as Array<{
      id: number;
      name: string;
      unit: string;
      dueMonth: string;
      remainingDue: string;
    }>;
  }, [tenants]);

  const currentYear = new Date().getFullYear();
  const monthTicks = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  const cashflowSeries = useMemo(() => {
    const byMonth = Array.from({ length: 12 }).map((_, index) => ({
      month: monthTicks[index],
      inflow: 0,
      outflow: 0,
    }));
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== currentYear) return;
      const m = date.getMonth();
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount)) return;
      if (tx.type === "INFLOW") byMonth[m].inflow += amount;
      else byMonth[m].outflow += amount;
    });
    return byMonth;
  }, [transactions, currentYear]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    const now = new Date();
    const currentMonth = now.getMonth();
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      if (Number.isNaN(date.getTime())) return;
      if (date.getFullYear() !== currentYear) return;
      if (date.getMonth() !== currentMonth) return;
      const amount = Number(tx.amount);
      if (!Number.isFinite(amount)) return;
      map.set(tx.category, (map.get(tx.category) ?? 0) + amount * (tx.type === "OUTFLOW" ? -1 : 1));
    });
    const colors: Record<string, string> = {
      maintenance: "#2563eb",
      expense: "#dc2626",
      ad_revenue: "#9333ea",
      other: "#64748b",
    };
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value: Math.abs(value), fill: colors[name] ?? "#64748b" }))
      .filter((entry) => entry.value > 0);
  }, [transactions, currentYear]);

  const cards = metrics
    ? [
        {
          title: "Total Revenue (this month)",
          value: formatPkrAmount(metrics.total_revenue),
          borderColor: "#16a34a",
          valueColor: "#16a34a",
        },
        {
          title: "Treasury Balance",
          value: formatPkrAmount(metrics.treasury_balance),
          borderColor: "#2563eb",
          valueColor: "#2563eb",
        },
        {
          title: "Total Overdues",
          value: formatPkrAmount(metrics.total_overdues),
          borderColor: "#dc2626",
          valueColor: "#dc2626",
          interactive: true,
        },
        {
          title: "Ad Revenue (all time)",
          value: formatPkrAmount(metrics.ad_revenue),
          borderColor: "#9333ea",
          valueColor: "#9333ea",
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          Financial overview for Anum Vista.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-6 p-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-md p-6 border-l-4"
              >
                <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="mt-4 h-8 w-1/2 animate-pulse rounded bg-slate-200" />
              </div>
            ))
          : cards.map((card) => (
              <article
                key={card.title}
                className="bg-white rounded-xl shadow-md p-6 border-l-4"
                style={{ borderLeftColor: card.borderColor }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (card.title === "Total Overdues") setOverdueOpen((v) => !v);
                  }}
                  className={`w-full text-left ${card.title === "Total Overdues" ? "cursor-pointer" : "cursor-default"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                    {card.title === "Total Overdues" ? (
                      <span className="text-xs font-semibold text-slate-400">
                        {overdueOpen ? "Hide" : "View"}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-2xl font-bold" style={{ color: card.valueColor }}>
                    {card.value}
                  </p>
                </button>

                {card.title === "Total Overdues" ? (
                  <AnimatePresence>
                    {overdueOpen ? (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 overflow-hidden rounded-lg border border-rose-100 bg-rose-50/40"
                      >
                        <div className="max-h-64 overflow-y-auto p-3">
                          {overdueResidents.length === 0 ? (
                            <p className="text-sm text-slate-600">No overdue residents.</p>
                          ) : (
                            <div className="space-y-2">
                              {overdueResidents.map((resident) => (
                                <div
                                  key={resident.id}
                                  className="rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-semibold text-slate-900">
                                      {resident.unit}
                                    </p>
                                    <p className="font-semibold text-rose-700">
                                      {formatPkrAmount(resident.remainingDue)}
                                    </p>
                                  </div>
                                  <p className="text-xs text-slate-500">
                                    Due: {prettyMonth(resident.dueMonth)} • {resident.name}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                ) : null}
              </article>
            ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Cashflow Trend (This Year)
              </p>
              <p className="text-sm text-slate-600">Monthly inflow vs outflow</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={cashflowSeries}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="inflow" stroke="#16a34a" strokeWidth={2} />
                <Line type="monotone" dataKey="outflow" stroke="#dc2626" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Category Breakdown (This Month)
          </p>
          <p className="text-sm text-slate-600">Absolute totals by category</p>
          <div className="mt-4 h-72">
            {categoryBreakdown.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-xl bg-slate-50 text-sm text-slate-500">
                Not enough data yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" outerRadius={90} />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
