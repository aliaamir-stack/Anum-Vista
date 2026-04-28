import { NextRequest, NextResponse } from "next/server";
import { BACKEND_API_URL } from "@/lib/config";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: NextRequest, context: Params) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const response = await fetch(`${BACKEND_API_URL}/tenants/${id}/cars`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      return NextResponse.json(
        { message: data.detail ?? `Backend responded with ${response.status}` },
        { status: response.status },
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch {
    return NextResponse.json(
      { message: "Could not update car maintenance." },
      { status: 502 },
    );
  }
}
