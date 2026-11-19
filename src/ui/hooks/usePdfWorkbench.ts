import { useCallback, useEffect, useMemo, useState } from "react";
import type { StoredDraftBundle } from "../../application/ports/DraftStorePort";
import {
  exportSessionToPdfBytes,
  loadAndAppendPdfFiles,
  persistSessionDraft,
} from "../../application/use-cases/SessionWorkflow";
import {
  canRedo,
  canUndo,
  createCommandStack,
  pushState,
  redoState,
  replacePresentWithoutHistory,
  undoState,
  type CommandStackState,
} from "../../domain/commands/EditCommandStack";
import {
  assertValidSignaturePaths,
  sanitizeWinAnsiText,
  type InkColor,
  type PageAnnotation,
  type SignaturePoint,
  type TextFontSizePt,
} from "../../domain/entities/Annotation";
import {
  addAnnotation,
  deletePage,
  duplicatePage,
  moveAnnotation,
  movePageByDelta,
  removeAnnotation,
  renameSession,
  reorderPage,
  resetAllRotations,
  rotateAllPages,
  rotatePage,
  setActivePage,
  type DocumentSession,
} from "../../domain/entities/DocumentSession";
import { PdfDomainError } from "../../domain/errors/PdfDomainError";
import { PdfJsRendererAdapter } from "../../infrastructure/pdf/PdfJsRendererAdapter";
import { PdfLibEngineAdapter } from "../../infrastructure/pdf/PdfLibEngineAdapter";
import { IndexedDbDraftAdapter } from "../../infrastructure/storage/IndexedDbDraftAdapter";
import type { WorkbenchTool } from "../components/TopChrome";

export interface ToastNotice {
  readonly id: string;
  readonly tone: "info" | "success" | "error";
  readonly message: string;
}

function makeId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function toUserErrorMessage(error: unknown): string {
  if (error instanceof PdfDomainError) {
    return `${error.message} ${error.recoveryHint}`;
  }
  return "No se pudo completar la operación solicitada sobre el PDF.";
}

