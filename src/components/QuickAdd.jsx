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
  { id: 'regalo', label: 'Regalo', icon: '🎁' },
  { id: 'educacion', label: 'Educación', icon: '📚' },
  { id: 'otros', label: 'Otros', icon: '📦' },
]

const EMOJIS = ['🛒','🍕','🍔','☕','🎁','💝','👶','🐾','✈️','🏖️','🎮','📱','💻','🔧','🏋️','💇','🚿','🧹','🌿','💐','🎂','🥳','📦','🏠','⚡','💧','🔑','🎓','💊','🩺']

const QUESTIONS = {
  expense: [
    '¿En qué gastaste?',
    '¿Qué compraste?',
    '¿A quién le pagaste?',
    '¿Qué necesitabas?',
  ],
  income: [
    '¿De dónde viene este ingreso?',
    '¿Qué recibiste?',
    '¿Quién te pagó?',
  ],
  fixed: [
    '¿Cuál es este gasto fijo?',
    '¿Qué debes pagar cada ciclo?',
  ]
}

export default function QuickAdd({ onClose, onSaved }) {
  const { user } = useAuth()
  const [tab, setTab] = useState('expense')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('otros')
  const [emoji, setEmoji] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [dueDay, setDueDay] = useState('')
  const [loading, setLoading] = useState(false)
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [questionIdx] = useState(Math.floor(Math.random() * 4))

  const selectedCat = CATEGORIES.find(c => c.id === category)
  const displayIcon = emoji || selectedCat?.icon || '📦'

  const handleSave = async () => {
    if (!amount || !description) return
    setLoading(true)

    if (tab === 'fixed') {
      const { error } = await supabase.from('fixed_expenses').insert({
        user_id: user.id,
        name: (emoji ? emoji + ' ' : '') + description,
        amount: Number(amount),
        category,
        due_day: dueDay ? Number(dueDay) : null,
      })
      if (error) { showToast('Error al guardar', 'error') }
      else { showToast('Gasto fijo agregado ✓'); onSaved?.(); onClose() }
    } else {
      const { error } = await supabase.from('transactions').insert({
        user_id: user.id,
        type: tab,
        amount: Number(amount),
        description: (emoji ? emoji + ' ' : '') + description,
        category,
        date,
      })
      if (error) { showToast('Error al guardar', 'error') }
      else { showToast('Guardado ✓'); onSaved?.(); onClose() }
    }
    setLoading(false)
  }

  const question = QUESTIONS[tab]?.[questionIdx % QUESTIONS[tab].length] || '¿Qué fue?'

  const tabStyle = (t) => ({
    flex: 1, padding: '9px 8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 12, transition: 'all .2s',
    background: tab === t ? (t === 'income' ? '#10b981' : t === 'fixed' ? '#f59e0b' : '#f43f5e') : 'transparent',
    color: tab === t ? '#000' : '#888'
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border2)', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, animation: 'slideUp .25s ease' }}>
        <div style={{ width: 36, height: 4, background: 'var(--border2)', borderRadius: 2, margin: '12px auto 0' }} />

        <div style={{ padding: '16px 20px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 17, fontWeight: 700 }}>Nuevo registro</h3>
            <button onClick={onClose} style={{ background: 'var(--bg3)', color: 'var(--text2)', borderRadius: '50%', width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, border: 'none', cursor: 'pointer' }}><X size={16} /></button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg3)', borderRadius: 10, padding: 3, marginBottom: 20, gap: 3 }}>
            <button style={tabStyle('expense')} onClick={() => setTab('expense')}>↓ Gasto</button>
            <button style={tabStyle('income')} onClick={() => setTab('income')}>↑ Ingreso</button>
            <button style={tabStyle('fixed')} onClick={() => setTab('fixed')}>📌 Compromiso</button>
          </div>

          {/* Amount */}
          <div style={{ position: 'relative', marginBottom: 16 }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text2)', fontSize: 18, fontWeight: 700 }}>RD$</span>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="0.00"
              style={{ fontSize: 26, fontWeight: 700, paddingLeft: 54, background: 'var(--bg3)', width: '100%' }}
              autoFocus />
          </div>

          {/* Description with emoji picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>{question}</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border2)', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                {displayIcon}
              </button>
              <input value={description} onChange={e => setDescription(e.target.value)}
                placeholder={tab === 'fixed' ? 'Casa, luz, préstamo...' : 'Supermercado, Uber, regalo a mi esposa...'}
                style={{ flex: 1 }} />
            </div>
            {showEmojiPicker && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 6, marginTop: 10, background: 'var(--bg3)', borderRadius: 10, padding: 10 }}>
                <button onClick={() => { setEmoji(''); setShowEmojiPicker(false) }}
                  style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--bg4)', border: '1px solid var(--border2)', color: 'var(--text2)', fontSize: 11, cursor: 'pointer' }}>
                  Auto
                </button>
                {EMOJIS.map(e => (
                  <button key={e} onClick={() => { setEmoji(e); setShowEmojiPicker(false) }}
                    style={{ width: 34, height: 34, borderRadius: 8, background: emoji === e ? 'rgba(0,208,132,0.15)' : 'var(--bg4)', border: emoji === e ? '1px solid var(--green)' : '1px solid var(--border2)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Categories */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginBottom: 16 }}>
            {CATEGORIES.map(c => (
              <button key={c.id} onClick={() => setCategory(c.id)}
                style={{ padding: '6px 10px', borderRadius: 20, background: category === c.id ? 'rgba(0,208,132,0.15)' : 'var(--bg3)', border: `1px solid ${category === c.id ? 'var(--green)' : 'var(--border2)'}`, color: category === c.id ? 'var(--green)' : 'var(--text2)', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}>
                {c.icon} {c.label}
              </button>
            ))}
          </div>

          {/* Date or due day */}
          {tab === 'fixed' ? (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>¿Qué día del mes vence? (opcional)</label>
              <input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)}
                placeholder="Ej: 10 para el día 10 de cada mes" style={{ fontSize: 14 }} />
            </div>
          ) : (
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 6 }}>¿Cuándo fue?</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ fontSize: 13 }} />
            </div>
          )}

          <button onClick={handleSave} disabled={loading || !amount || !description}
            style={{ width: '100%', padding: 14, fontSize: 15, fontWeight: 600, background: tab === 'income' ? '#10b981' : tab === 'fixed' ? '#f59e0b' : 'var(--green)', color: '#000', border: 'none', borderRadius: 10, cursor: 'pointer', opacity: (!amount || !description) ? 0.5 : 1 }}>
            {loading ? 'Guardando...' : tab === 'fixed' ? 'Agregar compromiso 📌' : tab === 'income' ? 'Registrar ingreso ↑' : 'Registrar gasto ↓'}
          </button>
        </div>
      </div>
    </div>
  )
}
