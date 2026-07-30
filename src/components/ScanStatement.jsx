import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Upload, CheckCircle2, AlertCircle, Sparkles, Loader2, RefreshCw } from 'lucide-react'

// Carga dinamica de librerias de lectura en el cliente
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve()
    const s = document.createElement('script')
    s.src = src
    s.onload = resolve
    s.onerror = reject
    document.head.appendChild(s)
  })
}

export default function ScanStatement({ onClose, onSaved }) {
  const { user } = useAuth()
  const [analyzing, setAnalyzing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState('DOP')
  const [result, setResult] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [statusText, setStatusText] = useState('')

  useEffect(() => {
    // Precargar libreria PDF.js para lectura local
    loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js').catch(() => {})
  }, [])

  // Extraer texto de PDF
  const readPdfText = async (file) => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js')
    const pdfjsLib = window['pdfjs-dist/build/pdf']
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'
    
    const arrayBuffer = await file.arrayBuffer()
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
    let fullText = ""

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i)
      const textContent = await page.getTextContent()
      const pageText = textContent.items.map(item => item.str).join(" ")
      fullText += `\n--- PAGINA ${i} ---\n` + pageText
    }
    return fullText
  }

  // Extraer texto de Imagen con OCR Tesseract
  const readImageText = async (file) => {
    await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js')
    const worker = await window.Tesseract.createWorker('spa')
    const ret = await worker.recognize(file)
    await worker.terminate()
    return ret.data.text
  }

  const processTextWithGroq = async (extractedText) => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY
    if (!apiKey) {
      throw new Error("No se encontró la clave VITE_GROQ_API_KEY.")
    }

    const systemPrompt = `You are a strict financial transaction extractor. Analyze the provided text from bank statements or receipts.
INSTRUCTIONS:
1. Extract ALL listed transactions without skipping any item.
2. Group items by currency ("DOP" or "USD").
3. Identify type ("expense" or "income").
4. Assign category ("Supermercado", "Alimentación", "Servicios", "Suscripciones", "Transporte", "Abono a Tarjeta", "Otros").

Return standard JSON:
{
  "summary": {
    "dop_expense": 0.00,
    "dop_income": 0.00,
    "usd_expense": 0.00,
    "usd_income": 0.00
  },
  "transactions": [
    {
      "id": "1",
      "date": "YYYY-MM-DD",
      "description": "Merchant Name",
      "amount": 100.00,
      "type": "expense",
      "category": "Supermercado",
      "currency": "DOP"
    }
  ]
}`

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        response_format: { type: 'json_object' },
        temperature: 0.1,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Extract ALL transactions from this document text:

