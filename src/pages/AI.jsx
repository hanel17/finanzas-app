import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { Send, Bot } from 'lucide-react'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SUGGESTIONS = [
  "¿En qué estoy gastando más?",
  "¿Cómo puedo ahorrar RD$5,000 este mes?",
  "¿Cuál fue mi peor categoría?",
  "¿Puedo comprar algo de RD$20,000?",
  "Hazme un presupuesto",
  "¿Qué gastos puedo reducir?",
]

const WELCOME = "¡Hola! Soy tu asistente financiero personal. Puedo analizar tus finanzas y darte recomendaciones personalizadas. ¿En qué te puedo ayudar hoy?"

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
      " | Deuda tarjetas: RD$" + totalDebt +
      " | Tarjetas: " + JSON.stringify(cards.data||[]) +
      " | Gastos por categoria: " + JSON.stringify(txByCategory) +
      " | Metas: " + JSON.stringify(goals.data||[])
  }

  const sendMessage = async (text) => {
    const q = text || input
    if (!q.trim() || loading) return
    const newMessages = [...messages, { role: "user", content: q }]
    setMessages(newMessages)
    setInput("")
    setLoading(true)

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY
      const genAI = new GoogleGenerativeAI(apiKey)
      const context = await getFinancialContext()
      
      const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        systemInstruction: "Eres un asesor financiero personal experto. Da consejos específicos y accionables basados en los datos del usuario. Sé directo y amigable. Habla en español dominicano. " + context
      })

      const history = newMessages.slice(1, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }]
      }))

      const chat = model.startChat({ history })
      const result = await chat.sendMessage(q)
      const responseText = result.response.text()

      setMessages(prev => [...prev, { role: "assistant", content: responseText }])
    } catch (e) {
      console.error("Error con Gemini SDK:", e)
      setMessages(prev => [...prev, { role: "assistant", content: "Lo siento, hubo un error al consultar a Gemini." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "20px", display: "flex", flexDirection: "column", height: "calc(100vh - 100px)" }}>
      <h2 style={{ marginBottom: "5px" }}>Asistente IA</h2>
      <p style={{ color: "var(--text2)", marginBottom: "20px" }}>Analiza tus finanzas en tiempo real</p>

      <div style={{ flex: 1, overflowY: "auto", paddingRight: "10px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", gap: "10px", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            {m.role === "assistant" && (
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Bot size={18} color="#000" />
              </div>
            )}
            <div style={{
              background: m.role === "user" ? "var(--accent)" : "var(--bg3)",
              color: m.role === "user" ? "#000" : "var(--text1)",
              padding: "12px 16px",
              borderRadius: "16px",
              maxWidth: "80%",
              whiteSpace: "pre-wrap",
              fontSize: "14px",
              lineHeight: "1.5"
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: "var(--text2)", fontSize: "14px", fontStyle: "italic" }}>
            Escribiendo respuesta...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "15px 0" }}>
        {SUGGESTIONS.map((s, i) => (
          <button key={i} onClick={() => sendMessage(s)} style={{ background: "var(--bg2)", border: "1px solid var(--border)", padding: "6px 12px", borderRadius: "20px", fontSize: "12px", color: "var(--text2)", cursor: "pointer" }}>
            {s}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Hazme una pregunta sobre tus finanzas..."
          style={{ flex: 1, padding: "12px 16px", borderRadius: "8px", background: "var(--bg2)", border: "1px solid var(--border)", color: "var(--text1)", fontSize: "14px" }}
        />
        <button onClick={() => sendMessage()} style={{ background: "var(--accent)", border: "none", borderRadius: "8px", padding: "0 16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Send size={18} color="#000" />
        </button>
      </div>
    </div>
  )
}
