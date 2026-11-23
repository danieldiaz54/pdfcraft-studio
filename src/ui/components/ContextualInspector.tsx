import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import type {
  InkColor,
  SignaturePoint,
  TextFontSizePt,
} from "../../domain/entities/Annotation";
import { formatBytesLabel, type SourcePdfMeta } from "../../domain/entities/DocumentSession";
import { formatPageDimensionsMm, type PageItem } from "../../domain/entities/PageItem";
import {
  ChevronDownIcon,
  PenSignIcon,
  PlusIcon,
  RotateCcwIcon,
  RotateCwIcon,
  TrashIcon,
} from "./Icons";
import type { WorkbenchTool } from "./TopChrome";

interface ContextualInspectorProps {
  readonly activeTool: WorkbenchTool;
  readonly mobileOpen: boolean;
  readonly activePage: PageItem;
  readonly pageIndex: number;
  readonly totalPages: number;
  readonly sources: ReadonlyArray<SourcePdfMeta>;
  readonly onCloseMobile: () => void;
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
  { hex: "#111827", label: "Negra" },
  { hex: "#1D4ED8", label: "Cobalto" },
];

const SAMPLE_SIGNATURE_PATHS: ReadonlyArray<ReadonlyArray<SignaturePoint>> = [
  [
    { x: 0.08, y: 0.72 },
    { x: 0.14, y: 0.24 },
    { x: 0.22, y: 0.18 },
    { x: 0.27, y: 0.64 },
    { x: 0.34, y: 0.42 },
    { x: 0.44, y: 0.48 },
    { x: 0.54, y: 0.22 },
    { x: 0.62, y: 0.58 },
    { x: 0.74, y: 0.36 },
    { x: 0.9, y: 0.41 },
  ],
  [
    { x: 0.18, y: 0.78 },
    { x: 0.78, y: 0.68 },
  ],
];

function InspectorShell({
  label,
  title,
  description,
  mobileOpen,
  onCloseMobile,
  footer,
  children,
}: {
  readonly label: string;
  readonly title: string;
  readonly description: string;
  readonly mobileOpen: boolean;
  readonly onCloseMobile: () => void;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <aside
      className="pc-inspector"
      data-mobile-open={mobileOpen}
      aria-label={label}
    >
      <div className="pc-inspector-main">
        <div className="pc-inspector-head-row">
          <h2 className="pc-inspector-title">{title}</h2>
          <button
            type="button"
            className="pc-mobile-collapse-btn"
            aria-label="Ocultar panel y ver hoja completa"
            onClick={onCloseMobile}
          >
            <span>Ver hoja</span>
            <ChevronDownIcon />
          </button>
        </div>
        <p className="pc-inspector-desc">{description}</p>
        {children}
      </div>
      {footer ? <div className="pc-inspector-footer">{footer}</div> : null}
    </aside>
  );
}

