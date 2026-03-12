import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

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

export function formatSubjectName(name?: string | null) {
  if (!name) {
    return "Untitled subject"
  }

  return name.split(" -", 1)[0]?.trim() || name
}

export function getSubjectColorHex(name?: string | null) {
  const safeName = name || "Untitled subject"
  let hash = 0

  for (let index = 0; index < safeName.length; index += 1) {
    hash = safeName.charCodeAt(index) + ((hash << 5) - hash)
  }

  const hue = Math.abs(hash) % 360
  const saturation = 0.65
  const lightness = 0.55
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation
  const huePrime = hue / 60
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1))
  const match = lightness - chroma / 2

  let red = 0
  let green = 0
  let blue = 0

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma
    green = secondary
  } else if (huePrime < 2) {
    red = secondary
    green = chroma
  } else if (huePrime < 3) {
    green = chroma
    blue = secondary
  } else if (huePrime < 4) {
    green = secondary
    blue = chroma
  } else if (huePrime < 5) {
    red = secondary
    blue = chroma
  } else {
    red = chroma
    blue = secondary
  }

  return `#${[red, green, blue]
    .map((value) => Math.round((value + match) * 255))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`
}

function getHexColorStyle(hexColor: string) {
  const normalized = hexColor.trim();
  const match = normalized.match(/^#?([0-9a-f]{6})$/i);

  if (!match) {
    return null;
  }

  const value = match[1];
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  const normalizedHex = `#${value}`;

  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.16)`,
    borderColor: normalizedHex,
    color: `rgba(${red}, ${green}, ${blue}, 0.95)`,
  }
}

export function getSubjectColorStyle(name?: string | null, preferredColor?: string | null) {
  const preferredStyle = preferredColor ? getHexColorStyle(preferredColor) : null;

  if (preferredStyle) {
    return preferredStyle
  }

  const baseHex = getSubjectColorHex(name)
  const hexStyle = getHexColorStyle(baseHex)

  if (hexStyle) {
    return hexStyle
  }

  return {
    backgroundColor: "#dbeafe",
    borderColor: "#3b82f6",
    color: "#1d4ed8",
  }
}
