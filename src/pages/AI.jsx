import { useState, useRef, useEffect } from "react"
import { useAuth } from "../context/AuthContext"
import { supabase } from "../lib/supabase"
import { Send, Bot, Zap } from "lucide-react"

const SUGGESTIONS = [
  "En que estoy gastando mas?",
  "Como puedo ahorrar RD$5,000 este mes?",
  "Cambia el pago de la casa para el dia 15",
  "Agrega un gasto de RD$500 en comida hoy",
  "Cuanto puedo gastar hoy?",
  "Hazme un presupuesto",
]

const WELCOME = "Hola! Soy tu asistente financiero con capacidad de accion. No solo te doy consejos, tambien puedo modificar tus datos directamente. Prueba diciendome: cambia el dia de pago de la casa, agrega una transaccion, actualiza el balance de tu tarjeta, etc."

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
    const recentTx = (transactions.data||[]).slice(0,20).map(t =>
      t.date+" | "+(t.type==="income"?"+":"-")+"RD$"+t.amount+" | "+t.description+" | "+t.category
    ).join(" || ")
    return "PERFIL: ingreso=RD$"+totalIncome+" gastos_fijos=RD$"+totalFixed+" deuda_tarjetas=RD$"+totalDebt+
      " | GASTOS_FIJOS: "+JSON.stringify((expenses.data||[]).map(e=>({id:e.id,name:e.name,amount:e.amount,due_day:e.due_day,category:e.category})))+
      " | TARJETAS: "+JSON.stringify((cards.data||[]).map(c=>({id:c.id,bank:c.bank_name,name:c.card_name,balance:c.current_balance,limit:c.credit_limit,due_date:c.due_date})))+
      " | METAS: "+JSON.stringify((goals.data||[]).map(g=>({id:g.id,name:g.name,current:g.current_amount,target:g.target_amount,date:g.target_date})))+
      " | CATEGORIAS: "+JSON.stringify(txByCategory)+
      " | ULTIMAS_TX: "+recentTx
  }

  const executeAction = async (action) => {
    try {
      if (action.type === "update_fixed_expense") {
        const { data } = await supabase.from("fixed_expenses").select("*").eq("user_id", user.id)
        const match = (data||[]).find(e => e.name.toLowerCase().includes((action.name||"").toLowerCase()))
        if (!match) return "No encontre un gasto fijo llamado: "+action.name
        const updates = {}
        if (action.amount !== undefined) updates.amount = Number(action.amount)
        if (action.due_day !== undefined) updates.due_day = Number(action.due_day)
        if (action.new_name) updates.name = action.new_name
        if (action.category) updates.category = action.category
        await supabase.from("fixed_expenses").update(updates).eq("id", match.id)
        return "Actualice el gasto fijo "+match.name+" correctamente."
      }
      if (action.type === "update_card_balance") {
        const { data } = await supabase.from("credit_cards").select("*").eq("user_id", user.id)
        const match = (data||[]).find(c =>
          c.bank_name.toLowerCase().includes((action.bank||"").toLowerCase()) ||
          c.card_name.toLowerCase().includes((action.bank||"").toLowerCase())
        )
        if (!match) return "No encontre esa tarjeta."
        await supabase.from("credit_cards").update({ current_balance: Number(action.balance) }).eq("id", match.id)
        return "Actualice el balance de "+match.bank_name+" "+match.card_name+" a RD$"+action.balance
      }
      if (action.type === "update_goal") {
        const { data } = await supabase.from("savings_goals").select("*").eq("user_id", user.id)
        const match = (data||[]).find(g => g.name.toLowerCase().includes((action.name||"").toLowerCase()))
        if (!match) return "No encontre esa meta."
        const updates = {}
        if (action.current_amount !== undefined) updates.current_amount = Number(action.current_amount)
        if (action.target_amount !== undefined) updates.target_amount = Number(action.target_amount)
        if (action.target_date) updates.target_date = action.target_date
        await supabase.from("savings_goals").update(updates).eq("id", match.id)
        return "Actualice la meta "+match.name+" correctamente."
      }
      if (action.type === "add_transaction") {
        await supabase.from("transactions").insert({
          user_id: user.id,
          type: action.tx_type || "expense",
          amount: Number(action.amount),
          description: action.description,
          category: action.category || "otros",
          date: action.date || new Date().toISOString().split("T")[0]
        })
        return "Registre la transaccion: "+action.description+" RD$"+action.amount
      }
      if (action.type === "update_income") {
        await supabase.from("profiles").update({ monthly_income: Number(action.income) }).eq("id", user.id)
        return "Actualice tu ingreso mensual a RD$"+action.income
      }
    } catch(e) {
      return "Error ejecutando la accion: "+e.message
    }
    return "Accion no reconocida."
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
      const systemPrompt = "Eres un asistente financiero personal. Habla en espanol dominicano casual. REGLA CRITICA: Cuando el usuario pida modificar algo, DEBES incluir el bloque de accion. NUNCA digas que hiciste algo sin incluir el bloque. Formato OBLIGATORIO al final de tu respuesta cuando hay accion: |||ACTION|||JSON_AQUI|||END||| Ejemplos: Si piden cambiar dia de pago de casa a dia 15: |||ACTION|||{\"type\":\"update_fixed_expense\",\"name\":\"casa\",\"due_day\":15}|||END||| Si piden cambiar balance de BHD a 5000: |||ACTION|||{\"type\":\"update_card_balance\",\"bank\":\"BHD\",\"balance\":5000}|||END||| Si piden agregar gasto de 500 en comida: |||ACTION|||{\"type\":\"add_transaction\",\"tx_type\":\"expense\",\"amount\":500,\"description\":\"comida\",\"category\":\"comida\",\"date\":\"\"  }|||END||| Si NO hay accion, responde normal sin el bloque. DATOS: "+context
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer "+import.meta.env.VITE_GROQ_API_KEY },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          max_tokens: 600,
          messages: [
            { role: "system", content: systemPrompt },
            ...newMessages.slice(1).map(m => ({ role: m.role, content: m.content }))
          ]
        })
      })
      const data = await res.json()
      const rawReply = data.choices?.[0]?.message?.content || "Sin respuesta."
      console.log("RAW REPLY:", rawReply)
      console.log("HAS ACTION:", rawReply.includes("|||ACTION|||"))
      const actionMatch = rawReply.match(/\|\|\|ACTION\|\|\|([\s\S]*?)\|\|\|END\|\|\|/)
      let finalReply = rawReply.replace(/\|\|\|ACTION\|\|\|[\s\S]*?\|\|\|END\|\|\|/g, "").trim()
      let actionResult = null
      if (actionMatch) {
        try {
          const actionObj = JSON.parse(actionMatch[1].trim())
          actionResult = await executeAction(actionObj)
        } catch(e) {
          console.error("Action parse error:", e, actionMatch[1])
          actionResult = "Error procesando la accion."
        }
      }
      if (actionResult) {
        finalReply = finalReply + (finalReply ? "\n\n" : "") + "✅ "+actionResult
      }
      setMessages(prev => [...prev, { role: "assistant", content: finalReply }])
    } catch(e) {
      console.error(e)
      setMessages(prev => [...prev, { role: "assistant", content: "Error conectando con el asistente: "+e.message }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"calc(100vh - 80px)", maxWidth:700, margin:"0 auto", padding:"0 16px" }}>
      <div style={{ padding:"20px 0 16px" }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)" }}><Bot size={18}/></div>
          <div>
            <h1 style={{ fontSize:20, fontWeight:700, margin:0 }}>Asistente IA</h1>
            <p style={{ fontSize:12, color:"var(--text2)", margin:0 }}>Analiza y modifica tus finanzas en tiempo real</p>
          </div>
          <div style={{ marginLeft:"auto", display:"flex", alignItems:"center", gap:6, background:"rgba(123,47,255,0.1)", border:"1px solid rgba(123,47,255,0.3)", borderRadius:20, padding:"4px 10px" }}>
            <Zap size={12} color="var(--purple)" />
            <span style={{ fontSize:11, color:"var(--purple)", fontWeight:600 }}>Con acciones</span>
          </div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", display:"flex", flexDirection:"column", gap:12, paddingBottom:16 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start", animation:"fadeIn .2s ease" }}>
            {m.role==="assistant" && (
              <div style={{ width:28, height:28, borderRadius:8, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)", marginRight:8, flexShrink:0, marginTop:2 }}><Bot size={14}/></div>
            )}
            <div style={{ maxWidth:"82%", padding:"10px 14px", borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:m.role==="user"?"var(--green)":"var(--bg2)", color:m.role==="user"?"#000":"var(--text)", fontSize:14, lineHeight:1.6, border:m.role==="assistant"?"1px solid var(--border)":"none", whiteSpace:"pre-wrap" }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
            <div style={{ width:28, height:28, borderRadius:8, background:"rgba(123,47,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--purple)", flexShrink:0 }}><Bot size={14}/></div>
            <div style={{ padding:"10px 14px", background:"var(--bg2)", borderRadius:"16px 16px 16px 4px", border:"1px solid var(--border)", display:"flex", gap:5, alignItems:"center" }}>
              {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"var(--purple)", animation:"pulse 1s "+i*0.2+"s infinite" }} />)}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:12 }}>
          {SUGGESTIONS.map((s,i) => (
            <button key={i} onClick={() => sendMessage(s)} style={{ padding:"6px 12px", borderRadius:20, background:"var(--bg2)", border:"1px solid var(--border2)", color:"var(--text2)", fontSize:12, fontWeight:500, cursor:"pointer" }}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div style={{ display:"flex", gap:8, background:"var(--bg2)", border:"1px solid var(--border2)", borderRadius:14, padding:"6px 6px 6px 14px", marginBottom:16 }}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&sendMessage()} placeholder="Pregunta o pide un cambio en tus finanzas..." style={{ flex:1, background:"transparent", border:"none", padding:"6px 0", fontSize:14, outline:"none", color:"var(--text)" }} />
        <button onClick={() => sendMessage()} disabled={!input.trim()||loading} style={{ background:input.trim()?"var(--purple)":"var(--bg4)", color:"#fff", width:36, height:36, borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", padding:0, flexShrink:0, border:"none", cursor:"pointer" }}>
          <Send size={15}/>
        </button>
      </div>
    </div>
  )
}
