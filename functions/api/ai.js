// Proxy seguro hacia Google Gemini — adaptador para Cloudflare Pages Functions.
// Las variables (GEMINI_API_KEY, GEMINI_MODEL, SUPABASE_URL, SUPABASE_ANON_KEY)
// vienen de context.env (Settings > Variables and Secrets del proyecto de Pages).
// La lógica está en api/_lib/ai-core.js (compartida con Vercel).

import { handleAiRequest } from '../../api/_lib/ai-core.js'

const json = (status, data, headers = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...headers }
  })

export async function onRequestPost({ request, env }) {
  let body = null
  try { body = await request.json() } catch { body = null }
  const { status, json: data } = await handleAiRequest(body, request.headers.get('Authorization') || '', env)
  return json(status, data)
}

// Cualquier otro método: 405 (onRequestPost tiene prioridad para POST)
export function onRequest() {
  return json(405, { error: { message: 'Método no permitido.' } }, { Allow: 'POST' })
}
