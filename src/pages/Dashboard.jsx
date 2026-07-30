import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import ScanStatement from '../components/ScanStatement'
import QuickAdd from '../components/QuickAdd'
import { FinancialEngine } from '../services/FinancialEngine'
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

  const executeAction = async (action) => {
    try {
      if (action.type === "update_fixed_expense") {
        const { data } = await supabase.from('fixed_expenses').select('*').eq('user_id', user.id)
        const match = (data||[]).find(e => e.name.toLowerCase().includes((action.name||'').toLowerCase()))
        if (!match) return 'No encontre un gasto fijo llamado: '+action.name
        const updates = {}
        if (action.amount !== undefined) updates.amount = Number(action.amount)
        if (action.due_day !== undefined) updates.due_day = Number(action.due_day)
        if (action.new_name) updates.name = action.new_name
        if (action.category) updates.category = action.category
        await supabase.from('fixed_expenses').update(updates).eq('id', match.id)
        await loadData()
        return 'Actualice el gasto fijo '+match.name
      }
      if (action.type === "delete_fixed_expense") {
        const { data } = await supabase.from('fixed_expenses').select('*').eq('user_id', user.id)
        const match = (data||[]).find(e => e.name.toLowerCase().includes((action.name||'').toLowerCase()))
        if (!match) return 'No encontre ese gasto fijo.'
        await supabase.from('fixed_expenses').delete().eq('id', match.id)
        await loadData()
        return 'Elimine el gasto fijo: '+match.name
      }
      if (action.type === "update_card_balance") {
        const { data } = await supabase.from('credit_cards').select('*').eq('user_id', user.id)
        const match = (data||[]).find(c =>
          c.bank_name.toLowerCase().includes((action.bank||'').toLowerCase()) ||
          c.card_name.toLowerCase().includes((action.bank||'').toLowerCase())
        )
        if (!match) return 'No encontre esa tarjeta.'
        await supabase.from('credit_cards').update({ current_balance: Number(action.balance) }).eq('id', match.id)
        await loadData()
        return 'Actualice el balance de '+match.bank_name+' a RD$'+action.balance
      }
      if (action.type === "update_goal") {
        const { data } = await supabase.from('savings_goals').select('*').eq('user_id', user.id)
        const match = (data||[]).find(g => g.name.toLowerCase().includes((action.name||'').toLowerCase()))
        if (!match) return 'No encontre esa meta.'
        const updates = {}
        if (action.current_amount !== undefined) updates.current_amount = Number(action.current_amount)
        if (action.target_amount !== undefined) updates.target_amount = Number(action.target_amount)
        if (action.target_date) updates.target_date = action.target_date
        await supabase.from('savings_goals').update(updates).eq('id', match.id)
        await loadData()
        return 'Actualice la meta '+match.name
      }
      if (action.type === "add_transaction") {
        await supabase.from('transactions').insert({
          user_id: user.id,
          type: action.tx_type || 'expense',
          amount: Number(action.amount),
          description: action.description,
          category: action.category || 'otros',
          date: action.date || new Date().toISOString().split('T')[0]
        })
        await loadData()
        return 'Registre: '+action.description+' RD$'+action.amount
      }
      if (action.type === "delete_transaction") {
        const { data } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50)
        const match = (data||[]).find(t =>
          t.description.toLowerCase().includes((action.description||'').toLowerCase()) ||
          (action.amount && Math.abs(Number(t.amount) - Number(action.amount)) < 10)
        )
        if (!match) return 'No encontre esa transaccion.'
        await supabase.from('transactions').delete().eq('id', match.id)
        await loadData()
        return 'Elimine: '+match.description+' RD$'+match.amount
      }
      if (action.type === "update_income") {
        await supabase.from('profiles').update({ monthly_income: Number(action.income) }).eq('id', user.id)
        await loadData()
        return 'Actualice tu ingreso a RD$'+action.income
      }
    } catch(e) {
      return 'Error: '+e.message
    }
    return 'Accion no reconocida: '+action.type
  }

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
Gastos comprometidos (fijos): RD$${metrics?.totalUnpaid}
Gastos realizados: RD$${metrics?.cycleSpent}
Dinero realmente libre: RD$${metrics?.moneyAvailable}
Gasto diario recomendado: RD$${metrics?.dailyBudget}

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
            { role: 'system', content: 'Eres un asistente financiero personal con capacidad de modificar datos. Habla en espanol dominicano directo. Cuando pidan un cambio incluye al FINAL: |||ACTION|||{json}|||END||| Tipos: update_fixed_expense(name,amount?,due_day?,new_name?,category?), delete_fixed_expense(name), update_card_balance(bank,balance), update_goal(name,current_amount?,target_amount?,target_date?), add_transaction(tx_type,amount,description,category,date), delete_transaction(description?,amount?), update_income(income). Sin accion responde normal. ' + fullContext },
            { role: 'user', content: question }
          ]
        })
      })
      const data = await res.json()
      const rawReply = data.choices?.[0]?.message?.content || 'Sin respuesta.'
      const actionMatch = rawReply.match(/\|\|\|ACTION\|\|\|([\s\S]*?)\|\|\|END\|\|\|/)
      let finalReply = rawReply.replace(/\|\|\|ACTION\|\|\|[\s\S]*?\|\|\|END\|\|\|/g, '').trim()
      if (actionMatch) {
        try {
          const actionObj = JSON.parse(actionMatch[1].trim())
          const actionResult = await executeAction(actionObj)
          if (actionResult) finalReply = finalReply + (finalReply ? '\n\n' : '') + '✅ ' + actionResult
        } catch(e) {
          console.error('Action error:', e)
        }
      }
      setAiReply(finalReply || 'Sin respuesta.')
    } catch(e) {
      console.error('AI error:', e)
      setAiReply('Error conectando con el asistente.')
    }
    setAiLoading(false)
  }

  // CÁLCULO DEL MOTOR DE CICLO FINANCIERO
  const currentCycle = FinancialEngine.getCurrentCycle(data.cycleConfig)
  const metrics = FinancialEngine.calculate({
    transactions: data.transactions,
    fixedExpenses: data.expenses,
    savings: data.savings || [],
    carryOver: data.carryOver || 0,
    incomeConfig: data.cycleConfig?.expected_income || 45000,
    cycle: currentCycle
  })
  const health = FinancialEngine.getHealthLabel(metrics?.cycleHealth)

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

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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
              {currSymbol}{metrics.dailyBudget.toLocaleString()}/día
            </h3>
          </div>
          <p style={{ margin: 0, fontSize: 12, color: '#cbd5e1', maxWidth: 400 }}>
            Te quedan <b>{currSymbol}{metrics.moneyAvailable.toLocaleString()}</b> libres para consumir en los próximos <b>{currentCycle.daysRemaining} días</b>.
          </p>
        </div>
      </div>

      {/* DETALLE DE DINERO COMPROMETIDO VS LIBRE */}
      {/* SALUD DEL CICLO */}
      <div style={{ background: `${health?.color}15`, border: `1px solid ${health?.color}40`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>{health?.emoji}</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: health?.color }}>{health?.label}</div>
          <div style={{ fontSize: 12, color: '#94a3b8' }}>{health?.desc}</div>
        </div>
        {metrics?.carryOver > 0 && (
          <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Saldo arrastrado</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#10b981' }}>+{currSymbol}{metrics.carryOver.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* 4 PREGUNTAS CLAVE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💵</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>¿Cuánto dinero tengo hoy?</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#10b981', letterSpacing: '-0.5px' }}>
            {currSymbol}{(metrics?.moneyInHand || 0).toLocaleString('es-DO', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
          </h2>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            Ingresos + saldo anterior
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>📋</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>¿Cuánto debo pagar?</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f59e0b', letterSpacing: '-0.5px' }}>
            {currSymbol}{(metrics?.totalUnpaid || 0).toLocaleString('es-DO', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
          </h2>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4, marginBottom: 8 }}>
            {metrics?.unpaidCommitments?.length || 0} compromisos pendientes
          </div>
          {metrics?.unpaidCommitments?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
              {metrics.unpaidCommitments.map((c, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#1e293b', borderRadius: 8, padding: '8px 10px' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>{c.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>RD${Number(c.amount).toLocaleString('es-DO', {maximumFractionDigits: 0})}</div>
                  </div>
                  <button
                    onClick={async () => {
                      await supabase.from('transactions').insert({
                        user_id: user.id,
                        type: 'expense',
                        amount: Number(c.amount),
                        description: c.name,
                        category: c.category || 'otros',
                        date: new Date().toISOString().split('T')[0]
                      })
                      loadData()
                    }}
                    style={{ background: '#10b981', color: '#000', fontSize: 11, fontWeight: 600, padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    ✓ Pagué
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', padding: 18, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>💸</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>¿Cuánto ya gasté?</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#f43f5e', letterSpacing: '-0.5px' }}>
            {currSymbol}{(metrics?.cycleSpent || 0).toLocaleString('es-DO', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
          </h2>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            Gastos realizados este ciclo
          </div>
        </div>

        <div style={{ background: '#0f172a', border: '2px solid #10b98140', padding: 18, borderRadius: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>¿Cuánto puedo gastar?</span>
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#38bdf8', letterSpacing: '-0.5px' }}>
            {currSymbol}{(metrics?.moneyAvailable || 0).toLocaleString('es-DO', {minimumFractionDigits: 0, maximumFractionDigits: 2})}
          </h2>
          <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
            {currSymbol}{(metrics?.dailyBudget || 0).toLocaleString('es-DO', {minimumFractionDigits: 0, maximumFractionDigits: 2})}/día por {currentCycle?.daysRemaining} días
          </div>
        </div>
      </div>

      {/* UPCOMING PAYMENTS - fuera de este ciclo */}
      {metrics?.upcomingCommitments?.length > 0 && (
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 16 }}>📅</span>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Próximos pagos (fuera de este ciclo)</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {metrics.upcomingCommitments.map((e, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#020617', borderRadius: 10, border: '1px solid #1e293b' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: '#1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                    {e.category === 'hogar' ? '🏠' : e.category === 'servicios' ? '⚡' : e.category === 'salud' ? '💊' : '📦'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>
                      {e.due_day ? `Vence día ${e.due_day} del próximo ciclo` : 'Próximo ciclo'}
                    </div>
                  </div>
                </div>
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f59e0b' }}>RD${Number(e.amount).toLocaleString()}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 12px', fontSize: 12, color: '#64748b' }}>
              <span>Total comprometido próximo ciclo</span>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>
                RD${metrics.upcomingCommitments.reduce((s,e) => s+Number(e.amount),0).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

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
