"use client";

import { FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

type AssignmentSubmissionFormProps = {
  assignmentId: number;
  courseId: number;
  existingBody?: string;
  existingUrl?: string;
  submissionTypes: string[];
};

export function AssignmentSubmissionForm({
  assignmentId,
  courseId,
  existingBody,
  existingUrl,
  submissionTypes,
}: AssignmentSubmissionFormProps) {
  const availableTypes = useMemo(
    () => submissionTypes.filter((type) => type === "online_text_entry" || type === "online_url"),
    [submissionTypes],
  );
  const defaultType = availableTypes[0] === "online_url" ? "online_url" : "online_text_entry";
  const [submissionType, setSubmissionType] = useState<"online_text_entry" | "online_url">(defaultType);
  const [body, setBody] = useState(existingBody ?? "");
  const [url, setUrl] = useState(existingUrl ?? "");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  if (availableTypes.length === 0) {
    return null;
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setStatus(null);

    const response = await fetch(`/api/courses/${courseId}/assignments/${assignmentId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        submissionType,
        body,
        url,
      }),
    });

    const payload = (await response.json()) as { error?: string };

    if (!response.ok) {
      setStatus(payload.error ?? "Could not submit assignment");
      setSaving(false);
      return;
    }

    setStatus("Submitted successfully");
    setSaving(false);
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {availableTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {availableTypes.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setSubmissionType(type as "online_text_entry" | "online_url")}
              className={
                submissionType === type
                  ? "rounded-full bg-black px-3 py-1.5 text-xs font-medium text-white"
                  : "rounded-full border border-black/15 px-3 py-1.5 text-xs text-black/60 transition hover:border-black/30 hover:text-black"
              }
            >
              {type === "online_text_entry" ? "Text entry" : "Website URL"}
            </button>
          ))}
        </div>
      )}

      {submissionType === "online_text_entry" ? (
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={8}
          className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm"
          placeholder="Write your submission here"
        />
      ) : (
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-xl border border-black/15 px-3 py-3 text-sm"
          placeholder="https://example.com"
        />
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Submitting..." : "Submit assignment"}
        </Button>
        {status && <p className="text-sm text-black/60">{status}</p>}
      </div>
    </form>
  );
}
