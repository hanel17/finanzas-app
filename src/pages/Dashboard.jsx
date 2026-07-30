import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScanStatement from '../components/ScanStatement'
import QuickAdd from '../components/QuickAdd'
import { FinancialCycleEngine } from '../services/FinancialCycleEngine'
import { Plus, Sparkles, Calendar, DollarSign, ShieldAlert, Zap, Send, Settings } from 'lucide-react'
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts'
import { useNavigate } from 'react-router-dom'

const COLORS = ['#00d084','#4cc9f0','#ffd60a','#ff4d6d','#7b2fff','#f77f00','#06d6a0','#e63946']

export default function Dashboard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showScan, setShowScan] = useState(false)
  const [showQuickAdd, setShowQuickAdd] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiReply, setAiReply] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  
  const [data, setData] = useState({
    cycleConfig: null,
    cards: [],
    expenses: [],
    transactions: [],
    goals: []
  })

  const loadData = useCallback(async () => {
    if (!user) return
    setLoading(true)
    try {
      const [configRes, cardsRes, expensesRes, txRes] = await Promise.all([
        supabase.from('financial_cycles_config').select('*').eq('user_id', user.id).maybeSingle(),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false })
      ])

      setData({
        cycleConfig: configRes.data || { frequency: 'monthly', pay_day_1: 25, expected_income: 45000 },
        cards: cardsRes.data || [],
        expenses: expensesRes.data || [],
        transactions: txRes.data || []
      })
    } catch (err) {
      console.error("Error al cargar datos del Dashboard:", err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    loadData()
  }, [loadData])

  const askAI = async (q) => {
    const question = q || aiPrompt.trim()
    if (!question || aiLoading) return
    setAiPrompt('')
    setAiLoading(true)
    setAiReply(null)
    try {
      // Load full financial data
      const [profileRes, cardsRes, expensesRes, txRes, goalsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('credit_cards').select('*').eq('user_id', user.id),
        supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
        supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(100),
        supabase.from('savings_goals').select('*').eq('user_id', user.id),
      ])

      const profile = profileRes.data || {}
      const cards = cardsRes.data || []
      const expenses = expensesRes.data || []
      const transactions = txRes.data || []
      const goals = goalsRes.data || []

      // Build category summary
      const byCat = transactions.filter(t => t.type === 'expense').reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
        return acc
      }, {})

      // Recent transactions detail
      const recentTx = transactions.slice(0, 30).map(t =>
        `${t.date} | ${t.type === 'income' ? '+' : '-'}RD$${t.amount} | ${t.description} | ${t.category}`
      ).join('\n')

      const fullContext = `
=== PERFIL ===
Nombre: ${profile.full_name || 'Usuario'}
Ingreso mensual titular: RD$${profile.monthly_income || 0}
Ingreso pareja: RD$${profile.spouse_income || 0}
Ingreso total: RD$${(profile.monthly_income || 0) + (profile.spouse_income || 0)}

=== CICLO ACTUAL ===
Período: ${currentCycle?.formattedRange}
Días transcurridos: ${currentCycle?.daysElapsed}
Días restantes: ${currentCycle?.daysRemaining}
Ingreso del ciclo: RD$${metrics?.totalIncome}
Gastos comprometidos (fijos): RD$${metrics?.committedMoney}
Gastos realizados: RD$${metrics?.cycleSpent}
Dinero realmente libre: RD$${metrics?.reallyAvailable}
Gasto diario recomendado: RD$${metrics?.dailyRecommended}

=== TARJETAS DE CRÉDITO ===
${cards.map(c => `${c.bank_name} ${c.card_name}: Balance RD$${c.current_balance} de RD$${c.credit_limit} (${((c.current_balance/c.credit_limit)*100).toFixed(0)}%) | Vence: ${c.due_date} | Mínimo: RD$${c.minimum_payment} | Tasa: ${c.interest_rate}%`).join('\n') || 'Sin tarjetas'}

=== GASTOS FIJOS MENSUALES ===
${expenses.map(e => `${e.name}: RD$${e.amount} (${e.category})${e.due_day ? ' | Día ' + e.due_day : ''}`).join('\n') || 'Sin gastos fijos'}

=== METAS DE AHORRO ===
${goals.map(g => `${g.name}: RD$${g.current_amount} de RD$${g.target_amount} (${((g.current_amount/g.target_amount)*100).toFixed(0)}%) | Meta: ${g.target_date}`).join('\n') || 'Sin metas'}

=== GASTOS POR CATEGORÍA (histórico) ===
${Object.entries(byCat).sort((a,b) => b[1]-a[1]).map(([k,v]) => `${k}: RD$${v.toLocaleString()}`).join('\n') || 'Sin datos'}

=== ÚLTIMAS 30 TRANSACCIONES ===
${recentTx || 'Sin transacciones'}
      `

      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + import.meta.env.VITE_GROQ_API_KEY },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          max_tokens: 500,
          messages: [
            { role: 'system', content: 'Eres un asesor financiero personal experto en finanzas dominicanas. Tienes acceso completo a todos los datos financieros del usuario. Da consejos especificos, usa los montos exactos, se directo y amigable. Responde en espanol dominicano natural. Maximo 4 oraciones a menos que te pidan un analisis detallado. ' + fullContext },
            { role: 'user', content: question }
          ]
        })
      })
      const data = await res.json()
      setAiReply(data.choices?.[0]?.message?.content || 'Sin respuesta.')
    } catch(e) {
      console.error('AI error:', e)
      setAiReply('Error conectando con el asistente.')
    }
    setAiLoading(false)
  }

  // CÁLCULO DEL MOTOR DE CICLO FINANCIERO
  const currentCycle = FinancialCycleEngine.getCurrentCycle(data.cycleConfig)
  const metrics = FinancialCycleEngine.calculateCycleMetrics({
    transactions: data.transactions,
    fixedExpenses: data.expenses,
    incomeConfig: data.cycleConfig?.expected_income || 45000,
    currentCycle
  })

  const currSymbol = data.cycleConfig?.currency === 'USD' ? '$' : 'RD$'

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', color: '#fff', display: 'flex', flexDirection: 'column', gap: 24 }}>
      
      {/* Header Superior */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Hola, bienvenido 👋</h1>
          <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: 13 }}>
            {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => navigate('/cycle-config')}
            style={{ padding: '10px 14px', background: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Settings size={16} /> Ajustar Ciclo
          </button>
          <button
            onClick={() => setShowScan(true)}
            style={{ padding: '10px 16px', background: '#312e81', border: '1px solid #4f46e5', color: '#818cf8', borderRadius: 10, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
          >
            <Sparkles size={16} /> Escanear
          </button>
        </div>
      </div>

      {/* INDICADOR VISUAL DEL CICLO FINANCIERO */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)', border: '1px solid #312e81', borderRadius: 16, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calendar size={20} color="#818cf8" />
            <span style={{ fontSize: 15, fontWeight: 700, color: '#f8fafc' }}>
              Ciclo Actual ({currentCycle.formattedRange})
            </span>
          </div>

          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#cbd5e1' }}>
            <span>Han pasado: <b style={{ color: '#fff' }}>{currentCycle.daysElapsed} días</b></span>
            <span>Restan: <b style={{ color: '#818cf8' }}>{currentCycle.daysRemaining} días</b></span>
          </div>
        </div>

        {/* Barra de Progreso del Ciclo */}
        <div style={{ width: '100%', background: '#020617', borderRadius: 8, height: 10, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ width: `${currentCycle.progressPercentage}%`, background: 'linear-gradient(90deg, #6366f1, #a855f7)', height: '100%', borderRadius: 8, transition: 'width 0.5s ease' }} />
        </div>

        {/* METRICA CLAVE: DINERO RECOMENDADO POR DIA */}
        <div style={{ background: '#02061760', border: '1px solid #334155', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Gasto Diario Recomendado Hasta el Próximo Cobro:</span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: 20, fontWeight: 800, color: '#10b981' }}>
              {currSymbol}{metrics.dailyRecommended.toLocaleString()}/día
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', maxWidth: 400 }}>
            Te quedan <b>{currSymbol}{metrics.reallyAvailable.toLocaleString()}</b> libres para consumir en los próximos <b>{currentCycle.daysRemaining} días</b>.
          </p>
        </div>
      </div>

      {/* DETALLE DE DINERO COMPROMETIDO VS LIBRE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Ingreso del Ciclo</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0 0', color: '#10b981' }}>
            {currSymbol}{metrics.totalIncome.toLocaleString()}
          </h2>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Dinero Comprometido (Fijos)</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0 0', color: '#f59e0b' }}>
            {currSymbol}{metrics.committedMoney.toLocaleString()}
          </h2>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Gastos Realizados</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0 0', color: '#f43f5e' }}>
            {currSymbol}{metrics.cycleSpent.toLocaleString()}
          </h2>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>Dinero Realmente Libre</span>
          <h2 style={{ fontSize: 22, fontWeight: 700, margin: '6px 0 0 0', color: '#38bdf8' }}>
            {currSymbol}{metrics.reallyAvailable.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* ASISTENTE IA ENFOCADO EN CICLOS */}
      <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ background: '#312e81', padding: 6, borderRadius: 8 }}>
            <Sparkles size={18} color="#818cf8" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Copiloto IA del Ciclo Actual</h4>
            <span style={{ fontSize: 11, color: '#64748b' }}>Consultando tu ciclo {currentCycle.formattedRange}</span>
          </div>
        </div>

        {aiReply && (
          <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', fontSize: 13, lineHeight: 1.6, color: '#e2e8f0' }}>
            <span style={{ color: '#10b981', fontWeight: 600, marginRight: 6 }}>✦</span>{aiReply}
          </div>
        )}
        {aiLoading && (
          <div style={{ fontSize: 13, color: '#64748b', padding: '8px 0' }}>Analizando tu ciclo...</div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            '¿Llegaré con dinero al final del ciclo?',
            '¿Cuánto puedo gastar hoy?',
            'Analiza mis gastos comprometidos',
            'Pronóstico para el próximo pago'
          ].map((q, i) => (
            <button key={i} onClick={() => askAI(q)} style={{ background: '#0f172a', border: '1px solid #1e293b', color: '#94a3b8', padding: '6px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer' }}>
              {q}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={aiPrompt}
            onChange={e => setAiPrompt(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && askAI()}
            placeholder="Pregunta sobre tu ciclo financiero..."
            style={{ flex: 1, padding: '9px 14px', fontSize: 13, background: '#0f172a', border: '1px solid #334155', borderRadius: 8, color: '#fff', outline: 'none' }}
          />
          <button onClick={() => askAI()} disabled={!aiPrompt.trim() || aiLoading}
            style={{ background: aiPrompt.trim() ? '#10b981' : '#1e293b', color: '#000', width: 38, height: 38, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, flexShrink: 0, border: 'none', cursor: 'pointer' }}>
            <Send size={15} color={aiPrompt.trim() ? '#000' : '#555'} />
          </button>
        </div>
      </div>

      {/* Modal Escáner */}
      {showScan && (
        <ScanStatement onClose={() => setShowScan(false)} onSaved={() => loadData()} />
      )}
      {showQuickAdd && (
        <QuickAdd onClose={() => setShowQuickAdd(false)} onSaved={loadData} />
      )}
      <button onClick={() => setShowQuickAdd(true)} style={{ position:'fixed', bottom:24, right:24, width:52, height:52, borderRadius:'50%', background:'#10b981', color:'#000', fontSize:24, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(16,185,129,0.4)', zIndex:200, border:'none', cursor:'pointer' }}>
        <Plus size={22} />
      </button>

    </div>
  )
}
