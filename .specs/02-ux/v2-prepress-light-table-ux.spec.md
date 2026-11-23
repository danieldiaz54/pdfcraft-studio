# SPEC-03: Rediseño UX & Frontend V2 — Daylight Prepress Light-Table (`pdfcraft-studio`)

> **Estado**: Aprobado para implementación desde `dev` (`feat/v2-ux-light-table-upgrade`)
> **Fecha**: 2026-11-23
> **Skills aplicadas**: `design-taste-frontend` (`taste-skill 2.5.1`), `impeccable` (`Operate` + `craft-floor.md`), `web-design-guidelines`

---

## 1. Diagnóstico de Fisuras Detectadas en Auditoría Playwright (`1440×900` y `390×844`)

1. **Desborde horizontal severo de la hoja en móvil (`390×844`):** `DocumentCanvas` fijaba `560px * zoom`, provocando `sheet.x = -83px` y recortando los márgenes del contrato en teléfonos.
2. **Panel de herramientas oculto bajo el pliegue en móvil:** en `<= 768px`, `ContextualInspector` se apilaba en `y = 1279px`, haciendo invisible el lienzo de firma al pulsar `Firmar` en la barra superior, además de perder `386px` verticales entre cabecera y riel.
3. **Colisiones en escritorio (`1440×900`):** `.pc-toast` (`top: 64px; right: 18px`) cubría el encabezado del inspector derecho, y `.pc-overlay-remove` (`×`) se superponía sobre el texto de las anotaciones.
4. **Pantalla inicial plana y jerga en barra superior:** tarjeta punteada aislada sobre `75%` de lienzo vacío y botón `"Arquitectura"` compitiendo con la tarea principal.
5. **Fricciones táctiles en edición:** lienzo de firma sin escalado HiDPI (`devicePixelRatio`), ausencia de firma rápida de ejemplo en 1 clic, imposibilidad de redimensionar firmas/textos sobre la hoja, ausencia de botones anterior/siguiente en la píldora inferior y falta de indicador visual al arrastrar miniaturas.

---

## 2. Arquitectura de Solución V2

### A. Dominio Puro (`src/domain/entities/DocumentSession.ts`)
- Nueva operación inmutable `resizeAnnotation(session, annotationId, nextWidth, nextHeight, nowIso)` validada mediante `clampNormalizedBox`, integrada en `EditCommandStack` (`Undo / Redo`).
- Cero dependencias de React, DOM, `pdf-lib` o `pdfjs-dist`.

### B. Bienvenida Editorial en 2 Columnas (`EmptyDropzone.tsx`)
- Grilla asimétrica sobre mesa de luz diurna (`max-width: 1160px`, márgenes iguales):
  - **Columna izquierda:** titular claro en `Bricolage Grotesque`, bandeja de arrastre y selección de archivos PDF, dos escenarios instantáneos en 1 clic (*"Contrato listo para firmar"* y *"Escaneo con página girada para corregir"*), recuperación de borrador privado desde IndexedDB y hechos verificables (`0 KB enviados a internet`).
  - **Columna derecha:** espécimen físico interactivo de hoja A4 sobre tapete mineral `#EAEEF2` con marcas de corte milimétricas en las esquinas, miniatura de páginas y trazo caligráfico vectorial cobalto animado que abre el contrato al hacer clic.
- Acceso técnico discreto en cabecera: píldora clicable `"100% en tu navegador · Cómo funciona"` en lugar del botón `"Arquitectura"` primario.

### C. Mesa de Edición Precisa y Fluida (`TopChrome`, `ThumbnailRail`, `DocumentCanvas`, `ContextualInspector`)
- **Auto-ajuste responsivo (`ResizeObserver`):** el ancho base de la hoja se adapta automáticamente al contenedor central (`Math.min(580, stageWidth - padding) * zoom`), garantizando `0px` de recorte lateral en `390×844`.
- **Serialización de renderizado `pdf.js`:** cola por `<canvas>` (`WeakMap`) en `PdfJsRendererAdapter` para evitar colisiones de render durante giros o cambios rápidos de zoom.
- **Manipulación directa en hoja:** arrastre fluido + tirador inferior derecho de redimensionado (`.pc-overlay-resize`) + botón eliminar exterior sin pisar el texto.
- **Firma HiDPI + 1 clic:** escalado `devicePixelRatio` en el pad de firma, guía visual cuando está vacío y botón `"Usar firma de ejemplo"` para prueba inmediata.
- **Píldora inferior completa:** `Deshacer`, `Rehacer`, `- 100% +` (clic en porcentaje restablece `100%`) y navegación `‹ Pág. 2 / 4 ›` + flechas de teclado.
- **Ergonomía móvil (`<= 768px`):** cabecera compacta, tira horizontal de miniaturas con botón `+ PDF` integrado en línea y hoja de herramientas inferior colapsable (`Mostrar / Ocultar panel`) para editar y ver la hoja sin desplazamientos largos.
- **Notificaciones y cajón técnico animados:** `.pc-toast` centrado sobre la mesa de luz sin tapar el inspector y `ArchitectureDrawer` con transición suave de entrada/salida y bloqueo de scroll.
