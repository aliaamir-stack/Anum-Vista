"use client";

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
      </div>
    </section>
  );
}
