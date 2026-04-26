"use client";

<<<<<<< HEAD
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { Cell, Pie, PieChart } from "recharts";
import { api } from "@/lib/api";
import type { DashboardMetricsResponse } from "@/lib/types";

const monthOptions = [
  { label: "Jan", value: "01" },
  { label: "Feb", value: "02" },
  { label: "Mar", value: "03" },
  { label: "Apr", value: "04" },
  { label: "May", value: "05" },
  { label: "Jun", value: "06" },
  { label: "Jul", value: "07" },
  { label: "Aug", value: "08" },
  { label: "Sep", value: "09" },
  { label: "Oct", value: "10" },
  { label: "Nov", value: "11" },
  { label: "Dec", value: "12" },
] as const;

const parseDecimal = (value: string | number | null | undefined): number => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const formatPkr = (value: number): string =>
  `₨ ${value.toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

function AnimatedCurrency({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const durationMs = 900;
    const start = performance.now();
    const initial = displayValue;
    let frame = 0;

    const tick = (now: number) => {
      const progress = Math.min((now - start) / durationMs, 1);
      const next = initial + (value - initial) * progress;
      setDisplayValue(next);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <motion.p
      className={className}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {formatPkr(displayValue)}
    </motion.p>
  );
}

const normalizeMetrics = (metrics: DashboardMetricsResponse) => {
  const source = metrics as DashboardMetricsResponse & {
    overdue_apartments?: string[];
    overdueApartmentNumbers?: string[];
    maintenance_progress?: {
      received?: string;
      expected?: string;
    };
  };

  return {
    totalRevenue: parseDecimal(source.totalRevenue ?? source.total_revenue),
    overdueAmount: parseDecimal(source.totalOverdueAmount ?? source.total_overdues),
    treasuryBalance: parseDecimal(source.treasuryBalance ?? source.treasury_balance),
    adRevenue: parseDecimal(source.allTimeAdRevenue ?? source.ad_revenue),
    overdueUnits:
      source.missingApartments ??
      source.overdue_units ??
      source.overdue_apartments ??
      source.overdueApartmentNumbers ??
      [],
    maintenanceReceived: parseDecimal(
      source.maintenanceReceivedThisMonth ??
        source.maintenance_received ??
        source.maintenance_progress?.received,
    ),
    maintenanceExpected: parseDecimal(
      source.maintenanceExpectedTotal ??
        source.total_expected_maintenance ??
        source.maintenance_progress?.expected,
    ),
  };
};

export default function DashboardPage() {
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    String(now.getMonth() + 1).padStart(2, "0"),
  );
  const [selectedYear, setSelectedYear] = useState(String(now.getFullYear()));
  const yearOptions = [String(now.getFullYear()), String(now.getFullYear() - 1)];

  const {
    data: metrics,
    isLoading,
    isFetching,
    error,
  } = useQuery({
    queryKey: ["dashboard-metrics", selectedMonth, selectedYear],
    queryFn: () => api.getDashboardMetrics(selectedMonth, selectedYear),
  });

  const normalized = useMemo(
    () =>
      normalizeMetrics(
        metrics ?? {
          total_revenue: "0",
          total_overdues: "0",
          treasury_balance: "0",
          ad_revenue: "0",
        },
      ),
    [metrics],
  );

  const progressRatio =
    normalized.maintenanceExpected > 0
      ? Math.min(normalized.maintenanceReceived / normalized.maintenanceExpected, 1)
      : 0;

  const progressData = [
    { name: "Received", value: progressRatio * 100, color: "#2563eb" },
    { name: "Pending", value: 100 - progressRatio * 100, color: "#e2e8f0" },
  ];

  const revenueMonth = `${selectedYear}-${selectedMonth}`;

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-semibold text-slate-900">Financial Dashboard</h2>
          <p className="mt-1 text-sm text-slate-500">
            Live accounting overview with animated performance indicators.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Month
              </label>
              <select
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              >
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Year
              </label>
              <select
                value={selectedYear}
                onChange={(event) => setSelectedYear(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              >
                {yearOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <motion.article
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Revenue ({revenueMonth})
          </p>
          {isLoading ? (
            <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-slate-200" />
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={selectedMonth} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <AnimatedCurrency value={normalized.totalRevenue} className="mt-3 text-3xl font-bold text-emerald-600" />
              </motion.div>
            </AnimatePresence>
          )}
          {isFetching && !isLoading ? (
            <p className="mt-2 text-xs text-slate-400">Refreshing metric...</p>
          ) : null}
        </motion.article>

        <motion.article
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Overdue Tracker
          </p>
          {isLoading ? (
            <div className="mt-4 h-10 w-1/2 animate-pulse rounded bg-slate-200" />
          ) : (
            <AnimatedCurrency value={normalized.overdueAmount} className="mt-3 text-3xl font-bold text-rose-600" />
          )}
          <div className="mt-4 max-h-28 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3">
            {normalized.overdueUnits.length === 0 ? (
              <p className="text-sm text-slate-500">No overdue apartments.</p>
            ) : (
              normalized.overdueUnits.map((unit) => (
                <p key={unit} className="rounded-md bg-white px-2 py-1 text-xs font-medium text-slate-700">
                  {unit}
                </p>
              ))
            )}
          </div>
        </motion.article>

        <motion.article
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Treasury Balance
          </p>
          {isLoading ? (
            <div className="mt-4 h-10 w-2/3 animate-pulse rounded bg-slate-200" />
          ) : (
            <AnimatedCurrency value={normalized.treasuryBalance} className="mt-3 text-3xl font-bold text-sky-700" />
          )}
        </motion.article>

        <motion.article
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Ad Revenue (Lifetime)
          </p>
          {isLoading ? (
            <div className="mt-4 h-10 w-1/2 animate-pulse rounded bg-slate-200" />
          ) : (
            <AnimatedCurrency value={normalized.adRevenue} className="mt-3 text-3xl font-bold text-violet-600" />
          )}
        </motion.article>

        <motion.article
          whileHover={{ y: -3 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-8"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Maintenance Progress
          </p>
          <div className="mt-4 grid grid-cols-1 items-center gap-4 md:grid-cols-2">
            <div className="h-48">
              <PieChart width={220} height={180}>
                <Pie
                  data={progressData}
                  dataKey="value"
                  innerRadius={50}
                  outerRadius={70}
                  strokeWidth={0}
                  cx={100}
                  cy={85}
                >
                  {progressData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-slate-600">
                Received vs expected maintenance for the selected month.
              </p>
              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressRatio * 100}%` }}
                  transition={{ duration: 0.8 }}
                  className="h-full rounded-full bg-sky-600"
                />
              </div>
              <p className="text-sm font-semibold text-slate-700">
                {(progressRatio * 100).toFixed(1)}% completed
              </p>
              <p className="text-xs text-slate-500">
                {formatPkr(normalized.maintenanceReceived)} / {formatPkr(normalized.maintenanceExpected)}
              </p>
            </div>
          </div>
        </motion.article>
=======
import { useEffect, useState } from "react";
import type { DashboardMetricsResponse } from "@/lib/types";

const METRICS_URL = "http://localhost:8000/api/dashboard/metrics";

const formatPkrAmount = (value: string): string =>
  `₨ ${parseFloat(value).toLocaleString("en-PK")}`;

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadMetrics = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(METRICS_URL, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          let message = `Failed to fetch metrics (${response.status})`;
          try {
            const errorBody = (await response.json()) as { message?: string };
            if (errorBody.message) message = errorBody.message;
          } catch {
            // Ignore JSON parse errors and keep default message.
          }
          throw new Error(message);
        }

        const data = (await response.json()) as DashboardMetricsResponse;
        setMetrics(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Failed to load dashboard metrics.");
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadMetrics();
    return () => controller.abort();
  }, []);

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
          {error}
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
                <p className="text-sm text-gray-500 mb-1">{card.title}</p>
                <p className="text-2xl font-bold" style={{ color: card.valueColor }}>
                  {card.value}
                </p>
              </article>
            ))}
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
      </div>
    </section>
  );
}
