import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  BrandDocIcon,
  MergeDocsIcon,
  OrganizeIcon,
  PenSignIcon,
  RotateCwIcon,
  TextTypeIcon,
} from "./Icons";

export type WorkbenchTool = "organize" | "rotate" | "sign" | "text" | "merge";

interface TopChromeProps {
  readonly title: string;
  readonly activeTool: WorkbenchTool;
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
  activeTool,
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
    <header className="pc-topbar">
      <div className="pc-brand-group">
        <button
          type="button"
          className="pc-brand-btn"
          title="Volver al inicio o cargar otro documento"
          onClick={onResetToWelcome}
        >
          <span className="pc-brand-mark">
            <BrandDocIcon />
          </span>
          <span className="pc-brand-title">PdfCraft</span>
        </button>

        <span className="pc-topbar-sep" aria-hidden="true" />

        <form onSubmit={handleSubmit}>
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
      </div>

      <nav className="pc-tool-strip" aria-label="Herramientas de edición PDF">
        {TOOLS.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="pc-tool-btn"
            data-active={activeTool === tool.id}
            aria-pressed={activeTool === tool.id}
            onClick={() => onSelectTool(tool.id)}
          >
            {tool.renderIcon()}
            <span>{tool.label}</span>
          </button>
        ))}
      </nav>

      <div className="pc-actions-group">
        <span className="pc-local-pill">
          <span className="pc-local-dot" />
          100% local
        </span>
        <button
          type="button"
          className="pc-btn-primary"
          disabled={isExporting}
          onClick={onDownload}
        >
          {isExporting ? "Generando PDF..." : "Descargar PDF"}
        </button>
        <button
          type="button"
          className="pc-btn-secondary"
          onClick={onOpenArchitecture}
        >
          Arquitectura
        </button>
      </div>
    </header>
  );
}
