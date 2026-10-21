import { supabase } from './supabase'

// Llama a la IA (Gemini) a través de la función del servidor (/api/ai).
// La clave de Gemini nunca llega al navegador; se envía el token de sesión
// del usuario para que el servidor verifique que está autenticado.
export async function aiChat(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) throw new Error('Debes iniciar sesión para usar el asistente.')

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
