import { google } from "googleapis";
import { extractSlug, extractTitle, extractMetaDescription, extractTags } from "../../lib/article-utils";
import { saveArticleRecord, saveScheduledRecord } from "../../lib/article-store";
import { markdownToHtml } from "../../lib/markdown-to-html";
import { validateBody, MAX } from "../../lib/validate";
import { getGoogleAuth, SCOPES } from "../../lib/google-auth";

export const config = { maxDuration: 60 };

// ─── Schedule Article API ──────────────────────────────────────────────────
// 1. Calcula el próximo martes o jueves disponible
// 2. Añade una fila al Google Sheet del departamento
// 3. Guarda en KV para el historial de Claude
// Columnas del sheet: B=fecha, C=título, E=URL, F=estado
// Se empieza a programar a partir de la fila 282

const SHEET_START_ROW = 282;

// ─── Google Sheets ──────────────────────────────────────────────────────────

// Obtener el nombre de la primera hoja del spreadsheet
async function getSheetName(sheets, spreadsheetId) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
  return meta.data.sheets[0].properties.title;
}

function getAuth() {
  const auth = getGoogleAuth([SCOPES.sheets]);
  if (!auth) throw new Error("Google Service Account not configured");
  return auth;
}

// Buscar la última fila ocupada a partir de SHEET_START_ROW
async function findNextAvailableRow(sheets, spreadsheetId, sheetName) {
  const range = `${sheetName}!B${SHEET_START_ROW}:B1000`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values || [];
  return SHEET_START_ROW + values.length;
}

// Buscar la última fecha programada para calcular el siguiente martes/jueves
async function getLastScheduledDate(sheets, spreadsheetId, sheetName) {
  const range = `${sheetName}!B${SHEET_START_ROW}:B1000`;
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range });

  const values = res.data.values || [];
  if (values.length === 0) return null;

  for (let i = values.length - 1; i >= 0; i--) {
    const cell = values[i][0];
    if (cell) {
      const parts = cell.split("/");
      if (parts.length === 3) {
        const d = new Date(parts[2], parts[1] - 1, parts[0]);
        if (!isNaN(d.getTime())) return d;
      }
      const isoDate = new Date(cell);
      if (!isNaN(isoDate.getTime())) return isoDate;
    }
  }
  return null;
}

// Calcular el próximo martes (2) o jueves (4) después de una fecha dada
function getNextTuesdayOrThursday(afterDate) {
  const date = new Date(afterDate);
  date.setDate(date.getDate() + 1); // Empezar desde el día siguiente

  // Avanzar hasta encontrar un martes (2) o jueves (4)
  while (true) {
    const day = date.getDay();
    if (day === 2 || day === 4) return date; // Martes o jueves
    date.setDate(date.getDate() + 1);
  }
}

// Formatear fecha como dd/mm/yyyy
function formatDate(date) {
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

// Añadir fila al sheet
async function addRowToSheet(sheets, spreadsheetId, sheetName, row, rowNumber) {
  const range = `${sheetName}!B${rowNumber}:F${rowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: "USER_ENTERED",
    requestBody: {
      values: [[
        row.fecha,    // B
        row.titulo,   // C
        "",           // D (vacía)
        row.url,      // E
        row.estado,   // F
      ]],
    },
  });
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method === "GET") {
    // GET: Devolver info del próximo slot disponible
    try {
      const auth = getAuth();
      const sheets = google.sheets({ version: "v4", auth });
      const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

      if (!spreadsheetId) {
        return res.status(200).json({ nextDate: null, error: "GOOGLE_SHEETS_ID not configured" });
      }

      const sheetName = await getSheetName(sheets, spreadsheetId);
      const lastDate = await getLastScheduledDate(sheets, spreadsheetId, sheetName);
      const baseDate = lastDate || new Date();
      const nextDate = getNextTuesdayOrThursday(baseDate);
      const nextRow = await findNextAvailableRow(sheets, spreadsheetId, sheetName);

      return res.status(200).json({
        nextDate: formatDate(nextDate),
        nextDateISO: nextDate.toISOString().split("T")[0],
        nextRow,
        dayName: nextDate.getDay() === 2 ? "Martes" : "Jueves",
      });
    } catch (err) {
      console.error("Next slot error:", err);
      return res.status(200).json({ nextDate: null, error: "No se pudo calcular el próximo hueco disponible" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const validationError = validateBody(req.body, {
    articulo: { required: true, max: MAX.articulo },
    tema: { required: true, max: MAX.tema },
    keywords: { max: MAX.keywords },
    categoria: { max: MAX.corto },
    tono: { max: MAX.corto },
  });
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  const { tema, categoria, keywords, tono, articulo } = req.body;

  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;
  if (!spreadsheetId) {
    return res.status(500).json({ error: "GOOGLE_SHEETS_ID no configurada en Vercel" });
  }

  try {
    const titulo = extractTitle(articulo) || tema;
    const slug = extractSlug(articulo);
    const htmlContent = markdownToHtml(articulo);
    const blogUrl = slug ? `https://ferrolan.es/blog/${slug}/` : "";

    // 1. Conectar con Google Sheets
    const auth = getAuth();
    const sheets = google.sheets({ version: "v4", auth });
    const sheetName = await getSheetName(sheets, spreadsheetId);

    // 2. Calcular próxima fecha disponible (martes o jueves)
    const lastDate = await getLastScheduledDate(sheets, spreadsheetId, sheetName);
    const baseDate = lastDate || new Date();
    const publishDate = getNextTuesdayOrThursday(baseDate);
    const fechaFormateada = formatDate(publishDate);
    const dayName = publishDate.getDay() === 2 ? "Martes" : "Jueves";

    // 3. Encontrar la fila donde escribir
    const nextRow = await findNextAvailableRow(sheets, spreadsheetId, sheetName);

    // 4. Escribir en el Google Sheet
    await addRowToSheet(sheets, spreadsheetId, sheetName, {
      fecha: fechaFormateada,
      titulo: titulo,
      url: blogUrl,
      estado: "Programado",
    }, nextRow);

    // 5. Guardar en KV para el historial de artículos
    const id = `scheduled:${Date.now()}`;
    const entry = {
      id,
      status: "scheduled",
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      tono: tono || "",
      titulo,
      slug,
      metaDescription: extractMetaDescription(articulo),
      tags: extractTags(articulo),
      publishDate: publishDate.toISOString(),
      publishDateFormatted: fechaFormateada,
      dayName,
      sheetRow: nextRow,
      createdAt: new Date().toISOString(),
      contenidoMarkdown: articulo,
      contenidoHtml: htmlContent,
    };

    await saveScheduledRecord(entry);

    // 6. También guardar en historial general para que Claude no repita temas
    const articleId = `article:${Date.now()}`;
    await saveArticleRecord({
      id: articleId,
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      titulo,
      slug,
      tags: extractTags(articulo),
      fecha: new Date().toISOString().split("T")[0],
      contenido: articulo,
    });

    return res.status(200).json({
      scheduled: true,
      id,
      publishDate: fechaFormateada,
      dayName,
      titulo,
      sheetRow: nextRow,
      blogUrl,
    });
  } catch (err) {
    // El detalle (Google Sheets API incluida) queda en logs
    console.error("Schedule error:", err);
    return res.status(500).json({ error: "Error al programar el artículo. Revisa los logs del servidor." });
  }
}
