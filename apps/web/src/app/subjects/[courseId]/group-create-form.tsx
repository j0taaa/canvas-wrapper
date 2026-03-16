"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, LockKeyhole, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

const fieldClassName =
  "w-full rounded-2xl border border-border/80 bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-ring focus:ring-2 focus:ring-ring/20";

type GroupCreateFormProps = {
  canCreate: boolean;
  courseId: number;
};

export function GroupCreateForm({ canCreate, courseId }: GroupCreateFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = () => {
    if (!canCreate) {
      return;
    }

    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const response = await fetch(`/api/courses/${courseId}/groups`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            description,
            name,
          }),
        });

        const payload = (await response.json()) as {
          error?: string;
          group?: { id: number };
        };

        if (!response.ok || !payload.group) {
          throw new Error(payload.error ?? "Unable to create group.");
        }

        router.push(`/subjects/${courseId}/groups/${payload.group.id}`);
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Unable to create group.");
      }
    });
  };

  if (!canCreate) {
    return (
      <Button type="button" variant="outline" disabled className="gap-2">
        <LockKeyhole className="h-4 w-4" />
        <span>New group locked</span>
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <Button type="button" onClick={() => setIsOpen((current) => !current)} className="gap-2">
        <Plus className="h-4 w-4" />
        <span>{isOpen ? "Close" : "New group"}</span>
      </Button>
      {isOpen && (
        <div className="space-y-3 rounded-2xl border border-black/10 bg-white/90 p-4">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Group name"
            className={fieldClassName}
          />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            rows={3}
            className={`${fieldClassName} resize-none`}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex justify-end">
            <Button type="button" onClick={handleSubmit} disabled={isPending || !name.trim()} className="gap-2">
              {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span>{isPending ? "Creating..." : "Create group"}</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
