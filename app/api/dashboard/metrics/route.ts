import { NextRequest, NextResponse } from "next/server";
import type { DashboardMetricsResponse } from "@/lib/types";

const BACKEND_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

export async function GET(request: NextRequest) {
  try {
    // Forward the search params (like ?year=2026) to the FastAPI backend
    const url = `${BACKEND_BASE_URL}/api/dashboard/metrics${request.nextUrl.search}`;
    
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    // Handle non-OK responses from the backend
    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as DashboardMetricsResponse;
    return NextResponse.json(data, { status: 200 });
    
  } catch (error) {
    // Handle network errors or backend downtime
    return NextResponse.json(
      { message: "Could not reach backend API. Ensure FastAPI is running on port 8000." },
      { status: 502 },
    );
  }
}