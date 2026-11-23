import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { PdfRenderPort } from "../../application/ports/PdfEnginePort";
import type { PageAnnotation } from "../../domain/entities/Annotation";
import { getEffectivePageSize, type PageItem } from "../../domain/entities/PageItem";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  MinusIcon,
  PlusIcon,
  RedoIcon,
  UndoIcon,
} from "./Icons";

interface DocumentCanvasProps {
  readonly page: PageItem;
  readonly pageNumber: number;
  readonly totalPages: number;
  readonly annotations: ReadonlyArray<PageAnnotation>;
  readonly selectedAnnotationId: string | null;
  readonly sourceBytes: Uint8Array | undefined;
  readonly renderer: PdfRenderPort;
  readonly zoom: number;
  readonly canUndoAction: boolean;
  readonly canRedoAction: boolean;
  readonly onSelectAnnotation: (id: string | null) => void;
  readonly onMoveAnnotation: (id: string, x: number, y: number) => void;
  readonly onResizeAnnotation: (id: string, width: number, height: number) => void;
  readonly onRemoveAnnotation: (id: string) => void;
  readonly onStepPage: (delta: -1 | 1) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onZoomChange: (delta: number) => void;
  readonly onResetZoom: () => void;
}

interface InteractionState {
  readonly mode: "move" | "resize";
  readonly id: string;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly initialX: number;
  readonly initialY: number;
  readonly initialWidth: number;
  readonly initialHeight: number;
  readonly currentX: number;
  readonly currentY: number;
  readonly currentWidth: number;
  readonly currentHeight: number;
}

