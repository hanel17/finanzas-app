import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-DO')

export default function Savings() {
  const { user } = useAuth()
  const [savings, setSavings] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'deposit', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
  const [loading, setLoading] = useState(false)

  const load = async () => {
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id || user?.id
    if (!uid) return
    const { data } = await supabase.from('savings').select('*').eq('user_id', uid).order('date', { ascending: false })
    setSavings(data || [])
  }

  useEffect(() => { load() }, [])

  const handleSave = async () => {
    if (!form.amount) return
    setLoading(true)
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id || user?.id
    if (!uid) { setLoading(false); return }
    await supabase.from('savings').insert({ ...form, user_id: uid, amount: Number(form.amount) })
    setForm({ type: 'deposit', amount: '', description: '', date: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    setLoading(false)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('savings').delete().eq('id', id)
    load()
  }

  const totalDeposits = savings.filter(s => s.type === 'deposit').reduce((sum, s) => sum + Number(s.amount), 0)
  const totalWithdrawals = savings.filter(s => s.type === 'withdrawal').reduce((sum, s) => sum + Number(s.amount), 0)
  const totalSavings = totalDeposits - totalWithdrawals

  const label = { fontSize: 12, color: '#94a3b8', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Ahorros 🏦</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Independiente de tus ciclos financieros</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: '#10b981', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          <Plus size={16} /> Registrar
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <div style={{ background: '#0f172a', border: '2px solid #10b98140', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <PiggyBank size={18} color="#10b981" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Total ahorrado</span>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#10b981' }}>RD${fmt(totalSavings)}</div>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>Tu patrimonio guardado</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingUp size={18} color="#10b981" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Total depositado</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>RD${fmt(totalDeposits)}</div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <TrendingDown size={18} color="#f43f5e" />
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Total retirado</span>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f43f5e' }}>RD${fmt(totalWithdrawals)}</div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 14, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: '#fff' }}>Nuevo registro</h3>
          <div style={{ display: 'flex', background: '#1e293b', borderRadius: 10, padding: 3, marginBottom: 16, gap: 3 }}>
            {['deposit', 'withdrawal'].map(t => (
              <button key={t} onClick={() => setForm({...form, type: t})}
                style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all .2s',
                  background: form.type === t ? (t === 'deposit' ? '#10b981' : '#f43f5e') : 'transparent',
                  color: form.type === t ? '#000' : '#94a3b8' }}>
                {t === 'deposit' ? '↑ Depositar' : '↓ Retirar'}
              </button>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={label}>Monto (RD$)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})}
                placeholder="5000" style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '12px 14px', fontSize: 20, fontWeight: 700, width: '100%', outline: 'none' }} />
            </div>
            <div>
              <label style={label}>Descripción</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                placeholder="Fondo emergencia, vacaciones..."
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }} />
            </div>
            <div>
              <label style={label}>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})}
                style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 14, width: '100%', outline: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)}
              style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 14 }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={loading || !form.amount}
              style={{ flex: 2, background: form.type === 'deposit' ? '#10b981' : '#f43f5e', color: '#000', border: 'none', borderRadius: 8, padding: 12, cursor: 'pointer', fontSize: 14, fontWeight: 700, opacity: !form.amount ? 0.5 : 1 }}>
              {loading ? 'Guardando...' : form.type === 'deposit' ? 'Depositar' : 'Retirar'}
            </button>
          </div>
        </div>
      )}

      {/* History */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {savings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#475569' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🏦</div>
            <p style={{ fontSize: 14 }}>No tienes ahorros registrados aún.</p>
            <p style={{ fontSize: 13, marginTop: 4 }}>Usa el botón "Enviar a ahorros" en el Dashboard.</p>
          </div>
        ) : savings.map((s, i) => (
          <div key={s.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: s.type === 'deposit' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                {s.type === 'deposit' ? '↑' : '↓'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#e2e8f0' }}>{s.description || (s.type === 'deposit' ? 'Depósito' : 'Retiro')}</div>
                <div style={{ fontSize: 11, color: '#475569' }}>{s.date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: s.type === 'deposit' ? '#10b981' : '#f43f5e' }}>
                {s.type === 'deposit' ? '+' : '-'}RD${fmt(Number(s.amount))}
              </span>
              <button onClick={() => handleDelete(s.id)}
                style={{ background: 'transparent', color: '#475569', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16 }}>
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
