import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent } from "react";
import type {
  InkColor,
  SignaturePoint,
  TextFontSizePt,
} from "../../domain/entities/Annotation";
import { formatBytesLabel, type SourcePdfMeta } from "../../domain/entities/DocumentSession";
import { formatPageDimensionsMm, type PageItem } from "../../domain/entities/PageItem";
import { PlusIcon, RotateCcwIcon, RotateCwIcon, TrashIcon } from "./Icons";
import type { WorkbenchTool } from "./TopChrome";

interface ContextualInspectorProps {
  readonly activeTool: WorkbenchTool;
  readonly activePage: PageItem;
  readonly pageIndex: number;
  readonly totalPages: number;
  readonly sources: ReadonlyArray<SourcePdfMeta>;
  readonly onPlaceSignature: (
    paths: ReadonlyArray<ReadonlyArray<SignaturePoint>>,
    inkColor: InkColor,
  ) => void;
  readonly onPlaceText: (
    text: string,
    fontSizePt: TextFontSizePt,
    inkColor: InkColor,
  ) => void;
  readonly onMovePage: (delta: -1 | 1) => void;
  readonly onDuplicatePage: () => void;
  readonly onDeletePage: () => void;
  readonly onRotateActivePage: (delta: 90 | -90) => void;
  readonly onRotateAllPages: () => void;
  readonly onResetRotations: () => void;
  readonly onAppendFiles: (files: FileList) => void;
}

const INK_OPTIONS: ReadonlyArray<{ readonly hex: InkColor; readonly label: string }> = [
  { hex: "#111827", label: "Tinta negra" },
  { hex: "#1D4ED8", label: "Tinta cobalto" },
];