export function DocumentCanvas({
  page,
  pageNumber,
  totalPages,
  annotations,
  selectedAnnotationId,
  sourceBytes,
  renderer,
  zoom,
  canUndoAction,
  canRedoAction,
  onSelectAnnotation,
  onMoveAnnotation,
  onResizeAnnotation,
  onRemoveAnnotation,
  onStepPage,
  onUndo,
  onRedo,
  onZoomChange,
  onResetZoom,
}: DocumentCanvasProps) {
  const stageRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [stageFitWidth, setStageFitWidth] = useState<number>(560);
  const [interaction, setInteraction] = useState<InteractionState | null>(null);

  // Dynamically measure available stage width so mobile (390px) fits 100% cleanly without horizontal clipping
  useEffect(() => {
    const stageEl = stageRef.current;
    if (!stageEl) return;

    const computeFitWidth = () => {
      const clientW = stageEl.clientWidth;
      if (clientW <= 0) return;
      const horizontalPad = clientW <= 768 ? 24 : 64;
      const available = Math.max(240, clientW - horizontalPad);
      setStageFitWidth(Math.min(580, available));
    };

    computeFitWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", computeFitWidth);
      return () => window.removeEventListener("resize", computeFitWidth);
    }

    const observer = new ResizeObserver(() => computeFitWidth());
    observer.observe(stageEl);
    return () => observer.disconnect();
  }, []);

  const effectiveSize = getEffectivePageSize(page);
  const aspectRatio = effectiveSize.heightPt / Math.max(1, effectiveSize.widthPt);
  const displayWidthPx = Math.round(stageFitWidth * zoom);
  const displayHeightPx = Math.round(displayWidthPx * aspectRatio);
  const pdfScaleRatio = displayWidthPx / Math.max(1, effectiveSize.widthPt);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceBytes) return;

    let cancelled = false;
    renderer
      .renderPageToCanvas(
        sourceBytes,
        page.sourcePageIndex,
        canvas,
        displayWidthPx,
        page.rotation,
      )
      .catch(() => {
        if (!cancelled) {
          // Ignore superseded renders when flipping pages or zooming rapidly
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    page.sourceDocId,
    page.sourcePageIndex,
    page.rotation,
    displayWidthPx,
    sourceBytes,
    renderer,
  ]);

  const startMove = (
    event: PointerEvent<HTMLDivElement>,
    ann: PageAnnotation,
  ) => {
    event.stopPropagation();
    onSelectAnnotation(ann.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({
      mode: "move",
      id: ann.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: ann.x,
      initialY: ann.y,
      initialWidth: ann.width,
      initialHeight: ann.height,
      currentX: ann.x,
      currentY: ann.y,
      currentWidth: ann.width,
      currentHeight: ann.height,
    });
  };

  const startResize = (
    event: PointerEvent<HTMLButtonElement>,
    ann: PageAnnotation,
  ) => {
    event.stopPropagation();
    onSelectAnnotation(ann.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setInteraction({
      mode: "resize",
      id: ann.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: ann.x,
      initialY: ann.y,
      initialWidth: ann.width,
      initialHeight: ann.height,
      currentX: ann.x,
      currentY: ann.y,
      currentWidth: ann.width,
      currentHeight: ann.height,
    });
  };

  const handlePointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!interaction || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = (event.clientX - interaction.startClientX) / Math.max(1, rect.width);
    const dy = (event.clientY - interaction.startClientY) / Math.max(1, rect.height);

    if (interaction.mode === "move") {
      setInteraction({
        ...interaction,
        currentX: Math.min(
          1 - interaction.initialWidth,
          Math.max(0.01, interaction.initialX + dx),
        ),
        currentY: Math.min(
          1 - interaction.initialHeight,
          Math.max(0.01, interaction.initialY + dy),
        ),
      });
    } else {
      setInteraction({
        ...interaction,
        currentWidth: Math.min(
          0.9 - interaction.initialX,
          Math.max(0.08, interaction.initialWidth + dx),
        ),
        currentHeight: Math.min(
          0.45,
          Math.max(0.04, interaction.initialHeight + dy),
        ),
      });
    }
  };

  const endInteraction = () => {
    if (!interaction) return;
    if (interaction.mode === "move") {
      if (
        Math.abs(interaction.currentX - interaction.initialX) > 0.002 ||
        Math.abs(interaction.currentY - interaction.initialY) > 0.002
      ) {
        onMoveAnnotation(
          interaction.id,
          interaction.currentX,
          interaction.currentY,
        );
      }
    } else if (
      Math.abs(interaction.currentWidth - interaction.initialWidth) > 0.004 ||
      Math.abs(interaction.currentHeight - interaction.initialHeight) > 0.004
    ) {
      onResizeAnnotation(
        interaction.id,
        interaction.currentWidth,
        interaction.currentHeight,
      );
    }
    setInteraction(null);
  };

  return (
    <section
      ref={stageRef}
      className="pc-stage"
      aria-label="Mesa de edición del documento PDF"
      onClick={() => onSelectAnnotation(null)}
    >
      <div className="pc-stage-canvas-wrap">
        <div
          ref={frameRef}
          className="pc-sheet-frame"
          style={{
            width: `${displayWidthPx}px`,
            height: `${displayHeightPx}px`,
          }}
        >
          <canvas ref={canvasRef} className="pc-sheet-canvas" />

          {annotations.map((ann) => {
            const isInteracting = interaction?.id === ann.id;
            const leftPct = (isInteracting ? interaction.currentX : ann.x) * 100;
            const topPct = (isInteracting ? interaction.currentY : ann.y) * 100;
            const widthPct =
              (isInteracting ? interaction.currentWidth : ann.width) * 100;
            const heightPct =
              (isInteracting ? interaction.currentHeight : ann.height) * 100;
            const isSelected = selectedAnnotationId === ann.id;

            return (
              <div
                key={ann.id}
                className="pc-overlay-item"
                data-selected={isSelected}
                data-kind={ann.kind}
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: ann.kind === "signature" ? `${widthPct}%` : "auto",
                  minWidth: ann.kind === "text" ? `${widthPct}%` : undefined,
                  height: ann.kind === "signature" ? `${heightPct}%` : "auto",
                }}
                onPointerDown={(e) => startMove(e, ann)}
                onPointerMove={handlePointerMove}
                onPointerUp={endInteraction}
                onPointerCancel={endInteraction}
                onClick={(e) => e.stopPropagation()}
              >
                {ann.kind === "signature" ? (
                  <svg
                    viewBox="0 0 100 100"
                    preserveAspectRatio="none"
                    width="100%"
                    height="100%"
                  >
                    {ann.paths.map((stroke, sIdx) => {
                      const d = stroke
                        .map(
                          (pt, pIdx) =>
                            `${pIdx === 0 ? "M" : "L"}${(pt.x * 100).toFixed(2)} ${(pt.y * 100).toFixed(2)}`,
                        )
                        .join(" ");
                      return (
                        <path
                          key={sIdx}
                          d={d}
                          fill="none"
                          stroke={ann.inkColor}
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          vectorEffect="non-scaling-stroke"
                        />
                      );
                    })}
                  </svg>
                ) : (
                  <div
                    className="pc-overlay-text"
                    style={{
                      color: ann.inkColor,
                      fontSize: `${Math.max(10, Math.round(ann.fontSizePt * pdfScaleRatio))}px`,
                    }}
                  >
                    {ann.text}
                  </div>
                )}

                {isSelected ? (
                  <>
                    <button
                      type="button"
                      className="pc-overlay-remove"
                      aria-label="Quitar elemento de la página"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveAnnotation(ann.id);
                      }}
                    >
                      <CloseIcon width={12} height={12} />
                    </button>

                    {ann.kind === "signature" ? (
                      <button
                        type="button"
                        className="pc-overlay-resize"
                        title="Arrastra para cambiar el tamaño de la firma"
                        aria-label="Redimensionar firma"
                        onPointerDown={(e) => startResize(e, ann)}
                        onPointerMove={handlePointerMove}
                        onPointerUp={endInteraction}
                        onPointerCancel={endInteraction}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : null}
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div
        className="pc-floating-pill"
        role="toolbar"
        aria-label="Controles de historial, zoom y páginas"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="pc-pill-btn"
          disabled={!canUndoAction}
          title="Deshacer (Ctrl+Z)"
          aria-label="Deshacer"
          onClick={onUndo}
        >
          <UndoIcon />
        </button>
        <button
          type="button"
          className="pc-pill-btn"
          disabled={!canRedoAction}
          title="Rehacer (Ctrl+Y)"
          aria-label="Rehacer"
          onClick={onRedo}
        >
          <RedoIcon />
        </button>

        <span className="pc-pill-divider" aria-hidden="true" />

        <button
          type="button"
          className="pc-pill-btn"
          disabled={zoom <= 0.65}
          aria-label="Alejar página"
          onClick={() => onZoomChange(-0.15)}
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          className="pc-pill-zoom-reset"
          title="Restablecer zoom al 100%"
          onClick={onResetZoom}
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          className="pc-pill-btn"
          disabled={zoom >= 1.55}
          aria-label="Acercar página"
          onClick={() => onZoomChange(0.15)}
        >
          <PlusIcon />
        </button>

        <span className="pc-pill-divider" aria-hidden="true" />

        <button
          type="button"
          className="pc-pill-btn"
          disabled={pageNumber <= 1}
          title="Página anterior (Flecha izquierda)"
          aria-label="Página anterior"
          onClick={() => onStepPage(-1)}
        >
          <ChevronLeftIcon />
        </button>
        <span className="pc-pill-mono">
          {pageNumber} / {totalPages}
        </span>
        <button
          type="button"
          className="pc-pill-btn"
          disabled={pageNumber >= totalPages}
          title="Página siguiente (Flecha derecha)"
          aria-label="Página siguiente"
          onClick={() => onStepPage(1)}
        >
          <ChevronRightIcon />
        </button>
      </div>
    </section>
  );
}
