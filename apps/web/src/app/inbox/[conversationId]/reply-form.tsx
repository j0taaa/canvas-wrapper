"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Reply, SendHorizonal } from "lucide-react";
import { Button } from "@/components/ui/button";

type ReplyFormProps = {
  conversationId: number;
};

const fieldClassName =
  "w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

export function ReplyForm({ conversationId }: ReplyFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!message.trim()) {
      setError("Write a reply before sending.");
      return;
    }

    setError("");
    setSuccess("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/inbox/conversations/${conversationId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ body: message }),
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Unable to send reply.");
        }

        setMessage("");
        setSuccess("Reply sent.");
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to send reply.");
      }
    });
  };

  return (
    <div className="rounded-3xl border border-border/80 bg-card/95 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Reply className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Reply</p>
      </div>
      <textarea
        value={message}
        onChange={(event) => setMessage(event.target.value)}
        placeholder="Write your reply"
        className={`${fieldClassName} min-h-36 resize-y`}
      />
      {(error || success) && (
        <p className={`mt-3 text-sm ${error ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
          {error || success}
        </p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={handleSubmit} disabled={isPending || !message.trim()}>
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
          <span>{isPending ? "Sending..." : "Send reply"}</span>
        </Button>
      </div>
    </div>
  );
}
