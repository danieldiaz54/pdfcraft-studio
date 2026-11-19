# Reporte de Auditoría de Seguridad y Privacidad — `pdfcraft-studio`

> **Veredicto:** **`CERTIFIED`** · `0 Critical · 0 High · 0 Medium`
> **Auditor:** `security-auditor`
> **Fecha:** 2026-11-18

## Controles Verificados
1. **Validación estricta de entrada de archivos (`DocumentSession.ts`)**:
   - Verificación obligatoria de cabecera mágica `%PDF-` en los primeros 1024 bytes (`INVALID_FILE_TYPE`).
   - Límite máximo de archivo `MAX_FILE_BYTES = 26_214_400` (`25 MB`) para prevenir agotamiento de memoria del navegador (`FILE_TOO_LARGE`).
2. **Sanitización de salida (`Annotation.ts`)**:
   - `sanitizePdfFilename()` elimina traversal (`../`), caracteres especiales y asegura extensión `.pdf`.
   - `sanitizeWinAnsiText()` filtra secuencias de control y caracteres fuera del juego seguro antes de llamar a `pdf-lib`.
3. **Aislamiento de Red y DOM (`test_pdfcraft_contracts.py`)**:
   - Cero llamadas `fetch()` o `XMLHttpRequest` en `src/`.
   - Worker de `pdfjs-dist` empaquetado localmente con Vite (cero scripts remotos de terceros).
   - Cero usos de `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML` o `eval`.
4. **Exclusión de documentación privada y secretos (`.gitignore`)**:
   - Mantiene `/docs/*` salvo `!/docs/adr/**`, `.env.development`, `.env.production` y `.agents/.agents/`.
