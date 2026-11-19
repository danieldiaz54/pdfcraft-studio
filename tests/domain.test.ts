import { describe, expect, it } from "vitest";
import {
  canRedo,
  canUndo,
  createCommandStack,
  pushState,
  redoState,
  undoState,
} from "../src/domain/commands/EditCommandStack";
import {
  assertValidSignaturePaths,
  sanitizePdfFilename,
  sanitizeWinAnsiText,
} from "../src/domain/entities/Annotation";
import {
  MAX_FILE_BYTES,
  addAnnotation,
  assertExportableSession,
  createEmptySession,
  deletePage,
  duplicatePage,
  reorderPage,
  rotatePage,
  validateFileSize,
  validatePdfHeader,
} from "../src/domain/entities/DocumentSession";
import {
  mapDisplayToPdfPoint,
  rotateAngle,
  type PageItem,
} from "../src/domain/entities/PageItem";
import { PdfDomainError } from "../src/domain/errors/PdfDomainError";
import { PdfLibEngineAdapter } from "../src/infrastructure/pdf/PdfLibEngineAdapter";

const NOW = "2026-11-18T12:00:00.000Z";

function makeTestSession(pageCount = 3) {
  const base = createEmptySession("sess-1", "Contrato Base.pdf", NOW);
  const pages: PageItem[] = Array.from({ length: pageCount }, (_, i) => ({
    id: `pg-${i + 1}`,
    sourceDocId: "doc-1",
    sourcePageIndex: i,
    rotation: 0,
    widthPt: 595.28,
    heightPt: 841.89,
  }));
  return {
    ...base,
    pages,
    sources: [
      { id: "doc-1", name: "Contrato Base.pdf", byteLength: 12_400, pageCount },
    ],
    activePageId: pages[0]?.id ?? null,
  };
}

describe("Hexagonal Domain & PdfLib Integration", () => {
  it("validates PDF headers and file size limits", () => {
    const valid = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]);
    expect(() => validatePdfHeader(valid)).not.toThrow();

    const invalid = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]);
    expect(() => validatePdfHeader(invalid)).toThrow(PdfDomainError);

    expect(() => validateFileSize(MAX_FILE_BYTES + 1)).toThrow(PdfDomainError);
    expect(() => validateFileSize(0)).toThrow(PdfDomainError);
  });

  it("sanitizes filenames and WinAnsi annotation strings", () => {
    expect(sanitizePdfFilename("../Mi Contrato Final!!")).toBe(
      "Mi_Contrato_Final.pdf",
    );
    expect(sanitizePdfFilename("   ")).toBe("documento_editado.pdf");
    expect(sanitizeWinAnsiText("Firmado por María — €100\nOK")).toBe(
      "Firmado por María - EUR100 OK",
    );
  });

  it("reorders, rotates, duplicates and blocks deleting the last page", () => {
    let session = makeTestSession(2);
    session = reorderPage(session, 0, 1, NOW);
    expect(session.pages.map((p) => p.id)).toEqual(["pg-2", "pg-1"]);

    session = rotatePage(session, "pg-2", 90, NOW);
    expect(session.pages[0]?.rotation).toBe(90);
    expect(rotateAngle(270, 90)).toBe(0);

    session = duplicatePage(session, "pg-2", "pg-2-copy", "ann-dup", NOW);
    expect(session.pages).toHaveLength(3);

    session = deletePage(session, "pg-2-copy", NOW);
    session = deletePage(session, "pg-1", NOW);
    expect(() => deletePage(session, "pg-2", NOW)).toThrow(PdfDomainError);

    const empty = createEmptySession("e1", "vacío.pdf", NOW);
    expect(() => assertExportableSession(empty)).toThrow(PdfDomainError);
  });

  it("supports immutable undo/redo command stack", () => {
    const s0 = makeTestSession(2);
    let stack = createCommandStack(s0, "Inicial");
    expect(canUndo(stack)).toBe(false);

    const s1 = rotatePage(s0, "pg-1", 90, NOW);
    stack = pushState(stack, s1, "Rotar +90°", "log-1");
    expect(canUndo(stack)).toBe(true);
    expect(stack.present?.pages[0]?.rotation).toBe(90);

    stack = undoState(stack, "log-2", NOW);
    expect(stack.present?.pages[0]?.rotation).toBe(0);
    expect(canRedo(stack)).toBe(true);

    stack = redoState(stack, "log-3", NOW);
    expect(stack.present?.pages[0]?.rotation).toBe(90);
  });

  it("maps display coordinates accurately across all 4 rotations", () => {
    expect(mapDisplayToPdfPoint(0, 0, 600, 800, 0)).toEqual({ x: 0, y: 800 });
    expect(mapDisplayToPdfPoint(0, 0, 600, 800, 90)).toEqual({ x: 0, y: 0 });
    expect(mapDisplayToPdfPoint(0, 0, 600, 800, 180)).toEqual({ x: 600, y: 0 });
    expect(mapDisplayToPdfPoint(0, 0, 600, 800, 270)).toEqual({ x: 600, y: 800 });
  });

  it("rejects empty signatures", () => {
    expect(() => assertValidSignaturePaths([])).toThrow(PdfDomainError);
    expect(() =>
      assertValidSignaturePaths([
        [
          { x: 0.1, y: 0.5 },
          { x: 0.8, y: 0.5 },
        ],
      ]),
    ).not.toThrow();
  });

  it("builds the 4-page sample contract, stamps signature + text, and exports valid PDF", async () => {
    const engine = new PdfLibEngineAdapter();
    const bytes = await engine.buildSampleContractBytes();
    validatePdfHeader(bytes);

    const loaded = await engine.inspectPdf(
      "sample-doc",
      "Contrato_Servicios_2026.pdf",
      bytes,
      "pg",
    );
    expect(loaded.pages).toHaveLength(4);

    const p0 = loaded.pages[0];
    const p1 = loaded.pages[1];
    if (!p0 || !p1) {
      throw new Error("Expected 4 sample pages");
    }

    let session = createEmptySession("s-e2e", "Contrato_Firmado.pdf", NOW);
    session = {
      ...session,
      pages: [p1, p0], // Swap page 2 & page 1
      sources: [loaded.source],
      activePageId: p1.id,
    };
    session = rotatePage(session, p1.id, 90, NOW);
    session = addAnnotation(
      session,
      {
        id: "sig-1",
        kind: "signature",
        pageId: p1.id,
        x: 0.15,
        y: 0.7,
        width: 0.25,
        height: 0.1,
        inkColor: "#1D4ED8",
        paths: [
          [
            { x: 0.1, y: 0.8 },
            { x: 0.5, y: 0.2 },
            { x: 0.9, y: 0.6 },
          ],
        ],
      },
      NOW,
    );
    session = addAnnotation(
      session,
      {
        id: "txt-1",
        kind: "text",
        pageId: p0.id,
        x: 0.2,
        y: 0.2,
        width: 0.3,
        height: 0.05,
        text: "Revisado 2026",
        fontSizePt: 16,
        inkColor: "#111827",
      },
      NOW,
    );

    const buffers = new Map<string, Uint8Array>([["sample-doc", bytes]]);
    const exported = await engine.exportPdf(session, buffers);
    validatePdfHeader(exported);

    const reinspected = await engine.inspectPdf(
      "recheck",
      "Contrato_Firmado.pdf",
      exported,
      "re",
    );
    expect(reinspected.pages).toHaveLength(2);
  });
});
