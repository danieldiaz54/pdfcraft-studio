import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import type { PdfRenderPort } from "../../application/ports/PdfEnginePort";
import { normalizeRotation, type RotationAngle } from "../../domain/entities/PageItem";

let workerConfigured = false;
const canvasQueues = new WeakMap<HTMLCanvasElement, Promise<void>>();

function ensureWorker(): void {
  if (!workerConfigured) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    workerConfigured = true;
  }
}

/** Local Canvas renderer powered by pdfjs-dist v4 bundled worker (zero external CDN requests). */
export class PdfJsRendererAdapter implements PdfRenderPort {
  public renderPageToCanvas(
    bytes: Uint8Array,
    sourcePageIndex: number,
    canvas: HTMLCanvasElement,
    targetWidthPx: number,
    extraCwRotation: RotationAngle,
  ): Promise<void> {
    const previous = canvasQueues.get(canvas) ?? Promise.resolve();
    const next = previous
      .catch(() => undefined)
      .then(() =>
        this.performRender(
          bytes,
          sourcePageIndex,
          canvas,
          targetWidthPx,
          extraCwRotation,
        ),
      );
    canvasQueues.set(canvas, next);
    return next;
  }

  private async performRender(
    bytes: Uint8Array,
    sourcePageIndex: number,
    canvas: HTMLCanvasElement,
    targetWidthPx: number,
    extraCwRotation: RotationAngle,
  ): Promise<void> {
    ensureWorker();

    const loadingTask = pdfjsLib.getDocument({ data: bytes.slice() });
    const pdfDoc = await loadingTask.promise;
    try {
      const page = await pdfDoc.getPage(sourcePageIndex + 1);
      const totalRotation = normalizeRotation((page.rotate || 0) + extraCwRotation);

      const baseViewport = page.getViewport({ scale: 1, rotation: totalRotation });
      const scale = targetWidthPx / Math.max(1, baseViewport.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const renderViewport = page.getViewport({
        scale: scale * dpr,
        rotation: totalRotation,
      });

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        return;
      }

      canvas.width = Math.max(1, Math.floor(renderViewport.width));
      canvas.height = Math.max(1, Math.floor(renderViewport.height));

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({
        canvasContext: ctx,
        viewport: renderViewport,
      });
      await renderTask.promise;
    } finally {
      await pdfDoc.destroy();
    }
  }
}
