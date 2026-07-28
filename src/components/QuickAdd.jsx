import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'
import { X, Plus } from 'lucide-react'

const CATEGORIES = [
  { id: 'comida', label: 'Comida', icon: '🍔' },
  { id: 'transporte', label: 'Transporte', icon: '🚗' },
  { id: 'hogar', label: 'Hogar', icon: '🏠' },
  { id: 'servicios', label: 'Servicios', icon: '⚡' },
  { id: 'salud', label: 'Salud', icon: '💊' },
  { id: 'entretenimiento', label: 'Entret.', icon: '🎬' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'diezmo', label: 'Diezmo', icon: '🙏' },
  { id: 'ahorro', label: 'Ahorro', icon: '🏦' },
  { id: 'ropa', label: 'Ropa', icon: '👕' },
  { id: 'gas', label: 'Gas', icon: '⛽' },
  { id: 'otros', label: 'Otros', icon: '📦' },
]

export default function QuickAdd({ onClose, onSaved }) {
  const { user } = useAuth()
  const [type, setType] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('otros')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [loading, setLoading] = useState(false)

  const handleSave = async () => {
    if (!amount || !description) return
    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id, type, amount: Number(amount), description, category, date
    })
    if (error) { showToast('Error al guardar', 'error') }
    else { showToast('Movimiento guardado'); onSaved?.(); onClose() }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0', padding: '8px 0 0', width: '100%', maxWidth: 480, animation: 'slideUp .25s ease' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '0 auto 16px' }} />
        <div style={{ padding: '0 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Nuevo movimiento</h3>
            <button onClick={onClose} style={{ background: 'var(--bg3)', color: 'var(--text2)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}><X size={16} /></button>
          </div>

          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 20 }}>
            {['expense','income'].map(t => (
              <button key={t} onClick={() => setType(t)} style={{ flex: 1, padding: '8px', borderRadius: 8, background: type === t ? (t === 'income' ? 'var(--green)' : 'var(--red)') : 'transparent', color: type === t ? '#000' : 'var(--text2)', fontWeight: 600, fontSize: 13, transition: 'all .2s' }}>
                {t === 'expense' ? '↓ Gasto' : '↑ Ingreso'}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 18, fontWeight: 700 }}>$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" style={{ fontSize: 28, fontWeight: 700, paddingLeft: 34, background: 'var(--bg3)' }} autoFocus />
          </div>

          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="¿Qué fue?" style={{ marginBottom: 16 }} />

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)} style={{ padding: '6px 10px', borderRadius: 20, background: category === c.id ? 'rgba(0,208,132,0.15)' : 'var(--bg3)', border: `1px solid ${category === c.id ? 'var(--green)' : 'var(--border2)'}`, color: category === c.id ? 'var(--green)' : 'var(--text2)', fontSize: 12, fontWeight: 500 }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ marginBottom: 16, fontSize: 13 }} />

          <button onClick={handleSave} disabled={loading || !amount || !description} className="btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }}>
            {loading ? 'Guardando...' : 'Guardar movimiento'}
          </button>
        </div>
      </div>
    </div>
  )
}
