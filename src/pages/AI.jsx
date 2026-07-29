import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, Bot } from 'lucide-react'

const SUGGESTIONS = [
  "En que estoy gastando mas?",
  "Como puedo ahorrar RD$5,000 este mes?",
  "Cual fue mi peor categoria?",
  "Puedo comprar algo de RD$20,000?",
  "Hazme un presupuesto",
  "Que gastos puedo reducir?",
]

const WELCOME = "Hola! Soy tu asistente financiero personal. Puedo analizar tus finanzas y darte recomendaciones personalizadas. En que te puedo ayudar hoy?"

export default function AI() {
  const { user } = useAuth()
  const [messages, setMessages] = useState([{ role: "assistant", content: WELCOME }])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  const getFinancialContext = async () => {
    const [profile, cards, expenses, transactions, goals] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(50),
      supabase.from("savings_goals").select("*").eq("user_id", user.id),
    ])
    const p = profile.data || {}
    const totalIncome = (p.monthly_income||0) + (p.spouse_income||0)
    const totalDebt = (cards.data||[]).reduce((s,c)=>s+Number(c.current_balance),0)
    const totalFixed = (expenses.data||[]).reduce((s,e)=>s+Number(e.amount),0)
    const txByCategory = (transactions.data||[]).reduce((acc,t) => {
      if(t.type==="expense") acc[t.category] = (acc[t.category]||0) + Number(t.amount)
      return acc
    }, {})
    return "DATOS FINANCIEROS DEL USUARIO:" +
      " Ingreso mensual: RD$" + totalIncome +
      " | Gastos fijos: RD$" + totalFixed +
      " | Disponible: RD$" + (totalIncome-totalFixed) +
      " | Deuda tarjetas: RD$" + totalDebt +
      " | Tarjetas: " + (cards.data||[]).map(c=>c.bank_name+" "+c.card_name+" balance:RD$"+c.current_balance+" limite:RD$"+c.credit_limit).join(", ") +
      " | Gastos por categoria: " + Object.entries(txByCategory).sort((a,b)=>b[1]-a[1]).map(([k,v])=>k+":RD$"+v).join(", ") +
      " | Metas: " + (goals.data||[]).map(g=>g.name+" RD$"+g.current_amount+"/"+g.target_amount).join(", ")
  }

  const sendMessage = async (text) => {
    const msg = text || input.trim()
    if (!msg || loading) return
    setInput("")
    const newMessages = [...messages, { role: "user", content: msg }]
    setMessages(newMessages)
    setLoading(true)
    try {
      const context = await getFinancialContext()
      const systemPrompt = "Eres un asesor financiero personal experto en finanzas dominicanas. Da consejos especificos y accionables basados en los datos reales del usuario. Se directo, amigable y usa los montos exactos. Habla en espanol. " + context
      const contents = newMessages.slice(1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))
      if (contents.length === 0 || contents[0].role !== "user") {
        contents.unshift({ role: "user", parts: [{ text: msg }] })
      }
      const response = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${import.meta.env.VITE_GEMINI_API_KEY}", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: contents
        })
      })
      const data = await response.json()
      console.log("Gemini response:", data)
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || data.error?.message || "Sin respuesta del asistente."
      setMessages(prev => [...prev, { role: "assistant", content: reply }])
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: "assistant", content: "Error: " + e.message }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 120px)", maxHeight:700 }}>
      <div style={{ marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)" }}><Bot size={18}/></div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700 }}>Asistente IA</h1>
            <p style={{ fontSize:12, color:"var(--text2)" }}>Analiza tus finanzas en tiempo real</p>
          </div>
        </div>
      </div>
      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, paddingBottom:16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            {m.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)", marginRight:8, flexShrink:0, marginTop:2 }}><Bot size={14}/></div>
            )}
            <div style={{ maxWidth:"80%", padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"var(--green)":"var(--bg2)", color:m.role==="user"?"#000":"var(--text)", fontSize:14, lineHeight:1.6, border:m.role==="assistant"?"1px solid var(--border)":"none", whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)", flexShrink:0 }}><Bot size={14}/></div>
            <div style={{ padding:"10px 14px", background:"var(--bg2)", borderRadius:"16px 16px 16px 4px", border:"1px solid var(--border)", display:"flex", gap:4, alignItems:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--purple)", animation:"pulse 1s "+i*0.2+"s infinite" }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {messages.length <= 1 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{ padding:"6px 12px", borderRadius:20, background:"var(--bg2)", border:"1px solid var(--border2)", color:"var(--text2)", fontSize:12, fontWeight:500 }}>
              {s}
            </button>
          ))}
        </div>
      )}
      <div style={{ display:"flex", gap:8, background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:14, padding:"6px 6px 6px 14px" }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendMessage()} placeholder="Pregunta algo sobre tus finanzas..." style={{ flex:1, background:"transparent", border:"none", padding:"6px 0", fontSize:14 }} />
        <button onClick={() => sendMessage()} disabled={!input.trim()||loading} style={{ background:input.trim()?"var(--purple)":"var(--bg4)", color:"#fff", width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0 }}>
          <Send size={15}/>
        </button>
      </div>
    </div>
  )
}
