import { kv } from "@vercel/kv";
import { google } from "googleapis";

// ─── Schedule Article API ──────────────────────────────────────────────────
// 1. Guarda el artículo en KV con estado "programado" y fecha de publicación
// 2. Crea un evento en Google Calendar para esa fecha/hora
// 3. El cron job /api/cron/publish se encarga de publicar en WordPress

function extractSlug(text) {
  const match = text.match(/slug[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : null;
}

function extractTitle(text) {
  const match = text.match(/^#\s+(.+)/m);
  return match ? match[1].trim() : null;
}

function extractMetaDescription(text) {
  const match = text.match(/meta\s*descripci[oó]n[^:]*:\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

function extractTags(text) {
  const match = text.match(/etiquetas?[^:]*:\s*([^\n]+)/i);
  if (!match) return [];
  return match[1].split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
}

// ─── Markdown → HTML básico para WordPress ─────────────────────────────────

function markdownToHtml(md) {
  // Separar el bloque META SEO (todo después de --- final)
  const parts = md.split(/\n---\n/);
  const content = parts[0]; // Solo el contenido, no el bloque meta

  let html = content
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => {
      const fullUrl = url.startsWith("/") ? `https://ferrolan.es${url}` : url;
      return `<a href="${fullUrl}">${text}</a>`;
    })
    .replace(/^- (.+)$/gm, "<li>$1</li>");

  html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, "<ul>\n$1</ul>\n");

  const lines = html.split("\n");
  const result = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^<(h[1-6]|ul|li|hr|p|\/p|\/ul)/.test(trimmed)) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  return result.join("\n")
    .replace(/<p><h/g, "<h")
    .replace(/<\/h([1-6])><\/p>/g, "</h$1>")
    .replace(/<p><ul>/g, "<ul>")
    .replace(/<\/ul><\/p>/g, "</ul>")
    .replace(/<p>\s*<\/p>/g, "");
}

// ─── Google Calendar ────────────────────────────────────────────────────────

async function createCalendarEvent(titulo, publishDate, slug) {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_PRIVATE_KEY;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!email || !key || !calendarId) {
    console.log("Google Calendar not configured — skipping event creation");
    return null;
  }

  const auth = new google.auth.JWT(email, null, key.replace(/\\n/g, "\n"), [
    "https://www.googleapis.com/auth/calendar.events",
  ]);

  const calendar = google.calendar({ version: "v3", auth });

  const startTime = new Date(publishDate);
  const endTime = new Date(startTime.getTime() + 30 * 60000); // 30 min duration

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: `📝 Blog: ${titulo}`,
      description: [
        `Artículo del blog de Ferrolan programado para publicación automática.`,
        ``,
        `Slug: ${slug || "pendiente"}`,
        ``,
        `⚡ Este artículo se publicará automáticamente en WordPress a esta hora.`,
      ].join("\n"),
      start: { dateTime: startTime.toISOString(), timeZone: "Europe/Madrid" },
      end: { dateTime: endTime.toISOString(), timeZone: "Europe/Madrid" },
      colorId: "11", // Rojo — Ferrolan brand
      reminders: {
        useDefault: false,
        overrides: [
          { method: "popup", minutes: 60 },
          { method: "popup", minutes: 10 },
        ],
      },
    },
  });

  return event.data;
}

// ─── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { tema, categoria, keywords, tono, articulo, publishDate } = req.body;

  if (!articulo || !tema || !publishDate) {
    return res.status(400).json({ error: "Faltan datos: tema, artículo y fecha de publicación son obligatorios" });
  }

  try {
    const titulo = extractTitle(articulo) || tema;
    const slug = extractSlug(articulo);
    const htmlContent = markdownToHtml(articulo);

    const id = `scheduled:${Date.now()}`;
    const entry = {
      id,
      status: "scheduled", // scheduled → published → failed
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      tono: tono || "",
      titulo,
      slug,
      metaDescription: extractMetaDescription(articulo),
      tags: extractTags(articulo),
      publishDate, // ISO string: "2026-03-15T10:00:00"
      createdAt: new Date().toISOString(),
      contenidoMarkdown: articulo,
      contenidoHtml: htmlContent,
      calendarEventId: null,
      wpPostId: null,
    };

    // 1. Guardar en KV
    await kv.set(id, JSON.stringify(entry));
    await kv.lpush("scheduled:index", id);

    // 2. Crear evento en Google Calendar (no bloquea si falla)
    try {
      const event = await createCalendarEvent(titulo, publishDate, slug);
      if (event) {
        entry.calendarEventId = event.id;
        await kv.set(id, JSON.stringify(entry));
      }
    } catch (calErr) {
      console.error("Calendar event error (non-blocking):", calErr.message);
    }

    // 3. También guardar en el historial general de artículos para que Claude no repita temas
    const articleId = `article:${Date.now()}`;
    const articleEntry = {
      id: articleId,
      tema,
      categoria: categoria || "",
      keywords: keywords || "",
      titulo,
      slug,
      tags: extractTags(articulo),
      fecha: new Date().toISOString().split("T")[0],
      contenido: articulo,
    };
    await kv.set(articleId, JSON.stringify(articleEntry));
    await kv.lpush("articles:index", articleId);

    return res.status(200).json({
      scheduled: true,
      id,
      publishDate,
      titulo,
      calendarEvent: !!entry.calendarEventId,
    });
  } catch (err) {
    console.error("Schedule error:", err);
    return res.status(500).json({ error: "Error al programar el artículo: " + err.message });
  }
}
