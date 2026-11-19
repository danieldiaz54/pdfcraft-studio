import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { PdfRenderPort } from "../../application/ports/PdfEnginePort";
import type { PageItem } from "../../domain/entities/PageItem";
import { PlusIcon, RotateCwIcon, TrashIcon } from "./Icons";

interface ThumbnailTileProps {
  readonly page: PageItem;
  readonly index: number;
  readonly totalPages: number;
  readonly isActive: boolean;
  readonly sourceBytes: Uint8Array | undefined;
  readonly renderer: PdfRenderPort;
  readonly onSelect: () => void;
  readonly onRotate: () => void;
  readonly onDelete: () => void;
  readonly onDragStartIndex: (index: number) => void;
  readonly onDropOnIndex: (targetIndex: number) => void;
}

function ThumbnailTile({
  page,
  index,
  totalPages,
  isActive,
  sourceBytes,
  renderer,
  onSelect,
  onRotate,
  onDelete,
  onDragStartIndex,
  onDropOnIndex,
}: ThumbnailTileProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !sourceBytes) return;

    let cancelled = false;
    renderer
      .renderPageToCanvas(sourceBytes, page.sourcePageIndex, canvas, 120, page.rotation)
      .catch(() => {
        if (!cancelled) {
          // Ignore cancellation/unmount noise during fast reorders
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page.sourceDocId, page.sourcePageIndex, page.rotation, sourceBytes, renderer]);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    onDropOnIndex(index);
  };

  return (
    <div
      className="pc-thumb-item"
      draggable
      onDragStart={() => onDragStartIndex(index)}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        className="pc-thumb-card"
        data-active={isActive}
        role="button"
        tabIndex={0}
        aria-label={`Seleccionar página ${index + 1}`}
        aria-current={isActive ? "page" : undefined}
        onClick={onSelect}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      >
        <canvas ref={canvasRef} className="pc-thumb-canvas" />

        <div className="pc-thumb-actions">
          <button
            type="button"
            className="pc-mini-icon-btn"
            title={`Rotar página ${index + 1}`}
            aria-label={`Rotar página ${index + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              onRotate();
            }}
          >
            <RotateCwIcon width={12} height={12} />
          </button>
          <button
            type="button"
            className="pc-mini-icon-btn"
            title={`Eliminar página ${index + 1}`}
            aria-label={`Eliminar página ${index + 1}`}
            disabled={totalPages <= 1}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <TrashIcon width={12} height={12} />
          </button>
        </div>
      </div>

      <span className="pc-thumb-num">{index + 1}</span>
    </div>
  );
}

interface ThumbnailRailProps {
  readonly pages: ReadonlyArray<PageItem>;
  readonly activePageId: string | null;
  readonly sourceBuffers: ReadonlyMap<string, Uint8Array>;
  readonly renderer: PdfRenderPort;
  readonly onSelectPage: (pageId: string) => void;
  readonly onReorderPages: (fromIndex: number, toIndex: number) => void;
  readonly onRotatePage: (pageId: string) => void;
  readonly onDeletePage: (pageId: string) => void;
  readonly onAppendPdfFiles: (files: FileList) => void;
}

export function ThumbnailRail({
  pages,
  activePageId,
  sourceBuffers,
  renderer,
  onSelectPage,
  onReorderPages,
  onRotatePage,
  onDeletePage,
  onAppendPdfFiles,
}: ThumbnailRailProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const addInputRef = useRef<HTMLInputElement | null>(null);

  const handleDropOnIndex = (targetIndex: number) => {
    if (draggedIndex !== null && draggedIndex !== targetIndex) {
      onReorderPages(draggedIndex, targetIndex);
    }
    setDraggedIndex(null);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAppendPdfFiles(event.target.files);
    }
    event.target.value = "";
  };

  return (
    <aside className="pc-rail" aria-label="Miniaturas de páginas">
      <div className="pc-rail-list">
        {pages.map((page, index) => (
          <ThumbnailTile
            key={page.id}
            page={page}
            index={index}
            totalPages={pages.length}
            isActive={page.id === activePageId}
            sourceBytes={sourceBuffers.get(page.sourceDocId)}
            renderer={renderer}
            onSelect={() => onSelectPage(page.id)}
            onRotate={() => onRotatePage(page.id)}
            onDelete={() => onDeletePage(page.id)}
            onDragStartIndex={setDraggedIndex}
            onDropOnIndex={handleDropOnIndex}
          />
        ))}
      </div>

      <div className="pc-rail-footer">
        <input
          ref={addInputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="sr-only"
          aria-label="Agregar archivo PDF"
          onChange={handleFileInput}
        />
        <button
          type="button"
          className="pc-btn-secondary"
          onClick={() => addInputRef.current?.click()}
        >
          <PlusIcon />
          <span>Agregar PDF</span>
        </button>
      </div>
    </aside>
  );
}
