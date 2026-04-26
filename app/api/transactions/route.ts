import { NextResponse } from "next/server";
import type { CreateTransactionPayload, Transaction } from "@/lib/types";
import { BACKEND_API_URL } from "@/lib/config";

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_API_URL}/transactions`, {
      method: "GET",
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { message: `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as Transaction[];
    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Could not reach backend API (NEXT_PUBLIC_API_URL)" },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as CreateTransactionPayload;
    const response = await fetch(`${BACKEND_API_URL}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return NextResponse.json(
        { message: errorBody || `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    const data = (await response.json()) as Transaction;
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Could not create transaction via backend API (NEXT_PUBLIC_API_URL)" },
      { status: 502 },
    );
  }
}
