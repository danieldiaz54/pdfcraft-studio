# DESIGN.md — `pdfcraft-studio`

> Contrato visual generado bajo `ui-ux-pro-max` + `frontend-design` + `stitch-skill` + `impeccable/reference/craft-floor.md`.

## 1. Visual Atmosphere & Physical Scene
- **Escena física:** Mesa de luz de estudio de impresión diurno (*Daylight Editorial Light-Table*). Papel físico crisp descansando sobre un tapete mineral frío de estudio bajo luz natural de oficina.
- **Modo:** Claro (`Light` exclusivo; sin modo oscuro ni gradientes neón).
- **Densidad y tono:** Aireado, preciso y táctil (`Density 6/10`, `Variance 7/10`, `Motion 3/10`). Cada borde y elevación imita objetos reales de papelería y herramientas de preprensa, nunca un dashboard SaaS genérico.

## 2. Color Calibration (`>= 4.5:1` Contraste WCAG AA Verificado)

| Token / Rol | Nombre Descriptivo | Hex | CSS Variable | Uso Exacto |
|---|---|---|---|---|
| Workspace Mat | Slate Light-Table Mat | `#EAEEF2` | `--bg-stage` | Fondo del lienzo central donde descansa la hoja PDF |
| Primary Chrome | Pure Paper Chrome | `#FFFFFF` | `--bg-chrome` | Barra superior de 52px, hoja PDF física y panel inspector derecho |
| Rail Surface | Cool Mineral Paper | `#F8FAFC` | `--bg-rail` | Riel izquierdo de miniaturas y estado de bienvenida inicial |
| Ink Primary | Deep Charcoal Ink | `#111827` | `--text-primary` | Títulos, controles activos y texto principal |
| Ink Secondary | Slate Ink | `#475569` | `--text-secondary` | Metadatos de página, placeholders e iconos secundarios |
| Divider Hairline | Light Steel Rule | `#E2E8F0` | `--border-hairline` | Líneas divisorias exactas de `1px` entre zonas de trabajo |
| Primary Tool Accent | Cobalt Studio Ink | `#1D4ED8` | `--accent-cobalt` | Herramienta activa, borde de página seleccionada y botón `"Descargar PDF"` |
| Cobalt Hover | Deep Cobalt Press | `#1E40AF` | `--accent-cobalt-hover` | Estado hover del CTA principal y botones primarios |
| Selection Wash | Soft Cobalt Tint | `#EFF6FF` | `--accent-cobalt-tint` | Fondo sutil de herramienta seleccionada y zona de arrastre activa |
| Privacy Verified | Pine Verified Ink | `#15803D` | `--status-local-ink` | Exclusivo para texto e icono del indicador `"100% local"` sobre `#F0FDF4` |
| Destructive | Signal Cut Red | `#DC2626` | `--status-danger` | Exclusivo para eliminar página o advertencias de límite excedido |

## 3. Typographic Architecture (Anti-Slop Strict Stack)
- **Prohibidas:** `Inter`, `Roboto`, `Open Sans`, `Outfit`, `Space Grotesk`.
- **Wordmark & Empty-State Headings:** `Bricolage Grotesque` (`600`–`700`, `letter-spacing: -0.02em`, `line-height: 1.12`).
- **Workspace UI Controls & Body:** `Public Sans` (`400`, `500`, `600`, `line-height: 1.5`, máx `65ch`).
- **Real Measurements & Page Counters Only:** `JetBrains Mono` (`font-variant-numeric: tabular-nums`) exclusivamente para dimensiones (`A4 · 210×297 mm`), porcentaje de zoom (`100%`), conteo (`2 / 4`) y peso real en bytes (`1.4 MB`).

## 4. Layout Principles (`Operate` Mode — 3-Zone Workbench)
1. **Top Chrome (`52px`, `#FFFFFF`, `border-bottom: 1px solid #E2E8F0`):**
   - Izquierda: Wordmark `PdfCraft` + nombre de archivo editable (`Contrato_Servicios_2026.pdf`).
   - Centro: Barra segmentada con iconos SVG consistentes de un solo peso (`Organizar`, `Rotar`, `Firmar`, `Texto`, `Unir PDF`).
   - Derecha: Indicador `"100% local"`, botón primario cobalto `"Descargar PDF"` y botón discreto `"Arquitectura"`.
2. **Left Thumbnail Rail (`208px`, `#F8FAFC`, `border-right: 1px solid #E2E8F0`):**
   - Miniaturas verticales A4 numeradas (`1..N`). La página activa lleva marco `2px solid #1D4ED8`.
   - Controles rápidos en hover/focus (rotar / eliminar) y botón fijo inferior `"+ Agregar PDF"`.
3. **Center Stage (`flex-1`, `#EAEEF2`):**
   - Hoja física blanca A4 centrada con sombra direccional de papel (`0 8px 24px -4px rgba(15, 23, 42, 0.08)`).
   - Barra flotante inferior compacta: `Deshacer`, `Rehacer`, `- 100% +`, `Página 2 de 4`.
4. **Right Contextual Inspector (`260px`, `#FFFFFF`, `border-left: 1px solid #E2E8F0`, máximo 4 controles visibles por estado):**
   - Muestra únicamente herramientas de la pestaña activa (ej. en `Firmar`: lienzo de firma manuscrita, selector de tinta `#111827` / `#1D4ED8`, botón `"Limpiar"` y botón `"Insertar en página"`).
5. **Welcome / Prepress Split Hero (`#F8FAFC` + `#EAEEF2`):**
   - Grilla asimétrica de dos columnas sin tarjetas SaaS repetitivas: a la izquierda, titular claro en `Bricolage Grotesque`, bandeja de selección/arrastre con dos escenarios en 1 clic (*"Contrato listo para firmar"* y *"Escaneo de lado para corregir"*) y garantías verificables (`0 KB enviados a internet`); a la derecha, espécimen físico A4 interactivo sobre mesa de luz `#EAEEF2` con marcas de corte en las esquinas y firma cobalto animada.
   - En móvil (`<= 768px`), la hoja A4 escala automáticamente al ancho disponible mediante `ResizeObserver` (`0px` de recorte horizontal) y el inspector contextual opera como bandeja inferior colapsable (`data-mobile-open`).

## 5. Motion Philosophy & Interaction States
- Transiciones rápidas táctiles de escritorio (`150ms–200ms`, `cubic-bezier(0.22, 1, 0.36, 1)`) en selección de herramientas y rotación visual.
- Superficies del navegador tematizadas (`::selection` en `#EFF6FF`/`#1D4ED8`, scrollbars finos en `#CBD5E1`, `:focus-visible` nítido de `2px solid #1D4ED8` con `offset: 2px`).
- Respeto estricto a `@media (prefers-reduced-motion: reduce)` y colapso responsivo limpio debajo de `768px` (riel de miniaturas horizontal o drawer y acciones accesibles de `>= 44px`).

## 6. Explicit Anti-Patterns Banned (`frontend-design` & `impeccable`)
- Cero fondos oscuros, brillos púrpuras, gradientes decorativos ni glassmorphism gratuito.
- Cero *eyebrows* en MAYÚSCULAS espaciadas sobre encabezados.
- Cero numeración falsa `01 / 02 / 03` en tarjetas de beneficios.
- Cero palabras aisladas pintadas de otro color o cursiva dentro de los `<h1>`.
- Cero emojis como iconos y cero grillas de 3 tarjetas idénticas tipo SaaS genérico.
