// Proxy seguro hacia Google Gemini (endpoint compatible con OpenAI) — adaptador para Vercel.
// La clave vive solo en el servidor (GEMINI_API_KEY) y solo usuarios con
// sesión válida de Supabase pueden usarlo. Recibe y devuelve el mismo formato
// estilo OpenAI (messages -> choices[0].message.content).
// La lógica está en api/_lib/ai-core.js (compartida con Cloudflare Pages).

import { handleAiRequest } from './_lib/ai-core.js'

function parseBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  if (typeof req.body === 'string') {
    try { return JSON.parse(req.body) } catch { return null }
  }
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: { message: 'Método no permitido.' } })
  }

  const { status, json } = await handleAiRequest(parseBody(req), req.headers.authorization || '', process.env)
  return res.status(status).json(json)
}
