// Lógica compartida del proxy de IA (Google Gemini, endpoint compatible con OpenAI).
// No depende de la plataforma: solo usa fetch y APIs web estándar, así que
// sirve tanto para Vercel (api/ai.js) como para Cloudflare Pages (functions/api/ai.js).
// Vercel ignora los archivos que empiezan con "_", así que esto no es una ruta.
//
// handleAiRequest(body, authHeader, env) -> { status, json }
//   body:       objeto ya parseado (o null si el JSON es inválido)
//   authHeader: valor del header Authorization ("Bearer <token de Supabase>")
//   env:        { GEMINI_API_KEY, GEMINI_MODEL?, SUPABASE_URL?, SUPABASE_ANON_KEY? }

const DEFAULT_SUPABASE_URL = 'https://uslbqzhdfisnwafmfuoa.supabase.co'
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzbGJxemhkZmlzbndhZm1mdW9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUyMzIyODUsImV4cCI6MjEwMDgwODI4NX0.HDTeXkbYC1xenYN_yaUCCTFg9Go3_crEh984C6Hqzhs'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
export const ALLOWED_MODELS = ['gemini-3.5-flash-lite', 'gemini-3.8-flash']
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

const fail = (status, message) => ({ status, json: { error: { message } } })

async function getUser(token, env) {
  const supabaseUrl = env.SUPABASE_URL || DEFAULT_SUPABASE_URL
  const anonKey = env.SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY
  const r = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  })
  if (!r.ok) return null
  const user = await r.json().catch(() => null)
  return user && user.id ? user : null
}

export async function handleAiRequest(body, authHeader, env = {}, deps = {}) {
  const verifyUser = deps.getUser || getUser

  const apiKey = env.GEMINI_API_KEY
  if (!apiKey) return fail(500, 'GEMINI_API_KEY no está configurada en el servidor.')

  const auth = authHeader || ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!token) return fail(401, 'Debes iniciar sesión.')

  let user
  try {
    user = await verifyUser(token, env)
  } catch {
    return fail(502, 'No se pudo verificar la sesión.')
  }
  if (!user) return fail(401, 'Sesión inválida o expirada.')

  if (!body || !Array.isArray(body.messages) || body.messages.length === 0) {
    return fail(400, 'Solicitud inválida.')
  }
  if (body.messages.length > MAX_MESSAGES) return fail(400, 'Demasiados mensajes.')

  let totalChars = 0
  const messages = []
  for (const m of body.messages) {
    if (!m || !ALLOWED_ROLES.includes(m.role) || typeof m.content !== 'string') {
      return fail(400, 'Mensaje inválido.')
    }
    totalChars += m.content.length
    messages.push({ role: m.role, content: m.content })
  }
  if (totalChars > MAX_TOTAL_CHARS) return fail(413, 'El texto enviado es demasiado largo.')

  // Principal: gemini-3.5-flash-lite (rápido). GEMINI_MODEL puede cambiarlo.
  const defaultModel = ALLOWED_MODELS.includes(env.GEMINI_MODEL) ? env.GEMINI_MODEL : 'gemini-3.5-flash-lite'
  const model = ALLOWED_MODELS.includes(body.model) ? body.model : defaultModel
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
  // Respaldo: el otro modelo permitido (gemini-3.8-flash si el principal es flash-lite)
  const fallbackModel = ALLOWED_MODELS.find(m => m !== model)
  if (result.timedOut || result.networkError || RETRY_STATUSES.includes(result.status)) {
    console.warn(`Gemini ${model} falló (${result.timedOut ? 'timeout' : result.status || 'red'}), reintentando con ${fallbackModel}`)
    result = await callGemini(apiKey, { ...basePayload, model: fallbackModel })
  }

  if (result.timedOut) return fail(504, 'El asistente tardó demasiado en responder. Intenta de nuevo.')
  if (result.networkError) return fail(502, 'No se pudo conectar con Gemini.')
  return { status: result.status, json: result.data }
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
