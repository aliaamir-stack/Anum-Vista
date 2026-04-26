"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { api } from "@/lib/api";
import type { Transaction } from "@/lib/types";

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
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"ALL" | "INFLOW" | "OUTFLOW">("ALL");

  const { data: transactions = [], isLoading, error } = useQuery({
    queryKey: ["transactions"],
    queryFn: api.getTransactions,
  });

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: api.getTenants,
  });

  const tenantById = useMemo(() => {
    const map = new Map<number, { name: string; unit: string }>();
    tenants.forEach((tenant) => {
      map.set(tenant.id, { name: tenant.name, unit: tenant.unit.unit_no });
    });
    return map;
  }, [tenants]);

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return transactions.filter((tx) => {
      const tenant = tx.occupant_id ? tenantById.get(tx.occupant_id) : undefined;
      const name = tenant?.name.toLowerCase() ?? "";
      const unit = tenant?.unit.toLowerCase() ?? "";
      const matchesSearch = query.length === 0 || name.includes(query) || unit.includes(query);
      const matchesType = typeFilter === "ALL" || tx.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [search, typeFilter, transactions, tenantById]);

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Transactions</h2>
        <p className="mt-1 text-sm text-slate-500">
          Receipt history with detailed audit information.
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
              { id: "INFLOW", label: "Inflow" },
              { id: "OUTFLOW", label: "Outflow" },
            ].map((option) => {
              const active = typeFilter === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setTypeFilter(option.id as "ALL" | "INFLOW" | "OUTFLOW")}
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
          {filteredTransactions.map((tx: Transaction) => {
            const tenant = tx.occupant_id ? tenantById.get(tx.occupant_id) : undefined;
            const sourceLabel = tenant ? `${tenant.unit} - ${tenant.name}` : tx.source || "General";
            const maintenanceMonth = tx.maintenance_month ?? tx.maintenanceMonth;
            const timestamp = tx.timestamp ?? tx.created_at ?? tx.date;
            const generatedBy = tx.generated_by ?? tx.generatedBy ?? "System";
            const isExpanded = expandedId === tx.id;

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
                    <p className="truncate text-base font-semibold text-slate-900">{sourceLabel}</p>
                  </div>
                  <p
                    className={`text-lg font-bold ${
                      tx.type === "INFLOW" ? "text-green-500" : "text-red-500"
                    }`}
                  >
                    {tx.type === "INFLOW" ? "+" : "-"}{formatAmount(tx.amount)}
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
                          <span className="font-semibold text-slate-800">Receipt #:</span>{" "}
                          {tx.receipt_no ?? "-"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Category:</span>{" "}
                          {tx.category}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Maintenance Month:</span>{" "}
                          {maintenanceMonth ? maintenanceMonth : "N/A"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Exact Timestamp:</span>{" "}
                          {formatDateTime(timestamp)}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Generated By:</span>{" "}
                          {generatedBy}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Notes:</span>{" "}
                          {tx.notes || "-"}
                        </p>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.article>
            );
          })}
        </div>
      )}
    </section>
  );
}