export function ContextualInspector({
  activeTool,
  activePage,
  pageIndex,
  totalPages,
  sources,
  onPlaceSignature,
  onPlaceText,
  onMovePage,
  onDuplicatePage,
  onDeletePage,
  onRotateActivePage,
  onRotateAllPages,
  onResetRotations,
  onAppendFiles,
}: ContextualInspectorProps) {
  const sigCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [paths, setPaths] = useState<SignaturePoint[][]>([]);
  const [drawing, setDrawing] = useState(false);
  const [inkColor, setInkColor] = useState<InkColor>("#1D4ED8");

  const [noteText, setNoteText] = useState("Aprobado · Daniel Díaz");
  const [fontSizePt, setFontSizePt] = useState<TextFontSizePt>(16);

  const mergeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of paths) {
      if (stroke.length < 2) continue;
      ctx.beginPath();
      const first = stroke[0];
      if (!first) continue;
      ctx.moveTo(first.x * canvas.width, first.y * canvas.height);
      for (let i = 1; i < stroke.length; i += 1) {
        const pt = stroke[i];
        if (pt) {
          ctx.lineTo(pt.x * canvas.width, pt.y * canvas.height);
        }
      }
      ctx.stroke();
    }
  }, [paths, inkColor]);

  const toNormalizedSigPoint = (
    event: PointerEvent<HTMLCanvasElement>,
  ): SignaturePoint => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.min(0.98, Math.max(0.02, (event.clientX - rect.left) / Math.max(1, rect.width))),
      y: Math.min(0.96, Math.max(0.04, (event.clientY - rect.top) / Math.max(1, rect.height))),
    };
  };

  const handleSigDown = (event: PointerEvent<HTMLCanvasElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    const pt = toNormalizedSigPoint(event);
    setDrawing(true);
    setPaths((prev) => [...prev, [pt]]);
  };

  const handleSigMove = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drawing) return;
    const pt = toNormalizedSigPoint(event);
    setPaths((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1] ?? [];
      return [...prev.slice(0, -1), [...last, pt]];
    });
  };

  const handleSigUp = () => {
    setDrawing(false);
  };

  const insertSignatureSampleIfEmpty = () => {
    onPlaceSignature(paths, inkColor);
    setPaths([]);
  };

  const handleMergeInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      onAppendFiles(event.target.files);
    }
    event.target.value = "";
  };

  if (activeTool === "sign") {
    return (
      <aside className="pc-inspector" aria-label="Panel de firma manuscrita">
        <div>
          <h2 className="pc-inspector-title">Firma manuscrita</h2>
          <p className="pc-inspector-desc">
            Dibuja dentro del recuadro y luego muévela libremente sobre la hoja.
          </p>

          <div className="pc-sig-pad-wrap">
            <div className="pc-sig-pad-baseline" aria-hidden="true" />
            <canvas
              ref={sigCanvasRef}
              width={260}
              height={136}
              className="pc-sig-canvas"
              aria-label="Lienzo para dibujar firma manuscrita"
              onPointerDown={handleSigDown}
              onPointerMove={handleSigMove}
              onPointerUp={handleSigUp}
              onPointerCancel={handleSigUp}
            />
          </div>

          <div className="pc-swatch-row" role="radiogroup" aria-label="Color de tinta">
            {INK_OPTIONS.map((opt) => (
              <button
                key={opt.hex}
                type="button"
                className="pc-swatch-btn"
                data-selected={inkColor === opt.hex}
                aria-label={opt.label}
                aria-pressed={inkColor === opt.hex}
                onClick={() => setInkColor(opt.hex)}
              >
                <span className="pc-swatch-dot" style={{ backgroundColor: opt.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="pc-inspector-footer">
          <button
            type="button"
            className="pc-btn-secondary"
            onClick={() => setPaths([])}
          >
            Limpiar
          </button>
          <button
            type="button"
            className="pc-btn-primary"
            disabled={paths.length === 0}
            onClick={insertSignatureSampleIfEmpty}
          >
            Insertar en página
          </button>
        </div>
      </aside>
    );
  }

  if (activeTool === "text") {
    const todayFormatted = new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
    }).format(new Date());

    return (
      <aside className="pc-inspector" aria-label="Panel de texto">
        <div>
          <h2 className="pc-inspector-title">Texto y fecha</h2>
          <p className="pc-inspector-desc">
            Agrega aclaraciones, iniciales o fechas sobre la página activa.
          </p>

          <label htmlFor="pc-text-note-input" className="pc-field-label">
            Contenido a insertar
          </label>
          <input
            id="pc-text-note-input"
            type="text"
            className="pc-text-input"
            maxLength={140}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />

          <div className="pc-chip-row">
            <button
              type="button"
              className="pc-chip-btn"
              onClick={() => setNoteText(`Firmado el ${todayFormatted}`)}
            >
              Usar fecha de hoy
            </button>
            {([12, 16, 20] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                className="pc-chip-btn"
                data-active={fontSizePt === sz}
                onClick={() => setFontSizePt(sz)}
              >
                {sz} pt
              </button>
            ))}
          </div>

          <div className="pc-swatch-row" style={{ marginTop: "16px" }} role="radiogroup" aria-label="Color de texto">
            {INK_OPTIONS.map((opt) => (
              <button
                key={opt.hex}
                type="button"
                className="pc-swatch-btn"
                data-selected={inkColor === opt.hex}
                aria-label={opt.label}
                aria-pressed={inkColor === opt.hex}
                onClick={() => setInkColor(opt.hex)}
              >
                <span className="pc-swatch-dot" style={{ backgroundColor: opt.hex }} />
              </button>
            ))}
          </div>
        </div>

        <div className="pc-inspector-footer">
          <button
            type="button"
            className="pc-btn-primary"
            disabled={!noteText.trim()}
            onClick={() => onPlaceText(noteText, fontSizePt, inkColor)}
          >
            Insertar en página
          </button>
        </div>
      </aside>
    );
  }

  if (activeTool === "rotate") {
    return (
      <aside className="pc-inspector" aria-label="Panel de rotación">
        <div>
          <h2 className="pc-inspector-title">Rotar páginas</h2>
          <p className="pc-inspector-desc">
            Corrige hojas escaneadas al revés o en horizontal antes de descargar.
          </p>

          <div className="pc-meta-row">
            <span>Orientación actual</span>
            <span className="pc-meta-mono">{activePage.rotation}°</span>
          </div>

          <div className="pc-stack-actions">
            <button
              type="button"
              className="pc-btn-secondary"
              onClick={() => onRotateActivePage(90)}
            >
              <RotateCwIcon />
              <span>Girar 90° a la derecha</span>
            </button>
            <button
              type="button"
              className="pc-btn-secondary"
              onClick={() => onRotateActivePage(-90)}
            >
              <RotateCcwIcon />
              <span>Girar 90° a la izquierda</span>
            </button>
            <button
              type="button"
              className="pc-btn-secondary"
              onClick={onRotateAllPages}
            >
              <RotateCwIcon />
              <span>Rotar todo +90°</span>
            </button>
            <button
              type="button"
              className="pc-btn-secondary"
              onClick={onResetRotations}
            >
              <span>Restablecer 0°</span>
            </button>
          </div>
        </div>

        <div className="pc-meta-row" style={{ marginBottom: 0 }}>
          <span>Formato hoja</span>
          <span className="pc-meta-mono">{formatPageDimensionsMm(activePage)}</span>
        </div>
      </aside>
    );
  }

  if (activeTool === "merge") {
    return (
      <aside className="pc-inspector" aria-label="Panel para unir documentos PDF">
        <div>
          <h2 className="pc-inspector-title">Unir documentos</h2>
          <p className="pc-inspector-desc">
            Combina anexos o contratos adicionales al final del documento actual.
          </p>

          <input
            ref={mergeInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            aria-label="Seleccionar otro PDF para unir"
            onChange={handleMergeInput}
          />

          <button
            type="button"
            className="pc-btn-primary"
            style={{ width: "100%", marginBottom: "14px" }}
            onClick={() => mergeInputRef.current?.click()}
          >
            <PlusIcon />
            <span>Agregar otro PDF</span>
          </button>

          <ul className="pc-log-list">
            {sources.map((src) => (
              <li key={src.id} className="pc-log-item">
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {src.name}
                </span>
                <span className="pc-meta-mono">
                  {src.pageCount}p · {formatBytesLabel(src.byteLength)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pc-meta-row" style={{ marginBottom: 0 }}>
          <span>Total de páginas</span>
          <span className="pc-meta-mono">{totalPages} págs</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="pc-inspector" aria-label="Panel para organizar página">
      <div>
        <h2 className="pc-inspector-title">Organizar página</h2>
        <p className="pc-inspector-desc">
          Reordena la secuencia, duplica hojas o elimina páginas sobrantes.
        </p>

        <div className="pc-meta-row">
          <span>Tamaño de hoja</span>
          <span className="pc-meta-mono">{formatPageDimensionsMm(activePage)}</span>
        </div>

        <div className="pc-stack-actions">
          <button
            type="button"
            className="pc-btn-secondary"
            disabled={pageIndex === 0}
            onClick={() => onMovePage(-1)}
          >
            <span>Subir una posición</span>
          </button>
          <button
            type="button"
            className="pc-btn-secondary"
            disabled={pageIndex >= totalPages - 1}
            onClick={() => onMovePage(1)}
          >
            <span>Bajar una posición</span>
          </button>
          <button
            type="button"
            className="pc-btn-secondary"
            onClick={onDuplicatePage}
          >
            <span>Duplicar esta página</span>
          </button>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="pc-btn-danger-outline"
          disabled={totalPages <= 1}
          onClick={onDeletePage}
        >
          <TrashIcon />
          <span>Eliminar página</span>
        </button>
      </div>
    </aside>
  );
}
