import { NextResponse } from "next/server";
import type { DashboardMetricsResponse } from "@/lib/types";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_BASE_URL}/api/dashboard/metrics`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as DashboardMetricsResponse;
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Could not reach backend on localhost:8000" },
      { status: 502 },
    );
  }
}
