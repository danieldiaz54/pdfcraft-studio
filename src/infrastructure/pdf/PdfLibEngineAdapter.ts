import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import type { LoadedPdfResult, PdfEnginePort } from "../../application/ports/PdfEnginePort";
import {
  sanitizeWinAnsiText,
  type InkColor,
  type PageAnnotation,
} from "../../domain/entities/Annotation";
import type { DocumentSession } from "../../domain/entities/DocumentSession";
import {
  mapDisplayToPdfPoint,
  normalizeRotation,
  type PageItem,
  type RotationAngle,
} from "../../domain/entities/PageItem";
import { PdfDomainError } from "../../domain/errors/PdfDomainError";
import { buildSampleContractPdfBytes } from "./SampleContractBuilder";

function toPdfRgb(hex: InkColor) {
  if (hex === "#1D4ED8") {
    return rgb(0.114, 0.306, 0.847);
  }
  return rgb(0.067, 0.094, 0.153);
}

/** Hexagonal adapter implementing binary PDF inspection, merging and stamping via pdf-lib. */
export class PdfLibEngineAdapter implements PdfEnginePort {
  public async inspectPdf(
    sourceDocId: string,
    fileName: string,
    bytes: Uint8Array,
    pageIdPrefix: string,
  ): Promise<LoadedPdfResult> {
    let loaded: PDFDocument;
    try {
      loaded = await PDFDocument.load(bytes.slice());
    } catch {
      throw new PdfDomainError(
        "CORRUPT_PDF",
        `No se pudo leer "${fileName}".`,
        "El archivo podría estar dañado o protegido con contraseña.",
      );
    }

    const pdfPages = loaded.getPages();
    if (pdfPages.length === 0) {
      throw new PdfDomainError(
        "INVALID_FILE_TYPE",
        `El PDF "${fileName}" no contiene páginas.`,
        "Selecciona un documento con al menos una página.",
      );
    }

    const pages: PageItem[] = pdfPages.map((p, index) => {
      const size = p.getSize();
      return {
        id: `${pageIdPrefix}-${index}`,
        sourceDocId,
        sourcePageIndex: index,
        rotation: 0,
        widthPt: size.width,
        heightPt: size.height,
      };
    });

    return {
      source: {
        id: sourceDocId,
        name: fileName,
        byteLength: bytes.byteLength,
        pageCount: pages.length,
      },
      pages,
      bytes,
    };
  }

  public async exportPdf(
    session: DocumentSession,
    sourceBuffers: ReadonlyMap<string, Uint8Array>,
  ): Promise<Uint8Array> {
    const outDoc = await PDFDocument.create();
    outDoc.setTitle(session.title);
    outDoc.setProducer("PdfCraft Studio (Local-First)");

    const font = await outDoc.embedFont(StandardFonts.HelveticaBold);
    const loadedSources = new Map<string, PDFDocument>();

    const annotationsByPage = new Map<string, PageAnnotation[]>();
    for (const ann of session.annotations) {
      const list = annotationsByPage.get(ann.pageId) ?? [];
      list.push(ann);
      annotationsByPage.set(ann.pageId, list);
    }

    for (const pageItem of session.pages) {
      let srcDoc = loadedSources.get(pageItem.sourceDocId);
      if (!srcDoc) {
        const bytes = sourceBuffers.get(pageItem.sourceDocId);
        if (!bytes) {
          throw new PdfDomainError(
            "CORRUPT_PDF",
            "Faltan datos binarios de una de las páginas cargadas.",
            "Vuelve a cargar el archivo PDF original para regenerar el borrador.",
          );
        }
        srcDoc = await PDFDocument.load(bytes.slice());
        loadedSources.set(pageItem.sourceDocId, srcDoc);
      }

      const [copied] = await outDoc.copyPages(srcDoc, [pageItem.sourcePageIndex]);
      if (!copied) {
        continue;
      }

      const baseAngle = copied.getRotation().angle;
      const finalRotation: RotationAngle = normalizeRotation(
        baseAngle + pageItem.rotation,
      );
      copied.setRotation(degrees(finalRotation));

      const rawSize = copied.getSize();
      const pageAnns = annotationsByPage.get(pageItem.id) ?? [];

      for (const ann of pageAnns) {
        const color = toPdfRgb(ann.inkColor);
        if (ann.kind === "signature") {
          for (const stroke of ann.paths) {
            for (let i = 1; i < stroke.length; i += 1) {
              const p0 = stroke[i - 1];
              const p1 = stroke[i];
              if (!p0 || !p1) continue;

              const u0 = ann.x + p0.x * ann.width;
              const v0 = ann.y + p0.y * ann.height;
              const u1 = ann.x + p1.x * ann.width;
              const v1 = ann.y + p1.y * ann.height;

              const start = mapDisplayToPdfPoint(
                u0,
                v0,
                rawSize.width,
                rawSize.height,
                finalRotation,
              );
              const end = mapDisplayToPdfPoint(
                u1,
                v1,
                rawSize.width,
                rawSize.height,
                finalRotation,
              );

              copied.drawLine({
                start,
                end,
                thickness: 2.1,
                color,
              });
            }
          }
        } else {
          const safeText = sanitizeWinAnsiText(ann.text);
          if (!safeText) continue;

          // Offset text anchor near the baseline inside annotation box
          const anchorU = ann.x + 0.008;
          const anchorV = ann.y + Math.min(ann.height * 0.72, 0.04);
          const pos = mapDisplayToPdfPoint(
            anchorU,
            anchorV,
            rawSize.width,
            rawSize.height,
            finalRotation,
          );

          copied.drawText(safeText, {
            x: pos.x,
            y: pos.y,
            size: ann.fontSizePt,
            font,
            color,
            rotate: degrees(finalRotation),
          });
        }
      }

      outDoc.addPage(copied);
    }

    return outDoc.save();
  }

  public async buildSampleContractBytes(): Promise<Uint8Array> {
    return buildSampleContractPdfBytes();
  }
}
