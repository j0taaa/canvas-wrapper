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
      className="inline-flex rounded-full border border-black/15 bg-white p-2 text-black/65 transition hover:border-black/30 hover:text-black"
    >
      <ArrowLeft className="h-4 w-4" />
    </button>
  );
}
