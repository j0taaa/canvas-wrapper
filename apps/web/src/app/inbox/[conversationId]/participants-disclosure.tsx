"use client";

import { useState } from "react";

export function ParticipantsDisclosure({
  defaultCollapsed,
  emptyLabel,
  hideLabel,
  participants,
  recipientsCountLabel,
  recipientsLabel,
  showLabel,
}: {
  defaultCollapsed: boolean;
  emptyLabel: string;
  hideLabel: string;
  participants: string[];
  recipientsCountLabel: string;
  recipientsLabel: string;
  showLabel: string;
}) {
  const [expanded, setExpanded] = useState(!defaultCollapsed);

  if (participants.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyLabel}</p>;
  }

  return (
    <div className="space-y-3">
      {defaultCollapsed ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/80 bg-muted/35 px-4 py-3 text-left transition hover:bg-muted/55"
        >
          <div>
            <p className="text-sm font-semibold text-foreground">{recipientsLabel}</p>
            <p className="text-sm text-muted-foreground">{recipientsCountLabel}</p>
          </div>
          <span className="text-sm font-medium text-muted-foreground">
            {expanded ? hideLabel : showLabel}
          </span>
        </button>
      ) : (
        <p className="text-sm font-semibold text-foreground">{recipientsLabel}</p>
      )}

      {expanded ? (
        <div className="space-y-1">
          {participants.map((participant, index) => (
            <p key={`${participant}-${index}`} className="text-sm text-muted-foreground">
              {participant}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
