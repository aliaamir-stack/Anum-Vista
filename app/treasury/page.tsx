"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { api } from "@/lib/api";

const holderOrder = ["Naveed", "Asif", "Dilshad", "Ali", "Danish"] as const;

const formatPkr = (value: string): string =>
  `₨ ${Number(value).toLocaleString("en-PK", { maximumFractionDigits: 0 })}`;

export default function TreasuryPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["treasury-current"],
    queryFn: api.getTreasuryCurrent,
  });

  const holders =
    data?.holders?.slice().sort((a, b) => {
      const ai = holderOrder.indexOf(a.name as (typeof holderOrder)[number]);
      const bi = holderOrder.indexOf(b.name as (typeof holderOrder)[number]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    }) ?? [];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-3xl font-semibold text-slate-900">Treasury</h2>
        <p className="mt-1 text-sm text-slate-500">
          Current treasury snapshot by holder.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {(error as Error).message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <motion.article
          whileHover={{ y: -2 }}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-12"
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Period</p>
          {isLoading ? (
            <div className="mt-3 h-7 w-56 animate-pulse rounded bg-slate-200" />
          ) : (
            <p className="mt-2 text-lg font-semibold text-slate-900">{data?.period ?? "—"}</p>
          )}
        </motion.article>

        {isLoading ? (
          Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              className="h-28 animate-pulse rounded-2xl bg-slate-200 lg:col-span-4"
            />
          ))
        ) : (
          holders.map((holder) => (
            <motion.article
              key={holder.name}
              whileHover={{ y: -2 }}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-4"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Holder
              </p>
              <p className="mt-1 text-xl font-semibold text-slate-900">{holder.name}</p>
              <p className="mt-3 text-2xl font-bold text-sky-700">{formatPkr(holder.amount)}</p>
            </motion.article>
          ))
        )}
      </div>
    </section>
  );
}

