"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

type HistoryBackButtonProps = {
  fallbackHref: string;
};

export function HistoryBackButton({ fallbackHref }: HistoryBackButtonProps) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Go back"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
      className="inline-flex rounded-full border border-border/80 bg-card p-2 text-muted-foreground transition hover:border-foreground/15 hover:bg-muted/85 hover:text-foreground"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
