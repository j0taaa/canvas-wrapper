import JSZip from "jszip";
import mammoth from "mammoth";

const DOCX_CONTENT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const PPTX_CONTENT_TYPES = new Set([
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

type OfficePreviewKind = "docx" | "pptx";

export type DocxPreview = {
  html: string;
  kind: "docx";
  warnings: string[];
};

export type PptxPreview = {
  kind: "pptx";
  slides: Array<{
    items: string[];
    number: number;
    title: string;
  }>;
};

export type OfficePreview = DocxPreview | PptxPreview;

function getFilenameExtension(filename?: string) {
  const normalizedName = filename?.trim().toLowerCase() ?? "";
  const parts = normalizedName.split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.at(-1) ?? "";
}

export function getOfficePreviewKind(contentType?: string, filename?: string): OfficePreviewKind | null {
  const normalizedType = (contentType ?? "").toLowerCase();
  const extension = getFilenameExtension(filename);

  if (DOCX_CONTENT_TYPES.has(normalizedType) || extension === "docx") {
    return "docx";
  }

  if (PPTX_CONTENT_TYPES.has(normalizedType) || extension === "pptx") {
    return "pptx";
  }

  return null;
}

function decodeXmlEntities(value: string) {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function sortSlideEntries(left: string, right: string) {
  const leftNumber = Number(left.match(/slide(\d+)\.xml$/)?.[1] ?? "0");
  const rightNumber = Number(right.match(/slide(\d+)\.xml$/)?.[1] ?? "0");
  return leftNumber - rightNumber;
}

async function generateDocxPreview(data: ArrayBuffer): Promise<DocxPreview> {
  const result = await mammoth.convertToHtml({
    buffer: Buffer.from(data),
  });

  return {
    html: result.value || "<p>No previewable content was found in this Word document.</p>",
    kind: "docx",
    warnings: result.messages.map((message) => message.message),
  };
}

async function generatePptxPreview(data: ArrayBuffer): Promise<PptxPreview> {
  const archive = await JSZip.loadAsync(Buffer.from(data));
  const slideEntries = Object.keys(archive.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry))
    .sort(sortSlideEntries);

  const slides = await Promise.all(
    slideEntries.map(async (entry, index) => {
      const xml = await archive.file(entry)?.async("string");
      const textMatches = Array.from(xml?.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g) ?? []);
      const texts = textMatches
        .map((match) => decodeXmlEntities(match[1]).replace(/\s+/g, " ").trim())
        .filter(Boolean);
      const title = texts[0] ?? `Slide ${index + 1}`;
      const items = texts.length > 1 ? texts.slice(1) : [];

      return {
        items,
        number: index + 1,
        title,
      };
    }),
  );

  return {
    kind: "pptx",
    slides,
  };
}

export async function generateOfficePreview(
  data: ArrayBuffer,
  contentType?: string,
  filename?: string,
): Promise<OfficePreview | null> {
  const kind = getOfficePreviewKind(contentType, filename);

  if (kind === "docx") {
    return generateDocxPreview(data);
  }

  if (kind === "pptx") {
    return generatePptxPreview(data);
  }

  return null;
}
