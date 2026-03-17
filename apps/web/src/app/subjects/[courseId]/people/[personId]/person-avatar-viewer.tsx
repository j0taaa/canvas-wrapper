"use client";

import { useState } from "react";

type PersonAvatarViewerProps = {
  alt: string;
  fallback: string;
  src?: string;
};

export function PersonAvatarViewer({ alt, fallback, src }: PersonAvatarViewerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="relative flex size-24 shrink-0 items-center justify-center overflow-hidden rounded-full border border-black/15 bg-black/[0.04] text-2xl font-semibold text-black/70 transition hover:opacity-90 sm:size-28"
        aria-label={`Expand ${alt} profile picture`}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={alt} className="h-full w-full object-cover" />
        ) : (
          <span>{fallback}</span>
        )}
      </button>

      {isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/88 p-1 sm:p-3"
          aria-label="Close expanded profile picture"
        >
          <div className="flex max-h-full max-w-full items-center justify-center">
            {src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt}
                className="h-[88vh] w-[90vw] rounded-[2.5rem] object-contain shadow-2xl sm:h-[84vh] sm:w-[84vw]"
              />
            ) : (
              <div className="flex size-[76vw] max-h-[84vh] max-w-[76vw] items-center justify-center rounded-[2.5rem] border border-white/20 bg-white/10 text-7xl font-semibold text-white sm:size-[26rem]">
                {fallback}
              </div>
            )}
          </div>
        </button>
      )}
    </>
  );
}
