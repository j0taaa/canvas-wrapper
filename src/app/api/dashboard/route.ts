import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/canvas";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: string };
    const data = await getDashboardData(body.apiKey);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
