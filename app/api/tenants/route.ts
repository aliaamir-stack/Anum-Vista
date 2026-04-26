import { NextRequest, NextResponse } from "next/server";
import type { Occupant } from "@/lib/types";
import { BACKEND_API_URL } from "@/lib/config";

export async function GET(request: NextRequest) {
  try {
    const response = await fetch(`${BACKEND_API_URL}/tenants${request.nextUrl.search}`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as Occupant[];
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Could not reach backend API (NEXT_PUBLIC_API_URL)" },
      { status: 502 },
    );
  }
}
