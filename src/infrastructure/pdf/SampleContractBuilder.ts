import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Generate a real 4-page Spanish service agreement PDF completely inside the browser
 * so recruiters and first-time visitors can test organizing, rotating, signing, and exporting in 1 click.
 */
export async function buildSampleContractPdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle("Contrato_Servicios_2026.pdf");
  doc.setAuthor("PdfCraft Studio");

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.067, 0.094, 0.153);
  const muted = rgb(0.278, 0.333, 0.412);
  const cobalt = rgb(0.114, 0.306, 0.847);
  const ruleColor = rgb(0.82, 0.85, 0.9);

  const pageWidth = 595.28; // A4 pt
  const pageHeight = 841.89;

  const drawFooter = (pageIndex: number): void => {
    const page = doc.getPages()[pageIndex];
    if (!page) return;
    page.drawLine({
      start: { x: 64, y: 58 },
      end: { x: pageWidth - 64, y: 58 },
      thickness: 0.75,
      color: ruleColor,
    });
    page.drawText("Contrato_Servicios_2026.pdf  -  Documento de ejemplo local", {
      x: 64,
      y: 42,
      size: 9,
      font: fontRegular,
      color: muted,
    });
    page.drawText(`Página ${pageIndex + 1} de 4`, {
      x: pageWidth - 122,
      y: 42,
      size: 9,
      font: fontBold,
      color: muted,
    });
  };

  // --- Página 1: Carátula y Declaraciones ---
  const p1 = doc.addPage([pageWidth, pageHeight]);
  p1.drawRectangle({ x: 64, y: pageHeight - 92, width: 34, height: 4, color: cobalt });
  p1.drawText("CONTRATO DE PRESTACIÓN DE SERVICIOS", {
    x: 64,
    y: pageHeight - 124,
    size: 20,
    font: fontBold,
    color: ink,
  });
  p1.drawText("ACUERDO MARCO DE DISEÑO E INGENIERÍA DE PRODUCTO", {
    x: 64,
    y: pageHeight - 148,
    size: 11,
    font: fontBold,
    color: cobalt,
  });
  p1.drawLine({
    start: { x: 64, y: pageHeight - 168 },
    end: { x: pageWidth - 64, y: pageHeight - 168 },
    thickness: 1,
    color: ruleColor,
  });

  const p1Paragraphs = [
    "IDENTIFICACIÓN DE LAS PARTES",
    "De una parte, Estudio Digital del Norte S.A.S. (en adelante, 'el Cliente'), representado",
    "por Laura Mendoza Ríos en calidad de Directora de Operaciones.",
    "",
    "De otra parte, Daniel Díaz (en adelante, 'el Prestador'), consultor independiente",
    "en arquitectura de software, sistemas distribuidos y diseño de producto digital.",
    "",
    "DECLARACIONES",
    "I. Que el Cliente requiere el diseño, arquitectura y puesta en marcha de una plataforma",
    "web privada de gestión documental que opere de forma local en navegador.",
    "II. Que el Prestador cuenta con la capacidad técnica, experiencia y herramientas",
    "necesarias para ejecutar el proyecto conforme al Anexo Técnico A.",
    "III. Que ambas partes reconocen la validez de su firma electrónica o manuscrita",
    "estampada en la Página 2 del presente documento.",
  ];

  let y1 = pageHeight - 208;
  for (const line of p1Paragraphs) {
    if (line === "") {
      y1 -= 12;
      continue;
    }
    const isHeading = line === line.toUpperCase() && line.length > 8;
    p1.drawText(line, {
      x: 64,
      y: y1,
      size: isHeading ? 11 : 10.5,
      font: isHeading ? fontBold : fontRegular,
      color: isHeading ? ink : muted,
    });
    y1 -= isHeading ? 22 : 18;
  }

  // Summary card on Page 1
  p1.drawRectangle({
    x: 64,
    y: 250,
    width: pageWidth - 128,
    height: 110,
    borderColor: ruleColor,
    borderWidth: 1,
    color: rgb(0.973, 0.98, 0.988),
  });
  p1.drawText("RESUMEN EJECUTIVO DEL ACUERDO", {
    x: 84,
    y: 332,
    size: 10,
    font: fontBold,
    color: cobalt,
  });
  p1.drawText("Vigencia estimada: 12 semanas  |  Modalidad: Entregables quincenales", {
    x: 84,
    y: 306,
    size: 10,
    font: fontRegular,
    color: ink,
  });
  p1.drawText("Sede operativa: Remoto  |  Referencia interna: CTR-2026-041", {
    x: 84,
    y: 282,
    size: 10,
    font: fontRegular,
    color: muted,
  });

  // --- Página 2: Cláusulas + Bloque de Firma (coincide con el mockup aprobado) ---
  const p2 = doc.addPage([pageWidth, pageHeight]);
  p2.drawText("Contrato de Prestación de", {
    x: 138,
    y: pageHeight - 102,
    size: 20,
    font: fontBold,
    color: ink,
  });
  p2.drawText("Servicios Profesionales", {
    x: 162,
    y: pageHeight - 128,
    size: 20,
    font: fontBold,
    color: ink,
  });

  const p2Intro = [
    "En la Ciudad de México, comparecen las partes para celebrar el presente",
    "contrato de servicios profesionales conforme a las siguientes:",
  ];
  let y2 = pageHeight - 172;
  for (const line of p2Intro) {
    p2.drawText(line, { x: 84, y: y2, size: 11, font: fontRegular, color: ink });
    y2 -= 18;
  }

  p2.drawText("CLÁUSULAS", {
    x: 256,
    y: pageHeight - 234,
    size: 12,
    font: fontBold,
    color: ink,
  });

  const drawClause = (
    title: string,
    lines: ReadonlyArray<string>,
    startY: number,
  ): number => {
    p2.drawText(title, { x: 84, y: startY, size: 11, font: fontBold, color: ink });
    let curY = startY - 22;
    for (const l of lines) {
      p2.drawText(l, { x: 84, y: curY, size: 10.5, font: fontRegular, color: muted });
      curY -= 17;
    }
    return curY - 18;
  };

  let cursorY2 = drawClause(
    "PRIMERA. OBJETO",
    [
      "El Prestador se obliga a realizar los servicios profesionales de diseño,",
      "arquitectura y desarrollo de software descritos en el Anexo Técnico A,",
      "garantizando privacidad local de los archivos procesados por el usuario.",
    ],
    pageHeight - 280,
  );

  cursorY2 = drawClause(
    "SEGUNDA. HONORARIOS Y FORMA DE PAGO",
    [
      "El Cliente pagará al Prestador la cantidad total convenida dentro de los",
      "diez días hábiles posteriores a la entrega aprobada de cada hito.",
      "Todo pago quedará amparado por su comprobante fiscal correspondiente.",
    ],
    cursorY2,
  );

  drawClause(
    "TERCERA. VALIDACIÓN DE FIRMA EN PÁGINA",
    [
      "Usa la herramienta 'Firmar' de la barra superior para estampar tu firma",
      "manuscrita sobre el recuadro inferior del Prestador y descarga el PDF.",
    ],
    cursorY2,
  );

  // Signature block lines at bottom of Page 2
  p2.drawLine({
    start: { x: 84, y: 175 },
    end: { x: 254, y: 175 },
    thickness: 1,
    color: ink,
  });
  p2.drawText("Firma del Prestador", {
    x: 118,
    y: 156,
    size: 10,
    font: fontBold,
    color: ink,
  });

  p2.drawLine({
    start: { x: 340, y: 175 },
    end: { x: 510, y: 175 },
    thickness: 1,
    color: ink,
  });
  p2.drawText("Firma del Cliente", {
    x: 382,
    y: 156,
    size: 10,
    font: fontBold,
    color: ink,
  });

  // --- Página 3: Propiedad Intelectual y Confidencialidad ---
  const p3 = doc.addPage([pageWidth, pageHeight]);
  p3.drawText("CLÁUSULAS ADICIONALES DE CUMPLIMIENTO", {
    x: 64,
    y: pageHeight - 96,
    size: 14,
    font: fontBold,
    color: ink,
  });
  p3.drawLine({
    start: { x: 64, y: pageHeight - 112 },
    end: { x: pageWidth - 64, y: pageHeight - 112 },
    thickness: 1,
    color: ruleColor,
  });

  const p3Items = [
    ["CUARTA. CONFIDENCIALIDAD", "Toda documentación compartida durante la prestación del servicio será tratada como estrictamente confidencial y procesada localmente sin exposición a terceros."],
    ["QUINTA. PROPIEDAD INTELECTUAL", "Una vez liquidados los honorarios pactados, los entregables desarrollados a medida pasarán a titularidad del Cliente junto con su documentación técnica."],
    ["SEXTA. CONTROL DE CAMBIOS Y VERSIONES", "Cualquier ajuste adicional de alcance se aprobará por escrito indicando impacto en tiempo y presupuesto antes de iniciar su ejecución."],
  ] as const;

  let y3 = pageHeight - 154;
  for (const [heading, body] of p3Items) {
    p3.drawText(heading, { x: 64, y: y3, size: 11, font: fontBold, color: cobalt });
    y3 -= 22;
    const words = body.split(" ");
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > 74) {
        p3.drawText(line.trim(), { x: 64, y: y3, size: 10.5, font: fontRegular, color: muted });
        y3 -= 17;
        line = w;
      } else {
        line = `${line} ${w}`;
      }
    }
    if (line.trim()) {
      p3.drawText(line.trim(), { x: 64, y: y3, size: 10.5, font: fontRegular, color: muted });
      y3 -= 28;
    }
  }

  // --- Página 4: Anexo Técnico A ---
  const p4 = doc.addPage([pageWidth, pageHeight]);
  p4.drawText("ANEXO TÉCNICO A - PLAN DE ENTREGABLES", {
    x: 64,
    y: pageHeight - 96,
    size: 14,
    font: fontBold,
    color: ink,
  });
  p4.drawLine({
    start: { x: 64, y: pageHeight - 112 },
    end: { x: pageWidth - 64, y: pageHeight - 112 },
    thickness: 1,
    color: ruleColor,
  });

  const milestones = [
    ["Hito 1 (Semanas 1 - 3)", "Definición de producto, flujo local-first y prototipos aprobados."],
    ["Hito 2 (Semanas 4 - 7)", "Motor de edición PDF, organización, rotación y firma manuscrita."],
    ["Hito 3 (Semanas 8 - 10)", "Persistencia en IndexedDB, historial Undo/Redo y pruebas automatizadas."],
    ["Hito 4 (Semanas 11 - 12)", "Auditoría de accesibilidad WCAG AA, optimización y despliegue CDN."],
  ] as const;

  let y4 = pageHeight - 160;
  for (const [mTitle, mDesc] of milestones) {
    p4.drawRectangle({
      x: 64,
      y: y4 - 36,
      width: pageWidth - 128,
      height: 54,
      borderColor: ruleColor,
      borderWidth: 1,
      color: rgb(1, 1, 1),
    });
    p4.drawText(mTitle, { x: 80, y: y4 - 4, size: 10.5, font: fontBold, color: ink });
    p4.drawText(mDesc, { x: 80, y: y4 - 22, size: 10, font: fontRegular, color: muted });
    y4 -= 74;
  }

  for (let i = 0; i < 4; i += 1) {
    drawFooter(i);
  }

  return doc.save();
}
