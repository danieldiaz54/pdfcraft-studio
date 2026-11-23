import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { SamplePreset } from "../hooks/usePdfWorkbench";
import {
  BrandDocIcon,
  OrganizeIcon,
  PenSignIcon,
  RotateCwIcon,
  ShieldIcon,
  UploadDocIcon,
} from "./Icons";

interface EmptyDropzoneProps {
  readonly isBusy: boolean;
  readonly savedDraftTitle: string | null;
  readonly onOpenFiles: (files: FileList) => void;
  readonly onLoadSample: (preset: SamplePreset) => void;
  readonly onResumeDraft: () => void;
  readonly onDiscardDraft: () => void;
  readonly onOpenArchitecture: () => void;
}

export function EmptyDropzone({
  isBusy,
  savedDraftTitle,
  onOpenFiles,
  onLoadSample,
  onResumeDraft,
  onDiscardDraft,
  onOpenArchitecture,
}: EmptyDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
      onOpenFiles(event.dataTransfer.files);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onOpenFiles(files);
    }
    event.target.value = "";
  };

  return (
    <div className="pc-app pc-app-welcome">
      <header className="pc-topbar">
        <div className="pc-brand-group">
          <div className="pc-brand-btn pc-brand-static" aria-label="PdfCraft">
            <span className="pc-brand-mark">
              <BrandDocIcon />
            </span>
            <span className="pc-brand-title">PdfCraft</span>
          </div>
        </div>

        <div className="pc-actions-group">
          <button
            type="button"
            className="pc-local-trigger"
            onClick={onOpenArchitecture}
            title="Ver cómo se procesa todo localmente sin servidor"
          >
            <span className="pc-local-dot" aria-hidden="true" />
            <span>100% local</span>
            <span className="pc-local-sep" aria-hidden="true" />
            <span className="pc-local-how">Cómo funciona</span>
          </button>
        </div>
      </header>

      <main className="pc-welcome-main">
        <div className="pc-welcome-shell">
          <div className="pc-welcome-grid">
            <div className="pc-welcome-copy">
              <h1 className="pc-welcome-h1">
                Edita, ordena y firma tus PDF sin subirlos a ningún servidor.
              </h1>
              <p className="pc-welcome-sub">
                Abre contratos, facturas o escaneos directo en tu navegador. Reordena
                hojas, corrige páginas giradas y estampa tu firma manuscrita sin que
                tus documentos salgan de tu equipo.
              </p>

              <div
                className="pc-dropzone-card"
                data-dragging={isDragging}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  multiple
                  className="sr-only"
                  aria-label="Seleccionar archivos PDF"
                  onChange={handleFileChange}
                />

                <div className="pc-dropzone-primary-row">
                  <button
                    type="button"
                    className="pc-btn-primary pc-btn-lg"
                    disabled={isBusy}
                    onClick={() => inputRef.current?.click()}
                  >
                    <UploadDocIcon />
                    <span>Seleccionar archivos PDF</span>
                  </button>
                  <span className="pc-dropzone-hint">
                    o suelta aquí uno o varios PDF <span className="pc-meta-mono">(máx. 25 MB)</span>
                  </span>
                </div>

                <div className="pc-preset-divider">
                  <span>Prueba inmediata con un documento de ejemplo</span>
                </div>

                <div className="pc-preset-row">
                  <button
                    type="button"
                    className="pc-preset-btn"
                    disabled={isBusy}
                    onClick={() => onLoadSample("sign")}
                  >
                    <PenSignIcon />
                    <span>
                      {isBusy ? "Abriendo..." : "Contrato listo para firmar"}
                    </span>
                    <span className="pc-preset-meta">4 págs</span>
                  </button>

                  <button
                    type="button"
                    className="pc-preset-btn"
                    disabled={isBusy}
                    onClick={() => onLoadSample("scan")}
                  >
                    <RotateCwIcon />
                    <span>Escaneo de lado para corregir</span>
                    <span className="pc-preset-meta">90°</span>
                  </button>
                </div>

                {savedDraftTitle ? (
                  <div className="pc-resume-banner">
                    <span>
                      Borrador guardado en este navegador:{" "}
                      <strong>{savedDraftTitle}</strong>
                    </span>
                    <div className="pc-resume-actions">
                      <button
                        type="button"
                        className="pc-resume-link"
                        onClick={onResumeDraft}
                      >
                        Continuar edición
                      </button>
                      <button
                        type="button"
                        className="pc-resume-discard"
                        onClick={onDiscardDraft}
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="pc-utility-strip" aria-label="Garantías del estudio">
                <span className="pc-utility-item">
                  <ShieldIcon />
                  <span>
                    <strong className="pc-meta-mono">0 KB</strong> enviados a internet
                  </span>
                </span>
                <span className="pc-utility-item">
                  <OrganizeIcon />
                  <span>Unir, rotar y reordenar hojas</span>
                </span>
                <span className="pc-utility-item">
                  <PenSignIcon />
                  <span>Firma vectorial y guardado privado</span>
                </span>
              </div>
            </div>

            <div className="pc-specimen-col">
              <button
                type="button"
                className="pc-specimen-stage"
                disabled={isBusy}
                onClick={() => onLoadSample("sign")}
                aria-label="Abrir contrato de ejemplo en la mesa de edición"
              >
                <span className="pc-crop-mark" data-pos="tl" aria-hidden="true" />
                <span className="pc-crop-mark" data-pos="tr" aria-hidden="true" />
                <span className="pc-crop-mark" data-pos="bl" aria-hidden="true" />
                <span className="pc-crop-mark" data-pos="br" aria-hidden="true" />

                <div className="pc-specimen-rail" aria-hidden="true">
                  <span className="pc-specimen-thumb">1</span>
                  <span className="pc-specimen-thumb" data-active="true">
                    2
                  </span>
                  <span className="pc-specimen-thumb">3</span>
                  <span className="pc-specimen-thumb">4</span>
                </div>

                <div className="pc-specimen-sheet" aria-hidden="true">
                  <div className="pc-specimen-head">
                    <span>Contrato_Servicios_2026.pdf</span>
                    <span className="pc-meta-mono">A4 · 210×297 mm</span>
                  </div>

                  <div className="pc-specimen-doc-title">
                    Contrato de Prestación de Servicios
                  </div>
                  <div className="pc-specimen-lines">
                    <span style={{ width: "92%" }} />
                    <span style={{ width: "84%" }} />
                    <span style={{ width: "68%" }} />
                  </div>

                  <div className="pc-specimen-clause">TERCERA. FIRMA DE CONFORMIDAD</div>
                  <div className="pc-specimen-lines">
                    <span style={{ width: "88%" }} />
                    <span style={{ width: "74%" }} />
                  </div>

                  <div className="pc-specimen-sig-row">
                    <div className="pc-specimen-sig-box">
                      <svg
                        viewBox="0 0 180 54"
                        className="pc-specimen-sig-svg"
                        fill="none"
                      >
                        <path
                          className="pc-specimen-sig-path"
                          d="M14 40 C26 12, 42 10, 46 34 C49 44, 62 20, 76 26 C88 31, 98 14, 112 30 C123 41, 144 22, 166 25"
                          stroke="#1D4ED8"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      <span className="pc-specimen-sig-label">Firma del Prestador</span>
                    </div>

                    <div className="pc-specimen-sig-box" data-muted="true">
                      <div className="pc-specimen-date-tag">Firmado hoy</div>
                      <span className="pc-specimen-sig-label">Sello de fecha</span>
                    </div>
                  </div>
                </div>

                <span className="pc-specimen-cta">
                  Abrir ejemplo interactivo en 1 clic
                </span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
