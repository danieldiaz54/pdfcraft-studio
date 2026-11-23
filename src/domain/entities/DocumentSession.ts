import { PdfDomainError } from "../errors/PdfDomainError";
import {
  clampNormalizedBox,
  sanitizePdfFilename,
  type PageAnnotation,
} from "./Annotation";
import { rotateAngle, type PageItem } from "./PageItem";

export const MAX_FILE_BYTES = 26_214_400; // 25 MB per PDF

export interface SourcePdfMeta {
  readonly id: string;
  readonly name: string;
  readonly byteLength: number;
  readonly pageCount: number;
}

export interface DocumentSession {
  readonly id: string;
  readonly title: string;
  readonly pages: ReadonlyArray<PageItem>;
  readonly annotations: ReadonlyArray<PageAnnotation>;
  readonly sources: ReadonlyArray<SourcePdfMeta>;
  readonly activePageId: string | null;
  readonly networkBytesSent: 0;
  readonly updatedAtIso: string;
}

/** Verify PDF magic header `%PDF-` within the first 1024 bytes. */
export function validatePdfHeader(bytes: Uint8Array): void {
  const probeLimit = Math.min(bytes.length, 1024);
  if (probeLimit < 5) {
    throw new PdfDomainError(
      "INVALID_FILE_TYPE",
      "El archivo seleccionado está vacío o no es un PDF válido.",
      "Elige un documento con extensión .pdf que comience con cabecera PDF válida.",
    );
  }
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  for (let i = 0; i <= probeLimit - magic.length; i += 1) {
    if (
      bytes[i] === magic[0] &&
      bytes[i + 1] === magic[1] &&
      bytes[i + 2] === magic[2] &&
      bytes[i + 3] === magic[3] &&
      bytes[i + 4] === magic[4]
    ) {
      return;
    }
  }
  throw new PdfDomainError(
    "INVALID_FILE_TYPE",
    "El archivo no tiene formato PDF válido.",
    "Verifica que el archivo sea un PDF estándar sin cifrado propietario incompatible.",
  );
}

/** Guard client memory against files exceeding MAX_FILE_BYTES (25 MB). */
export function validateFileSize(byteLength: number): void {
  if (byteLength <= 0) {
    throw new PdfDomainError(
      "INVALID_FILE_TYPE",
      "El archivo está vacío.",
      "Selecciona un archivo PDF con al menos una página.",
    );
  }
  if (byteLength > MAX_FILE_BYTES) {
    throw new PdfDomainError(
      "FILE_TOO_LARGE",
      "El archivo supera el límite de 25 MB.",
      "Divide el documento en partes más pequeñas antes de cargarlo.",
    );
  }
}

/** Create a clean initial local session with zero network transmission. */
export function createEmptySession(
  id: string,
  title: string,
  nowIso: string,
): DocumentSession {
  return {
    id,
    title: sanitizePdfFilename(title),
    pages: [],
    annotations: [],
    sources: [],
    activePageId: null,
    networkBytesSent: 0,
    updatedAtIso: nowIso,
  };
}

/** Append a newly loaded PDF source and its pages into an active session. */
export function appendPages(
  session: DocumentSession,
  source: SourcePdfMeta,
  newPages: ReadonlyArray<PageItem>,
  nowIso: string,
  preferredActivePageId?: string,
): DocumentSession {
  const nextPages = [...session.pages, ...newPages];
  const nextActive =
    preferredActivePageId ?? session.activePageId ?? nextPages[0]?.id ?? null;

  return {
    ...session,
    pages: nextPages,
    sources: [...session.sources, source],
    activePageId: nextActive,
    updatedAtIso: nowIso,
  };
}

/** Reorder a page from fromIndex to toIndex immutably. */
export function reorderPage(
  session: DocumentSession,
  fromIndex: number,
  toIndex: number,
  nowIso: string,
): DocumentSession {
  if (
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex >= session.pages.length ||
    toIndex >= session.pages.length ||
    fromIndex === toIndex
  ) {
    return session;
  }
  const copy = [...session.pages];
  const [moved] = copy.splice(fromIndex, 1);
  if (!moved) {
    return session;
  }
  copy.splice(toIndex, 0, moved);
  return {
    ...session,
    pages: copy,
    updatedAtIso: nowIso,
  };
}

/** Move a page one slot earlier (-1) or later (+1). */
export function movePageByDelta(
  session: DocumentSession,
  pageId: string,
  delta: -1 | 1,
  nowIso: string,
): DocumentSession {
  const index = session.pages.findIndex((p) => p.id === pageId);
  if (index < 0) {
    return session;
  }
  return reorderPage(session, index, index + delta, nowIso);
}

/** Rotate a single page clockwise (+90) or counter-clockwise (-90). */
export function rotatePage(
  session: DocumentSession,
  pageId: string,
  delta: 90 | -90,
  nowIso: string,
): DocumentSession {
  const pages = session.pages.map((page) =>
    page.id === pageId
      ? { ...page, rotation: rotateAngle(page.rotation, delta) }
      : page,
  );
  return { ...session, pages, updatedAtIso: nowIso };
}

/** Rotate every page in the document simultaneously. */
export function rotateAllPages(
  session: DocumentSession,
  delta: 90 | -90,
  nowIso: string,
): DocumentSession {
  const pages = session.pages.map((page) => ({
    ...page,
    rotation: rotateAngle(page.rotation, delta),
  }));
  return { ...session, pages, updatedAtIso: nowIso };
}

