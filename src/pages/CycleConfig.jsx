import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Calendar, DollarSign, RefreshCw, Save, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function CycleConfig() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState({ type: '', text: '' })

  const [form, setForm] = useState({
    frequency: 'monthly',
    pay_day_1: 25,
    pay_day_2: 10,
    currency: 'DOP',
    expected_income: 45000,
    income_type: 'fixed'
  })

  useEffect(() => {
    async function loadConfig() {
      if (!user) return
      try {
        const { data, error } = await supabase
          .from('financial_cycles_config')
          .select('*')
          .eq('user_id', user?.id)
          .maybeSingle()

        if (data) {
          setForm(data)
        }
      } catch (err) {
        console.error("Error al cargar configuración:", err)
      } finally {
        setLoading(false)
      }
    }
    loadConfig()
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    let userId = user?.id
    if (!userId) {
      const { data } = await supabase.auth.getUser()
      userId = data?.user?.id
    }
    if (!userId) {
      setMsg({ type: 'error', text: 'Sesion no encontrada. Recarga la pagina.' })
      return
    }
    setSaving(true)
    setMsg({ type: '', text: '' })

    try {
      const payload = {
        user_id: userId,
        ...form,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('financial_cycles_config')
        .upsert(payload, { onConflict: 'user_id' })

      if (error) throw error

      setMsg({ type: 'success', text: '¡Configuración de Ciclo Financiero guardada correctamente!' })
      setTimeout(() => navigate('/'), 1200)
    } catch (err) {
      console.error(err)
      setMsg({ type: 'error', text: 'Error al guardar la configuración: ' + err.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 680, margin: '30px auto', padding: '0 20px', color: '#fff' }}>
      
      <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', color: '#818cf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <ArrowLeft size={16} /> Volver al Dashboard
      </button>

      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{ background: '#312e81', padding: 10, borderRadius: 12 }}>
            <Calendar size={24} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Configuración de Ciclo Financiero</h2>
            <p style={{ margin: 0, color: '#64748b', fontSize: 13 }}>Define cómo se administran tus ingresos de cobro a cobro</p>
          </div>
        </div>

        {msg.text && (
          <div style={{ padding: '12px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, background: msg.type === 'success' ? '#10b98120' : '#f43f5e20', color: msg.type === 'success' ? '#34d399' : '#f87171', border: `1px solid ${msg.type === 'success' ? '#10b981' : '#f43f5e'}` }}>
            {msg.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#cbd5e1' }}>
              Frecuencia de Ingreso / Cobro
            </label>
            <select
              value={form.frequency}
              onChange={(e) => setForm({ ...form, frequency: e.target.value })}
              style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
            >
              <option value="monthly">Mensual (del Día X al Día Y - ej. 25 al 24)</option>
              <option value="biweekly">Quincenal (2 pagos al mes - ej. 15 y 30)</option>
              <option value="weekly">Semanal (cada 7 días)</option>
              <option value="every_14">Cada 14 días</option>
              <option value="every_15">Cada 15 días</option>
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#cbd5e1' }}>
                Día Principal de Cobro
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={form.pay_day_1}
                onChange={(e) => setForm({ ...form, pay_day_1: Number(e.target.value) })}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>

            {form.frequency === 'biweekly' && (
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#cbd5e1' }}>
                  Segundo Día de Cobro
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={form.pay_day_2}
                  onChange={(e) => setForm({ ...form, pay_day_2: Number(e.target.value) })}
                  style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
                />
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#cbd5e1' }}>
                Moneda Principal
              </label>
              <select
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value })}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
              >
                <option value="DOP">🇩🇴 Pesos Dominicanos (DOP)</option>
                <option value="USD">🇺🇸 Dólares Estadounidenses (USD)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#cbd5e1' }}>
                Ingreso Esperado por Ciclo
              </label>
              <input
                type="number"
                value={form.expected_income}
                onChange={(e) => setForm({ ...form, expected_income: Number(e.target.value) })}
                style={{ width: '100%', background: '#1e293b', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#fff', fontSize: 14, outline: 'none' }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            style={{ width: '100%', padding: '12px', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: 10, cursor: 'pointer', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}
          >
            <Save size={16} /> {saving ? 'Guardando...' : 'Aplicar Ciclo Financiero'}
          </button>

        </form>
      </div>
    </div>
  )
}
