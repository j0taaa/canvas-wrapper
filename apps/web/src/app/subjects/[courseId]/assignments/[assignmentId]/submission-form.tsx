"use client";

import { FormEvent, useMemo, useState } from "react";
import { Download, FileDown, FileUp, MessageSquarePlus, SendHorizontal } from "lucide-react";
import { t, type AppLocale } from "@canvas/shared";
import { useLocale } from "@/components/locale-provider";
import { Button } from "@/components/ui/button";
import type { CanvasSubmissionAttachment, CanvasSubmissionComment } from "@/lib/canvas";

type AssignmentSubmissionFormProps = {
  assignmentId: number;
  courseId: number;
  existingBody?: string;
  existingUrl?: string;
  existingAttachments?: CanvasSubmissionAttachment[];
  existingComments?: CanvasSubmissionComment[];
  submissionTypes: string[];
};

type SubmitMode = "online_text_entry" | "online_url" | "online_upload";

function formatSubmissionTypeLabel(locale: AppLocale, type: SubmitMode) {
  if (type === "online_text_entry") {
    return t(locale, "subjects.textEntry");
  }

  if (type === "online_url") {
    return t(locale, "subjects.websiteUrl");
  }

  return t(locale, "subjects.fileUpload");
}

function formatCommentDate(locale: AppLocale, value?: string) {
  if (!value) {
    return t(locale, "common.noDate");
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function AssignmentSubmissionForm({
  assignmentId,
  courseId,
  existingBody,
  existingUrl,
  existingAttachments,
  existingComments,
  submissionTypes,
}: AssignmentSubmissionFormProps) {
  const { resolvedLocale } = useLocale();
  const availableTypes = useMemo(
    () => submissionTypes.filter((type): type is SubmitMode =>
      type === "online_text_entry" || type === "online_url" || type === "online_upload",
    ),
    [submissionTypes],
  );
  const defaultType = availableTypes[0] ?? "online_text_entry";
  const [submissionType, setSubmissionType] = useState<SubmitMode>(defaultType);
  const [body, setBody] = useState(existingBody ?? "");
  const [url, setUrl] = useState(existingUrl ?? "");
  const [files, setFiles] = useState<File[]>([]);
  const [comment, setComment] = useState("");
  const [commentText, setCommentText] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [commentStatus, setCommentStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingComment, setSavingComment] = useState(false);

  const attachments = existingAttachments ?? [];
  const comments = existingComments ?? [];

  if (availableTypes.length === 0) {
    return null;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    let response: Response;

    if (submissionType === "online_upload") {
      const formData = new FormData();
      formData.set("submissionType", submissionType);
      formData.set("comment", comment);

      for (const file of files) {
        formData.append("files", file);
      }

      response = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`, {
        method: "POST",
        body: formData,
      });
    } else {
      response = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          submissionType,
          body,
          url,
          comment,
        }),
      });
    }

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? t(resolvedLocale, "subjects.couldNotSubmitAssignment"));
      setSaving(false);
      return;
    }

    setStatus(t(resolvedLocale, "subjects.submittedSuccessfully"));
    setSaving(false);
    setFiles([]);
    setComment("");
  };

  const onCommentSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingComment(true);
    setCommentStatus(null);

    const response = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "comment",
        comment: commentText,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setCommentStatus(payload.error ?? t(resolvedLocale, "subjects.couldNotSubmitComment"));
      setSavingComment(false);
      return;
    }

    setCommentStatus(t(resolvedLocale, "subjects.commentSentSuccessfully"));
    setCommentText("");
    setSavingComment(false);
  };

  return (
    <div className="space-y-4">
      {attachments.length > 0 && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <div className="mb-3 flex items-center gap-2 text-emerald-800">
            <FileDown className="h-4 w-4" />
            <p className="text-xs font-medium uppercase tracking-wide">{t(resolvedLocale, "subjects.submittedFiles")}</p>
          </div>
          <div className="space-y-2">
            {attachments.map((attachment, index) => (
              attachment.url ? (
                <a
                  key={`${attachment.url}-${index}`}
                  href={attachment.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white px-3 py-2.5 text-sm text-emerald-900 transition hover:border-emerald-300 hover:bg-emerald-100/40"
                >
                  <span className="truncate font-medium">{attachment.display_name ?? attachment.filename ?? t(resolvedLocale, "subjects.downloadSubmittedFile")}</span>
                  <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                    <Download className="h-3 w-3" />
                    {t(resolvedLocale, "common.download")}
                  </span>
                </a>
              ) : null
            ))}
          </div>
        </div>
      )}

      <form onSubmit={onSubmit} className="space-y-3 rounded-xl border border-black/10 bg-black/[0.015] p-3">
        <div className="flex items-center gap-2 text-black/80">
          <FileUp className="h-4 w-4" />
          <p className="text-sm font-medium">{t(resolvedLocale, "subjects.newSubmission")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSubmissionType(type)}
              className={
                submissionType === type
                  ? "cursor-pointer rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                  : "cursor-pointer rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/60 transition hover:border-black/30 hover:text-black"
              }
            >
              {formatSubmissionTypeLabel(resolvedLocale, type)}
            </button>
          ))}
        </div>

        {submissionType === "online_text_entry" ? (
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={6}
            className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm"
            placeholder={t(resolvedLocale, "subjects.writeSubmissionHere")}
          />
        ) : submissionType === "online_url" ? (
          <input
            type="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm"
            placeholder="https://example.com"
          />
        ) : (
          <div className="space-y-2">
            <input
              type="file"
              multiple
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              className="block w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm"
            />
            {files.length > 0 && (
              <p className="text-xs text-black/55">
                {t(resolvedLocale, "subjects.filesSelected", { count: files.length })}
              </p>
            )}
          </div>
        )}

        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          rows={3}
          className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm"
          placeholder={t(resolvedLocale, "subjects.optionalSubmissionComment")}
        />

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saving}>
            {saving ? t(resolvedLocale, "subjects.submittingAssignmentAction") : t(resolvedLocale, "subjects.submitAssignmentAction")}
          </Button>
          {status && <p className="text-sm text-black/60">{status}</p>}
        </div>
      </form>

      <div className="rounded-xl border border-black/10 bg-black/[0.015] p-3">
        <div className="mb-3 flex items-center gap-2 text-black/80">
          <MessageSquarePlus className="h-4 w-4" />
          <p className="text-sm font-medium text-black/85">{t(resolvedLocale, "subjects.comments")}</p>
        </div>
        {comments.length > 0 ? (
          <div className="mb-4 space-y-3">
            {comments.map((submissionComment, index) => (
              <div key={`${submissionComment.created_at ?? "comment"}-${index}`} className="rounded-lg border border-black/10 bg-white/80 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-black/80">{submissionComment.author_name ?? t(resolvedLocale, "subjects.canvasUser")}</p>
                  <p className="text-xs text-black/45">{formatCommentDate(resolvedLocale, submissionComment.created_at)}</p>
                </div>
                {submissionComment.comment && (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-black/70">{submissionComment.comment}</p>
                )}
                {submissionComment.attachments && submissionComment.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {submissionComment.attachments.map((attachment, attachmentIndex) => (
                      attachment.url ? (
                        <a
                          key={`${attachment.url}-${attachmentIndex}`}
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-sm text-black/70 underline-offset-4 transition hover:text-black hover:underline"
                        >
                          {attachment.display_name ?? attachment.filename ?? t(resolvedLocale, "subjects.attachment")}
                        </a>
                      ) : null
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="mb-4 text-sm text-black/55">{t(resolvedLocale, "subjects.noCommentsYet")}</p>
        )}

        <form onSubmit={onCommentSubmit} className="space-y-3">
          <textarea
            value={commentText}
            onChange={(event) => setCommentText(event.target.value)}
            rows={3}
            className="w-full rounded-xl border border-black/15 px-3 py-2.5 text-sm"
            placeholder={t(resolvedLocale, "subjects.addComment")}
          />
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={savingComment}>
              <SendHorizontal className="h-4 w-4" />
              {savingComment ? t(resolvedLocale, "subjects.sendingComment") : t(resolvedLocale, "subjects.sendComment")}
            </Button>
            {commentStatus && <p className="text-sm text-black/60">{commentStatus}</p>}
          </div>
        </form>
      </div>
    </div>
  );
}
