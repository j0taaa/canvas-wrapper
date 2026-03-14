import { NextResponse } from "next/server";
import { getDashboardData, normalizeCanvasProviderUrl } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";
const CANVAS_API_BASE_COOKIE = "canvasApiBase";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { apiKey?: string; providerUrl?: string };
    const normalizedProviderUrl = normalizeCanvasProviderUrl(body.providerUrl);
    const data = await getDashboardData(body.apiKey, normalizedProviderUrl);
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

    response.cookies.set(CANVAS_API_BASE_COOKIE, normalizedProviderUrl, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

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
  response.cookies.set(CANVAS_API_BASE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });

  return response;
}
