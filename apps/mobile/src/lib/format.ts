import { DISPLAY_TIME_ZONE } from "@canvas/shared";

export function formatDateTime(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatDate(value?: string | null) {
  if (!value) {
    return "No date";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value));
}

export function formatRelativeBucket(value?: string | null) {
  if (!value) {
    return "Later";
  }

  const now = new Date();
  const dueDate = new Date(value);
  const startOfToday = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfDue = Date.UTC(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
  const diffDays = Math.floor((startOfDue - startOfToday) / 86_400_000);

  if (diffDays < 0) {
    return "Overdue";
  }

  if (diffDays === 0) {
    return "Due today";
  }

  if (diffDays <= 6) {
    return "This week";
  }

  return "Later";
}

export function stripHtml(value?: string | null) {
  if (!value) {
    return "";
  }

  return value
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatGrade(value?: number | null) {
  if (value == null || !Number.isFinite(value)) {
    return "No grade";
  }

  return `${new Intl.NumberFormat("pt-BR", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}%`;
}

export function formatDueDateShort(value?: string | null) {
  if (!value) {
    return "No date";
  }

  const date = new Date(value);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "Tomorrow";
  }
  if (diffDays === -1) {
    return "Yesterday";
  }
  if (diffDays > 0 && diffDays <= 7) {
    return date.toLocaleDateString("en-US", { weekday: "long" });
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(date);
}
