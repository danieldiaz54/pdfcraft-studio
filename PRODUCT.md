# PRODUCT.md — `pdfcraft-studio`

## 1. Propósito en una frase
**Editor de PDF privado que funciona 100% en el navegador**: abre uno o varios PDFs, reordena, rota o elimina páginas, agrega firma manuscrita o texto y descarga el archivo final sin subir documentos sensibles a ningún servidor.

## 2. Audiencia y Modo de Interfaz
- **Audiencia principal:** Cualquier persona (freelancers, estudiantes, operaciones, reclutadores y áreas administrativas) que necesita editar un PDF rápido sin cuentas, marcas de agua ni subir contratos privados a la nube.
- **Audiencia secundaria:** Líderes técnicos y reclutadores de ingeniería interesados en auditar la arquitectura **Local-First Hexagonal**, la pila **Undo/Redo** basada en comandos y la persistencia privada en **IndexedDB**.
- **Modo predominante (`impeccable`):** **`Operate`** — velocidad, claridad espacial y cero fricción sobre el documento; toda la complejidad técnica vive aislada en un panel lateral opcional.

## 3. Diseño de 2 Capas (Regla Anti-Informe)

### Capa 1 — Producto Cotidiano (Superficie por defecto)
Cinco acciones inmediatas en lenguaje humano claro:
1. **Abrir o probar en 1 clic:** Arrastrar archivos PDF desde el equipo o pulsar **"Probar con contrato de ejemplo (4 págs)"** para cargar un documento real al instante y explorar sin fricción.
2. **Organizar páginas:** Reordenar miniaturas (subir/bajar/arrastrar), rotar 90°, duplicar o eliminar páginas con soporte completo de **Deshacer / Rehacer** (`Ctrl+Z` / `Ctrl+Y`).
3. **Firmar y anotar:** Dibujar una firma manuscrita fluida en lienzo táctil o insertar anotaciones nítidas de texto/fecha directamente sobre la página activa.
4. **Unir y exportar:** Añadir más documentos PDF al proyecto activo y pulsar **"Descargar PDF"** para compilar y guardar un binario `.pdf` real localmente mediante `pdf-lib`.
5. **Persistencia privada automática:** Guardar sesiones y borradores recientes en **IndexedDB** dentro del navegador del usuario para no perder cambios al recargar la pestaña.

### Capa 2 — Inspector Técnico Opcional (`"Arquitectura"`)
Un cajón deslizante bajo demanda (*drawer* secundario, oculto por defecto) destinado a evaluación técnica:
- Diagrama interactivo de la **Arquitectura Hexagonal Local-First**:
  `Domain (DocumentSession, PageItem, Annotations, EditCommand)` -> `Ports (PdfEnginePort, DraftStorePort)` -> `Adapters (PdfLibAdapter, PdfJsCanvasAdapter, IndexedDbAdapter)`.
- Contador en vivo **`0 KB enviados a la red`** verificable en el tráfico local.
- Bitácora limpia del historial de comandos **Undo / Redo** ejecutados en la sesión actual.

## 4. Criterios de Éxito en 5 Segundos
- Un usuario que nunca ha visto la app entiende en el primer pantallazo que sirve para **editar, firmar y unir PDFs sin subirlos a internet**.
- No existen métricas de servidor, tablas de SLO, badges de arquitectura ni encabezados decorativos compitiendo con la hoja de trabajo.
