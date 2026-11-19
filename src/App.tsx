import { ArchitectureDrawer } from "./ui/components/ArchitectureDrawer";
import { ContextualInspector } from "./ui/components/ContextualInspector";
import { DocumentCanvas } from "./ui/components/DocumentCanvas";
import { EmptyDropzone } from "./ui/components/EmptyDropzone";
import { CloseIcon } from "./ui/components/Icons";
import { ThumbnailRail } from "./ui/components/ThumbnailRail";
import { TopChrome } from "./ui/components/TopChrome";
import { usePdfWorkbench } from "./ui/hooks/usePdfWorkbench";

export function App() {
  const wb = usePdfWorkbench();
  const session = wb.session;

  const activePageIndex =
    session && session.activePageId
      ? Math.max(
          0,
          session.pages.findIndex((p) => p.id === session.activePageId),
        )
      : 0;
  const activePage = session ? session.pages[activePageIndex] : undefined;

  const pageAnnotations =
    session && activePage
      ? session.annotations.filter((ann) => ann.pageId === activePage.id)
      : [];

  return (
    <>
      {wb.toast ? (
        <div
          className="pc-toast"
          data-tone={wb.toast.tone}
          role="status"
          aria-live="polite"
        >
          <span>{wb.toast.message}</span>
          <button
            type="button"
            className="pc-pill-btn"
            aria-label="Cerrar aviso"
            onClick={wb.dismissToast}
          >
            <CloseIcon />
          </button>
        </div>
      ) : null}

      {!session || !activePage ? (
        <EmptyDropzone
          isBusy={wb.isBusy}
          savedDraftTitle={wb.savedDraftTitle}
          onOpenFiles={wb.handleOpenFiles}
          onLoadSample={wb.handleLoadSample}
          onResumeDraft={wb.handleResumeDraft}
          onDiscardDraft={wb.handleDiscardDraft}
          onOpenArchitecture={() => wb.setArchOpen(true)}
        />
      ) : (
        <div className="pc-app">
          <TopChrome
            title={session.title}
            activeTool={wb.activeTool}
            isExporting={wb.isExporting}
            onResetToWelcome={wb.handleResetToWelcome}
            onRename={wb.handleRename}
            onSelectTool={wb.setActiveTool}
            onDownload={wb.handleDownload}
            onOpenArchitecture={() => wb.setArchOpen(true)}
          />

          <main className="pc-workbench">
            <ThumbnailRail
              pages={session.pages}
              activePageId={activePage.id}
              sourceBuffers={wb.sourceBuffers}
              renderer={wb.renderer}
              onSelectPage={wb.handleSelectPage}
              onReorderPages={wb.handleReorderPages}
              onRotatePage={(id) => wb.handleRotatePageById(id, 90)}
              onDeletePage={wb.handleDeletePageById}
              onAppendPdfFiles={wb.handleOpenFiles}
            />

            <DocumentCanvas
              page={activePage}
              pageNumber={activePageIndex + 1}
              totalPages={session.pages.length}
              annotations={pageAnnotations}
              selectedAnnotationId={wb.selectedAnnotationId}
              sourceBytes={wb.sourceBuffers.get(activePage.sourceDocId)}
              renderer={wb.renderer}
              zoom={wb.zoom}
              canUndoAction={wb.canUndoAction}
              canRedoAction={wb.canRedoAction}
              onSelectAnnotation={wb.setSelectedAnnotationId}
              onMoveAnnotation={wb.handleMoveAnnotation}
              onRemoveAnnotation={wb.handleRemoveAnnotation}
              onUndo={wb.handleUndo}
              onRedo={wb.handleRedo}
              onZoomChange={wb.changeZoom}
            />

            <ContextualInspector
              activeTool={wb.activeTool}
              activePage={activePage}
              pageIndex={activePageIndex}
              totalPages={session.pages.length}
              sources={session.sources}
              onPlaceSignature={wb.handlePlaceSignature}
              onPlaceText={wb.handlePlaceText}
              onMovePage={wb.handleMoveActivePage}
              onDuplicatePage={wb.handleDuplicateActivePage}
              onDeletePage={() => wb.handleDeletePageById(activePage.id)}
              onRotateActivePage={(delta) =>
                wb.handleRotatePageById(activePage.id, delta)
              }
              onRotateAllPages={wb.handleRotateAllPages}
              onResetRotations={wb.handleResetRotations}
              onAppendFiles={wb.handleOpenFiles}
            />
          </main>
        </div>
      )}

      <ArchitectureDrawer
        isOpen={wb.archOpen}
        commandLog={wb.commandLog}
        pageCount={session?.pages.length ?? 0}
        annotationCount={session?.annotations.length ?? 0}
        onClose={() => wb.setArchOpen(false)}
      />
    </>
  );
}
