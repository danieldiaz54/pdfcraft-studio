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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
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
          <div>
            <h2 id="pc-arch-drawer-title" className="pc-inspector-title">
              Cómo funciona por dentro
            </h2>
            <p className="pc-drawer-sub">
              Arquitectura Hexagonal Local-First · Cero servidores
            </p>
          </div>
          <button
            type="button"
            className="pc-pill-btn"
            aria-label="Cerrar panel informativo"
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="pc-drawer-body">
          <div className="pc-arch-box pc-arch-box-verified">
            <h3 className="pc-arch-verified-title">
              <ShieldIcon />
              <span>Privacidad verificable en red</span>
            </h3>
            <p className="pc-arch-verified-copy">
              Tráfico enviado a servidores externos:{" "}
              <strong className="pc-meta-mono">0 KB</strong>. La lectura de páginas, el
              trazo de firma vectorial y la compilación del PDF final ocurren
              íntegramente en la memoria local de tu navegador.
            </p>
          </div>

          <div className="pc-arch-box">
            <h3>Núcleo de dominio puro (src/domain)</h3>
            <p>
              Entidades inmutables (<code>DocumentSession</code>, <code>PageItem</code>,{" "}
              <code>Annotation</code>) y pila <code>EditCommandStack</code> sin
              dependencias de React, DOM ni librerías PDF. Sesión activa:{" "}
              <span className="pc-meta-mono">
                {pageCount} págs · {annotationCount} elementos
              </span>
              .
            </p>
          </div>

          <div className="pc-arch-box">
            <h3>Puertos y adaptadores (src/application · infrastructure)</h3>
            <p>
              <code>PdfEnginePort</code> compila binarios reales con{" "}
              <strong>pdf-lib</strong> y renderiza vistas HiDPI mediante{" "}
              <strong>pdfjs-dist</strong> (worker local empaquetado).{" "}
              <code>DraftStorePort</code> guarda borradores privados en{" "}
              <strong>IndexedDB</strong>.
            </p>
          </div>

          <div>
            <h3 className="pc-drawer-section-heading">
              Bitácora de comandos en memoria (Undo / Redo)
            </h3>
            {commandLog.length === 0 ? (
              <p className="pc-inspector-desc">
                Abre o edita un documento para inspeccionar cada transición inmutable.
              </p>
            ) : (
              <ul className="pc-log-list">
                {commandLog.slice(0, 12).map((entry) => (
                  <li key={entry.id} className="pc-log-item">
                    <span>{entry.label}</span>
                    <span className="pc-meta-mono pc-log-time">
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
            className="pc-btn-secondary pc-drawer-repo-link"
          >
            Ver código fuente y ADR en GitHub
          </a>
        </div>
      </div>
    </div>
  );
}
