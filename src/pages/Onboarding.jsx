import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

const CATEGORIES = ["hogar","comida","transporte","servicios","salud","educacion","entretenimiento","tarjeta","diezmo","gas","otros"]
const CAT_ICONS = { hogar:"🏠", comida:"🍔", transporte:"🚗", servicios:"⚡", salud:"💊", educacion:"📚", entretenimiento:"🎬", tarjeta:"💳", diezmo:"🙏", gas:"⛽", otros:"📦" }

const FREQ_OPTIONS = [
  {
    value: "biweekly",
    label: "Quincenal",
    emoji: "📅",
    desc: "Me pagan 2 veces al mes",
    detail: "Por ejemplo: el 15 y el 30 de cada mes, o el 1 y el 16.",
    benefit: "Ideal para planificar gastos en dos mitades del mes."
  },
  {
    value: "monthly",
    label: "Mensual",
    emoji: "🗓️",
    desc: "Me pagan 1 vez al mes",
    detail: "Recibes todo tu salario en un solo día cada mes.",
    benefit: "Te ayuda a distribuir tu dinero durante 30 días completos."
  },
  {
    value: "weekly",
    label: "Semanal",
    emoji: "📆",
    desc: "Me pagan cada semana",
    detail: "Recibes ingresos todos los lunes, viernes u otro día fijo.",
    benefit: "Control semana a semana de cada peso que entra y sale."
  }
]

