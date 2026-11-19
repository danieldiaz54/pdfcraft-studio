import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import {
  BrandDocIcon,
  OrganizeIcon,
  PenSignIcon,
  ShieldIcon,
  WelcomeSheetsIllustration,
} from "./Icons";

interface EmptyDropzoneProps {
  readonly isBusy: boolean;
  readonly savedDraftTitle: string | null;
  readonly onOpenFiles: (files: FileList) => void;
  readonly onLoadSample: () => void;
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
    <div className="pc-app">
      <header className="pc-topbar">
        <div className="pc-brand-group">
          <div className="pc-brand-btn" aria-label="PdfCraft">
            <span className="pc-brand-mark">
              <BrandDocIcon />
            </span>
            <span className="pc-brand-title">PdfCraft</span>
          </div>
        </div>

        <div className="pc-actions-group">
          <span className="pc-local-pill">
            <span className="pc-local-dot" />
            100% local
          </span>
          <button
            type="button"
            className="pc-btn-secondary"
            onClick={onOpenArchitecture}
          >
            Arquitectura
          </button>
        </div>
      </header>

      <main className="pc-welcome-main">
        <div
          className="pc-dropzone-card"
          data-dragging={isDragging}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="pc-welcome-illustration">
            <WelcomeSheetsIllustration />
          </div>

          <h1 className="pc-welcome-h1">
            Edita, ordena y firma tus PDF sin subirlos a ningún servidor
          </h1>
          <p className="pc-welcome-sub">
            Tus archivos permanecen en tu dispositivo en todo momento.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            className="sr-only"
            aria-label="Seleccionar archivos PDF"
            onChange={handleFileChange}
          />

          <div className="pc-welcome-cta-row">
            <button
              type="button"
              className="pc-btn-primary"
              disabled={isBusy}
              onClick={() => inputRef.current?.click()}
            >
              Seleccionar archivos PDF
            </button>
            <button
              type="button"
              className="pc-btn-secondary"
              disabled={isBusy}
              onClick={onLoadSample}
            >
              {isBusy
                ? "Cargando documento..."
                : "Probar con contrato de ejemplo (4 págs)"}
            </button>
          </div>

          {savedDraftTitle ? (
            <div className="pc-resume-banner">
              <span>Borrador privado encontrado: {savedDraftTitle}</span>
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
          ) : null}
        </div>

        <div className="pc-utility-strip" aria-label="Capacidades principales">
          <span className="pc-utility-item">
            <OrganizeIcon />
            Reordenar y unir páginas
          </span>
          <span className="pc-utility-item">
            <PenSignIcon />
            Firmar y anotar
          </span>
          <span className="pc-utility-item">
            <ShieldIcon />
            0 KB enviados a la red
          </span>
        </div>
      </main>
    </div>
  );
}
