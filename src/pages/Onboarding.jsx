import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const STEPS = [
  { num: 1, title: "Bienvenido a HR Finanzas", emoji: "👋" },
  { num: 2, title: "Tus ingresos", emoji: "💵" },
  { num: 3, title: "Tu ciclo de cobro", emoji: "📅" },
  { num: 4, title: "Compromisos fijos", emoji: "📋" },
  { num: 5, title: "Listo", emoji: "🎉" },
]

const CATEGORIES = ["hogar","comida","transporte","servicios","salud","educacion","entretenimiento","tarjeta","diezmo","gas","otros"]
const CAT_ICONS = { hogar:"🏠", comida:"🍔", transporte:"🚗", servicios:"⚡", salud:"💊", educacion:"📚", entretenimiento:"🎬", tarjeta:"💳", diezmo:"🙏", gas:"⛽", otros:"📦" }

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    monthly_income: "",
    spouse_income: "",
    frequency: "biweekly",
    pay_day_1: "27",
    pay_day_2: "12",
    currency: "DOP",
    expenses: [{ name: "", amount: "", category: "hogar", due_day: "" }]
  })

  const updateExpense = (i, field, val) => {
    const exps = [...form.expenses]
    exps[i][field] = val
    setForm({ ...form, expenses: exps })
  }

  const addExpense = () => {
    setForm({ ...form, expenses: [...form.expenses, { name: "", amount: "", category: "hogar", due_day: "" }] })
  }

  const removeExpense = (i) => {
    setForm({ ...form, expenses: form.expenses.filter((_, idx) => idx !== i) })
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) { navigate("/login"); return }

      // Save profile
      await supabase.from("profiles").upsert({
        id: uid,
        full_name: form.full_name,
        monthly_income: Number(form.monthly_income) || 0,
        spouse_income: Number(form.spouse_income) || 0
      })

      // Save cycle config
      await supabase.from("financial_cycles_config").upsert({
        user_id: uid,
        frequency: form.frequency,
        pay_day_1: Number(form.pay_day_1),
        pay_day_2: Number(form.pay_day_2),
        currency: form.currency,
        expected_income: Number(form.monthly_income) || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })

      // Save fixed expenses (compromisos)
      const validExpenses = form.expenses.filter(e => e.name && e.amount)
      if (validExpenses.length > 0) {
        await supabase.from("fixed_expenses").insert(
          validExpenses.map(e => ({
            user_id: uid,
            name: e.name,
            amount: Number(e.amount),
            category: e.category,
            due_day: e.due_day ? Number(e.due_day) : null
          }))
        )
      }

      setStep(5)
    } catch(e) {
      console.error(e)
    }
    setLoading(false)
  }

  const bg = { minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }
  const card = { background: "#090d16", border: "1px solid #1e293b", borderRadius: 20, padding: 32, width: "min(480px, 100%)" }
  const inp = { width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "inherit" }
  const lbl = { fontSize: 12, color: "#64748b", display: "block", marginBottom: 6 }
  const btn = (bg2, color2) => ({ width: "100%", padding: 14, background: bg2, color: color2, border: "none", borderRadius: 10, cursor: "pointer", fontSize: 15, fontWeight: 700, marginTop: 8 })

  return (
    <div style={bg}>
      <div style={card}>
        {/* Progress */}
        {step < 5 && (
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              {[1,2,3,4].map(s => (
                <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: s <= step ? "#10b981" : "#1e293b", transition: "background .3s" }} />
              ))}
            </div>
            <div style={{ fontSize: 12, color: "#475569" }}>Paso {step} de 4</div>
          </div>
        )}

        {/* Step 1 - Welcome */}
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>💰</div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Bienvenido a HR Finanzas</h1>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Tu asistente financiero personal inteligente. En 2 minutos tendrás todo configurado.
            </p>
            <div style={{ marginBottom: 20 }}>
              <label style={lbl}>¿Cómo te llamas?</label>
              <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                placeholder="Hanel Ramírez" style={inp} autoFocus />
            </div>
            <button onClick={() => form.full_name ? setStep(2) : null}
              style={{ ...btn("#10b981", "#000"), opacity: form.full_name ? 1 : 0.5 }}>
              Empezar →
            </button>
          </div>
        )}

        {/* Step 2 - Income */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>💵</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Tus ingresos</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>¿Cuánto recibes por ciclo de cobro?</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Tu ingreso por ciclo (RD$)</label>
                <input type="number" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})}
                  placeholder="22000" style={{ ...inp, fontSize: 22, fontWeight: 700 }} />
              </div>
              <div>
                <label style={lbl}>Ingreso de tu pareja (opcional)</label>
                <input type="number" value={form.spouse_income} onChange={e => setForm({...form, spouse_income: e.target.value})}
                  placeholder="0" style={inp} />
              </div>
              <div>
                <label style={lbl}>Moneda</label>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={inp}>
                  <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                  <option value="USD">🇺🇸 Dólares (USD)</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(1)} style={{ ...btn("#1e293b", "#94a3b8"), flex: 1 }}>← Atrás</button>
              <button onClick={() => form.monthly_income ? setStep(3) : null}
                style={{ ...btn("#10b981", "#000"), flex: 2, opacity: form.monthly_income ? 1 : 0.5 }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* Step 3 - Cycle */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📅</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>¿Cuándo te pagan?</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 24 }}>Esto define tu ciclo financiero</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={lbl}>Frecuencia de cobro</label>
                <select value={form.frequency} onChange={e => setForm({...form, frequency: e.target.value})} style={inp}>
                  <option value="biweekly">Quincenal (2 veces al mes)</option>
                  <option value="monthly">Mensual (1 vez al mes)</option>
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: form.frequency === "biweekly" ? "1fr 1fr" : "1fr", gap: 12 }}>
                <div>
                  <label style={lbl}>{form.frequency === "biweekly" ? "Primer día de cobro" : "Día de cobro"}</label>
                  <input type="number" min="1" max="31" value={form.pay_day_1} onChange={e => setForm({...form, pay_day_1: e.target.value})}
                    placeholder="27" style={inp} />
                </div>
                {form.frequency === "biweekly" && (
                  <div>
                    <label style={lbl}>Segundo día de cobro</label>
                    <input type="number" min="1" max="31" value={form.pay_day_2} onChange={e => setForm({...form, pay_day_2: e.target.value})}
                      placeholder="12" style={inp} />
                  </div>
                )}
              </div>
              <div style={{ background: "#1e293b", borderRadius: 10, padding: 12, fontSize: 13, color: "#94a3b8" }}>
                💡 Tu ciclo irá del día <b style={{ color: "#10b981" }}>{form.pay_day_1}</b>
                {form.frequency === "biweekly" ? ` al día ${Number(form.pay_day_2)-1}` : " al día " + (Number(form.pay_day_1)-1)} del siguiente mes.
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={{ ...btn("#1e293b", "#94a3b8"), flex: 1 }}>← Atrás</button>
              <button onClick={() => setStep(4)} style={{ ...btn("#10b981", "#000"), flex: 2 }}>Continuar →</button>
            </div>
          </div>
        )}

        {/* Step 4 - Fixed expenses */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "#fff", marginBottom: 4 }}>Compromisos fijos</h2>
            <p style={{ color: "#64748b", fontSize: 13, marginBottom: 20 }}>Pagos obligatorios cada ciclo (casa, tarjetas, préstamos...)</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14, maxHeight: 300, overflowY: "auto" }}>
              {form.expenses.map((exp, i) => (
                <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8, marginBottom: 8 }}>
                    <input placeholder="Ej: Casa, Claro, Préstamo..." value={exp.name} onChange={e => updateExpense(i, "name", e.target.value)}
                      style={{ ...inp, padding: "8px 12px", fontSize: 13 }} />
                    <input type="number" placeholder="Monto" value={exp.amount} onChange={e => updateExpense(i, "amount", e.target.value)}
                      style={{ ...inp, padding: "8px 12px", fontSize: 13 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 24px", gap: 8, alignItems: "center" }}>
                    <select value={exp.category} onChange={e => updateExpense(i, "category", e.target.value)}
                      style={{ ...inp, padding: "6px 10px", fontSize: 12 }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                    </select>
                    <input type="number" min="1" max="31" placeholder="Día" value={exp.due_day} onChange={e => updateExpense(i, "due_day", e.target.value)}
                      style={{ ...inp, padding: "6px 10px", fontSize: 12 }} />
                    {form.expenses.length > 1 && (
                      <button onClick={() => removeExpense(i)}
                        style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 18, padding: 0 }}>×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <button onClick={addExpense}
              style={{ width: "100%", padding: "10px", background: "transparent", border: "1px dashed #334155", color: "#64748b", borderRadius: 10, cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
              + Agregar otro compromiso
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setStep(3)} style={{ ...btn("#1e293b", "#94a3b8"), flex: 1 }}>← Atrás</button>
              <button onClick={handleFinish} disabled={loading}
                style={{ ...btn("#10b981", "#000"), flex: 2 }}>
                {loading ? "Guardando..." : "Finalizar configuración ✓"}
              </button>
            </div>
            <button onClick={() => { setStep(5); handleFinish() }}
              style={{ width: "100%", background: "transparent", border: "none", color: "#475569", fontSize: 12, cursor: "pointer", marginTop: 10, padding: 8 }}>
              Saltar por ahora
            </button>
          </div>
        )}

        {/* Step 5 - Done */}
        {step === 5 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>¡Todo listo, {form.full_name?.split(" ")[0] || "bienvenido"}!</h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
              Tu cuenta está configurada. Ya puedes empezar a controlar tus finanzas.
            </p>
            <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 12, padding: 16, marginBottom: 24, textAlign: "left" }}>
              {[
                ["💵", "Registra tus ingresos", "Cuando recibas un pago"],
                ["📋", "Marca compromisos pagados", "Desde el Dashboard"],
                ["🤖", "Pregúntale a la IA", "Análisis en tiempo real"],
                ["📊", "Revisa tus Insights", "Patrones y tendencias"],
              ].map(([icon, title, desc]) => (
                <div key={title} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0", borderBottom: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0" }}>{title}</div>
                    <div style={{ fontSize: 11, color: "#475569" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/")} style={btn("#10b981", "#000")}>
              Ir al Dashboard →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
