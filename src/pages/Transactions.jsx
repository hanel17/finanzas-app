import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { FinancialEngine } from '../services/FinancialEngine'
import { Plus, Trash2, Edit2, Filter } from 'lucide-react'
import QuickAdd from '../components/QuickAdd'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-DO')
const CATEGORIES = ['hogar','comida','transporte','servicios','salud','educacion','entretenimiento','tarjeta','diezmo','ahorro','ropa','gas','regalo','otros']
const CAT_ICONS = { comida:"🍔", transporte:"🚗", hogar:"🏠", servicios:"⚡", salud:"💊", educacion:"📚", entretenimiento:"🎬", tarjeta:"💳", diezmo:"🙏", ahorro:"🏦", ropa:"👕", gas:"⛽", regalo:"🎁", otros:"📦" }

export default function Transactions() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [cycleConfig, setCycleConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [filter, setFilter] = useState('cycle') // cycle | all | income | expense
  const [catFilter, setCatFilter] = useState('all')

  const load = useCallback(async () => {
    const { data: authData } = await supabase.auth.getUser()
    const uid = authData?.user?.id || user?.id
    if (!uid) return
    const [txRes, cfgRes] = await Promise.all([
      supabase.from('transactions').select('*').eq('user_id', uid).order('date', { ascending: false }),
      supabase.from('financial_cycles_config').select('*').eq('user_id', uid).maybeSingle()
    ])
    setTransactions(txRes.data || [])
    setCycleConfig(cfgRes.data)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const cycle = FinancialEngine.getCurrentCycle(cycleConfig)

  const handleEdit = (t) => {
    setEditingId(t.id)
    setEditForm({ type: t.type, amount: t.amount, description: t.description, category: t.category, date: t.date })
  }

  const handleUpdate = async () => {
    await supabase.from('transactions').update(editForm).eq('id', editingId)
    setEditingId(null)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('transactions').delete().eq('id', id)
    load()
  }

  // Filter transactions
  let filtered = transactions
  if (filter === 'cycle') filtered = filtered.filter(t => t.date >= cycle.startDate && t.date <= cycle.endDate)
  else if (filter === 'income') filtered = filtered.filter(t => t.type === 'income')
  else if (filter === 'expense') filtered = filtered.filter(t => t.type === 'expense')
  if (catFilter !== 'all') filtered = filtered.filter(t => t.category === catFilter)

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s,t) => s+Number(t.amount), 0)
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s,t) => s+Number(t.amount), 0)
  const cycleIncome = transactions.filter(t => t.date >= cycle.startDate && t.date <= cycle.endDate && t.type === 'income').reduce((s,t) => s+Number(t.amount), 0)
  const cycleExpense = transactions.filter(t => t.date >= cycle.startDate && t.date <= cycle.endDate && t.type === 'expense').reduce((s,t) => s+Number(t.amount), 0)

  const filterBtn = (val, label) => (
    <button onClick={() => setFilter(val)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600, transition: 'all .15s',
      background: filter === val ? '#10b981' : '#1e293b',
      color: filter === val ? '#000' : '#94a3b8' }}>
      {label}
    </button>
  )

  if (loading) return <div style={{ color: '#64748b', padding: 40 }}>Cargando...</div>

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff' }}>Movimientos</h1>
          <p style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Ciclo {cycle.formattedRange}</p>
        </div>
        <button onClick={() => setShowQuickAdd(true)}
          style={{ background: '#10b981', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Ingresos ciclo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>RD${fmt(cycleIncome)}</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Gastos ciclo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: '#f43f5e' }}>RD${fmt(cycleExpense)}</div>
        </div>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>Balance ciclo</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: cycleIncome-cycleExpense >= 0 ? '#10b981' : '#f43f5e' }}>
            RD${fmt(cycleIncome - cycleExpense)}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        {filterBtn('cycle', `📅 Este ciclo (${transactions.filter(t => t.date >= cycle.startDate && t.date <= cycle.endDate).length})`)}
        {filterBtn('all', '📋 Todos')}
        {filterBtn('income', '↑ Ingresos')}
        {filterBtn('expense', '↓ Gastos')}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        <button onClick={() => setCatFilter('all')} style={{ padding: '4px 10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 11, background: catFilter === 'all' ? '#334155' : '#1e293b', color: '#94a3b8' }}>
          Todas
        </button>
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCatFilter(c === catFilter ? 'all' : c)}
            style={{ padding: '4px 10px', borderRadius: 14, border: 'none', cursor: 'pointer', fontSize: 11, background: catFilter === c ? '#334155' : '#1e293b', color: catFilter === c ? '#fff' : '#64748b' }}>
            {CAT_ICONS[c]} {c}
          </button>
        ))}
      </div>

      {/* Transactions list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#475569' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
            <p style={{ fontSize: 14 }}>Sin movimientos {filter === 'cycle' ? 'en este ciclo' : ''}</p>
          </div>
        ) : filtered.map((t, i) => (
          <div key={t.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px' }}>
            {editingId === t.id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <select value={editForm.type} onChange={e => setEditForm({...editForm, type: e.target.value})}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                    <option value="expense">Gasto</option>
                    <option value="income">Ingreso</option>
                  </select>
                  <input type="number" value={editForm.amount} onChange={e => setEditForm({...editForm, amount: e.target.value})}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                  <input value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 13, gridColumn: '1/-1' }} />
                  <select value={editForm.category} onChange={e => setEditForm({...editForm, category: e.target.value})}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 13 }}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                  </select>
                  <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})}
                    style={{ background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={handleUpdate} style={{ flex: 1, background: '#10b981', color: '#000', fontWeight: 600, border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>Guardar</button>
                  <button onClick={() => setEditingId(null)} style={{ flex: 1, background: '#1e293b', color: '#94a3b8', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: t.type === 'income' ? 'rgba(16,185,129,0.1)' : 'rgba(244,63,94,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {CAT_ICONS[t.category] || (t.type === 'income' ? '↑' : '↓')}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{t.description}</div>
                    <div style={{ fontSize: 11, color: '#475569' }}>{t.category} · {t.date}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: t.type === 'income' ? '#10b981' : '#f43f5e', whiteSpace: 'nowrap' }}>
                    {t.type === 'income' ? '+' : '-'}RD${fmt(Number(t.amount))}
                  </span>
                  <button onClick={() => handleEdit(t)} style={{ background: 'transparent', color: '#475569', border: 'none', cursor: 'pointer', padding: 4 }}><Edit2 size={14}/></button>
                  <button onClick={() => handleDelete(t.id)} style={{ background: 'transparent', color: '#475569', border: 'none', cursor: 'pointer', padding: 4 }}><Trash2 size={14}/></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {showQuickAdd && <QuickAdd onClose={() => setShowQuickAdd(false)} onSaved={load} />}
    </div>
  )
}
