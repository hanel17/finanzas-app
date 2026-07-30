import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, CreditCard, Edit2 } from 'lucide-react'

export default function Cards() {
  const { user } = useAuth()
  const [cards, setCards] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ bank_name: '', card_name: '', credit_limit: '', current_balance: '', minimum_payment: '', due_date: '', interest_rate: '' })

  const [editingCard, setEditingCard] = useState(null)
  const [editCardForm, setEditCardForm] = useState({})

  const load = async () => {
    const { data } = await supabase.from('credit_cards').select('*').eq('user_id', user.id)
    setCards(data || [])
  }

  useEffect(() => { load() }, [])

  const handleAdd = async () => {
    if (!form.bank_name || !form.card_name) return
    await supabase.from('credit_cards').insert({ ...form, user_id: user.id })
    setForm({ bank_name: '', card_name: '', credit_limit: '', current_balance: '', minimum_payment: '', due_date: '', interest_rate: '' })
    setShowForm(false)
    load()
  }

  const handleEditCard = (c) => {
    setEditingCard(c.id)
    setEditCardForm({ bank_name: c.bank_name, card_name: c.card_name, credit_limit: c.credit_limit, current_balance: c.current_balance, minimum_payment: c.minimum_payment, due_date: c.due_date, interest_rate: c.interest_rate })
  }

  const handleUpdateCard = async () => {
    await supabase.from('credit_cards').update(editCardForm).eq('id', editingCard)
    setEditingCard(null)
    load()
  }

  const handleDelete = async (id) => {
    await supabase.from('credit_cards').delete().eq('id', id)
    load()
  }

  const totalDebt = cards.reduce((s, c) => s + Number(c.current_balance), 0)
  const totalLimit = cards.reduce((s, c) => s + Number(c.credit_limit), 0)
  const label = { fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Tarjetas de crédito</h1>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Gestiona tus tarjetas y balances</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>Deuda total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--red)' }}>RD${totalDebt.toLocaleString()}</div>
        </div>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px' }}>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginBottom: 4 }}>Límite total</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--blue)' }}>RD${totalLimit.toLocaleString()}</div>
        </div>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Nueva tarjeta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={label}>Banco</label><input placeholder="BHD" value={form.bank_name} onChange={e => setForm({...form, bank_name: e.target.value})} /></div>
            <div><label style={label}>Nombre</label><input placeholder="Mi País" value={form.card_name} onChange={e => setForm({...form, card_name: e.target.value})} /></div>
            <div><label style={label}>Límite (RD$)</label><input type="number" placeholder="72000" value={form.credit_limit} onChange={e => setForm({...form, credit_limit: e.target.value})} /></div>
            <div><label style={label}>Balance actual (RD$)</label><input type="number" placeholder="10828" value={form.current_balance} onChange={e => setForm({...form, current_balance: e.target.value})} /></div>
            <div><label style={label}>Pago mínimo (RD$)</label><input type="number" placeholder="301" value={form.minimum_payment} onChange={e => setForm({...form, minimum_payment: e.target.value})} /></div>
            <div><label style={label}>Fecha vencimiento</label><input type="date" value={form.due_date} onChange={e => setForm({...form, due_date: e.target.value})} /></div>
            <div><label style={label}>Tasa anual (%)</label><input type="number" placeholder="60" value={form.interest_rate} onChange={e => setForm({...form, interest_rate: e.target.value})} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <button onClick={() => setShowForm(false)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }}>Cancelar</button>
            <button onClick={handleAdd} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600 }}>Guardar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {cards.length === 0 ? (
          <div style={{ background: 'var(--bg2)', border: '1px dashed var(--border)', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--gray)' }}>
            <CreditCard size={32} style={{ margin: '0 auto 12px', opacity: .4 }} />
            <p>No tienes tarjetas agregadas aún</p>
          </div>
        ) : cards.map(c => {
          const pct = (Number(c.current_balance) / Number(c.credit_limit)) * 100
          const color = pct > 70 ? 'var(--red)' : pct > 40 ? 'var(--yellow)' : 'var(--green)'
          return (
            <div key={c.id} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{c.bank_name}</div>
                  <div style={{ fontSize: 13, color: 'var(--gray)' }}>{c.card_name}</div>
                </div>
                <button onClick={() => handleEditCard(c)} style={{ background: 'transparent', color: 'var(--gray)', padding: 4 }}><Edit2 size={15}/></button>
                <button onClick={() => handleDelete(c.id)} style={{ background: 'transparent', color: 'var(--gray)', padding: 4 }}><Trash2 size={16} /></button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
                <div><div style={{ fontSize: 11, color: 'var(--gray)' }}>Balance</div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--red)' }}>RD${Number(c.current_balance).toLocaleString()}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--gray)' }}>Límite</div><div style={{ fontSize: 15, fontWeight: 600 }}>RD${Number(c.credit_limit).toLocaleString()}</div></div>
                <div><div style={{ fontSize: 11, color: 'var(--gray)' }}>Pago mínimo</div><div style={{ fontSize: 15, fontWeight: 600, color: 'var(--yellow)' }}>RD${Number(c.minimum_payment).toLocaleString()}</div></div>
              </div>
              <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, marginBottom: 6 }}>
                <div style={{ width: `${Math.min(pct,100)}%`, height: '100%', background: color, borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--gray)' }}>
                <span>{pct.toFixed(0)}% utilizado · Tasa: {c.interest_rate}% anual</span>
                <span>Vence: {c.due_date}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
