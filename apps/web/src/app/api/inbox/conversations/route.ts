import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createConversation } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      body?: string;
      courseId?: number;
      recipientIds?: number[];
      sendIndividualMessages?: boolean;
      subject?: string;
    };

    const parsedCourseId = Number(body.courseId);
    const subject = body.subject?.trim();
    const messageBody = body.body?.trim();
    const recipientIds = Array.from(
      new Set(
        Array.isArray(body.recipientIds)
          ? body.recipientIds
            .map((recipientId) => Number(recipientId))
            .filter((recipientId) => Number.isFinite(recipientId))
          : [],
      ),
    );

    if (!Number.isFinite(parsedCourseId)) {
      return NextResponse.json({ error: "Select a subject before sending." }, { status: 400 });
    }

    if (recipientIds.length === 0) {
      return NextResponse.json({ error: "Choose at least one recipient before sending." }, { status: 400 });
    }

    if (!subject) {
      return NextResponse.json({ error: "Add a subject before sending." }, { status: 400 });
    }

    if (!messageBody) {
      return NextResponse.json({ error: "Write a message before sending." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key" }, { status: 401 });
    }

    const conversation = await createConversation(
      {
        body: messageBody,
        courseId: parsedCourseId,
        groupConversation: !body.sendIndividualMessages,
        recipientIds,
        subject,
      },
      apiKey,
    );

    return NextResponse.json({
      conversationId: conversation?.id ?? null,
      queued: !conversation?.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
