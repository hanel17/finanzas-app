import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, Edit2 } from 'lucide-react'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-DO')
const CATEGORIES = ['hogar','comida','transporte','servicios','salud','educacion','entretenimiento','tarjeta','diezmo','ahorro','gas','otros']
const CAT_ICONS = { hogar:'🏠', comida:'🍔', transporte:'🚗', servicios:'⚡', salud:'💊', educacion:'📚', entretenimiento:'🎬', tarjeta:'💳', diezmo:'🙏', ahorro:'🏦', gas:'⛽', otros:'📦' }

export default function FixedExpenses() {
  const { user } = useAuth()
  const [expenses, setExpenses] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [form, setForm] = useState({ name: '', amount: '', category: 'hogar', due_day: '' })

  const load = async () => {
    const { data } = await supabase.from('fixed_expenses').select('*').eq('user_id', user.id).order('created_at')
    setExpenses(data || [])
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.name || !form.amount) return
    await supabase.from('fixed_expenses').insert({ ...form, user_id: user.id, amount: Number(form.amount), due_day: form.due_day ? Number(form.due_day) : null })
    setForm({ name: '', amount: '', category: 'hogar', due_day: '' })
    setShowForm(false)
    load()
  }

  const handleEdit = (e) => {
    setEditingId(e.id)
    setEditForm({ name: e.name, amount: e.amount, category: e.category, due_day: e.due_day || '' })
  }

  const handleUpdate = async () => {
    await supabase.from('fixed_expenses').update({ ...editForm, amount: Number(editForm.amount), due_day: editForm.due_day ? Number(editForm.due_day) : null }).eq('id', editingId)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('fixed_expenses').delete().eq('id', id)
    load()
  }

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const label = { fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ padding: 24, maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Gastos Fijos 📌</h1>
          <p style={{ color: 'var(--text2)', fontSize: 13, marginTop: 4 }}>Compromisos que se repiten cada ciclo</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 13, color: 'var(--text2)' }}>Total comprometido mensual</span>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--yellow)' }}>RD${fmt(total)}</span>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nuevo gasto fijo</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1/-1' }}><label style={label}>Nombre</label><input placeholder="Casa, préstamo, gym..." value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
            <div><label style={label}>Monto (RD$)</label><input type="number" placeholder="10000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} /></div>
            <div><label style={label}>Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
              </select>
            </div>
            <div><label style={label}>Día de vencimiento (opcional)</label><input type="number" min="1" max="31" placeholder="Ej: 10" value={form.due_day} onChange={e => setForm({...form, due_day: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)', border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, padding: 10, cursor: 'pointer' }}>Guardar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {expenses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📌</div>
            <p style={{ fontSize: 13 }}>Sin gastos fijos. Agrega los compromisos que pagas cada mes.</p>
          </div>
        ) : expenses.map(e => (
          <div key={e.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            {editingId === e.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div style={{ gridColumn: '1/-1' }}><label style={label}>Nombre</label><input value={editForm.name} onChange={x => setEditForm({...editForm, name: x.target.value})} style={{ fontSize: 13 }} /></div>
                  <div><label style={label}>Monto (RD$)</label><input type="number" value={editForm.amount} onChange={x => setEditForm({...editForm, amount: x.target.value})} style={{ fontSize: 13 }} /></div>
                  <div><label style={label}>Categoría</label>
                    <select value={editForm.category} onChange={x => setEditForm({...editForm, category: x.target.value})} style={{ fontSize: 13 }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                    </select>
                  </div>
                  <div><label style={label}>Día vencimiento</label><input type="number" min="1" max="31" value={editForm.due_day} onChange={x => setEditForm({...editForm, due_day: x.target.value})} style={{ fontSize: 13 }} /></div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleUpdate} style={{ flex: 1, background: 'var(--green)', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {CAT_ICONS[e.category] || '📦'}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text3)' }}>
                      {e.category}{e.due_day ? ` · Vence día ${e.due_day}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--yellow)' }}>RD${fmt(Number(e.amount))}</span>
                  <button onClick={() => handleEdit(e)} style={{ background: 'transparent', color: 'var(--text3)', border: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={15}/></button>
                  <button onClick={() => handleDelete(e.id)} style={{ background: 'transparent', color: 'var(--text3)', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={15}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
