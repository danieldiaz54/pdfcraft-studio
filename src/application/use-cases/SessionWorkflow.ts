import {
  appendPages,
  assertExportableSession,
  createEmptySession,
  validateFileSize,
  validatePdfHeader,
  type DocumentSession,
} from "../../domain/entities/DocumentSession";
import type { DraftStorePort } from "../ports/DraftStorePort";
import type { PdfEnginePort } from "../ports/PdfEnginePort";

export interface OpenPdfOutcome {
  readonly session: DocumentSession;
  readonly sourceBuffers: Map<string, Uint8Array>;
  readonly addedPageCount: number;
}

/** Coordinate file validation, pdf-lib parsing, and multi-file appending cleanly. */
export async function loadAndAppendPdfFiles(
  engine: PdfEnginePort,
  existingSession: DocumentSession | null,
  existingBuffers: ReadonlyMap<string, Uint8Array>,
  files: ReadonlyArray<{ readonly name: string; readonly bytes: Uint8Array }>,
  createId: () => string,
  nowIso: string,
  preferredSampleActiveIndex?: number,
): Promise<OpenPdfOutcome> {
  const nextBuffers = new Map<string, Uint8Array>(existingBuffers);
  const firstName = files[0]?.name ?? "documento_editado.pdf";
  let session =
    existingSession ?? createEmptySession(createId(), firstName, nowIso);
  let totalAdded = 0;

  for (const file of files) {
    validateFileSize(file.bytes.byteLength);
    validatePdfHeader(file.bytes);

    const sourceId = createId();
    const safeBytes = file.bytes.slice();
    const loaded = await engine.inspectPdf(
      sourceId,
      file.name,
      safeBytes,
      `pg-${sourceId}`,
    );
    nextBuffers.set(sourceId, safeBytes);

    const targetPage =
      preferredSampleActiveIndex !== undefined
        ? loaded.pages[preferredSampleActiveIndex]?.id
        : undefined;

    session = appendPages(session, loaded.source, loaded.pages, nowIso, targetPage);
    totalAdded += loaded.pages.length;
  }

  return {
    session,
    sourceBuffers: nextBuffers,
    addedPageCount: totalAdded,
  };
}

/** Validate invariants and compile final edited PDF binary locally. */
export async function exportSessionToPdfBytes(
  engine: PdfEnginePort,
  session: DocumentSession,
  sourceBuffers: ReadonlyMap<string, Uint8Array>,
): Promise<Uint8Array> {
  assertExportableSession(session);
  return engine.exportPdf(session, sourceBuffers);
}

/** Save updated session and active source binaries into private IndexedDB store. */
export async function persistSessionDraft(
  store: DraftStorePort,
  session: DocumentSession,
  sourceBuffers: ReadonlyMap<string, Uint8Array>,
): Promise<void> {
  const activeIds = new Set(session.pages.map((p) => p.sourceDocId));
  const packedBuffers: Array<{
    readonly sourceDocId: string;
    readonly bytes: Uint8Array;
  }> = [];

  for (const sourceId of activeIds) {
    const buf = sourceBuffers.get(sourceId);
    if (buf) {
      packedBuffers.push({ sourceDocId: sourceId, bytes: buf.slice() });
    }
  }

  await store.saveDraft({
    session,
    sourceBuffers: packedBuffers,
  });
}
