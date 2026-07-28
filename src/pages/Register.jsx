import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const [form, setForm] = useState({ fullName: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signUp(form.email, form.password, form.fullName)
    if (error) { setError(error.message); setLoading(false) }
    else navigate('/onboarding')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ width: 380, background: 'var(--bg2)', borderRadius: 16, padding: 32, border: '1px solid var(--border)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>💰</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)' }}>Crear cuenta</h1>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Empieza a controlar tus finanzas</p>
        </div>
        {error && <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 12px', color: 'var(--red)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Nombre completo</label>
            <input type="text" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} placeholder="Hanel Ramírez" required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="tu@email.com" required />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Contraseña</label>
            <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Mínimo 6 caracteres" required minLength={6} />
          </div>
          <button type="submit" disabled={loading}
            style={{ background: 'var(--green)', color: '#000', fontWeight: 600, padding: '12px', marginTop: 4 }}>
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>
        <p style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--gray)' }}>
          Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  )
}
