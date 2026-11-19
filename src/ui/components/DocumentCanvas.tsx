import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { PdfRenderPort } from "../../application/ports/PdfEnginePort";
import type { PageAnnotation } from "../../domain/entities/Annotation";
import { getEffectivePageSize, type PageItem } from "../../domain/entities/PageItem";
import { CloseIcon, MinusIcon, PlusIcon, RedoIcon, UndoIcon } from "./Icons";

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
  readonly onRemoveAnnotation: (id: string) => void;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
  readonly onZoomChange: (delta: number) => void;
}

interface DragState {
  readonly id: string;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly initialX: number;
  readonly initialY: number;
  readonly currentX: number;
  readonly currentY: number;
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
  onRemoveAnnotation,
  onUndo,
  onRedo,
  onZoomChange,
}: DocumentCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);

  const effectiveSize = getEffectivePageSize(page);
  const baseWidthPx = Math.round(560 * zoom);
  const aspectRatio = effectiveSize.heightPt / Math.max(1, effectiveSize.widthPt);
  const displayWidthPx = baseWidthPx;
  const displayHeightPx = Math.round(baseWidthPx * aspectRatio);

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
          // Ignore superseded renders when flipping pages quickly
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

  const startDrag = (
    event: PointerEvent<HTMLDivElement>,
    ann: PageAnnotation,
  ) => {
    event.stopPropagation();
    onSelectAnnotation(ann.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragState({
      id: ann.id,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialX: ann.x,
      initialY: ann.y,
      currentX: ann.x,
      currentY: ann.y,
    });
  };

  const handleDragMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!dragState || !frameRef.current) return;
    const rect = frameRef.current.getBoundingClientRect();
    const dx = (event.clientX - dragState.startClientX) / Math.max(1, rect.width);
    const dy = (event.clientY - dragState.startClientY) / Math.max(1, rect.height);
    setDragState({
      ...dragState,
      currentX: Math.min(0.92, Math.max(0.01, dragState.initialX + dx)),
      currentY: Math.min(0.92, Math.max(0.01, dragState.initialY + dy)),
    });
  };

  const endDrag = () => {
    if (!dragState) return;
    if (
      Math.abs(dragState.currentX - dragState.initialX) > 0.002 ||
      Math.abs(dragState.currentY - dragState.initialY) > 0.002
    ) {
      onMoveAnnotation(dragState.id, dragState.currentX, dragState.currentY);
    }
    setDragState(null);
  };

  return (
    <section
      className="pc-stage"
      aria-label="Mesa de edición del documento PDF"
      onClick={() => onSelectAnnotation(null)}
    >
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
          const isBeingDragged = dragState?.id === ann.id;
          const leftPct = (isBeingDragged ? dragState.currentX : ann.x) * 100;
          const topPct = (isBeingDragged ? dragState.currentY : ann.y) * 100;
          const isSelected = selectedAnnotationId === ann.id;

          return (
            <div
              key={ann.id}
              className="pc-overlay-item"
              data-selected={isSelected}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${ann.width * 100}%`,
                height: `${ann.height * 100}%`,
              }}
              onPointerDown={(e) => startDrag(e, ann)}
              onPointerMove={handleDragMove}
              onPointerUp={endDrag}
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
                  style={{
                    color: ann.inkColor,
                    fontSize: `${Math.round(ann.fontSizePt * zoom)}px`,
                    fontWeight: 600,
                    lineHeight: 1.2,
                    padding: "2px 4px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {ann.text}
                </div>
              )}

              {isSelected ? (
                <button
                  type="button"
                  className="pc-overlay-remove"
                  aria-label="Quitar anotación de la página"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAnnotation(ann.id);
                  }}
                >
                  <CloseIcon />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div
        className="pc-floating-pill"
        role="toolbar"
        aria-label="Controles de historial y zoom"
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
        <span className="pc-pill-mono">{Math.round(zoom * 100)}%</span>
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

        <span className="pc-pill-mono">
          Pág. {pageNumber} / {totalPages}
        </span>
      </div>
    </section>
  );
}
