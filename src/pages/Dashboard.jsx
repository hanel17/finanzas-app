import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, CreditCard, Target, Plus } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [cards, setCards] = useState([])
  const [expenses, setExpenses] = useState([])
  const [transactions, setTransactions] = useState([])
  const [goals, setGoals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const [p, c, e, t, g] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(5),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
      ])
      setProfile(p.data)
      setCards(c.data || [])
      setExpenses(e.data || [])
      setTransactions(t.data || [])
      setGoals(g.data || [])
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div style={{ color: 'var(--gray)', padding: 40 }}>Cargando...</div>

  const totalIncome = (profile?.monthly_income || 0) + (profile?.spouse_income || 0)
  const totalFixedExp = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const totalDebt = cards.reduce((s, c) => s + Number(c.current_balance), 0)
  const available = totalIncome - totalFixedExp

  const COLORS = ['#22c55e','#ef4444','#f59e0b','#3b82f6','#8b5cf6','#ec4899']

  const pieData = expenses.reduce((acc, e) => {
    const found = acc.find(a => a.name === e.category)
    if (found) found.value += Number(e.amount)
    else acc.push({ name: e.category, value: Number(e.amount) })
    return acc
  }, [])

  const statCard = (icon, label, value, color) => (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--gray)', fontSize: 12, marginBottom: 8 }}>{icon}{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color }}>{value}</div>
    </div>
  )

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Hola, {profile?.full_name?.split(' ')[0] || 'bienvenido'} 👋</h1>
        <p style={{ color: 'var(--gray)', fontSize: 13, marginTop: 4 }}>Aquí está el resumen de tus finanzas</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {statCard(<TrendingUp size={14} />, 'Ingreso mensual', `RD$${totalIncome.toLocaleString()}`, 'var(--green)')}
        {statCard(<TrendingDown size={14} />, 'Gastos fijos', `RD$${totalFixedExp.toLocaleString()}`, 'var(--red)')}
        {statCard(<CreditCard size={14} />, 'Deuda total', `RD$${totalDebt.toLocaleString()}`, 'var(--yellow)')}
        {statCard(<Target size={14} />, 'Disponible', `RD$${available.toLocaleString()}`, 'var(--blue)')}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Gastos por categoría</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value">
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={v => `RD$${Number(v).toLocaleString()}`} contentStyle={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--gray)', fontSize: 13 }}>Sin datos aún</p>}
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Tarjetas</h3>
            <Link to="/cards" style={{ fontSize: 12 }}>Ver todas</Link>
          </div>
          {cards.length === 0 ? (
            <Link to="/cards">
              <button style={{ width: '100%', background: 'var(--bg3)', color: 'var(--text)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
                <Plus size={16} /> Agregar tarjeta
              </button>
            </Link>
          ) : cards.map(c => {
            const pct = (c.current_balance / c.credit_limit) * 100
            return (
              <div key={c.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{c.bank_name} — {c.card_name}</span>
                  <span style={{ color: 'var(--red)' }}>RD${Number(c.current_balance).toLocaleString()}</span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{ width: `${Math.min(pct,100)}%`, height: '100%', background: pct > 70 ? 'var(--red)' : pct > 40 ? 'var(--yellow)' : 'var(--green)', borderRadius: 2 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{pct.toFixed(0)}% usado · Vence {c.due_date}</div>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Últimos movimientos</h3>
          <Link to="/transactions" style={{ fontSize: 12 }}>Ver todos</Link>
        </div>
        {transactions.length === 0 ? (
          <Link to="/transactions">
            <button style={{ width: '100%', background: 'var(--bg3)', color: 'var(--text)', border: '1px dashed var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12 }}>
              <Plus size={16} /> Registrar movimiento
            </button>
          </Link>
        ) : transactions.map(t => (
          <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{t.description}</div>
              <div style={{ fontSize: 11, color: 'var(--gray)' }}>{t.category} · {t.date}</div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: t.type === 'income' ? 'var(--green)' : 'var(--red)' }}>
              {t.type === 'income' ? '+' : '-'}RD${Number(t.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {goals.length > 0 && (
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Metas de ahorro</h3>
            <Link to="/goals" style={{ fontSize: 12 }}>Ver todas</Link>
          </div>
          {goals.map(g => {
            const pct = (g.current_amount / g.target_amount) * 100
            return (
              <div key={g.id} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                  <span>{g.name}</span>
                  <span style={{ color: 'var(--green)' }}>RD${Number(g.current_amount).toLocaleString()} / RD${Number(g.target_amount).toLocaleString()}</span>
                </div>
                <div style={{ height: 6, background: 'var(--border)', borderRadius: 3 }}>
                  <div style={{ width: `${Math.min(pct,100)}%`, height: '100%', background: 'var(--green)', borderRadius: 3 }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--gray)', marginTop: 2 }}>{pct.toFixed(0)}% · Meta: {g.target_date}</div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
