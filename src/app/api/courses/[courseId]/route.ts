import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCourseContent } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await params;
    const parsedCourseId = Number(courseId);

    if (!Number.isFinite(parsedCourseId)) {
      return NextResponse.json({ error: "Invalid course id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;
    const data = await getCourseContent(parsedCourseId, apiKey);

    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
