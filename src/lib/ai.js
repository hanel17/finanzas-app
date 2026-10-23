import { supabase } from './supabase'

const EXPIRED_MSG = 'Tu sesión expiró. Inicia sesión de nuevo.'

// Cierra la sesión local; AuthContext detecta el SIGNED_OUT y manda a /login.
const expireSession = async () => {
  await supabase.auth.signOut({ scope: 'local' })
  throw new Error(EXPIRED_MSG)
}

// Llama a la IA (Gemini) a través de la función del servidor (/api/ai).
// La clave de Gemini nunca llega al navegador; se envía el token de sesión
// del usuario para que el servidor verifique que está autenticado.
export async function aiChat(payload) {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) return expireSession()

  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  })
  if (res.status === 401) return expireSession()
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}
