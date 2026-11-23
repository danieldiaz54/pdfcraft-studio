import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BrandDocIcon,
  DownloadDocIcon,
  MergeDocsIcon,
  OrganizeIcon,
  PenSignIcon,
  RotateCwIcon,
  TextTypeIcon,
} from "./Icons";

export type WorkbenchTool = "organize" | "rotate" | "sign" | "text" | "merge";

interface TopChromeProps {
  readonly title: string;
  readonly pageCount: number;
  readonly activeTool: WorkbenchTool;
  readonly mobileInspectorOpen: boolean;
  readonly isExporting: boolean;
  readonly onResetToWelcome: () => void;
  readonly onRename: (nextTitle: string) => void;
  readonly onSelectTool: (tool: WorkbenchTool) => void;
  readonly onDownload: () => void;
  readonly onOpenArchitecture: () => void;
}

const TOOLS: ReadonlyArray<{
  readonly id: WorkbenchTool;
  readonly label: string;
  readonly renderIcon: () => ReactNode;
}> = [
  { id: "organize", label: "Organizar", renderIcon: () => <OrganizeIcon /> },
  { id: "rotate", label: "Rotar", renderIcon: () => <RotateCwIcon /> },
  { id: "sign", label: "Firmar", renderIcon: () => <PenSignIcon /> },
  { id: "text", label: "Texto", renderIcon: () => <TextTypeIcon /> },
  { id: "merge", label: "Unir PDF", renderIcon: () => <MergeDocsIcon /> },
];

export function TopChrome({
  title,
  pageCount,
  activeTool,
  mobileInspectorOpen,
  isExporting,
  onResetToWelcome,
  onRename,
  onSelectTool,
  onDownload,
  onOpenArchitecture,
}: TopChromeProps) {
  const [draftTitle, setDraftTitle] = useState(title);

  useEffect(() => {
    setDraftTitle(title);
  }, [title]);

  const commitTitle = () => {
    const trimmed = draftTitle.trim();
    if (trimmed && trimmed !== title) {
      onRename(trimmed);
    } else {
      setDraftTitle(title);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    commitTitle();
  };

  return (
    <header className="pc-topbar pc-topbar-workbench">
      <div className="pc-brand-group">
        <button
          type="button"
          className="pc-brand-btn"
          title="Cerrar documento actual y volver al inicio"
          onClick={onResetToWelcome}
        >
          <span className="pc-brand-mark">
            <BrandDocIcon />
          </span>
          <span className="pc-brand-title">PdfCraft</span>
        </button>

        <span className="pc-topbar-sep" aria-hidden="true" />

        <form onSubmit={handleSubmit} className="pc-filename-form">
          <label htmlFor="pc-doc-filename" className="sr-only">
            Nombre del archivo de salida
          </label>
          <input
            id="pc-doc-filename"
            className="pc-filename-input"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            onBlur={commitTitle}
          />
        </form>

        <span className="pc-doc-count-badge" aria-label={`${pageCount} páginas`}>
          {pageCount}p
        </span>
      </div>

      <nav className="pc-tool-strip" aria-label="Herramientas de edición PDF">
        {TOOLS.map((tool) => {
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              type="button"
              className="pc-tool-btn"
              data-active={isActive}
              data-mobile-open={isActive && mobileInspectorOpen}
              aria-pressed={isActive}
              onClick={() => onSelectTool(tool.id)}
            >
              {tool.renderIcon()}
              <span>{tool.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="pc-actions-group">
        <button
          type="button"
          className="pc-local-trigger pc-local-trigger-compact"
          onClick={onOpenArchitecture}
          title="Ver arquitectura Local-First e historial de cambios"
        >
          <span className="pc-local-dot" aria-hidden="true" />
          <span className="pc-local-label-full">0 KB · Cómo funciona</span>
          <span className="pc-local-label-short">Info</span>
        </button>
        <button
          type="button"
          className="pc-btn-primary"
          disabled={isExporting}
          onClick={onDownload}
        >
          <DownloadDocIcon />
          <span>{isExporting ? "Generando..." : "Descargar PDF"}</span>
        </button>
      </div>
    </header>
  );
}
