export function formatSubjectName(name?: string | null) {
  if (!name) {
    return "Untitled subject";
  }

  return name.split(" -", 1)[0]?.trim() || name;
}

export function orderSubjectsByPreference<T extends { id: number }>(
  subjects: T[],
  orderedIds: number[] = [],
) {
  const uniqueOrderedIds = Array.from(new Set(orderedIds));
  const orderIndex = new Map<number, number>();

  uniqueOrderedIds.forEach((id, index) => {
    orderIndex.set(id, index);
  });

  return subjects
    .map((subject, index) => ({
      index,
      order: orderIndex.get(subject.id) ?? Number.POSITIVE_INFINITY,
      subject,
    }))
    .sort((left, right) => {
      if (left.order === right.order) {
        return left.index - right.index;
      }

      return left.order - right.order;
    })
    .map((entry) => entry.subject);
}

export function getSubjectColorHex(name?: string | null) {
  const safeName = name || "Untitled subject";
  let hash = 0;

  for (let index = 0; index < safeName.length; index += 1) {
    hash = safeName.charCodeAt(index) + ((hash << 5) - hash);
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 0.65;
  const lightness = 0.55;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const huePrime = hue / 60;
  const secondary = chroma * (1 - Math.abs((huePrime % 2) - 1));
  const match = lightness - chroma / 2;

  let red = 0;
  let green = 0;
  let blue = 0;

  if (huePrime >= 0 && huePrime < 1) {
    red = chroma;
    green = secondary;
  } else if (huePrime < 2) {
    red = secondary;
    green = chroma;
  } else if (huePrime < 3) {
    green = chroma;
    blue = secondary;
  } else if (huePrime < 4) {
    green = secondary;
    blue = chroma;
  } else if (huePrime < 5) {
    red = secondary;
    blue = chroma;
  } else {
    red = chroma;
    blue = secondary;
  }

  return `#${[red, green, blue]
    .map((value) => Math.round((value + match) * 255))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function normalizeSubjectColorHex(value?: string | null) {
  const normalized = value?.trim().match(/^#?([0-9a-f]{6})$/i);

  if (!normalized) {
    return null;
  }

  return `#${normalized[1].toLowerCase()}`;
}

export function getSubjectColorPalette(name?: string | null, preferredColor?: string | null) {
  const normalizedColor = normalizeSubjectColorHex(preferredColor ?? getSubjectColorHex(name));

  if (!normalizedColor) {
    return {
      backgroundColor: "#dbeafe",
      borderColor: "#3b82f6",
      color: "#1d4ed8",
    };
  }

  const value = normalizedColor.slice(1);
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return {
    backgroundColor: `rgba(${red}, ${green}, ${blue}, 0.16)`,
    borderColor: normalizedColor,
    color: `rgba(${red}, ${green}, ${blue}, 0.95)`,
  };
}
