import type {
  CreateTransactionPayload,
  DashboardMetricsResponse,
  Occupant,
<<<<<<< HEAD
  ReceiptPayload,
  ReceiptResponse,
  Transaction,
} from "./types";
import { FRONTEND_API_BASE } from "./config";

const API_BASE_URL = FRONTEND_API_BASE;
=======
  Transaction,
} from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9

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

<<<<<<< HEAD
const withQuery = (
  path: string,
  params?: Record<string, string | number | undefined>,
): string => {
  if (!params) return path;
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) query.set(key, String(value));
  });
  const serialized = query.toString();
  return serialized ? `${path}?${serialized}` : path;
};

export const api = {
  getDashboardMetrics: (month?: string, year?: string): Promise<DashboardMetricsResponse> =>
    fetchJson<DashboardMetricsResponse>(withQuery("/dashboard/metrics", { month, year })),

  getTenants: (): Promise<Occupant[]> => fetchJson<Occupant[]>("/tenants"),

  getTransactions: (): Promise<Transaction[]> =>
    fetchJson<Transaction[]>("/transactions"),
=======
export const api = {
  getDashboardMetrics: (): Promise<DashboardMetricsResponse> =>
    fetchJson<DashboardMetricsResponse>("/api/dashboard/metrics"),

  getTenants: (): Promise<Occupant[]> => fetchJson<Occupant[]>("/api/tenants"),

  getTransactions: (): Promise<Transaction[]> =>
    fetchJson<Transaction[]>("/api/transactions"),
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9

  createTransaction: (payload: CreateTransactionPayload): Promise<Transaction> => {
    if (!payload.date.includes("T")) {
      throw new Error("Transaction date must be a full ISO datetime string.");
    }

<<<<<<< HEAD
    return fetchJson<Transaction>("/transactions", {
=======
    return fetchJson<Transaction>("/api/transactions", {
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
<<<<<<< HEAD

  createReceipt: (payload: ReceiptPayload): Promise<ReceiptResponse> =>
    fetchJson<ReceiptResponse>("/receipts", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
=======
>>>>>>> 933b7a9bb429ac032addf003d19bbc13bbdb98a9
};
