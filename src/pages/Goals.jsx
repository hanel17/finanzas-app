import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Target } from 'lucide-react'

export default function Goals() {
  const { user } = useAuth()
  const [goals, setGoals] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [addingTo, setAddingTo] = useState(null)
  const [addAmount, setAddAmount] = useState('')
  const [form, setForm] = useState({ name: '', target_amount: '', current_amount: '0', target_date: '' })

  const load = async () => {
    const { data } = await supabase.from('savings_goals').select('*').eq('user_id', user.id)
    setGoals(data || [])
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.target_amount) return
    await supabase.from('savings_goals').insert({ ...form, user_id: user.id })
    setForm({ name: '', target_amount: '', current_amount: '0', target_date: '' })
    setShowForm(false)
    load()
  }

  const handleAddSavings = async (goal) => {
    const newAmount = Number(goal.current_amount) + Number(addAmount)
    await supabase.from('savings_goals').update({ current_amount: newAmount }).eq('id', goal.id)
    setAddingTo(null)
    setAddAmount('')
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('savings_goals').delete().eq('id', id)
    load()
  }

  const label = { fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Metas de ahorro</h1>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Crea y sigue tus metas financieras</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Nueva meta
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nueva meta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Nombre de la meta</label><input placeholder="Vacaciones, emergencia..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label style={label}>Monto objetivo (RD$)</label><input type="number" placeholder="20000" value={form.target_amount} onChange={e => setForm({...form, target_amount: e.target.value})} /></div>
            <div><label style={label}>Ya tengo ahorrado (RD$)</label><input type="number" placeholder="0" value={form.current_amount} onChange={e => setForm({...form, current_amount: e.target.value})} /></div>
            <div><label style={label}>Fecha objetivo</label><input type="date" value={form.target_date} onChange={e => setForm({...form, target_date: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600 }}>Guardar meta</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {goals.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
            <Target size={32} style={{ margin: '0 auto 12px', opacity: .4 }} />
            <p>No tienes metas aún. Crea la primera.</p>
          </div>
        ) : goals.map(g => {
          const pct = (Number(g.current_amount) / Number(g.target_amount)) * 100
          const remaining = Number(g.target_amount) - Number(g.current_amount)
          return (
            <div key={g.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{g.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 2 }}>Meta: {g.target_date}</div>
                </div>
                <button onClick={() => handleDelete(g.id)} style={{ background: 'transparent', color: 'var(--gray)', padding: 4 }}><Trash2 size={16} /></button>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                <span style={{ color: 'var(--green)', fontWeight: 600 }}>RD${Number(g.current_amount).toLocaleString()}</span>
                <span style={{ color: 'var(--gray)' }}>de RD${Number(g.target_amount).toLocaleString()}</span>
              </div>
              <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, marginBottom: 8 }}>
                <div style={{ width: `${Math.min(pct,100)}%`, height: '100%', background: pct >= 100 ? 'var(--green)' : 'var(--blue)', borderRadius: 4, transition: 'width .3s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray)', marginBottom: 12 }}>
                <span>{pct.toFixed(1)}% completado</span>
                <span>Falta: RD${remaining.toLocaleString()}</span>
              </div>
              {addingTo === g.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input type="number" placeholder="Monto a agregar" value={addAmount} onChange={e => setAddAmount(e.target.value)} style={{ flex: 1 }} />
                  <button onClick={() => handleAddSavings(g)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, padding: '8px 14px' }}>Agregar</button>
                  <button onClick={() => setAddingTo(null)} style={{ background: 'var(--bg3)', color: 'var(--text)', padding: '8px 14px' }}>X</button>
                </div>
              ) : (
                <button onClick={() => setAddingTo(g.id)} style={{ width: '100%', background: 'rgba(34,197,94,.1)', color: 'var(--green)', border: '1px solid rgba(34,197,94,.3)', fontWeight: 500 }}>
                  + Agregar ahorro
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
