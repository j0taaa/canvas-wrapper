import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { submitAssignment } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseId: string; assignmentId: string }> },
) {
  try {
    const { courseId, assignmentId } = await params;
    const parsedCourseId = Number(courseId);
    const parsedAssignmentId = Number(assignmentId);

    if (!Number.isFinite(parsedCourseId) || !Number.isFinite(parsedAssignmentId)) {
      return NextResponse.json({ error: "Invalid course or assignment id" }, { status: 400 });
    }

    const body = (await request.json()) as {
      submissionType?: "online_text_entry" | "online_url";
      body?: string;
      url?: string;
    };

    if (body.submissionType !== "online_text_entry" && body.submissionType !== "online_url") {
      return NextResponse.json({ error: "Unsupported submission type" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;
    const submission = await submitAssignment(
      parsedCourseId,
      parsedAssignmentId,
      {
        submissionType: body.submissionType,
        body: body.body,
        url: body.url,
      },
      apiKey,
    );

    return NextResponse.json(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
