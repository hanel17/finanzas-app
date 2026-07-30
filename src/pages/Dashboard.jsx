import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScanStatement from '../components/ScanStatement'
import { Plus, Sparkles, TrendingUp, TrendingDown, DollarSign, CreditCard, PieChart as PieIcon, Send } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'

const COLORS = ['#00d084','#4cc9f0','#ffd60a','#ff4d6d','#7b2fff','#f77f00','#06d6a0','#e63946']

const StatCard = ({ icon, label, value, color, sub }) => (
  <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 20, borderRadius: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{label}</span>
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: color || '#fff' }}>{value}</div>
    {sub && <div style={{ fontSize: 11, color: '#64748b' }}>{sub}</div>}
  </div>
)

export default function Dashboard() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [showScan, setShowScan] = useState(false)
  const [data, setData] = useState({ profile: null, cards: [], expenses: [], transactions: [], goals: [] })
  const [aiPrompt, setAiPrompt] = useState('')

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [p, c, e, t, g] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
      ])
      setData({ 
        profile: p.data || null, 
        cards: c.data || [], 
        expenses: e.data || [], 
        transactions: t.data || [], 
        goals: g.data || [] 
      })
    } catch (err) {
      console.error("Error cargando dashboard:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const { profile, cards, expenses, transactions, goals } = data

  // Cálculos Dinámicos
  const totalIncomeProfile = (profile?.monthly_income || 0) + (profile?.spouse_income || 0)
  const totalFixed = expenses.reduce((s, e) => s + Number(e.amount || 0), 0)
  const totalDebt = cards.reduce((s, c) => s + Number(c.current_balance || 0), 0)

  const currentMonthStr = new Date().toISOString().slice(0, 7)
  const monthTx = transactions.filter(t => t.date?.startsWith(currentMonthStr))
  
  const monthExpenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0)
  const monthIncome = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)

  const displayIncome = totalIncomeProfile > 0 ? totalIncomeProfile : monthIncome
  const displayFixed = totalFixed > 0 ? totalFixed : monthExpenses
  const available = displayIncome - displayFixed

  // Datos para Gráficas
  const sourceForPie = expenses.length > 0 ? expenses : transactions.filter(t => t.type === 'expense')
  const pieData = sourceForPie.reduce((acc, e) => {
    const cat = e.category || 'Otros'
    const f = acc.find(a => a.name === cat)
    if (f) f.value += Number(e.amount || 0)
    else acc.push({ name: cat, value: Number(e.amount || 0) })
    return acc
  }, [])

  const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  const chartData = monthNames.slice(0, new Date().getMonth() + 1).map((m, i) => {
    const mo = String(i + 1).padStart(2, '0')
    const txs = transactions.filter(t => t.date?.includes(`-${mo}-`))
    return {
      name: m,
      gastos: txs.filter(t => t.type === 'expense').reduce((s, t) => s + Number(t.amount || 0), 0),
      ingresos: txs.filter(t => t.type === 'income').reduce((s, t) => s + Number(t.amount || 0), 0)
    }
  })

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Hola, bienvenido 👋</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 14 }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={() => setShowScan(true)}
            style={{ padding: '10px 16px', background: '#1e293b', border: '1px solid #334155', color: '#f8fafc', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            📄 Escanear
          </button>
          <button
            style={{ padding: '10px 16px', background: '#10b981', border: 'none', color: '#000', borderRadius: 10, cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}
          >
            <Plus size={16} /> Agregar
          </button>
        </div>
      </div>

      {/* Asistente IA */}
      <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#312e81', padding: 6, borderRadius: 8 }}>
            <Sparkles size={18} color="#818cf8" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Buenas noches, bienvenido 👋</h4>
            <span style={{ fontSize: 11, color: '#64748b' }}>Asistente IA • Basado en tus datos reales</span>
          </div>
        </div>

        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Hazme una pregunta sobre tus finanzas..."
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            style={{ width: '100%', background: '#020617', border: '1px solid #1e293b', borderRadius: 10, padding: '12px 16px', color: '#fff', fontSize: 13, outline: 'none' }}
          />
          <button style={{ position: 'absolute', right: 8, background: '#1e293b', border: 'none', color: '#94a3b8', borderRadius: 6, padding: 6, cursor: 'pointer' }}>
            <Send size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['En que estoy gastando mas?', 'Analiza mis gastos', 'Como ahorrar este mes?', 'Hazme un presupuesto'].map((q, i) => (
            <button key={i} onClick={() => setAiPrompt(q)} style={{ background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Resumen 4 Tarjetas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <StatCard icon="📈" label="Ingreso mensual" value={`RD$${displayIncome.toLocaleString()}`} color="#10b981" sub="Tú + pareja" />
        <StatCard icon="📉" label="Gastos fijos" value={`RD$${displayFixed.toLocaleString()}`} color="#f43f5e" sub="Este mes" />
        <StatCard icon="💳" label="Deuda tarjetas" value={`RD$${totalDebt.toLocaleString()}`} color="#ffd60a" sub={`${cards.length} tarjetas`} />
        <StatCard icon="🎯" label="Disponible" value={`RD$${available.toLocaleString()}`} color="#38bdf8" sub="Para metas/ahorro" />
      </div>

      {/* Gráficas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
        
        {/* Flujo del año */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600 }}>Flujo del año</h3>
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                <Area type="monotone" dataKey="gastos" stroke="#f43f5e" fill="#f43f5e20" strokeWidth={2} />
                <Area type="monotone" dataKey="ingresos" stroke="#10b981" fill="#10b98120" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gastos por Categoría */}
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 20 }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: 15, fontWeight: 600 }}>Gastos por categoría</h3>
          {pieData.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#64748b', fontSize: 13, marginTop: 60 }}>Sin datos aún</p>
          ) : (
            <div style={{ width: '100%', height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={4}>
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#020617', border: '1px solid #1e293b', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      </div>

      {/* Modal del Escáner */}
      {showScan && (
        <ScanStatement
          onClose={() => setShowScan(false)}
          onSaved={() => load()}
        />
      )}

    </div>
  )
}
