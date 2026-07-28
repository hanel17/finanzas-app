import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2 } from 'lucide-react'

const CATEGORIES = ['hogar','comida','transporte','servicios','salud','educacion','entretenimiento','tarjeta','diezmo','ahorro','otros']

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ type: 'expense', amount: '', description: '', category: 'otros', date: new Date().toISOString().split('T')[0] })

  const load = async () => {
    const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false })
    setTransactions(data || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.amount || !form.description) return
    await supabase.from('transactions').insert({ ...form, user_id: user.id, amount: Number(form.amount) })
    setForm({ type: 'expense', amount: '', description: '', category: 'otros', date: new Date().toISOString().split('T')[0] })
    setShowForm(false)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount), 0)
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Movimientos</h1>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Registro de ingresos y gastos</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>Total ingresos</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>+RD${totalIncome.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>Total gastos</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>-RD${totalExpense.toLocaleString()}</div>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nuevo movimiento</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Tipo</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Monto (RD$)</label>
              <input type="number" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} placeholder="0" />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Descripción</label>
              <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Uber, supermercado..." />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Categoría</label>
              <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }}>Fecha</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600 }}>Guardar</button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {loading ? <div style={{ padding: 20, color: 'var(--gray)' }}>Cargando...</div> :
         transactions.length === 0 ? <div style={{ padding: 40, textAlign: 'center', color: 'var(--gray)' }}>Sin movimientos aún. Agrega el primero.</div> :
         transactions.map((t, i) => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: t.type === 'income' ? 'rgba(34,197,94,.1)' : 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
                {t.type === 'income' ? '↑' : '↓'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
                <div style={{ fontSize: 11, color: 'var(--gray)' }}>{t.category} · {t.date}</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
                {t.type === 'income' ? '+' : '-'}RD${Number(t.amount).toLocaleString()}
              </span>
              <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', color: 'var(--gray)', padding: 4 }}>
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
