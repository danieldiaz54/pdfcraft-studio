import { PdfDomainError } from "../errors/PdfDomainError";

export type InkColor = "#111827" | "#1D4ED8";
export type TextFontSizePt = 12 | 16 | 20;

export interface SignaturePoint {
  readonly x: number;
  readonly y: number;
}

export interface NormalizedBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface SignatureAnnotation extends NormalizedBox {
  readonly id: string;
  readonly kind: "signature";
  readonly pageId: string;
  readonly paths: ReadonlyArray<ReadonlyArray<SignaturePoint>>;
  readonly inkColor: InkColor;
}

export interface TextAnnotation extends NormalizedBox {
  readonly id: string;
  readonly kind: "text";
  readonly pageId: string;
  readonly text: string;
  readonly fontSizePt: TextFontSizePt;
  readonly inkColor: InkColor;
}

export type PageAnnotation = SignatureAnnotation | TextAnnotation;

/** Clamp any box within [0, 1] page bounds while preserving minimum interactive size. */
export function clampNormalizedBox(box: NormalizedBox): NormalizedBox {
  const width = Math.min(0.9, Math.max(0.06, box.width));
  const height = Math.min(0.45, Math.max(0.035, box.height));
  const x = Math.min(1 - width, Math.max(0.01, box.x));
  const y = Math.min(1 - height, Math.max(0.01, box.y));
  return { x, y, width, height };
}

/** Validate a handwritten signature contains at least one drawable stroke with points. */
export function assertValidSignaturePaths(
  paths: ReadonlyArray<ReadonlyArray<SignaturePoint>>,
): void {
  const hasStroke = paths.some((stroke) => stroke.length >= 2);
  if (!hasStroke) {
    throw new PdfDomainError(
      "INVALID_ANNOTATION",
      "La firma está vacía.",
      "Dibuja al menos un trazo antes de insertar la firma en la página.",
    );
  }
}

/** Strip characters unsupported by standard PDF WinAnsi fonts while keeping Spanish accents. */
export function sanitizeWinAnsiText(raw: string): string {
  const normalized = raw.replace(/\r?\n/g, " ").trim();
  const filtered: string[] = [];
  for (const ch of normalized) {
    const code = ch.charCodeAt(0);
    // Basic Latin printable + Latin-1 Supplement printable (accents, ñ, ¿, ¡, currency/dash fallbacks)
    if ((code >= 32 && code <= 126) || (code >= 160 && code <= 255)) {
      filtered.push(ch);
    } else if (code === 0x2014 || code === 0x2013) {
      filtered.push("-");
    } else if (code === 0x20ac) {
      filtered.push("EUR");
    }
  }
  return filtered.join("").slice(0, 160);
}

/** Strictly sanitize exported PDF filename and enforce `.pdf` extension. */
export function sanitizePdfFilename(raw: string): string {
  const stripped = raw
    .trim()
    .replace(/\.pdf$/i, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[_.-]+|[_.-]+$/g, "");
  const base = stripped.length > 0 ? stripped.slice(0, 64) : "documento_editado";
  return `${base}.pdf`;
}
