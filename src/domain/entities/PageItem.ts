export type RotationAngle = 0 | 90 | 180 | 270;

export interface PageItem {
  readonly id: string;
  readonly sourceDocId: string;
  readonly sourcePageIndex: number;
  readonly rotation: RotationAngle;
  readonly widthPt: number;
  readonly heightPt: number;
}

export interface PdfCoordinatePoint {
  readonly x: number;
  readonly y: number;
}

const PT_TO_MM = 25.4 / 72;

/** Normalize any degree step cleanly onto the discrete {0, 90, 180, 270} set. */
export function normalizeRotation(angle: number): RotationAngle {
  const normalized = ((Math.round(angle / 90) * 90) % 360 + 360) % 360;
  if (normalized === 90 || normalized === 180 || normalized === 270) {
    return normalized;
  }
  return 0;
}

/** Rotate a page angle by +90, -90, 180, etc. while staying strictly typed. */
export function rotateAngle(
  current: RotationAngle,
  deltaDegrees: 90 | -90 | 180,
): RotationAngle {
  return normalizeRotation(current + deltaDegrees);
}

/** Return effective display dimensions accounting for 90°/270° orientation swaps. */
export function getEffectivePageSize(page: PageItem): {
  readonly widthPt: number;
  readonly heightPt: number;
} {
  if (page.rotation === 90 || page.rotation === 270) {
    return { widthPt: page.heightPt, heightPt: page.widthPt };
  }
  return { widthPt: page.widthPt, heightPt: page.heightPt };
}

/** Format page dimensions cleanly in millimeters for tabular measurements. */
export function formatPageDimensionsMm(page: PageItem): string {
  const effective = getEffectivePageSize(page);
  const wMm = Math.round(effective.widthPt * PT_TO_MM);
  const hMm = Math.round(effective.heightPt * PT_TO_MM);
  return `${wMm} × ${hMm} mm`;
}

/**
 * Map normalized display-space top-left coordinates (u, v in [0, 1]) into
 * unrotated PDF bottom-left coordinates (x, y) given raw page size and total CW rotation.
 */
export function mapDisplayToPdfPoint(
  u: number,
  v: number,
  rawWidthPt: number,
  rawHeightPt: number,
  totalCwRotation: RotationAngle,
): PdfCoordinatePoint {
  switch (totalCwRotation) {
    case 0:
      return {
        x: u * rawWidthPt,
        y: (1 - v) * rawHeightPt,
      };
    case 90:
      return {
        x: v * rawWidthPt,
        y: u * rawHeightPt,
      };
    case 180:
      return {
        x: (1 - u) * rawWidthPt,
        y: v * rawHeightPt,
      };
    case 270:
      return {
        x: (1 - v) * rawWidthPt,
        y: (1 - u) * rawHeightPt,
      };
  }
}
