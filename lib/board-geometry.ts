export const CARD_SIZE_LIMITS = {
  minWidth: 150,
  maxWidth: 520,
  minHeight: 110,
  maxHeight: 620,
} as const;

const round = (value: number) => Math.round(value * 100) / 100;
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));

export function clampCardSize(width: number, height: number) {
  return {
    width: round(
      clamp(width, CARD_SIZE_LIMITS.minWidth, CARD_SIZE_LIMITS.maxWidth),
    ),
    height: round(
      clamp(height, CARD_SIZE_LIMITS.minHeight, CARD_SIZE_LIMITS.maxHeight),
    ),
  };
}

export function resizeCardFromPointer({
  startWidth,
  startHeight,
  deltaX,
  deltaY,
  lockAspectRatio = false,
}: {
  startWidth: number;
  startHeight: number;
  deltaX: number;
  deltaY: number;
  lockAspectRatio?: boolean;
}) {
  if (!lockAspectRatio || startWidth <= 0 || startHeight <= 0) {
    return clampCardSize(startWidth + deltaX, startHeight + deltaY);
  }

  // Project the pointer movement onto the card diagonal. This makes horizontal
  // and vertical movement contribute smoothly without distorting images.
  const diagonalSquared = startWidth ** 2 + startHeight ** 2;
  const requestedScale =
    1 + (deltaX * startWidth + deltaY * startHeight) / diagonalSquared;
  const minimumScale = Math.max(
    CARD_SIZE_LIMITS.minWidth / startWidth,
    CARD_SIZE_LIMITS.minHeight / startHeight,
  );
  const maximumScale = Math.min(
    CARD_SIZE_LIMITS.maxWidth / startWidth,
    CARD_SIZE_LIMITS.maxHeight / startHeight,
  );
  const scale = clamp(requestedScale, minimumScale, maximumScale);

  return {
    width: round(startWidth * scale),
    height: round(startHeight * scale),
  };
}

export function clampCardPosition({
  x,
  y,
  width,
  height,
  sectionWidth,
  worldHeight,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  sectionWidth: number;
  worldHeight: number;
}) {
  return {
    x: round(clamp(x, 18, Math.max(18, sectionWidth - width - 18))),
    y: round(clamp(y, 74, Math.max(74, worldHeight - height - 26))),
  };
}

export function resolveSectionAtX<T extends { width: number }>(
  sections: T[],
  globalX: number,
  gap: number,
) {
  if (!sections.length) return null;

  let offset = 0;
  for (const section of sections) {
    const end = offset + section.width + gap;
    if (globalX < end) return { section, offset };
    offset = end;
  }

  const section = sections[sections.length - 1];
  return {
    section,
    offset: sections
      .slice(0, -1)
      .reduce((total, item) => total + item.width + gap, 0),
  };
}
