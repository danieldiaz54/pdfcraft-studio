# SPEC-02: Producto y Arquitectura Hexagonal Local-First (`pdfcraft-studio`)

> **Estado**: Diseño y Especificación en Revisión (Compuertas 1 y 2)
> **Fecha**: 2026-11-18
> **Rama**: `sdd/pdfcraft-design-and-spec`

---

## 1. Objetivo de Producto
Proveer una herramienta web interactiva de edición de PDF que opera íntegramente en el navegador del usuario (`0 KB enviados a red`), combinando **Organización de Páginas**, **Unión de Documentos**, **Firma Manuscrita**, **Anotaciones de Texto** y **Persistencia Privada en IndexedDB**.

## 2. Arquitectura Hexagonal Local-First (`src/`)

```text
src/
├── domain/                       # Núcleo puro TypeScript (0 dependencias de DOM o librerías externas)
│   ├── entities/
│   │   ├── DocumentSession.ts    # Agregado raíz: id, title, pages[], annotations[], activePageId, networkBytesSent=0
│   │   ├── PageItem.ts           # Value Object: id, sourceDocId, sourcePageIndex, rotation (0|90|180|270), widthPt, heightPt
│   │   └── Annotation.ts         # SignatureStroke | TextNote con coordenadas normalizadas [0..1]
│   ├── commands/
│   │   └── EditCommandStack.ts   # Undo/Redo inmutable basado en snapshots/comandos invertibles
│   └── errors/
│       └── PdfDomainError.ts     # Excepciones explícitas (INVALID_FILE_TYPE, FILE_TOO_LARGE, EMPTY_EXPORT, CORRUPT_PDF)
├── application/                  # Casos de uso y puertos (interfaces)
│   ├── ports/
│   │   ├── PdfEnginePort.ts      # loadPdfBytes(), renderPagePreview(), mergeAndExportPdf()
│   │   └── DraftStorePort.ts     # saveSession(), loadLatestSession(), clearSession()
│   └── use-cases/
│       ├── OpenOrMergePdfs.ts
│       ├── ManipulatePage.ts     # reorder, rotateClockwise, duplicate, deletePage
│       ├── ApplyAnnotation.ts    # addSignature, addTextAnnotation, removeAnnotation
│       └── ExportEditedPdf.ts
├── infrastructure/               # Adaptadores concretos intercambiables
│   ├── pdf/
│   │   ├── PdfLibEngineAdapter.ts    # Manipulación y compilación binaria vía pdf-lib
│   │   ├── PdfJsRendererAdapter.ts   # Renderizado nítido a HTML5 Canvas vía pdfjs-dist
│   │   └── SampleContractBuilder.ts  # Generador local del contrato de ejemplo (4 págs) con pdf-lib
│   └── storage/
│       └── IndexedDbDraftAdapter.ts  # Persistencia privada local de borradores sin cookies ni servidor
└── ui/                           # React 19 + TypeScript Strict + CSS tokens de DESIGN.md
    ├── components/
    │   ├── TopChrome.tsx
    │   ├── ThumbnailRail.tsx
    │   ├── DocumentCanvas.tsx
    │   ├── ContextualInspector.tsx
    │   ├── EmptyDropzone.tsx
    │   └── ArchitectureDrawer.tsx    # Capa 2 opcional (arquitectura hexagonal + log de comandos)
    └── hooks/
        └── usePdfWorkbench.ts
```

## 3. Invariantes de Dominio y Guardrails de Seguridad
1. **Cero tipos `any`:** `tsconfig.json` con `"strict": true` y pruebas automatizadas verificando ausencia total de `: any`, `as any` y `<any>`.
2. **Rotación restringida:** `rotation` solo acepta valores discreto-modulares en `{0, 90, 180, 270}`.
3. **Integridad de exportación:** No se permite exportar si `pages.length === 0`; lanza `PdfDomainError('EMPTY_EXPORT')` con mensaje de recuperación accionable en UI.
4. **Sanitización y límites de entrada (`security-auditor`):**
   - Tamaño máximo por archivo entrante: `25 MB` (`MAX_FILE_BYTES = 26_214_400`).
   - Validación de cabecera mágica `%PDF-` antes de intentar parsear bytes.
   - Sanitización estricta del nombre al descargar (`[^a-zA-Z0-9._-]` -> `_`, asegurando extensión `.pdf`).
   - Cero uso de `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML` o `eval` al renderizar anotaciones o vistas previas.
5. **Aislamiento de red:** Toda operación de carga, edición, firma y exportación ocurre offline-ready en memoria y IndexedDB del cliente (`networkBytesSent === 0`).

## 4. Plan de Verificación (Compuerta 3 & 4)
- **Pruebas unitarias de dominio y comandos (Vitest):** reordenamiento, rotación, eliminación con bloqueo de última página, undo/redo completo, sanitización de nombres y rechazo de PDFs inválidos o >25 MB.
- **Calidad frontend:** `eslint`, `tsc --noEmit`, `vite build` y auditoría contra `impeccable/reference/craft-floor.md` y `web-design-guidelines`.
- **Despliegue `$0`:** GitHub Actions CI + GitHub Pages (`https://danieldiaz54.github.io/pdfcraft-studio/`).
