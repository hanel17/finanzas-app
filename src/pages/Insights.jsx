import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { FinancialEngine } from '../services/FinancialEngine'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts'

const fmt = (n) => Math.round(n || 0).toLocaleString('es-DO')
const CAT_ICONS = { comida:"🍔", transporte:"🚗", hogar:"🏠", servicios:"⚡", salud:"💊", entretenimiento:"🎬", tarjeta:"💳", diezmo:"🙏", ahorro:"🏦", ropa:"👕", gas:"⛽", regalo:"🎁", otros:"📦" }
const COLORS = ["#10b981","#4cc9f0","#f59e0b","#f43f5e","#7b2fff","#f77f00","#06d6a0","#e63946"]

export default function Insights() {
  const { user } = useAuth()
  const [data, setData] = useState({ transactions: [], fixedExpenses: [], savings: [], cycleConfig: null })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id || user?.id
      if (!uid) return
      const [txRes, expRes, savRes, cfgRes] = await Promise.all([
        supabase.from("transactions").select("*").eq("user_id", uid).order("date", { ascending: false }),
        supabase.from("fixed_expenses").select("*").eq("user_id", uid),
        supabase.from("savings").select("*").eq("user_id", uid),
        supabase.from("financial_cycles_config").select("*").eq("user_id", uid).maybeSingle()
      ])
      setData({
        transactions: txRes.data || [],
        fixedExpenses: expRes.data || [],
        savings: savRes.data || [],
        cycleConfig: cfgRes.data
      })
      setLoading(false)
    }
    load()
  }, [user])

  if (loading) return <div style={{ color:"#64748b", padding: 40 }}>Cargando insights...</div>

  const { transactions, fixedExpenses, savings, cycleConfig } = data
  const cycle = FinancialEngine.getCurrentCycle(cycleConfig)
  const metrics = FinancialEngine.calculate({
    transactions, fixedExpenses, savings, carryOver: 0,
    incomeConfig: cycleConfig?.expected_income || 0, cycle
  })
  const health = FinancialEngine.getHealthLabel(metrics.cycleHealth)

  // Current cycle transactions
  const cycleTxs = metrics.cycleTxs
  const cycleExpenses = cycleTxs.filter(t => t.type === "expense")

  // Category breakdown this cycle
  const byCat = cycleExpenses.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
    return acc
  }, {})
  const catData = Object.entries(byCat).sort((a,b) => b[1]-a[1]).map(([name, value]) => ({ name, value, icon: CAT_ICONS[name] || "📦" }))

  // Last cycle comparison
  const prevCycleEnd = new Date(cycle.startDate)
  prevCycleEnd.setDate(prevCycleEnd.getDate() - 1)
  const prevCycleStart = new Date(cycle.startDate)
  prevCycleStart.setMonth(prevCycleStart.getMonth() - 1)
  const prevTxs = transactions.filter(t => t.date >= prevCycleStart.toISOString().split("T")[0] && t.date <= prevCycleEnd.toISOString().split("T")[0])
  const prevSpent = prevTxs.filter(t => t.type === "expense").reduce((s,t) => s+Number(t.amount), 0)
  const prevIncome = prevTxs.filter(t => t.type === "income").reduce((s,t) => s+Number(t.amount), 0)

  // Weekly spend this cycle
  const weeklyData = []
  const cycleStart = new Date(cycle.startDate)
  for (let w = 0; w < 4; w++) {
    const wStart = new Date(cycleStart)
    wStart.setDate(wStart.getDate() + w * 7)
    const wEnd = new Date(wStart)
    wEnd.setDate(wEnd.getDate() + 6)
    const wTxs = cycleExpenses.filter(t => t.date >= wStart.toISOString().split("T")[0] && t.date <= wEnd.toISOString().split("T")[0])
    weeklyData.push({ name: `Sem ${w+1}`, gastos: wTxs.reduce((s,t) => s+Number(t.amount), 0) })
  }

  // Top transactions this cycle
  const topTx = [...cycleExpenses].sort((a,b) => Number(b.amount)-Number(a.amount)).slice(0, 5)

  // Alerts
  const alerts = []
  if (metrics.cycleHealth === "danger") alerts.push({ icon: "🔴", text: "Al ritmo actual no llegarás al próximo cobro", type: "danger" })
  if (metrics.cycleHealth === "warning") alerts.push({ icon: "🟡", text: "Poco margen disponible, modera los gastos", type: "warning" })
  if (byCat.comida > 8000) alerts.push({ icon: "🍔", text: `Comida ya va en RD$${fmt(byCat.comida)} este ciclo`, type: "warning" })
  if (byCat.entretenimiento > 3000) alerts.push({ icon: "🎬", text: `Entretenimiento subió a RD$${fmt(byCat.entretenimiento)}`, type: "warning" })
  if (metrics.cycleSpent > metrics.totalIncome * 0.5 && cycle.daysElapsed < cycle.totalDays / 2) alerts.push({ icon: "⚡", text: "Gastaste más del 50% antes de la mitad del ciclo", type: "danger" })
  if (alerts.length === 0) alerts.push({ icon: "✅", text: "Tus finanzas se ven saludables este ciclo", type: "good" })

  const cycleChange = prevSpent > 0 ? ((metrics.cycleSpent - prevSpent) / prevSpent * 100) : 0

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#fff" }}>Insights 📊</h1>
        <p style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Ciclo {cycle.formattedRange} · {cycle.daysElapsed} días transcurridos</p>
      </div>

      {/* Health + key numbers */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <div style={{ background: `${health.color}15`, border: `1px solid ${health.color}40`, borderRadius: 14, padding: 16, gridColumn: "span 2" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 24 }}>{health.emoji}</span>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: health.color }}>{health.label}</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>{health.desc}</div>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 11, color: "#64748b" }}>vs ciclo anterior</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: cycleChange > 0 ? "#f43f5e" : "#10b981" }}>
                {cycleChange > 0 ? "↑" : "↓"} {Math.abs(cycleChange).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Gastado este ciclo</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#f43f5e" }}>RD${fmt(metrics.cycleSpent)}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>de RD${fmt(metrics.moneyInHand)} disponibles</div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Ciclo anterior</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#94a3b8" }}>RD${fmt(prevSpent)}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Referencia</div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Mayor gasto</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b" }}>
            {catData[0] ? `${catData[0].icon} ${catData[0].name}` : "—"}
          </div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>
            RD${fmt(catData[0]?.value)}
          </div>
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 6 }}>Transacciones</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#4cc9f0" }}>{cycleExpenses.length}</div>
          <div style={{ fontSize: 11, color: "#475569", marginTop: 4 }}>Este ciclo</div>
        </div>
      </div>

      {/* Alerts */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 12 }}>Alertas inteligentes</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10,
              background: a.type === "good" ? "rgba(16,185,129,0.08)" : a.type === "danger" ? "rgba(244,63,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${a.type === "good" ? "rgba(16,185,129,0.2)" : a.type === "danger" ? "rgba(244,63,94,0.2)" : "rgba(245,158,11,0.2)"}` }}>
              <span style={{ fontSize: 18 }}>{a.icon}</span>
              <span style={{ fontSize: 13, color: "#e2e8f0" }}>{a.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Gastos por categoría</div>
          {catData.length === 0 ? (
            <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "24px 0" }}>Sin gastos este ciclo</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={catData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} dataKey="value" paddingAngle={2}>
                    {catData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                    formatter={v => `RD$${fmt(v)}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 8 }}>
                {catData.slice(0,6).map((d,i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#94a3b8" }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, background: COLORS[i%COLORS.length] }} />
                    {d.icon} {d.name} · RD${fmt(d.value)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 16 }}>Gasto semanal este ciclo</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weeklyData}>
              <XAxis dataKey="name" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#475569", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 8, fontSize: 12 }}
                formatter={v => [`RD$${fmt(v)}`, "Gastos"]} />
              <Bar dataKey="gastos" fill="#4cc9f0" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top transactions */}
      <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff", marginBottom: 14 }}>Top gastos del ciclo</div>
        {topTx.length === 0 ? (
          <div style={{ color: "#475569", fontSize: 13, textAlign: "center", padding: "16px 0" }}>Sin gastos este ciclo</div>
        ) : topTx.map((t, i) => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: i < topTx.length-1 ? "1px solid #1e293b" : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#1e293b", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                {CAT_ICONS[t.category] || "📦"}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e8f0" }}>{t.description}</div>
                <div style={{ fontSize: 11, color: "#475569" }}>{t.category} · {t.date}</div>
              </div>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "#f43f5e" }}>RD${fmt(Number(t.amount))}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
