import type {
  CreateTransactionPayload,
  DashboardMetricsResponse,
  Occupant,
  Transaction,
  UpdateCarMaintenancePayload,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

const buildUrl = (path: string): string => `${API_BASE_URL}${path}`;

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(buildUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `API request failed (${response.status} ${response.statusText}) for ${path}: ${text}`,
    );
  }

  return response.json() as Promise<T>;
}

export const api = {
  getDashboardMetrics: (): Promise<DashboardMetricsResponse> =>
    fetchJson<DashboardMetricsResponse>("/api/dashboard/metrics"),

  getTenants: (): Promise<Occupant[]> => fetchJson<Occupant[]>("/api/tenants"),

  getTransactions: (): Promise<Transaction[]> =>
    fetchJson<Transaction[]>("/api/transactions"),

  createTransaction: (payload: CreateTransactionPayload): Promise<Transaction> => {
    if (!payload.date.includes("T")) {
      throw new Error("Transaction date must be a full ISO datetime string.");
    }

    return fetchJson<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
  updateCarMaintenance: (
    occupantId: number,
    payload: UpdateCarMaintenancePayload,
  ): Promise<Occupant> =>
    fetchJson<Occupant>(`/api/tenants/${occupantId}/cars`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    }),
};
