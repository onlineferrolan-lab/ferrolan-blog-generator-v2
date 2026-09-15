// ─── lib/kv.js ───────────────────────────────────────────────────────────────
// Cliente único de Vercel KV / Upstash Redis para toda la app.
//
// @vercel/kv quedó deprecado (los stores se movieron a Upstash). Migramos a
// @upstash/redis SIN cambiar nada en Vercel: el cliente lee las MISMAS
// variables que ya estaban configuradas (KV_REST_API_URL / KV_REST_API_TOKEN),
// que apuntan al mismo store Upstash de siempre.
//
// El cliente se crea de forma perezosa (en el primer comando), igual que hacía
// @vercel/kv, para que `next build` no falle en entornos sin las variables
// (build local, CI). Los comandos usados (get, set, lpush, lrange, lrem, del,
// hgetall, hset, hdel) tienen la misma firma en ambos clientes, y la
// deserialización automática de JSON también coincide.

import { Redis } from "@upstash/redis";

let client = null;

function getClient() {
  if (client) return client;
  // Quique usa un almacén aislado para no sobrescribir la integración KV
  // histórica del proyecto. Conservamos los nombres antiguos como fallback
  // para instalaciones que todavía dependan de ellos.
  const url = process.env.QUIQUE_KV_REST_API_URL || process.env.KV_REST_API_URL;
  const token = process.env.QUIQUE_KV_REST_API_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "KV no configurado: faltan QUIQUE_KV_REST_API_URL / QUIQUE_KV_REST_API_TOKEN"
    );
  }
  client = new Redis({ url, token });
  return client;
}

// Proxy que difiere la instanciación del cliente hasta el primer uso.
export const kv = new Proxy(
  {},
  {
    get(_target, prop) {
      const c = getClient();
      const value = c[prop];
      return typeof value === "function" ? value.bind(c) : value;
    },
  }
);
