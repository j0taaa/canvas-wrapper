import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createCourseGroup, getCourseGroups } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const parsedCourseId = Number(courseId);

    if (!Number.isFinite(parsedCourseId)) {
      return NextResponse.json({ error: "Invalid course id." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    if (!apiKey) {
      return NextResponse.json({ error: "Missing Canvas API key." }, { status: 401 });
    }

    const body = (await request.json()) as { description?: string; name?: string };
    const name = body.name?.trim();

    if (!name) {
      return NextResponse.json({ error: "Group name is required." }, { status: 400 });
    }

    const groups = await getCourseGroups(parsedCourseId, apiKey);
    const group = await createCourseGroup(
      groups,
      {
        description: body.description,
        name,
      },
      apiKey,
    );

    return NextResponse.json({ group });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to create group.";
    const status = message.includes("not allowed") ? 403 : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
