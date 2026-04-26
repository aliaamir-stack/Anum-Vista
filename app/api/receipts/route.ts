import { NextResponse } from "next/server";
import type { ReceiptPayload, ReceiptResponse } from "@/lib/types";
import { BACKEND_API_URL } from "@/lib/config";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as ReceiptPayload;
    const response = await fetch(`${BACKEND_API_URL}/receipts`, {
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

    const data = (await response.json()) as ReceiptResponse;
    return NextResponse.json(data, { status: 201 });
  } catch {
    return NextResponse.json(
      { message: "Could not create receipt via backend API (NEXT_PUBLIC_API_URL)" },
      { status: 502 },
    );
  }
}