${extractedText.slice(0, 20000)}` }
        ]
      })
    })

    const data = await response.json()
    if (!response.ok) {
      throw new Error(data.error?.message || "Error procesando respuesta con Groq LLM.")
    }

    let parsed = JSON.parse(data.choices[0]?.message?.content || '{}')
    
    if (!parsed.transactions || parsed.transactions.length === 0) {
      throw new Error("No se lograron detectar transacciones legibles en el documento.")
    }

    parsed.transactions = parsed.transactions.map((t, idx) => ({
      ...t,
      id: `tx_${idx}_${Date.now()}`,
      selected: true
    }))

    return parsed
  }

  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    
    setAnalyzing(true)
    setErrorMsg(null)
    setStatusText('Leyendo archivo...')

    try {
      let rawText = ""
      if (selectedFile.type.includes('pdf') || selectedFile.name.endsWith('.pdf')) {
        setStatusText('Extrayendo texto del PDF...')
        rawText = await readPdfText(selectedFile)
      } else if (selectedFile.type.includes('image')) {
        setStatusText('Ejecutando OCR en la imagen...')
        rawText = await readImageText(selectedFile)
      } else {
        rawText = await selectedFile.text()
      }

      if (!rawText.trim()) {
        throw new Error("El archivo no contiene texto legible.")
      }

      setStatusText('Analizando transacciones con IA Groq...')
      const parsedResult = await processTextWithGroq(rawText)
      setResult(parsedResult)
    } catch (err) {
      console.error(err)
      setErrorMsg(err.message || "Error procesando el documento.")
    } finally {
      setAnalyzing(false)
      setStatusText('')
    }
  }

  const toggleSelect = (id) => {
    setResult(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.id === id ? { ...t, selected: !t.selected } : t)
    }))
  }

  const toggleSelectAllCurrent = (selectAll) => {
    setResult(prev => ({
      ...prev,
      transactions: prev.transactions.map(t => t.currency === activeTab ? { ...t, selected: selectAll } : t)
    }))
  }

  const handleSave = async () => {
    if (!result) return
    const selectedTxs = result.transactions.filter(t => t.selected)
    
    if (selectedTxs.length === 0) {
      setErrorMsg("Debes seleccionar al menos un movimiento para guardar.")
      return
    }

    setSaving(true)
    setErrorMsg(null)

    // Formato normalizado compatible con esquemas standard Supabase
    const payload = selectedTxs.map(t => ({
      user_id: user?.id,
      date: t.date || new Date().toISOString().split('T')[0],
      description: t.description || 'Gasto escaneado',
      amount: Math.abs(Number(t.amount)),
      type: t.type === 'income' ? 'income' : 'expense',
      category: t.category || 'Otros',
      currency: t.currency || 'DOP'
    }))

    try {
      const { error } = await supabase
        .from('transactions')
        .insert(payload)

      if (error) {
        // En caso de que la tabla 'transactions' no tenga la columna 'currency', reenviamos sin ella
        if (error.message.includes('currency')) {
          const fallbackPayload = payload.map(({ currency, ...rest }) => rest)
          const { error: errFallback } = await supabase.from('transactions').insert(fallbackPayload)
          if (errFallback) throw errFallback
        } else {
          throw error
        }
      }

      setSaving(false)
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      console.error("Error guardando:", err)
      setErrorMsg("Error guardando en Supabase: " + (err.message || "Verifique los permisos / columnas."))
      setSaving(false)
    }
  }

  const currentTxs = result?.transactions.filter(t => t.currency === activeTab) || []
  const allCurrentSelected = currentTxs.length > 0 && currentTxs.every(t => t.selected)

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, width: '100%', maxWidth: 700, padding: 24, color: '#fff', maxHeight: '90vh', overflowY: 'auto' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Sparkles size={20} color="#818cf8" /> Escanear Estado / Recibo
          </h3>
          <button onClick={onClose} disabled={saving} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>

        {errorMsg && (
          <div style={{ background: '#f43f5e20', border: '1px solid #f43f5e', color: '#fecdd3', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {!result && (
          <div style={{ border: '2px dashed #334155', borderRadius: 12, padding: 40, textAlign: 'center', background: '#1e293b40', cursor: 'pointer', position: 'relative' }}>
            <input type="file" accept=".pdf,image/*,.txt" onChange={handleFileUpload} disabled={analyzing} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
            {analyzing ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                <Loader2 size={32} color="#818cf8" className="animate-spin" />
                <p style={{ margin: 0, fontWeight: 500 }}>{statusText || 'Procesando documento...'}</p>
              </div>
            ) : (
              <div>
                <Upload size={32} color="#818cf8" style={{ marginBottom: 12 }} />
                <p style={{ margin: 0, fontWeight: 500 }}>Sube tu estado de cuenta (PDF / Imagen)</p>
                <span style={{ fontSize: 12, color: '#64748b' }}>Se extraerán todos los consumos y abonos reales</span>
              </div>
            )}
          </div>
        )}

        {result && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: 12 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setActiveTab('DOP')}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: activeTab === 'DOP' ? '#4f46e5' : '#1e293b', color: activeTab === 'DOP' ? '#fff' : '#94a3b8'
                  }}
                >
                  🇩🇴 Pesos (DOP) ({result.transactions.filter(t => t.currency === 'DOP').length})
                </button>
                <button
                  onClick={() => setActiveTab('USD')}
                  style={{
                    padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
                    background: activeTab === 'USD' ? '#4f46e5' : '#1e293b', color: activeTab === 'USD' ? '#fff' : '#94a3b8'
                  }}
                >
                  🇺🇸 Dólares (USD) ({result.transactions.filter(t => t.currency === 'USD').length})
                </button>
              </div>

              <button
                onClick={() => toggleSelectAllCurrent(!allCurrentSelected)}
                style={{ background: 'none', border: 'none', color: '#818cf8', fontSize: 12, cursor: 'pointer' }}
              >
                {allCurrentSelected ? 'Desseleccionar todos' : 'Seleccionar todos'}
              </button>
            </div>

            <div style={{ maxHeight: 320, overflowY: 'auto', border: '1px solid #334155', borderRadius: 8 }}>
              {currentTxs.length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: '#64748b', fontSize: 13 }}>No hay movimientos en esta moneda.</p>
              ) : (
                currentTxs.map(tx => (
                  <div key={tx.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderBottom: '1px solid #1e293b', gap: 10, background: tx.selected ? 'transparent' : '#0f172a80', opacity: tx.selected ? 1 : 0.5 }}>
                    <input type="checkbox" checked={tx.selected} onChange={() => toggleSelect(tx.id)} style={{ cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 500 }}>{tx.description}</p>
                      <span style={{ fontSize: 10, color: '#818cf8', background: '#312e8140', padding: '2px 6px', borderRadius: 4 }}>{tx.category}</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: tx.type === 'income' ? '#10b981' : '#f87171' }}>
                        {tx.type === 'income' ? '+' : '-'}{tx.currency === 'DOP' ? 'RD$' : '$'}{Number(tx.amount).toLocaleString()}
                      </p>
                      <span style={{ fontSize: 10, color: '#64748b' }}>{tx.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
              <button onClick={() => setResult(null)} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                <RefreshCw size={14} /> Subir otro documento
              </button>
              
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={onClose} disabled={saving} style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', borderRadius: 8, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving} style={{ padding: '8px 20px', background: '#4f46e5', border: 'none', color: '#fff', borderRadius: 8, cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  {saving ? "Guardando..." : `Guardar Seleccionados (${result.transactions.filter(t=>t.selected).length})`}
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
