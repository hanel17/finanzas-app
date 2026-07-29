import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Sparkles, Send, X } from 'lucide-react'

const QUICK = [
  "En que estoy gastando mas?",
  "Analiza mis gastos",
  "Como ahorrar este mes?",
  "Hazme un presupuesto",
]

export default function AIBar({ userName }) {
  const { user } = useAuth()
  const [input, setInput] = useState("")
  const [reply, setReply] = useState(null)
  const [asked, setAsked] = useState(false)
  const [loading, setLoading] = useState(false)

  const getContext = async () => {
    const [profile, cards, expenses, transactions] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("credit_cards").select("*").eq("user_id", user.id),
      supabase.from("fixed_expenses").select("*").eq("user_id", user.id),
      supabase.from("transactions").select("*").eq("user_id", user.id).order("date", { ascending: false }).limit(30),
    ])
    const p = profile.data || {}
    const totalIncome = (p.monthly_income||0) + (p.spouse_income||0)
    const totalDebt = (cards.data||[]).reduce((s,c)=>s+Number(c.current_balance),0)
    const totalFixed = (expenses.data||[]).reduce((s,e)=>s+Number(e.amount),0)
    const txByCategory = (transactions.data||[]).reduce((acc,t) => {
      if(t.type==="expense") acc[t.category] = (acc[t.category]||0) + Number(t.amount)
      return acc
    }, {})
    return "Ingreso: RD$"+totalIncome+" | Gastos fijos: RD$"+totalFixed+" | Deuda: RD$"+totalDebt+" | Categorias: "+JSON.stringify(txByCategory)
  }

  const ask = async (q) => {
    const question = q || input.trim()
    if (!question || loading) return
    setInput("")
    setLoading(true)
    setReply(null)
    try {
      const context = await getContext()
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Eres un asesor financiero personal. Responde en maximo 3 oraciones, directo y en espanol. Datos del usuario: " + context },
            { role: "user", content: question }
          ]
        })
      })
      const data = await res.json()
      setReply(data.choices?.[0]?.message?.content || "Sin respuesta.")
    } catch(e) {
      setReply("Error conectando con el asistente.")
    }
    setLoading(false)
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Buenos dias" : hour < 18 ? "Buenas tardes" : "Buenas noches"

  return (
    <div style={{ background: "linear-gradient(135deg, rgba(0,208,132,0.06) 0%, rgba(123,47,255,0.06) 100%)", border: "1px solid rgba(0,208,132,0.15)", borderRadius: 16, padding: "16px 20px", marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, var(--green), var(--purple))", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={16} color="#000" />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{greeting}, {userName || "bienvenido"} 👋</div>
          <div style={{ fontSize: 11, color: "var(--text2)" }}>Asistente IA · Basado en tus datos reales</div>
        </div>
        {reply && <button onClick={() => setReply(null)} style={{ marginLeft: "auto", background: "transparent", color: "var(--text3)", padding: 4 }}><X size={14}/></button>}
      </div>

      {reply && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, lineHeight: 1.6, color: "var(--text)", border: "1px solid var(--border2)" }}>
          <span style={{ color: "var(--green)", fontWeight: 600, marginRight: 6 }}>✦</span>{reply}
        </div>
      )}

      {loading && (
        <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 13, color: "var(--text2)" }}>
          Analizando tus finanzas...
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Hazme una pregunta sobre tus finanzas..."
          style={{ flex: 1, padding: "9px 14px", fontSize: 13, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border2)" }}
        />
        <button onClick={() => ask()} disabled={!input.trim() || loading}
          style={{ background: input.trim() ? "var(--green)" : "var(--bg3)", color: "#000", width: 38, height: 38, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0 }}>
          <Send size={15} color={input.trim() ? "#000" : "#555"} />
        </button>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {QUICK.map((q, i) => (
          <button key={i} onClick={() => ask(q)} style={{ padding: "5px 10px", borderRadius: 20, background: "rgba(0,0,0,0.3)", border: "1px solid var(--border2)", color: "var(--text2)", fontSize: 11, fontWeight: 500 }}>
            {q}
          </button>
        ))}
      </div>
    </div>
  )
}
