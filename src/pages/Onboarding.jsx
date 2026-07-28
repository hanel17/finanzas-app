import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState({
    monthly_income: '', spouse_income: '',
    expenses: [{ name: '', amount: '', category: 'hogar' }],
    cards: [{ bank_name: '', card_name: '', credit_limit: '', current_balance: '', minimum_payment: '', due_date: '', interest_rate: '' }]
  })

  const categories = ['hogar','comida','transporte','servicios','salud','educacion','entretenimiento','otros']

  const updateExpense = (i, field, val) => {
    const exps = [...data.expenses]
    exps[i][field] = val
    setData({...data, expenses: exps})
  }

  const updateCard = (i, field, val) => {
    const cards = [...data.cards]
    cards[i][field] = val
    setData({...data, cards})
  }

  const handleFinish = async () => {
    setLoading(true)
    await supabase.from('profiles').upsert({ id: user.id, monthly_income: data.monthly_income, spouse_income: data.spouse_income })
    const validExpenses = data.expenses.filter(e => e.name && e.amount)
    if (validExpenses.length > 0) {
      await supabase.from('fixed_expenses').insert(validExpenses.map(e => ({ ...e, user_id: user.id })))
    }
    const validCards = data.cards.filter(c => c.bank_name && c.card_name)
    if (validCards.length > 0) {
      await supabase.from('credit_cards').insert(validCards.map(c => ({ ...c, user_id: user.id })))
    }
    navigate('/')
  }

  const card = { background: 'var(--bg2)', borderRadius: 16, padding: 28, border: '1px solid var(--border)', maxWidth: 520, margin: '0 auto' }
  const label = { fontSize: 12, color: 'var(--gray)', display: 'block', marginBottom: 6 }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 16px' }}>
      <div style={{ maxWidth: 520, margin: '0 auto 24px' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1,2,3].map(s => (
            <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: s <= step ? 'var(--green)' : 'var(--border)' }} />
          ))}
        </div>
        <p style={{ fontSize: 12, color: 'var(--gray)', marginTop: 8 }}>Paso {step} de 3</p>
      </div>

      {step === 1 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Bienvenido 👋</h2>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24 }}>Cuéntanos sobre tus ingresos mensuales</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={label}>Tu ingreso mensual (RD$)</label>
              <input type="number" value={data.monthly_income} onChange={e => setData({...data, monthly_income: e.target.value})} placeholder="52000" />
            </div>
            <div>
              <label style={label}>Ingreso de tu esposa/pareja (RD$) — opcional</label>
              <input type="number" value={data.spouse_income} onChange={e => setData({...data, spouse_income: e.target.value})} placeholder="12000" />
            </div>
            <button onClick={() => setStep(2)} style={{ background: 'var(--green)', color: '#000', fontWeight: 600, padding: 12, marginTop: 8 }}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Gastos fijos 📋</h2>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24 }}>Agrega tus gastos que se repiten cada mes</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.expenses.map((exp, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 110px', gap: 8 }}>
                <input placeholder="Nombre (ej: Casa)" value={exp.name} onChange={e => updateExpense(i, 'name', e.target.value)} />
                <input type="number" placeholder="Monto" value={exp.amount} onChange={e => updateExpense(i, 'amount', e.target.value)} />
                <select value={exp.category} onChange={e => updateExpense(i, 'category', e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            ))}
            <button onClick={() => setData({...data, expenses: [...data.expenses, { name: '', amount: '', category: 'hogar' }]})}
              style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px dashed var(--border)' }}>
              + Agregar otro gasto
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setStep(1)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }}>← Atrás</button>
              <button onClick={() => setStep(3)} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600 }}>Continuar →</button>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div style={card}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Tarjetas de crédito 💳</h2>
          <p style={{ color: 'var(--gray)', fontSize: 13, marginBottom: 24 }}>Agrega tus tarjetas para hacer seguimiento</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {data.cards.map((card, i) => (
              <div key={i} style={{ background: 'var(--bg3)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div><label style={label}>Banco</label><input placeholder="BHD" value={card.bank_name} onChange={e => updateCard(i, 'bank_name', e.target.value)} /></div>
                  <div><label style={label}>Nombre tarjeta</label><input placeholder="Mi País" value={card.card_name} onChange={e => updateCard(i, 'card_name', e.target.value)} /></div>
                  <div><label style={label}>Límite (RD$)</label><input type="number" placeholder="72000" value={card.credit_limit} onChange={e => updateCard(i, 'credit_limit', e.target.value)} /></div>
                  <div><label style={label}>Balance actual (RD$)</label><input type="number" placeholder="10828" value={card.current_balance} onChange={e => updateCard(i, 'current_balance', e.target.value)} /></div>
                  <div><label style={label}>Pago mínimo (RD$)</label><input type="number" placeholder="301" value={card.minimum_payment} onChange={e => updateCard(i, 'minimum_payment', e.target.value)} /></div>
                  <div><label style={label}>Fecha vencimiento</label><input type="date" value={card.due_date} onChange={e => updateCard(i, 'due_date', e.target.value)} /></div>
                  <div><label style={label}>Tasa anual (%)</label><input type="number" placeholder="60" value={card.interest_rate} onChange={e => updateCard(i, 'interest_rate', e.target.value)} /></div>
                </div>
              </div>
            ))}
            <button onClick={() => setData({...data, cards: [...data.cards, { bank_name: '', card_name: '', credit_limit: '', current_balance: '', minimum_payment: '', due_date: '', interest_rate: '' }]})}
              style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px dashed var(--border)' }}>
              + Agregar otra tarjeta
            </button>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => setStep(2)} style={{ flex: 1, background: 'var(--bg3)', color: 'var(--text)' }}>← Atrás</button>
              <button onClick={handleFinish} disabled={loading} style={{ flex: 2, background: 'var(--green)', color: '#000', fontWeight: 600 }}>
                {loading ? 'Guardando...' : 'Entrar al dashboard ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
