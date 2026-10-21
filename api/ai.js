// Proxy seguro hacia Google Gemini (endpoint compatible con OpenAI).
// La clave vive solo en el servidor (GEMINI_API_KEY) y solo usuarios con
// sesión válida de Supabase pueden usarlo. Recibe y devuelve el mismo formato
// estilo OpenAI (messages -> choices[0].message.content).

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://uslbqzhdfisnwafmfuoa.supabase.co'
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGJxemhkZmlzbndhZm1mdW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzIyODUsImV4cCI6MjEwMDgwODI4NX0.HDTeXkbYC1xenYN_yaUCCTFg9Go3_crEh984C6Hqzhs'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
const FALLBACK_MODEL = 'gemini-3.5-flash-lite'
const ALLOWED_MODELS = ['gemini-3.8-flash', FALLBACK_MODEL]
const DEFAULT_MODEL = ALLOWED_MODELS.includes(process.env.GEMINI_MODEL) ? process.env.GEMINI_MODEL : 'gemini-3.8-flash'
// Tiempo máximo por intento. Con el reintento queda dentro de maxDuration (60s, vercel.json).
const ATTEMPT_TIMEOUT_MS = 20000
// Errores con los que se reintenta una vez con el modelo de respaldo
const RETRY_STATUSES = [404, 429, 500, 503]
// En Gemini, los tokens de "pensamiento" cuentan dentro de max_tokens.
// Se suma este margen para que la respuesta visible no se corte.
const THINKING_HEADROOM = 2048
const DEFAULT_MAX_TOKENS = 1024
const MAX_TOKENS_LIMIT = 8192
const MAX_MESSAGES = 40
const MAX_TOTAL_CHARS = 60000
const ALLOWED_ROLES = ['system', 'user', 'assistant']

async function getUser(token) {
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` }
  })
  if (!r.ok) return null
  const user = await r.json().catch(() => null)
  return user && user.id ? user : null
}

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

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'GEMINI_API_KEY no está configurada en el servidor.' } })
  }

  const auth = req.headers.authorization || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return res.status(401).json({ error: { message: 'Debes iniciar sesión.' } })

  let user
  try {
    user = await getUser(token)
  } catch {
    return res.status(502).json({ error: { message: 'No se pudo verificar la sesión.' } })
  }
  if (!user) return res.status(401).json({ error: { message: 'Sesión inválida o expirada.' } })

  const body = parseBody(req)
  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return res.status(400).json({ error: { message: 'Solicitud inválida.' } })
  }
  if (body.messages.length > MAX_MESSAGES) {
    return res.status(400).json({ error: { message: 'Demasiados mensajes.' } })
  }

  let totalChars = 0
  const messages = []
  for (const m of body.messages) {
    if (!m || !ALLOWED_ROLES.includes(m.role) || typeof m.content !== 'string') {
      return res.status(400).json({ error: { message: 'Mensaje inválido.' } })
    }
    totalChars += m.content.length
    messages.push({ role: m.role, content: m.content })
  }
  if (totalChars > MAX_TOTAL_CHARS) {
    return res.status(413).json({ error: { message: 'El texto enviado es demasiado largo.' } })
  }

  const model = ALLOWED_MODELS.includes(body.model) ? body.model : DEFAULT_MODEL
  const requested = Number.parseInt(body.max_tokens, 10)
  const max_tokens = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MAX_TOKENS_LIMIT)
    : DEFAULT_MAX_TOKENS

  const basePayload = { messages, max_tokens: max_tokens + THINKING_HEADROOM, reasoning_effort: 'low' }
  if (typeof body.temperature === 'number') {
    basePayload.temperature = Math.min(Math.max(body.temperature, 0), 2)
  }
  if (body.response_format && body.response_format.type === 'json_object') {
    basePayload.response_format = { type: 'json_object' }
  }

  let result = await callGemini(apiKey, { ...basePayload, model })
  if (model !== FALLBACK_MODEL && (result.timedOut || result.networkError || RETRY_STATUSES.includes(result.status))) {
    console.warn(`Gemini ${model} falló (${result.timedOut ? 'timeout' : result.status || 'red'}), reintentando con ${FALLBACK_MODEL}`)
    result = await callGemini(apiKey, { ...basePayload, model: FALLBACK_MODEL })
  }

  if (result.timedOut) {
    return res.status(504).json({ error: { message: 'El asistente tardó demasiado en responder. Intenta de nuevo.' } })
  }
  if (result.networkError) {
    return res.status(502).json({ error: { message: 'No se pudo conectar con Gemini.' } })
  }
  return res.status(result.status).json(result.data)
}

async function callGemini(apiKey, payload) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS)
  try {
    const r = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    const data = await r.json().catch(() => ({ error: { message: 'Respuesta inválida de Gemini.' } }))
    // Gemini a veces responde como lista de errores; normalizar a { error: { message } }
    const out = Array.isArray(data) ? (data[0] || {}) : (data || {})
    if (!r.ok && !out.error) out.error = { message: 'Error del servicio de IA.' }
    if (!r.ok && typeof out.error === 'object' && !out.error.message) out.error.message = 'Error del servicio de IA.'
    return { status: r.status, data: out, model: payload.model }
  } catch (e) {
    if (e && e.name === 'AbortError') return { timedOut: true, model: payload.model }
    return { networkError: true, model: payload.model }
  } finally {
    clearTimeout(timer)
  }
}
