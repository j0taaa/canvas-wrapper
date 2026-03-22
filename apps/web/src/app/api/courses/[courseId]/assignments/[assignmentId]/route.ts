import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { addAssignmentComment, submitAssignment, uploadAssignmentSubmissionFiles } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";
type RequestFormData = {
  get: (name: string) => FormDataEntryValue | null;
  getAll: (name: string) => FormDataEntryValue[];
};

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

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;

    const contentType = request.headers.get("content-type") ?? "";
    let submission;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData() as unknown as RequestFormData;
      const action = formData.get("action");

      if (action === "comment") {
        const comment = String(formData.get("comment") ?? "");
        submission = await addAssignmentComment(parsedCourseId, parsedAssignmentId, comment, apiKey);
      } else {
        const submissionType = String(formData.get("submissionType") ?? "");
        const comment = String(formData.get("comment") ?? "");

        if (submissionType !== "online_upload") {
          return NextResponse.json({ error: "Unsupported submission type" }, { status: 400 });
        }

        const files = formData
          .getAll("files")
          .filter((value): value is File => value instanceof File && value.size > 0);

        if (files.length === 0) {
          return NextResponse.json({ error: "Choose at least one file to upload." }, { status: 400 });
        }

        const uploadedFileIds = await uploadAssignmentSubmissionFiles(
          parsedCourseId,
          parsedAssignmentId,
          await Promise.all(files.map(async (file) => ({
            contentType: file.type,
            data: Buffer.from(await file.arrayBuffer()),
            name: file.name,
            size: file.size,
          }))),
          apiKey,
        );

        submission = await submitAssignment(
          parsedCourseId,
          parsedAssignmentId,
          {
            submissionType: "online_upload",
            fileIds: uploadedFileIds,
            comment,
          },
          apiKey,
        );
      }
    } else {
      const body = (await request.json()) as {
        action?: "comment" | "submit";
        submissionType?: "online_text_entry" | "online_url";
        body?: string;
        url?: string;
        comment?: string;
      };

      if (body.action === "comment") {
        submission = await addAssignmentComment(
          parsedCourseId,
          parsedAssignmentId,
          body.comment ?? "",
          apiKey,
        );
      } else {
        if (body.submissionType !== "online_text_entry" && body.submissionType !== "online_url") {
          return NextResponse.json({ error: "Unsupported submission type" }, { status: 400 });
        }

        submission = await submitAssignment(
          parsedCourseId,
          parsedAssignmentId,
          {
            submissionType: body.submissionType,
            body: body.body,
            url: body.url,
            comment: body.comment,
          },
          apiKey,
        );
      }
    }

    return NextResponse.json(submission);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
