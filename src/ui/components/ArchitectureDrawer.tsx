import { useEffect } from "react";
import type { EditLogEntry } from "../../domain/commands/EditCommandStack";
import { CloseIcon, ShieldIcon } from "./Icons";

interface ArchitectureDrawerProps {
  readonly isOpen: boolean;
  readonly commandLog: ReadonlyArray<EditLogEntry>;
  readonly pageCount: number;
  readonly annotationCount: number;
  readonly onClose: () => void;
}

export function ArchitectureDrawer({
  isOpen,
  commandLog,
  pageCount,
  annotationCount,
  onClose,
}: ArchitectureDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="pc-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pc-arch-drawer-title"
      onClick={onClose}
    >
      <div className="pc-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pc-drawer-header">
          <h2 id="pc-arch-drawer-title" className="pc-inspector-title" style={{ margin: 0 }}>
            Arquitectura Hexagonal Local-First
          </h2>
          <button
            type="button"
            className="pc-pill-btn"
            aria-label="Cerrar panel de arquitectura"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="pc-drawer-body">
          <div className="pc-arch-box" style={{ backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }}>
            <h3 style={{ display: "flex", alignItems: "center", gap: "8px", color: "#15803D" }}>
              <ShieldIcon />
              Aislamiento de privacidad verificado
            </h3>
            <p style={{ color: "#166534" }}>
              Datos enviados a servidores externos:{" "}
              <strong className="pc-meta-mono" style={{ color: "#15803D" }}>0 KB</strong>. Todo el
              análisis binario, firma vectorial y exportación ocurre en la memoria de tu navegador.
            </p>
          </div>

          <div className="pc-arch-box">
            <h3>1. Núcleo de Dominio Puro (src/domain)</h3>
            <p>
              Modelos inmutables (DocumentSession, PageItem, Annotation) y pila Undo/Redo sin
              dependencias de React, DOM ni librerías PDF. Estado actual:{" "}
              <span className="pc-meta-mono">
                {pageCount} págs · {annotationCount} anotaciones
              </span>
              .
            </p>
          </div>

          <div className="pc-arch-box">
            <h3>2. Puertos y Adaptadores (src/application · infrastructure)</h3>
            <p>
              PdfEnginePort conecta con <strong>pdf-lib</strong> (edición y firma vectorial) y{" "}
              <strong>pdfjs-dist</strong> (worker local empaquetado). DraftStorePort persiste
              borradores privados en <strong>IndexedDB</strong>.
            </p>
          </div>

          <div>
            <h3 className="pc-inspector-title" style={{ fontSize: "14px", marginBottom: "8px" }}>
              Historial de Comandos (Undo / Redo)
            </h3>
            {commandLog.length === 0 ? (
              <p className="pc-inspector-desc" style={{ marginBottom: 0 }}>
                Carga o edita un documento para observar las instantáneas inmutables en memoria.
              </p>
            ) : (
              <ul className="pc-log-list">
                {commandLog.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="pc-log-item">
                    <span>{entry.label}</span>
                    <span className="pc-meta-mono" style={{ color: "#64748b" }}>
                      {entry.timestampIso.slice(11, 19)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <a
            href="https://github.com/danieldiaz54/pdfcraft-studio"
            target="_blank"
            rel="noreferrer"
            className="pc-btn-secondary"
            style={{ textDecoration: "none" }}
          >
            Ver código fuente y ADRs en GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
