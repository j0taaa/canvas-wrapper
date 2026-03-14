import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addConversationMessage } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ conversationId: string }> },
) {
  try {
    const { conversationId } = await params;
    const parsedConversationId = Number(conversationId);

    if (!Number.isFinite(parsedConversationId)) {
      return NextResponse.json({ error: "Invalid conversation id" }, { status: 400 });
    }

    const body = (await request.json()) as { body?: string };
    const messageBody = body.body?.trim();

    if (!messageBody) {
      return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key" }, { status: 401 });
    }

    const conversation = await addConversationMessage(parsedConversationId, messageBody, apiKey);
    return NextResponse.json(conversation);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
