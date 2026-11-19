import type { DocumentSession, SourcePdfMeta } from "../../domain/entities/DocumentSession";
import type { PageItem, RotationAngle } from "../../domain/entities/PageItem";

export interface LoadedPdfResult {
  readonly source: SourcePdfMeta;
  readonly pages: ReadonlyArray<PageItem>;
  readonly bytes: Uint8Array;
}

/** Application boundary for inspecting, compiling and building PDF documents locally. */
export interface PdfEnginePort {
  inspectPdf(
    sourceDocId: string,
    fileName: string,
    bytes: Uint8Array,
    pageIdPrefix: string,
  ): Promise<LoadedPdfResult>;

  exportPdf(
    session: DocumentSession,
    sourceBuffers: ReadonlyMap<string, Uint8Array>,
  ): Promise<Uint8Array>;

  buildSampleContractBytes(): Promise<Uint8Array>;
}

/** Application boundary for rendering PDF page previews to HTML5 Canvas. */
export interface PdfRenderPort {
  renderPageToCanvas(
    bytes: Uint8Array,
    sourcePageIndex: number,
    canvas: HTMLCanvasElement,
    targetWidthPx: number,
    extraCwRotation: RotationAngle,
  ): Promise<void>;
}
