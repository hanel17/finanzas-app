import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, Bot, Sparkles } from 'lucide-react'

const SUGGESTIONS = [
  '¿En qué estoy gastando más?',
  '¿Cómo puedo ahorrar RD$5,000 este mes?',
  '¿Cuál fue mi peor categoría?',
  '¿Puedo comprar algo de RD$20,000?',
  'Hazme un presupuesto',
  '¿Qué gastos puedo reducir?',
]

export default function AI() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([
    { role: 'assistant', content: '¡Hola! Soy tu asistente financiero personal 🤖

Puedo analizar tus finanzas y darte recomendaciones personalizadas. ¿En qué te puedo ayudar hoy?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const getFinancialContext = async () => {
    const [profile, cards, expenses, transactions, goals] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(50),
      supabase.from('savings_goals').select('*').eq('user_id', user.id),
    ])

    const p = profile.data || {}
    const totalIncome = (p.monthly_income||0) + (p.spouse_income||0)
    const totalDebt = (cards.data||[]).reduce((s,c)=>s+Number(c.current_balance),0)
    const totalFixed = (expenses.data||[]).reduce((s,e)=>s+Number(e.amount),0)

    const txByCategory = (transactions.data||[]).reduce((acc,t) => {
      if(t.type==='expense') {
        acc[t.category] = (acc[t.category]||0) + Number(t.amount)
      }
      return acc
    }, {})

    return `CONTEXTO FINANCIERO DEL USUARIO:
- Ingreso mensual total: RD$${totalIncome.toLocaleString()}
- Gastos fijos mensuales: RD$${totalFixed.toLocaleString()}
- Disponible después de gastos fijos: RD$${(totalIncome-totalFixed).toLocaleString()}
- Deuda total en tarjetas: RD$${totalDebt.toLocaleString()}
- Número de tarjetas: ${(cards.data||[]).length}
- Metas de ahorro activas: ${(goals.data||[]).length}

Tarjetas:
${(cards.data||[]).map(c=>`- ${c.bank_name} ${c.card_name}: RD$${Number(c.current_balance).toLocaleString()} de RD$${Number(c.credit_limit).toLocaleString()} (${((c.current_balance/c.credit_limit)*100).toFixed(0)}%)`).join('
')}

Gastos por categoría (últimas 50 transacciones):
${Object.entries(txByCategory).sort((a,b)=>b[1]-a[1]).map(([k,v])=>`- ${k}: RD$${v.toLocaleString()}`).join('
')}

Gastos fijos:
${(expenses.data||[]).map(e=>`- ${e.name}: RD$${Number(e.amount).toLocaleString()} (${e.category})`).join('
')}

Metas:
${(goals.data||[]).map(g=>`- ${g.name}: RD$${Number(g.current_amount).toLocaleString()} / RD$${Number(g.target_amount).toLocaleString()} (${((g.current_amount/g.target_amount)*100).toFixed(0)}%)`).join('
')}`
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const context = await getFinancialContext()
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: `Eres un asesor financiero personal experto en finanzas personales dominicanas. Tienes acceso a los datos financieros del usuario y debes dar consejos específicos, concretos y accionables basados en su situación real. Sé directo, amigable y usa emojis moderadamente. Habla en español dominicano casual. Usa los montos exactos del contexto cuando sea relevante. ${context}`,
          messages: messages.concat({ role: 'user', content: msg }).slice(1).map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await response.json()
      const reply = data.content?.[0]?.text || 'Lo siento, no pude procesar tu consulta.'
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Hubo un error conectando con el asistente. Verifica tu conexión.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 120px)', maxHeight:700 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:4 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:'rgba(123,47,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--purple)' }}><Bot size={18}/></div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, letterSpacing:'-0.5px' }}>Asistente IA</h1>
            <p style={{ fontSize:12, color:'var(--text2)' }}>Powered by Claude · Analiza tus finanzas en tiempo real</p>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12, paddingBottom:16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', animation:'fadeIn .2s ease' }}>
            {m.role==='assistant' && (
              <div style={{ width:28, height:28, borderRadius:8, background:'rgba(123,47,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--purple)', marginRight:8, flexShrink:0, marginTop:2 }}><Bot size={14}/></div>
            )}
            <div style={{ maxWidth:'80%', padding:'10px 14px', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', background:m.role==='user'?'var(--green)':' var(--bg2)', color:m.role==='user'?'#000':'var(--text)', fontSize:14, lineHeight:1.6, border:m.role==='assistant'?'1px solid var(--border)':'none', whiteSpace:'pre-wrap' }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ width:28, height:28, borderRadius:8, background:'rgba(123,47,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center', color:'var(--purple)', flexShrink:0 }}><Bot size={14}/></div>
            <div style={{ padding:'10px 14px', background:'var(--bg2)', borderRadius:'16px 16px 16px 4px', border:'1px solid var(--border)', display:'flex', gap:4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--purple)', animation:`pulse 1s ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ display:'flex', flexWrap:'wrap', gap:6, marginBottom:12 }}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{ padding:'6px 12px', borderRadius:20, background:'var(--bg2)', border:'1px solid var(--border2)', color:'var(--text2)', fontSize:12, fontWeight:500 }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:'flex', gap:8, background:'var(--bg2)', border:'1px solid var(--border2)', borderRadius:14, padding:'6px 6px 6px 14px' }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()} placeholder="Pregunta algo sobre tus finanzas..." style={{ flex:1, background:'transparent', border:'none', padding:'6px 0', fontSize:14 }} />
        <button onClick={() => sendMessage()} disabled={!input.trim()||loading} style={{ background:input.trim()?'var(--purple)':'var(--bg4)', color:'#fff', width:36, height:36, borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', padding:0, flexShrink:0 }}>
          <Send size={15}/>
        </button>
      </div>
    </div>
  )
}
