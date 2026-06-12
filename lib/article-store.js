// ─── lib/article-store.js ────────────────────────────────────────────────────
// Acceso centralizado a los artículos en Vercel KV.
//
// PROBLEMA que resuelve: el patrón original era lrange(índice) + un kv.get POR
// CADA id (N+1 sobre REST). Con cientos de artículos, cada listado/historial
// disparaba cientos de comandos. Además los registros completos llevan el
// contenido del artículo, que casi ningún lector necesita.
//
// SOLUCIÓN: un hash de metadatos por colección (articles:meta, scheduled:meta,
// wp:posts:meta) que se lee entero con UN hgetall. Los registros completos
// (con contenido) se mantienen como hasta ahora en claves sueltas.
//
// MIGRACIÓN: perezosa. Si el hash no existe aún, se carga por el camino
// antiguo, se puebla el hash y las siguientes lecturas ya son O(1) comandos.

import { kv } from "./kv";

const ARTICLES_INDEX = "articles:index";
const ARTICLES_META = "articles:meta";
const SCHEDULED_INDEX = "scheduled:index";
const SCHEDULED_META = "scheduled:meta";
const WP_POSTS_INDEX = "wp:posts:index";
const WP_POSTS_META = "wp:posts:meta";

function parseRecord(raw) {
  if (!raw) return null;
  return typeof raw === "string" ? JSON.parse(raw) : raw;
}

/** Quita los campos pesados de un registro para guardarlo como metadato. */
export function toArticleMeta(entry) {
  if (!entry || typeof entry !== "object") return entry;
  const { contenido, contenidoMarkdown, contenidoHtml, ...meta } = entry;
  return meta;
}

// ─── Lectura genérica hash + backfill desde el formato antiguo ──────────────

async function legacyLoad(indexKey, keyFn) {
  const ids = await kv.lrange(indexKey, 0, -1);
  if (!ids || ids.length === 0) return [];
  const records = await Promise.all(ids.map((id) => kv.get(keyFn ? keyFn(id) : id)));
  return records.map(parseRecord).filter(Boolean);
}

async function loadMeta(metaKey, indexKey, keyFn) {
  // 1. Hash de metadatos: un solo comando
  try {
    const hash = await kv.hgetall(metaKey);
    if (hash && Object.keys(hash).length > 0) {
      return Object.values(hash).map(parseRecord).filter(Boolean);
    }
  } catch {
    // seguimos por el camino antiguo
  }

  // 2. Backfill: cargar como antes y poblar el hash para la próxima vez
  const full = await legacyLoad(indexKey, keyFn);
  if (full.length > 0) {
    try {
      const hash = {};
      for (const e of full) {
        const id = e.id != null ? String(e.id) : null;
        if (id) hash[id] = toArticleMeta(e);
      }
      if (Object.keys(hash).length > 0) await kv.hset(metaKey, hash);
    } catch {
      // si no se puede poblar, la próxima lectura volverá a intentarlo
    }
  }
  return full.map(toArticleMeta);
}

// ─── Artículos generados por la app ─────────────────────────────────────────

/** Metadatos de todos los artículos (sin contenido). Un comando KV. */
export function getArticlesMeta() {
  return loadMeta(ARTICLES_META, ARTICLES_INDEX);
}

/** Guarda un artículo: registro completo + índice + hash de metadatos. */
export async function saveArticleRecord(entry) {
  await kv.set(entry.id, JSON.stringify(entry));
  await kv.lpush(ARTICLES_INDEX, entry.id);
  try {
    await kv.hset(ARTICLES_META, { [entry.id]: toArticleMeta(entry) });
  } catch {
    // el backfill lo reparará en la siguiente lectura
  }
}

export async function deleteArticleRecord(id) {
  await kv.del(id);
  await kv.lrem(ARTICLES_INDEX, 0, id);
  try {
    await kv.hdel(ARTICLES_META, id);
  } catch {
    // tolerable: quedaría un metadato huérfano
  }
}

// ─── Artículos programados ──────────────────────────────────────────────────

export function getScheduledMeta() {
  return loadMeta(SCHEDULED_META, SCHEDULED_INDEX);
}

export async function saveScheduledRecord(entry) {
  await kv.set(entry.id, JSON.stringify(entry));
  await kv.lpush(SCHEDULED_INDEX, entry.id);
  try {
    await kv.hset(SCHEDULED_META, { [entry.id]: toArticleMeta(entry) });
  } catch {}
}

/** Actualiza un programado existente (p.ej. el cron al publicar). */
export async function updateScheduledRecord(entry) {
  await kv.set(entry.id, JSON.stringify(entry));
  try {
    await kv.hset(SCHEDULED_META, { [entry.id]: toArticleMeta(entry) });
  } catch {}
}

/** Registro completo (con contenido) de cualquier colección. */
export async function getFullRecord(id) {
  return parseRecord(await kv.get(id));
}

// ─── Posts de WordPress sincronizados ───────────────────────────────────────

export function getWpPostsMeta() {
  return loadMeta(WP_POSTS_META, WP_POSTS_INDEX, (id) => `wp:post:${id}`);
}

/** Reemplaza el snapshot completo de posts de WP (usado por el sync). */
export async function replaceWpPosts(records) {
  // Hash de metadatos: lectura O(1) comandos
  await kv.del(WP_POSTS_META);
  if (records.length > 0) {
    const hash = {};
    for (const r of records) hash[String(r.id)] = r;
    await kv.hset(WP_POSTS_META, hash);
  }

  // Formato antiguo (índice + clave por post), por compatibilidad
  await kv.del(WP_POSTS_INDEX);
  await Promise.all(records.map((r) => kv.set(`wp:post:${r.id}`, JSON.stringify(r))));
  if (records.length > 0) {
    await kv.lpush(WP_POSTS_INDEX, ...records.map((r) => String(r.id)).reverse());
  }
}
