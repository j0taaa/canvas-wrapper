import { NextResponse } from "next/server";
import { getDashboardData } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: string };
    const data = await getDashboardData(body.apiKey);
    const response = NextResponse.json(data);

    if (body.apiKey) {
      response.cookies.set(CANVAS_API_KEY_COOKIE, body.apiKey, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 30,
      });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(CANVAS_API_KEY_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
