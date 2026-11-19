# ADR-001: Arquitectura Hexagonal Local-First para Edición Privada de PDF

- **Estado:** Aceptado
- **Fecha:** 2026-11-18
- **Proyecto:** `pdfcraft-studio`

## Contexto
Las herramientas web convencionales para editar, unir o firmar PDFs exigen subir documentos confidenciales (contratos, identificaciones, facturas) a un servidor remoto. Esto introduce costos de almacenamiento temporal, latencia de red y riesgos de privacidad innecesarios.

## Decisión
Adoptar una **Arquitectura Hexagonal 100% Local-First en navegador**:
- **Dominio puro (`src/domain/`)**: Modela sesiones, páginas (`RotationAngle ∈ {0, 90, 180, 270}`), anotaciones normalizadas y pila Undo/Redo sin depender de librerías gráficas ni de DOM.
- **Puertos (`src/application/ports/`)**: Interfaces `PdfEnginePort`, `PdfRenderPort` y `DraftStorePort`.
- **Adaptadores (`src/infrastructure/`)**:
  - `pdf-lib` para inspección, fusión de archivos, firma manuscrita vectorial e inyección de texto en salida binaria real.
  - `pdfjs-dist` con worker empaquetado localmente vía Vite para previsualización nítida en Canvas sin dependencias de CDN externas.
  - `IndexedDB` para persistir borradores privados entre recargas con costo de servidor `$0`.

## Consecuencias
- **Privacidad verificable:** `0 KB enviados a la red` al abrir, editar o descargar documentos.
- **Despliegue estático sin backend:** Publicación directa en GitHub Pages o Netlify Edge.
- **Reversibilidad:** Al aislar `pdf-lib` y `pdfjs-dist` tras puertos, el motor binario o almacenamiento local puede reemplazarse por WebAssembly o File System Access API sin tocar las reglas de negocio.