export default function Onboarding() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    full_name: "",
    monthly_income: "",
    spouse_income: "",
    frequency: "",
    pay_day_1: "",
    pay_day_2: "",
    currency: "DOP",
    expenses: [{ name: "", amount: "", category: "hogar", due_day: "" }]
  })

  const updateExpense = (i, field, val) => {
    const exps = [...form.expenses]
    exps[i][field] = val
    setForm({ ...form, expenses: exps })
  }

  const handleFinish = async () => {
    setLoading(true)
    try {
      const { data: authData } = await supabase.auth.getUser()
      const uid = authData?.user?.id
      if (!uid) { navigate("/login"); return }

      await supabase.from("profiles").upsert({
        id: uid, full_name: form.full_name,
        monthly_income: Number(form.monthly_income) || 0,
        spouse_income: Number(form.spouse_income) || 0
      })

      await supabase.from("financial_cycles_config").upsert({
        user_id: uid,
        frequency: form.frequency,
        pay_day_1: Number(form.pay_day_1) || 27,
        pay_day_2: Number(form.pay_day_2) || 12,
        currency: form.currency,
        expected_income: Number(form.monthly_income) || 0,
        updated_at: new Date().toISOString()
      }, { onConflict: "user_id" })

      const validExpenses = form.expenses.filter(e => e.name && e.amount)
      if (validExpenses.length > 0) {
        await supabase.from("fixed_expenses").insert(
          validExpenses.map(e => ({
            user_id: uid, name: e.name,
            amount: Number(e.amount), category: e.category,
            due_day: e.due_day ? Number(e.due_day) : null
          }))
        )
      }
      setStep(6)
    } catch(e) { console.error(e) }
    setLoading(false)
  }

  const selectedFreq = FREQ_OPTIONS.find(f => f.value === form.frequency)

  const s = {
    wrap: { minHeight: "100vh", background: "#020617", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" },
    card: { background: "#090d16", border: "1px solid #1e293b", borderRadius: 24, padding: "36px 32px", width: "min(520px, 100%)" },
    inp: { width: "100%", background: "#1e293b", border: "1px solid #334155", color: "#fff", borderRadius: 10, padding: "12px 14px", fontSize: 15, outline: "none", fontFamily: "inherit", marginTop: 4 },
    lbl: { fontSize: 12, color: "#64748b", display: "block", marginBottom: 4, marginTop: 14 },
    progress: (active) => ({ flex: 1, height: 3, borderRadius: 2, background: active ? "#10b981" : "#1e293b", transition: "background .3s" }),
    btnPrimary: { width: "100%", padding: 14, background: "#10b981", color: "#000", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 15, fontWeight: 700, marginTop: 20 },
    btnSecondary: { padding: "12px 20px", background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 500 },
    tip: { background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 12, padding: "12px 16px", marginTop: 16, fontSize: 13, color: "#94a3b8", lineHeight: 1.6 },
  }

  return (
    <div style={s.wrap}>
      <div style={s.card}>

        {/* STEP 1 - Welcome */}
        {step === 1 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>💰</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.5px" }}>
              Bienvenido a HR Finanzas
            </h1>
            <p style={{ color: "#64748b", fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
              La mayoría de las personas no saben exactamente en qué gastan su dinero. HR Finanzas cambia eso.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28, textAlign: "left" }}>
              {[
                ["🎯", "Sabe exactamente cuánto puedes gastar hoy"],
                ["📊", "Ve en qué categorías se va tu dinero"],
                ["🤖", "Un asistente IA analiza tus finanzas en tiempo real"],
                ["📅", "Organiza todo por ciclos de cobro, no por meses"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 20 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{text}</span>
                </div>
              ))}
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 13, color: "#64748b", display: "block", marginBottom: 8 }}>¿Cómo te llamas?</label>
              <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})}
                placeholder="Tu nombre completo" style={s.inp} autoFocus
                onKeyDown={e => e.key === "Enter" && form.full_name && setStep(2)} />
            </div>
            <button onClick={() => form.full_name ? setStep(2) : null}
              style={{ ...s.btnPrimary, opacity: form.full_name ? 1 : 0.4 }}>
              Empezar — son solo 3 pasos →
            </button>
            <p style={{ fontSize: 11, color: "#334155", marginTop: 12 }}>Sin tarjeta de crédito · Gratis para siempre</p>
          </div>
        )}

        {/* STEP 2 - Frequency */}
        {step === 2 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1,2,3,4].map(s2 => <div key={s2} style={s.progress(s2 <= 1)} />)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Paso 1 de 3 · Tu ciclo financiero</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>¿Cada cuánto te pagan?</h2>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              En lugar de trabajar con meses calendario, HR Finanzas organiza tus finanzas por <b style={{ color: "#10b981" }}>ciclos de cobro</b> — el período entre un pago y el siguiente. Esto es mucho más preciso porque el dinero no llega el 1ro de cada mes para todos.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {FREQ_OPTIONS.map(opt => (
                <div key={opt.value} onClick={() => setForm({...form, frequency: opt.value})}
                  style={{ padding: "14px 16px", background: form.frequency === opt.value ? "rgba(16,185,129,0.08)" : "#0f172a",
                    border: `1.5px solid ${form.frequency === opt.value ? "#10b981" : "#1e293b"}`,
                    borderRadius: 14, cursor: "pointer", transition: "all .2s" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: form.frequency === opt.value ? "#10b981" : "#e2e8f0" }}>{opt.label}</div>
                      <div style={{ fontSize: 12, color: "#64748b" }}>{opt.desc}</div>
                    </div>
                    {form.frequency === opt.value && <span style={{ marginLeft: "auto", color: "#10b981", fontSize: 18 }}>✓</span>}
                  </div>
                  {form.frequency === opt.value && (
                    <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 6, paddingTop: 8, borderTop: "1px solid #1e293b" }}>
                      {opt.detail}<br/><span style={{ color: "#10b981" }}>💡 {opt.benefit}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <button onClick={() => form.frequency ? setStep(3) : null}
              style={{ ...s.btnPrimary, opacity: form.frequency ? 1 : 0.4 }}>
              Continuar →
            </button>
          </div>
        )}

        {/* STEP 3 - Pay days */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1,2,3,4].map(s2 => <div key={s2} style={s.progress(s2 <= 2)} />)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Paso 1 de 3 · Días de cobro</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
              {selectedFreq?.emoji} ¿Qué día{form.frequency === "biweekly" ? "s" : ""} te pagan?
            </h2>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              {form.frequency === "biweekly" && "Dinos los dos días del mes en que recibes tu pago. Esto nos permite calcular exactamente cuánto dinero tienes disponible en cada quincena."}
              {form.frequency === "monthly" && "¿Qué día del mes recibes tu salario? Con esto calculamos tu ciclo de 30 días exacto."}
              {form.frequency === "weekly" && "¿Qué día de la semana te pagan? Organizaremos tus gastos semana a semana."}
            </p>

            <div style={{ display: "grid", gridTemplateColumns: form.frequency === "biweekly" ? "1fr 1fr" : "1fr", gap: 12, marginBottom: 16 }}>
              <div>
                <label style={s.lbl}>{form.frequency === "biweekly" ? "Primer día de cobro" : "Día de cobro del mes"}</label>
                <input type="number" min="1" max="31" value={form.pay_day_1} onChange={e => setForm({...form, pay_day_1: e.target.value})}
                  placeholder="Ej: 27" style={{ ...s.inp, fontSize: 22, fontWeight: 700, textAlign: "center" }} />
              </div>
              {form.frequency === "biweekly" && (
                <div>
                  <label style={s.lbl}>Segundo día de cobro</label>
                  <input type="number" min="1" max="31" value={form.pay_day_2} onChange={e => setForm({...form, pay_day_2: e.target.value})}
                    placeholder="Ej: 12" style={{ ...s.inp, fontSize: 22, fontWeight: 700, textAlign: "center" }} />
                </div>
              )}
            </div>

            {form.pay_day_1 && (
              <div style={s.tip}>
                <b style={{ color: "#10b981" }}>✓ Tu ciclo quedará así:</b><br/>
                {form.frequency === "biweekly" && form.pay_day_2
                  ? `Del día ${form.pay_day_1} → al día ${Number(form.pay_day_2)-1} (primera quincena) y del día ${form.pay_day_2} → al día ${Number(form.pay_day_1)-1} (segunda quincena).`
                  : `Del día ${form.pay_day_1} de cada mes al día ${Number(form.pay_day_1)-1} del mes siguiente.`
                }<br/><br/>
                💡 HR Finanzas calculará automáticamente cuántos días te quedan y cuánto puedes gastar por día sin quedarte sin dinero.
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(2)} style={s.btnSecondary}>← Atrás</button>
              <button onClick={() => form.pay_day_1 ? setStep(4) : null}
                style={{ ...s.btnPrimary, flex: 1, marginTop: 0, opacity: form.pay_day_1 ? 1 : 0.4 }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 4 - Income */}
        {step === 4 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1,2,3,4].map(s2 => <div key={s2} style={s.progress(s2 <= 3)} />)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Paso 2 de 3 · Tus ingresos</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>💵 ¿Cuánto recibes?</h2>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 20 }}>
              Este es el número más importante. Con tu ingreso por ciclo calculamos <b style={{ color: "#e2e8f0" }}>exactamente cuánto puedes gastar</b> cada día sin comprometer tus obligaciones.
            </p>
            <div>
              <label style={s.lbl}>Tu ingreso por ciclo (RD$)</label>
              <input type="number" value={form.monthly_income} onChange={e => setForm({...form, monthly_income: e.target.value})}
                placeholder="Ej: 22,000" style={{ ...s.inp, fontSize: 24, fontWeight: 700 }} autoFocus />
            </div>
            <div>
              <label style={s.lbl}>Ingreso de tu pareja (opcional)</label>
              <input type="number" value={form.spouse_income} onChange={e => setForm({...form, spouse_income: e.target.value})}
                placeholder="0" style={s.inp} />
              <p style={{ fontSize: 11, color: "#334155", marginTop: 6 }}>Si combinan finanzas en el hogar, esto mejora los cálculos.</p>
            </div>
            <div>
              <label style={s.lbl}>Moneda</label>
              <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} style={s.inp}>
                <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                <option value="USD">🇺🇸 Dólares (USD)</option>
              </select>
            </div>

            {form.monthly_income && (
              <div style={s.tip}>
                <b style={{ color: "#10b981" }}>📊 Vista previa:</b><br/>
                Con RD${Number(form.monthly_income).toLocaleString()} por ciclo, si gastas de forma balanceada tendrías aproximadamente <b style={{ color: "#10b981" }}>RD${Math.round(Number(form.monthly_income) / 30).toLocaleString()}/día</b> disponibles (antes de compromisos fijos).
              </div>
            )}

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button onClick={() => setStep(3)} style={s.btnSecondary}>← Atrás</button>
              <button onClick={() => form.monthly_income ? setStep(5) : null}
                style={{ ...s.btnPrimary, flex: 1, marginTop: 0, opacity: form.monthly_income ? 1 : 0.4 }}>
                Continuar →
              </button>
            </div>
          </div>
        )}

        {/* STEP 5 - Fixed expenses */}
        {step === 5 && (
          <div>
            <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
              {[1,2,3,4].map(s2 => <div key={s2} style={s.progress(s2 <= 4)} />)}
            </div>
            <div style={{ fontSize: 11, color: "#10b981", fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>Paso 3 de 3 · Compromisos fijos</div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 8 }}>📋 ¿Qué debes pagar sí o sí?</h2>
            <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6, marginBottom: 8 }}>
              Los <b style={{ color: "#e2e8f0" }}>compromisos fijos</b> son pagos que no puedes evitar: renta, tarjetas, préstamos, internet, seguros. HR Finanzas los reserva automáticamente de tu dinero disponible para que <b style={{ color: "#10b981" }}>nunca te olvides de pagarlos</b>.
            </p>
            <p style={{ color: "#475569", fontSize: 12, marginBottom: 16 }}>💡 Puedes agregar más después. Empieza con los más importantes.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12, maxHeight: 280, overflowY: "auto" }}>
              {form.expenses.map((exp, i) => (
                <div key={i} style={{ background: "#1e293b", borderRadius: 12, padding: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 100px", gap: 8, marginBottom: 8 }}>
                    <input placeholder="Ej: Renta, Claro, BHD..." value={exp.name}
                      onChange={e => updateExpense(i, "name", e.target.value)}
                      style={{ ...s.inp, padding: "8px 12px", fontSize: 13, marginTop: 0 }} />
                    <input type="number" placeholder="Monto" value={exp.amount}
                      onChange={e => updateExpense(i, "amount", e.target.value)}
                      style={{ ...s.inp, padding: "8px 12px", fontSize: 13, marginTop: 0 }} />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px 28px", gap: 8, alignItems: "center" }}>
                    <select value={exp.category} onChange={e => updateExpense(i, "category", e.target.value)}
                      style={{ ...s.inp, padding: "6px 10px", fontSize: 12, marginTop: 0 }}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{CAT_ICONS[c]} {c}</option>)}
                    </select>
                    <input type="number" min="1" max="31" placeholder="Día vence" value={exp.due_day}
                      onChange={e => updateExpense(i, "due_day", e.target.value)}
                      style={{ ...s.inp, padding: "6px 10px", fontSize: 12, marginTop: 0 }} />
                    {form.expenses.length > 1 && (
                      <button onClick={() => setForm({...form, expenses: form.expenses.filter((_,idx) => idx !== i)})}
                        style={{ background: "transparent", border: "none", color: "#475569", cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button onClick={() => setForm({...form, expenses: [...form.expenses, { name: "", amount: "", category: "hogar", due_day: "" }]})}
              style={{ width: "100%", padding: 10, background: "transparent", border: "1px dashed #334155", color: "#475569", borderRadius: 10, cursor: "pointer", fontSize: 13, marginBottom: 16 }}>
              + Agregar otro compromiso
            </button>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep(4)} style={s.btnSecondary}>← Atrás</button>
              <button onClick={handleFinish} disabled={loading}
                style={{ ...s.btnPrimary, flex: 1, marginTop: 0 }}>
                {loading ? "Configurando..." : "¡Empezar a controlar mis finanzas! 🚀"}
              </button>
            </div>
            <button onClick={() => { handleFinish() }}
              style={{ width: "100%", background: "transparent", border: "none", color: "#334155", fontSize: 12, cursor: "pointer", marginTop: 10, padding: 6 }}>
              Saltar por ahora (puedo configurarlo después)
            </button>
          </div>
        )}

        {/* STEP 6 - Done */}
        {step === 6 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#fff", marginBottom: 10 }}>
              ¡Listo, {form.full_name?.split(" ")[0]}!
            </h2>
            <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
              Tu cuenta está configurada. A partir de hoy sabrás exactamente en qué se va tu dinero y cuánto puedes gastar sin preocupaciones.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28, textAlign: "left" }}>
              {[
                ["✅", "Tu ciclo financiero está configurado"],
                ["✅", "Tus compromisos fijos están registrados"],
                ["✅", "El asistente IA ya tiene contexto de tus finanzas"],
                ["🔜", "Registra tu primer gasto o ingreso"],
              ].map(([icon, text]) => (
                <div key={text} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: "#0f172a", borderRadius: 10, border: "1px solid #1e293b" }}>
                  <span style={{ fontSize: 18 }}>{icon}</span>
                  <span style={{ fontSize: 13, color: "#cbd5e1" }}>{text}</span>
                </div>
              ))}
            </div>
            <button onClick={() => navigate("/")} style={s.btnPrimary}>
              Ir a mi Dashboard →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
