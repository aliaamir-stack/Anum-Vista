"use client";

import { useEffect, useMemo, useState } from "react";
import type { Occupant } from "@/lib/types";
import { api } from "@/lib/api";

const formatAmount = (value: string): string =>
  `Rs ${parseFloat(value || "0").toLocaleString("en-PK")}`;

type EditorState = {
  carCount: number;
  extraFee: string;
};

export default function CarMaintenancePage() {
  const [tenants, setTenants] = useState<Occupant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [editors, setEditors] = useState<Record<number, EditorState>>({});

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getTenants();
        setTenants(data);
        const nextEditors: Record<number, EditorState> = {};
        data.forEach((tenant) => {
          nextEditors[tenant.id] = {
            carCount: tenant.car_count ?? 1,
            extraFee: tenant.extra_car_maintenance_fee ?? "0.00",
          };
        });
        setEditors(nextEditors);
      } catch (err) {
        setError((err as Error).message || "Failed to load tenants.");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const totals = useMemo(() => {
    return tenants.reduce(
      (acc, tenant) => {
        acc.extra += parseFloat(tenant.extra_car_charges || "0");
        acc.total += parseFloat(tenant.total_monthly_maintenance || "0");
        return acc;
      },
      { extra: 0, total: 0 },
    );
  }, [tenants]);

  const saveRow = async (tenant: Occupant) => {
    const editor = editors[tenant.id];
    if (!editor) return;
    const normalizedCars = Math.max(0, Number(editor.carCount || 0));
    const fee = Number(editor.extraFee || 0);
    if (Number.isNaN(normalizedCars) || Number.isNaN(fee) || fee < 0) {
      setError("Please enter valid values for cars and extra fee.");
      return;
    }

    try {
      setSavingId(tenant.id);
      setError(null);
      const updated = await api.updateCarMaintenance(tenant.id, {
        car_count: normalizedCars,
        extra_car_maintenance_fee: fee.toFixed(2),
      });
      setTenants((prev) => prev.map((item) => (item.id === tenant.id ? updated : item)));
    } catch (err) {
      setError((err as Error).message || "Failed to update car maintenance.");
    } finally {
      setSavingId(null);
    }
  };

  return (
    <section className="space-y-6 p-8">
      <div>
        <h2 className="text-2xl font-semibold text-slate-900">Car Maintenance</h2>
        <p className="mt-1 text-sm text-slate-600">
          First car has no extra charge. Charges apply from the 2nd car onward.
        </p>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-slate-500">Total extra-car charges / month</p>
          <p className="mt-2 text-2xl font-semibold text-indigo-700">
            Rs {totals.extra.toLocaleString("en-PK")}
          </p>
        </article>
        <article className="rounded-xl bg-white p-6 shadow-md">
          <p className="text-sm text-slate-500">Total monthly maintenance (with cars)</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            Rs {totals.total.toLocaleString("en-PK")}
          </p>
        </article>
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow-md">
        <table className="min-w-full text-left text-sm">
          <thead style={{ backgroundColor: "#1e2a3a", color: "#ffffff" }}>
            <tr>
              <th className="px-5 py-3 font-semibold">Resident</th>
              <th className="px-5 py-3 font-semibold">Unit</th>
              <th className="px-5 py-3 font-semibold">Base Fee</th>
              <th className="px-5 py-3 font-semibold">Cars</th>
              <th className="px-5 py-3 font-semibold">Fee per Extra Car</th>
              <th className="px-5 py-3 font-semibold">Extra Charges</th>
              <th className="px-5 py-3 font-semibold">Total Maintenance</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-5 py-4" colSpan={8}>
                      <div className="h-4 w-1/2 animate-pulse rounded bg-slate-200" />
                    </td>
                  </tr>
                ))
              : tenants.map((tenant, index) => {
                  const editor = editors[tenant.id];
                  return (
                    <tr key={tenant.id} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-5 py-4 font-medium text-slate-800">{tenant.name}</td>
                      <td className="px-5 py-4 text-slate-700">{tenant.unit.unit_no}</td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatAmount(tenant.monthly_maintenance_fee)}
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min={0}
                          value={editor?.carCount ?? 0}
                          onChange={(e) =>
                            setEditors((prev) => ({
                              ...prev,
                              [tenant.id]: {
                                ...(prev[tenant.id] ?? { carCount: 0, extraFee: "0.00" }),
                                carCount: Number(e.target.value),
                              },
                            }))
                          }
                          className="w-20 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-5 py-4">
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editor?.extraFee ?? "0.00"}
                          onChange={(e) =>
                            setEditors((prev) => ({
                              ...prev,
                              [tenant.id]: {
                                ...(prev[tenant.id] ?? { carCount: 0, extraFee: "0.00" }),
                                extraFee: e.target.value,
                              },
                            }))
                          }
                          className="w-32 rounded border border-slate-300 px-2 py-1 text-sm"
                        />
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {formatAmount(tenant.extra_car_charges)}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {formatAmount(tenant.total_monthly_maintenance)}
                      </td>
                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() => void saveRow(tenant)}
                          disabled={savingId === tenant.id}
                          className="rounded bg-[#1e2a3a] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        >
                          {savingId === tenant.id ? "Saving..." : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
