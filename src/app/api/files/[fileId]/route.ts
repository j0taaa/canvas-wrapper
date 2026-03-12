import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getFileContent } from "@/lib/canvas";

const CANVAS_API_KEY_COOKIE = "canvasApiKey";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { fileId } = await params;
    const parsedFileId = Number(fileId);

    if (!Number.isFinite(parsedFileId)) {
      return NextResponse.json({ error: "Invalid file id" }, { status: 400 });
    }

    const cookieStore = await cookies();
    const apiKey = cookieStore.get(CANVAS_API_KEY_COOKIE)?.value;
    const { contentType, data } = await getFileContent(parsedFileId, apiKey);

    return new NextResponse(data, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