/** Reset rotation on all pages back to 0 degrees. */
export function resetAllRotations(
  session: DocumentSession,
  nowIso: string,
): DocumentSession {
  const pages = session.pages.map((page) => ({ ...page, rotation: 0 as const }));
  return { ...session, pages, updatedAtIso: nowIso };
}

/** Duplicate a page right after itself, cloning any annotations on that page. */
export function duplicatePage(
  session: DocumentSession,
  pageId: string,
  newPageId: string,
  newAnnotationIdPrefix: string,
  nowIso: string,
): DocumentSession {
  const idx = session.pages.findIndex((p) => p.id === pageId);
  if (idx < 0) {
    return session;
  }
  const target = session.pages[idx];
  if (!target) {
    return session;
  }
  const clonedPage: PageItem = { ...target, id: newPageId };
  const nextPages = [...session.pages];
  nextPages.splice(idx + 1, 0, clonedPage);

  const clonedAnnotations = session.annotations
    .filter((ann) => ann.pageId === pageId)
    .map((ann, i) => ({
      ...ann,
      id: `${newAnnotationIdPrefix}-${i}`,
      pageId: newPageId,
    }));

  return {
    ...session,
    pages: nextPages,
    annotations: [...session.annotations, ...clonedAnnotations],
    activePageId: newPageId,
    updatedAtIso: nowIso,
  };
}

/** Delete a page while protecting against leaving zero exportable pages. */
export function deletePage(
  session: DocumentSession,
  pageId: string,
  nowIso: string,
): DocumentSession {
  if (session.pages.length <= 1) {
    throw new PdfDomainError(
      "LAST_PAGE_PROTECTED",
      "El documento debe conservar al menos una página.",
      "Agrega o conserva al menos una página antes de eliminar esta.",
    );
  }
  const idx = session.pages.findIndex((p) => p.id === pageId);
  if (idx < 0) {
    return session;
  }
  const nextPages = session.pages.filter((p) => p.id !== pageId);
  const nextAnnotations = session.annotations.filter((a) => a.pageId !== pageId);
  let nextActive = session.activePageId;
  if (session.activePageId === pageId) {
    const fallbackIndex = Math.min(idx, nextPages.length - 1);
    nextActive = nextPages[fallbackIndex]?.id ?? null;
  }
  return {
    ...session,
    pages: nextPages,
    annotations: nextAnnotations,
    activePageId: nextActive,
    updatedAtIso: nowIso,
  };
}

/** Add a clamped signature or text annotation onto a target page. */
export function addAnnotation(
  session: DocumentSession,
  annotation: PageAnnotation,
  nowIso: string,
): DocumentSession {
  const clamped = clampNormalizedBox(annotation);
  const nextAnnotation: PageAnnotation = {
    ...annotation,
    ...clamped,
  };
  return {
    ...session,
    annotations: [...session.annotations, nextAnnotation],
    updatedAtIso: nowIso,
  };
}

/** Reposition an existing annotation cleanly inside [0, 1] page bounds. */
export function moveAnnotation(
  session: DocumentSession,
  annotationId: string,
  nextX: number,
  nextY: number,
  nowIso: string,
): DocumentSession {
  const annotations = session.annotations.map((ann) => {
    if (ann.id !== annotationId) {
      return ann;
    }
    const clamped = clampNormalizedBox({
      x: nextX,
      y: nextY,
      width: ann.width,
      height: ann.height,
    });
    return { ...ann, ...clamped };
  });
  return { ...session, annotations, updatedAtIso: nowIso };
}

/** Resize an existing annotation cleanly inside [0, 1] page bounds. */
export function resizeAnnotation(
  session: DocumentSession,
  annotationId: string,
  nextWidth: number,
  nextHeight: number,
  nowIso: string,
): DocumentSession {
  const annotations = session.annotations.map((ann) => {
    if (ann.id !== annotationId) {
      return ann;
    }
    const clamped = clampNormalizedBox({
      x: ann.x,
      y: ann.y,
      width: nextWidth,
      height: nextHeight,
    });
    return { ...ann, ...clamped };
  });
  return { ...session, annotations, updatedAtIso: nowIso };
}

/** Remove an annotation by ID. */
export function removeAnnotation(
  session: DocumentSession,
  annotationId: string,
  nowIso: string,
): DocumentSession {
  return {
    ...session,
    annotations: session.annotations.filter((a) => a.id !== annotationId),
    updatedAtIso: nowIso,
  };
}

/** Update session output filename cleanly. */
export function renameSession(
  session: DocumentSession,
  rawTitle: string,
  nowIso: string,
): DocumentSession {
  return {
    ...session,
    title: sanitizePdfFilename(rawTitle),
    updatedAtIso: nowIso,
  };
}

/** Switch active page if present in the session. */
export function setActivePage(
  session: DocumentSession,
  pageId: string,
): DocumentSession {
  if (!session.pages.some((p) => p.id === pageId)) {
    return session;
  }
  return { ...session, activePageId: pageId };
}

/** Guard export invariant before calling PdfEnginePort. */
export function assertExportableSession(session: DocumentSession): void {
  if (session.pages.length === 0) {
    throw new PdfDomainError(
      "EMPTY_EXPORT",
      "No hay páginas para descargar.",
      "Carga o agrega al menos un archivo PDF antes de exportar.",
    );
  }
}

/** Format byte size into readable KB or MB string for real telemetry display. */
export function formatBytesLabel(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  const kb = bytes / 1024;
  if (kb < 1024) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}
