import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { getSubjectColorPalette } from "@canvas/shared"
export { formatSubjectName, getSubjectColorHex } from "@canvas/shared"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const dueDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
})

const shortDueDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "America/Sao_Paulo",
})

export function formatDueDate(value?: string) {
  if (!value) {
    return "No due date"
  }

  return dueDateFormatter.format(new Date(value))
}

export function formatDueDateShort(value?: string) {
  if (!value) {
    return "No due date"
  }

  return shortDueDateFormatter.format(new Date(value))
}

export function getSubjectColorStyle(name?: string | null, preferredColor?: string | null) {
  return getSubjectColorPalette(name, preferredColor)
}
