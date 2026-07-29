import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Upload, CheckCircle2, AlertCircle, FileText, Sparkles, Trash2, DollarSign } from 'lucide-react'

export default function ScanStatement({ onClose, onSaved }) {
  const { user } = useAuth()
  const [file, setFile] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [activeTab, setActiveTab] = useState('DOP') // 'DOP' | 'USD'
  const [result, setResult] = useState(null)

  const handleUpload = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    setFile(selectedFile)
    setAnalyzing(true)

    // Simulación del motor mejorado con soporte DOP / USD
    setTimeout(() => {
      setAnalyzing(false)
      setResult({
        summary: {
          dop_expense: 20602.32,
          dop_income: 33438.82,
          usd_expense: 18.46,
          usd_income: 38.46,
        },
        transactions: [
          // Transacciones DOP
          { id: '1', date: '2026-06-15', description: 'MI GUSTO MELLA CHARLES', amount: 220, type: 'expense', category: 'Alimentación', currency: 'DOP', selected: true },
          { id: '2', date: '2026-06-24', description: 'BRAVO CHARLES DE GAULLE', amount: 4665, type: 'expense', category: 'Supermercado', currency: 'DOP', selected: true },
          { id: '3', date: '2026-06-26', description: 'PAGOS TARJETAS INTERNET', amount: 28000, type: 'income', category: 'Abono a Tarjeta', currency: 'DOP', selected: true },
          { id: '4', date: '2026-07-10', description: 'PAGOS TARJETAS INTERNET', amount: 5100, type: 'income', category: 'Abono a Tarjeta', currency: 'DOP', selected: true },
          { id: '5', date: '2026-07-13', description: 'DEVOLUCION 7% BRAVO JUNIO', amount: 326.55, type: 'income', category: 'Reembolsos / Cashback', currency: 'DOP', selected: true },
          
          // Transacciones USD
          { id: '6', date: '2026-06-25', description: 'APPLE.COM BILL', amount: 0.99, type: 'expense', category: 'Suscripciones', currency: 'USD', selected: true },
          { id: '7', date: '2026-07-08', description: 'SPOTIFY, STOCKHOLM', amount: 6.49, type: 'expense', category: 'Suscripciones', currency: 'USD', selected: true },
          { id: '8', date: '2026-07-10', description: 'NETFLIX.COM', amount: 9.99, type: 'expense', category: 'Suscripciones', currency: 'USD', selected: true },
          { id: '9', date: '2026-07-13', description: 'DEVOLUCION APPS DIGITALES', amount: 0.82, type: 'income', category: 'Reembolsos / Cashback', currency: 'USD', selected: true }
        ]
      })
    }, 2000)
  }

  const toggleSelect = (id) => {
    setResult(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    }))
  }

  const handleSave = async () => {
    const selectedTxs = result.transactions.filter(t => t.selected)
    if (selectedTxs.length === 0) return

    // Insertar en Supabase mapeado
    const toInsert = selectedTxs.map(t => ({
      user_id: user.id,
      date: t.date,
      description: t.description,
      amount: t.amount,
      type: t.type,
      category: t.category,
      currency: t.currency
    }))

    const { error } = await supabase.from('transactions').insert(toInsert)
    if (!error) {
      if (onSaved) onSaved()
      onClose()
    }
  }

  const currentTxs = result?.transactions.filter(t => t.currency === activeTab) || []

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 999, display: 'flex', alignItems: 'center', justifyCenter: 'center', padding: 20 }}>
      <div style={{ background: 'var(--bg1, #0f172a)', border: '1px solid var(--border1, #1e293b)', borderRadius: 16, width: '100%', maxWidth: 700, padding: 24, color: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#818cf8" /> Escanear Estado de Cuenta
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {!result && (
          <div style={{ border: '2px dashed #334155', borderRadius: 12, padding: 40, textAlign: 'center', background: '#1e293b40', cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept=".pdf,image/*" onChange={handleUpload} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            <Upload size={32} color="#818cf8" style={{ marginBottom: 12 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>{analyzing ? "Analizando y separando monedas (DOP/USD)..." : "Haz clic o arrastra tu estado de cuenta en PDF o Imagen"}</p>
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            {/* Pestanas DOP / USD */}
            <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid #334155', paddingBottom: 12 }}>
              <button
                onClick={() => setActiveTab('DOP')}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: activeTab === 'DOP' ? '#4f46e5' : '#1e293b', color: activeTab === 'DOP' ? '#fff' : '#94a3b8'
                }}
              >
                🇩🇴 Pesos (DOP)
              </button>
              <button
                onClick={() => setActiveTab('USD')}
                style={{
                  padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                  background: activeTab === 'USD' ? '#4f46e5' : '#1e293b', color: activeTab === 'USD' ? '#fff' : '#94a3b8'
                }}
              >
                🇺🇸 Dólares (USD)
              </button>
            </div>

            {/* Resumen por Moneda Activa */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: '#1e293b60', padding: 12, borderRadius: 10 }}>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Gastos en {activeTab}</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f43f5e' }}>
                  {activeTab === 'DOP' ? 'RD$' : '$'}{activeTab === 'DOP' ? result.summary.dop_expense.toLocaleString() : result.summary.usd_expense.toLocaleString()}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>Abonos / Pagos en {activeTab}</span>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#10b981' }}>
                  {activeTab === 'DOP' ? 'RD$' : '$'}{activeTab === 'DOP' ? result.summary.dop_income.toLocaleString() : result.summary.usd_income.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Tabla de Movimientos Filtrados */}
            <div style={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #334155', borderRadius: 8 }}>
              {currentTxs.map(tx => (
                <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyBetween: 'space-between', padding: '10px 12px', borderBottom: '1px solid #1e293b', gap: 10 }}>
                  <input type="checkbox" checked={tx.selected} onChange={() => toggleSelect(tx.id)} />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{tx.description}</p>
                    <span style={{ fontSize: 11, color: '#818cf8', background: '#312e8140', padding: '2px 6px', borderRadius: 4 }}>{tx.category}</span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#10b981' : '#f87171' }}>
                      {tx.type === 'income' ? '+' : '-'}{tx.currency === 'DOP' ? 'RD$' : '$'}{tx.amount.toLocaleString()}
                    </p>
                    <span style={{ fontSize: 10, color: '#64748b' }}>{tx.date}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Botones de Accion */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
              <button onClick={onClose} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                Guardar Seleccionados
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