export function ContextualInspector({
  activeTool,
  mobileOpen,
  activePage,
  pageIndex,
  totalPages,
  sources,
  onCloseMobile,
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

  // HiDPI Retina-crisp signature canvas rendering
  useEffect(() => {
    const canvas = sigCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = canvas.clientWidth || 244;
    const cssHeight = canvas.clientHeight || 138;
    const targetW = Math.round(cssWidth * dpr);
    const targetH = Math.round(cssHeight * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);
    ctx.strokeStyle = inkColor;
    ctx.lineWidth = 2.4;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    for (const stroke of paths) {
      if (stroke.length < 2) continue;
      const first = stroke[0];
      if (!first) continue;
      ctx.beginPath();
      ctx.moveTo(first.x * cssWidth, first.y * cssHeight);
      for (let i = 1; i < stroke.length; i += 1) {
        const pt = stroke[i];
        if (pt) {
          ctx.lineTo(pt.x * cssWidth, pt.y * cssHeight);
        }
      }
      ctx.stroke();
    }
  }, [paths, inkColor, activeTool, mobileOpen]);

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

  const handleInsertDrawnSignature = () => {
    onPlaceSignature(paths, inkColor);
    setPaths([]);
  };

  const handleUseSampleSignature = () => {
    onPlaceSignature(SAMPLE_SIGNATURE_PATHS, inkColor);
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
      <InspectorShell
        label="Panel de firma manuscrita"
        title="Firma manuscrita"
        description="Traza tu firma y colócala donde quieras sobre la hoja activa."
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
        footer={
          <>
            <button
              type="button"
              className="pc-btn-secondary"
              disabled={paths.length === 0}
              onClick={() => setPaths([])}
            >
              Limpiar
            </button>
            <button
              type="button"
              className="pc-btn-primary"
              disabled={paths.length === 0}
              onClick={handleInsertDrawnSignature}
            >
              Insertar en página
            </button>
          </>
        }
      >
        <div className="pc-sig-pad-wrap">
          {paths.length === 0 ? (
            <span className="pc-sig-placeholder" aria-hidden="true">
              Traza tu firma aquí
            </span>
          ) : null}
          <div className="pc-sig-pad-baseline" aria-hidden="true" />
          <canvas
            ref={sigCanvasRef}
            width={244}
            height={138}
            className="pc-sig-canvas"
            aria-label="Lienzo para dibujar firma manuscrita"
            onPointerDown={handleSigDown}
            onPointerMove={handleSigMove}
            onPointerUp={handleSigUp}
            onPointerCancel={handleSigUp}
          />
        </div>

        <div className="pc-sig-controls-row">
          <div className="pc-swatch-row" role="radiogroup" aria-label="Color de tinta">
            {INK_OPTIONS.map((opt) => (
              <button
                key={opt.hex}
                type="button"
                className="pc-swatch-chip"
                data-selected={inkColor === opt.hex}
                aria-pressed={inkColor === opt.hex}
                onClick={() => setInkColor(opt.hex)}
              >
                <span className="pc-swatch-dot" style={{ backgroundColor: opt.hex }} />
                <span>{opt.label}</span>
              </button>
            ))}
          </div>

          <button
            type="button"
            className="pc-sample-sig-btn"
            onClick={handleUseSampleSignature}
          >
            <PenSignIcon width={13} height={13} />
            <span>Firma rápida</span>
          </button>
        </div>
      </InspectorShell>
    );
  }

  if (activeTool === "text") {
    const todayFormatted = new Intl.DateTimeFormat("es-ES", {
      dateStyle: "medium",
    }).format(new Date());

    return (
      <InspectorShell
        label="Panel de texto y fecha"
        title="Texto y fecha"
        description="Inserta aclaraciones, nombres o sellos de fecha en la página actual."
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
        footer={
          <button
            type="button"
            className="pc-btn-primary"
            disabled={!noteText.trim()}
            onClick={() => onPlaceText(noteText, fontSizePt, inkColor)}
          >
            Insertar en página
          </button>
        }
      >
        <label htmlFor="pc-text-note-input" className="pc-field-label">
          Texto a estampar
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
            Fecha de hoy
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

        <div
          className="pc-swatch-row pc-swatch-row-left"
          role="radiogroup"
          aria-label="Color de texto"
        >
          {INK_OPTIONS.map((opt) => (
            <button
              key={opt.hex}
              type="button"
              className="pc-swatch-chip"
              data-selected={inkColor === opt.hex}
              aria-pressed={inkColor === opt.hex}
              onClick={() => setInkColor(opt.hex)}
            >
              <span className="pc-swatch-dot" style={{ backgroundColor: opt.hex }} />
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      </InspectorShell>
    );
  }

  if (activeTool === "rotate") {
    return (
      <InspectorShell
        label="Panel de rotación"
        title="Rotar páginas"
        description="Endereza hojas escaneadas de lado o al revés antes de exportar."
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
        footer={
          <div className="pc-meta-row pc-meta-row-flush">
            <span>Formato hoja</span>
            <span className="pc-meta-mono">{formatPageDimensionsMm(activePage)}</span>
          </div>
        }
      >
        <div className="pc-meta-row">
          <span>Orientación actual</span>
          <span className="pc-meta-mono">{activePage.rotation}°</span>
        </div>

        <div className="pc-stack-actions">
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
            onClick={() => onRotateActivePage(90)}
          >
            <RotateCwIcon />
            <span>Girar 90° a la derecha</span>
          </button>
          <button
            type="button"
            className="pc-btn-secondary"
            onClick={onRotateAllPages}
          >
            <RotateCwIcon />
            <span>Rotar todo el documento +90°</span>
          </button>
          <button
            type="button"
            className="pc-btn-secondary"
            disabled={activePage.rotation === 0}
            onClick={onResetRotations}
          >
            <span>Restablecer todo a 0°</span>
          </button>
        </div>
      </InspectorShell>
    );
  }

  if (activeTool === "merge") {
    return (
      <InspectorShell
        label="Panel para unir documentos PDF"
        title="Unir documentos"
        description="Combina anexos o contratos adicionales al final de esta sesión."
        mobileOpen={mobileOpen}
        onCloseMobile={onCloseMobile}
        footer={
          <div className="pc-meta-row pc-meta-row-flush">
            <span>Total en sesión</span>
            <span className="pc-meta-mono">{totalPages} págs</span>
          </div>
        }
      >
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
          className="pc-btn-primary pc-btn-block"
          onClick={() => mergeInputRef.current?.click()}
        >
          <PlusIcon />
          <span>Agregar otro archivo PDF</span>
        </button>

        <ul className="pc-log-list pc-sources-list">
          {sources.map((src) => (
            <li key={src.id} className="pc-log-item">
              <span className="pc-truncate">{src.name}</span>
              <span className="pc-meta-mono">
                {src.pageCount}p · {formatBytesLabel(src.byteLength)}
              </span>
            </li>
          ))}
        </ul>
      </InspectorShell>
    );
  }

  return (
    <InspectorShell
      label="Panel para organizar página"
      title={`Página ${pageIndex + 1} de ${totalPages}`}
      description="Cambia el orden del documento, duplica esta hoja o quita páginas sobrantes."
      mobileOpen={mobileOpen}
      onCloseMobile={onCloseMobile}
      footer={
        <button
          type="button"
          className="pc-btn-danger-outline"
          disabled={totalPages <= 1}
          onClick={onDeletePage}
        >
          <TrashIcon />
          <span>Eliminar esta página</span>
        </button>
      }
    >
      <div className="pc-meta-row">
        <span>Dimensiones</span>
        <span className="pc-meta-mono">{formatPageDimensionsMm(activePage)}</span>
      </div>

      <div className="pc-stack-actions">
        <button
          type="button"
          className="pc-btn-secondary"
          disabled={pageIndex === 0}
          onClick={() => onMovePage(-1)}
        >
          <span>Mover antes (pág. {Math.max(1, pageIndex)})</span>
        </button>
        <button
          type="button"
          className="pc-btn-secondary"
          disabled={pageIndex >= totalPages - 1}
          onClick={() => onMovePage(1)}
        >
          <span>Mover después (pág. {Math.min(totalPages, pageIndex + 2)})</span>
        </button>
        <button
          type="button"
          className="pc-btn-secondary"
          onClick={onDuplicatePage}
        >
          <span>Duplicar esta página</span>
        </button>
      </div>
    </InspectorShell>
  );
}
