import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
export const useAuth = () => useContext(AuthContext)

// Un error de red (sin conexión) no significa que la sesión expiró:
// en ese caso no cerramos la sesión.
const isNetworkError = (error) => error?.name === 'AuthRetryableFetchError' || error?.status === 0

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [sessionExpired, setSessionExpired] = useState(false)
  const manualSignOut = useRef(false)

  useEffect(() => {
    let active = true

    // Al abrir la app: validar la sesión guardada con el servidor (getUser),
    // no solo con lo que hay en el navegador (getSession).
    const init = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      if (!session) {
        if (active) {
          if (sessionError && !isNetworkError(sessionError)) setSessionExpired(true)
          setUser(null)
          setLoading(false)
        }
        return
      }

      const { data, error } = await supabase.auth.getUser()
      if (!active) return
      if (error && !isNetworkError(error)) {
        // Sesión vencida o inválida: limpiar y pedir iniciar sesión otra vez.
        await supabase.auth.signOut({ scope: 'local' })
        if (!active) return
        setSessionExpired(true)
        setUser(null)
      } else {
        setUser(data?.user ?? session.user)
      }
      setLoading(false)
    }
    init()

    // Escuchar cambios: si Supabase cierra la sesión sin que el usuario
    // lo pidiera (no se pudo renovar el token, 401 del servidor, etc.),
    // se marca como expirada.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        if (!manualSignOut.current) setSessionExpired(true)
        manualSignOut.current = false
        setUser(null)
        return
      }
      if (event === 'SIGNED_IN') setSessionExpired(false)
      if (event === 'INITIAL_SESSION') return // lo maneja init()
      if (!session) setSessionExpired(true)
      setUser(session?.user ?? null)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) { setSessionExpired(false); setUser(data?.user ?? null) }
    return { data, error }
  }

  const signOut = async () => {
    manualSignOut.current = true
    await supabase.auth.signOut()
    setSessionExpired(false)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, sessionExpired, signUp, signIn, signOut }}>
      {!loading && children}
    </AuthContext.Provider>
  )
}