export function usePdfWorkbench() {
  const engine = useMemo(() => new PdfLibEngineAdapter(), []);
  const renderer = useMemo(() => new PdfJsRendererAdapter(), []);
  const draftStore = useMemo(() => new IndexedDbDraftAdapter(), []);

  const [stack, setStack] = useState<CommandStackState>(() => createCommandStack());
  const [sourceBuffers, setSourceBuffers] = useState<Map<string, Uint8Array>>(
    () => new Map(),
  );
  const [savedDraft, setSavedDraft] = useState<StoredDraftBundle | null>(null);
  const [activeTool, setActiveTool] = useState<WorkbenchTool>("sign");
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(
    null,
  );
  const [zoom, setZoom] = useState<number>(1);
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [archOpen, setArchOpen] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastNotice | null>(null);

  const showToast = useCallback(
    (tone: ToastNotice["tone"], message: string) => {
      const notice: ToastNotice = { id: makeId("toast"), tone, message };
      setToast(notice);
    },
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Check IndexedDB for a previous private local draft on first load
  useEffect(() => {
    let active = true;
    draftStore
      .loadLatestDraft()
      .then((bundle) => {
        if (active && bundle && bundle.session.pages.length > 0) {
          setSavedDraft(bundle);
        }
      })
      .catch(() => {
        // Silently ignore unavailable IndexedDB
      });
    return () => {
      active = false;
    };
  }, [draftStore]);

  // Persist current session draft locally whenever session changes
  const session = stack.present;
  useEffect(() => {
    if (!session || session.pages.length === 0) return;
    persistSessionDraft(draftStore, session, sourceBuffers).catch(() => {
      // Ignore quota failures silently
    });
  }, [session, sourceBuffers, draftStore]);

  const commitMutation = useCallback(
    (
      updater: (current: DocumentSession, nowIso: string) => DocumentSession,
      label: string,
    ) => {
      setStack((prev) => {
        if (!prev.present) return prev;
        const nowIso = new Date().toISOString();
        try {
          const next = updater(prev.present, nowIso);
          return pushState(prev, next, label, makeId("log"));
        } catch (err) {
          showToast("error", toUserErrorMessage(err));
          return prev;
        }
      });
    },
    [showToast],
  );

  const handleOpenFiles = useCallback(
    async (fileList: FileList) => {
      setIsBusy(true);
      try {
        const items: Array<{ readonly name: string; readonly bytes: Uint8Array }> = [];
        for (let i = 0; i < fileList.length; i += 1) {
          const file = fileList.item(i);
          if (!file) continue;
          const arrayBuffer = await file.arrayBuffer();
          items.push({ name: file.name, bytes: new Uint8Array(arrayBuffer) });
        }
        if (items.length === 0) return;

        const outcome = await loadAndAppendPdfFiles(
          engine,
          session,
          sourceBuffers,
          items,
          () => makeId("id"),
          new Date().toISOString(),
        );

        setSourceBuffers(outcome.sourceBuffers);
        setStack((prev) =>
          prev.present
            ? pushState(
                prev,
                outcome.session,
                `Agregar ${outcome.addedPageCount} página(s)`,
                makeId("log"),
              )
            : createCommandStack(
                outcome.session,
                `Abrir PDF (${outcome.addedPageCount} págs)`,
              ),
        );
        setSavedDraft(null);
        showToast(
          "success",
          `${outcome.addedPageCount} página(s) cargadas localmente.`,
        );
      } catch (err) {
        showToast("error", toUserErrorMessage(err));
      } finally {
        setIsBusy(false);
      }
    },
    [engine, session, sourceBuffers, showToast],
  );

  const handleLoadSample = useCallback(async () => {
    setIsBusy(true);
    try {
      const sampleBytes = await engine.buildSampleContractBytes();
      const outcome = await loadAndAppendPdfFiles(
        engine,
        null,
        new Map(),
        [{ name: "Contrato_Servicios_2026.pdf", bytes: sampleBytes }],
        () => makeId("sample"),
        new Date().toISOString(),
        1, // Land on Page 2 where signature lines live
      );
      setSourceBuffers(outcome.sourceBuffers);
      setStack(
        createCommandStack(
          outcome.session,
          "Cargar Contrato_Servicios_2026.pdf (4 págs)",
        ),
      );
      setActiveTool("sign");
      setSelectedAnnotationId(null);
      setZoom(1);
      setSavedDraft(null);
    } catch (err) {
      showToast("error", toUserErrorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }, [engine, showToast]);

  const handleResumeDraft = useCallback(() => {
    if (!savedDraft) return;
    const restoredBuffers = new Map<string, Uint8Array>();
    for (const entry of savedDraft.sourceBuffers) {
      restoredBuffers.set(entry.sourceDocId, entry.bytes.slice());
    }
    setSourceBuffers(restoredBuffers);
    setStack(
      createCommandStack(savedDraft.session, "Borrador recuperado de IndexedDB"),
    );
    setSavedDraft(null);
  }, [savedDraft]);

  const handleDiscardDraft = useCallback(() => {
    setSavedDraft(null);
    draftStore.clearDraft().catch(() => {});
  }, [draftStore]);

  const handleResetToWelcome = useCallback(() => {
    setStack(createCommandStack());
    setSourceBuffers(new Map());
    setSelectedAnnotationId(null);
    setSavedDraft(null);
    draftStore.clearDraft().catch(() => {});
  }, [draftStore]);

  const handleSelectPage = useCallback((pageId: string) => {
    setSelectedAnnotationId(null);
    setStack((prev) =>
      prev.present
        ? replacePresentWithoutHistory(prev, setActivePage(prev.present, pageId))
        : prev,
    );
  }, []);

  const handleUndo = useCallback(() => {
    setSelectedAnnotationId(null);
    setStack((prev) => undoState(prev, makeId("log"), new Date().toISOString()));
  }, []);

  const handleRedo = useCallback(() => {
    setSelectedAnnotationId(null);
    setStack((prev) => redoState(prev, makeId("log"), new Date().toISOString()));
  }, []);

  // Keyboard shortcuts Ctrl/Cmd+Z and Ctrl/Cmd+Y
  useEffect(() => {
    if (!session) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        handleUndo();
      } else if (
        event.key.toLowerCase() === "y" ||
        (event.key.toLowerCase() === "z" && event.shiftKey)
      ) {
        event.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [session, handleUndo, handleRedo]);

  const handlePlaceSignature = useCallback(
    (paths: ReadonlyArray<ReadonlyArray<SignaturePoint>>, inkColor: InkColor) => {
      if (!session || !session.activePageId) return;
      try {
        assertValidSignaturePaths(paths);
      } catch (err) {
        showToast("error", toUserErrorMessage(err));
        return;
      }
      const id = makeId("sig");
      const targetPageId = session.activePageId;
      const annotation: PageAnnotation = {
        id,
        kind: "signature",
        pageId: targetPageId,
        x: 0.14,
        y: 0.7,
        width: 0.27,
        height: 0.092,
        paths,
        inkColor,
      };
      commitMutation(
        (cur, nowIso) => addAnnotation(cur, annotation, nowIso),
        "Insertar firma manuscrita",
      );
      setSelectedAnnotationId(id);
      showToast("success", "Firma insertada. Arrástrala para ajustar posición.");
    },
    [session, commitMutation, showToast],
  );

  const handlePlaceText = useCallback(
    (rawText: string, fontSizePt: TextFontSizePt, inkColor: InkColor) => {
      if (!session || !session.activePageId) return;
      const clean = sanitizeWinAnsiText(rawText);
      if (!clean) {
        showToast("error", "Escribe un texto válido antes de insertarlo.");
        return;
      }
      const id = makeId("txt");
      const targetPageId = session.activePageId;
      const annotation: PageAnnotation = {
        id,
        kind: "text",
        pageId: targetPageId,
        x: 0.56,
        y: 0.76,
        width: Math.min(0.42, Math.max(0.18, clean.length * 0.011)),
        height: 0.048,
        text: clean,
        fontSizePt,
        inkColor,
      };
      commitMutation(
        (cur, nowIso) => addAnnotation(cur, annotation, nowIso),
        "Insertar anotación de texto",
      );
      setSelectedAnnotationId(id);
      showToast("success", "Texto agregado. Arrástralo sobre la hoja para ubicarlo.");
    },
    [session, commitMutation, showToast],
  );

  const handleDownload = useCallback(async () => {
    if (!session) return;
    setIsExporting(true);
    try {
      const pdfBytes = await exportSessionToPdfBytes(
        engine,
        session,
        sourceBuffers,
      );
      const copy = new Uint8Array(pdfBytes);
      const blob = new Blob([copy], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = session.title;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      showToast("success", `Descargado ${session.title} sin salir del navegador.`);
    } catch (err) {
      showToast("error", toUserErrorMessage(err));
    } finally {
      setIsExporting(false);
    }
  }, [engine, session, sourceBuffers, showToast]);

  return {
    session,
    sourceBuffers,
    renderer,
    savedDraftTitle: savedDraft?.session.title ?? null,
    activeTool,
    setActiveTool,
    selectedAnnotationId,
    setSelectedAnnotationId,
    zoom,
    changeZoom: (delta: number) =>
      setZoom((z) => Math.min(1.6, Math.max(0.6, Number((z + delta).toFixed(2))))),
    isBusy,
    isExporting,
    archOpen,
    setArchOpen,
    toast,
    dismissToast: () => setToast(null),
    commandLog: stack.log,
    canUndoAction: canUndo(stack),
    canRedoAction: canRedo(stack),
    handleOpenFiles,
    handleLoadSample,
    handleResumeDraft,
    handleDiscardDraft,
    handleResetToWelcome,
    handleSelectPage,
    handleUndo,
    handleRedo,
    handleRename: (nextTitle: string) =>
      commitMutation(
        (cur, nowIso) => renameSession(cur, nextTitle, nowIso),
        `Renombrar documento`,
      ),
    handleReorderPages: (fromIdx: number, toIdx: number) =>
      commitMutation(
        (cur, nowIso) => reorderPage(cur, fromIdx, toIdx, nowIso),
        `Reordenar página ${fromIdx + 1} a posición ${toIdx + 1}`,
      ),
    handleMoveActivePage: (delta: -1 | 1) =>
      session?.activePageId
        ? commitMutation(
            (cur, nowIso) =>
              cur.activePageId ? movePageByDelta(cur, cur.activePageId, delta, nowIso) : cur,
            delta < 0 ? "Subir página" : "Bajar página",
          )
        : undefined,
    handleRotatePageById: (pageId: string, delta: 90 | -90) =>
      commitMutation(
        (cur, nowIso) => rotatePage(cur, pageId, delta, nowIso),
        `Rotar página ${delta > 0 ? "+90°" : "-90°"}`,
      ),
    handleRotateAllPages: () =>
      commitMutation(
        (cur, nowIso) => rotateAllPages(cur, 90, nowIso),
        "Rotar todas las páginas +90°",
      ),
    handleResetRotations: () =>
      commitMutation(
        (cur, nowIso) => resetAllRotations(cur, nowIso),
        "Restablecer orientación 0°",
      ),
    handleDuplicateActivePage: () =>
      session?.activePageId
        ? commitMutation(
            (cur, nowIso) =>
              cur.activePageId
                ? duplicatePage(
                    cur,
                    cur.activePageId,
                    makeId("dup"),
                    makeId("ann"),
                    nowIso,
                  )
                : cur,
            "Duplicar página activa",
          )
        : undefined,
    handleDeletePageById: (pageId: string) =>
      commitMutation(
        (cur, nowIso) => deletePage(cur, pageId, nowIso),
        "Eliminar página",
      ),
    handlePlaceSignature,
    handlePlaceText,
    handleMoveAnnotation: (id: string, x: number, y: number) =>
      commitMutation(
        (cur, nowIso) => moveAnnotation(cur, id, x, y, nowIso),
        "Ajustar posición de anotación",
      ),
    handleRemoveAnnotation: (id: string) => {
      setSelectedAnnotationId(null);
      commitMutation(
        (cur, nowIso) => removeAnnotation(cur, id, nowIso),
        "Quitar anotación",
      );
    },
    handleDownload,
  };
}
