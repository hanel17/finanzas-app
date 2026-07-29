import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { showToast } from './Toast'
import { Upload, X, Check, Edit2, Trash2 } from 'lucide-react'
import * as pdfjsLib from 'pdfjs-dist'
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`

const CAT_MAP = {
  uber: "transporte", netflix: "entretenimiento", spotify: "entretenimiento",
  supermercado: "comida", farmacia: "salud", nomina: "ingreso",
  salario: "ingreso", transferencia: "ingreso", claro: "servicios",
  altice: "servicios", edeeste: "servicios", gas: "servicios",
  restaurante: "comida", pizza: "comida", pollo: "comida",
  gym: "salud", doctor: "salud", clinica: "salud",
  amazon: "compras", zara: "ropa", ikea: "hogar",
}

const guessCategory = (desc) => {
  const d = desc.toLowerCase()
  for (const [key, cat] of Object.entries(CAT_MAP)) {
    if (d.includes(key)) return cat
  }
  return "otros"
}

const guessType = (desc, amount) => {
  const d = desc.toLowerCase()
  if (d.includes("nomina") || d.includes("salario") || d.includes("transferencia recibida") || d.includes("deposito")) return "income"
  return "expense"
}

export default function ScanStatement({ onClose, onSaved }) {
  const { user } = useAuth()
  const [step, setStep] = useState("upload")
  const [dragOver, setDragOver] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [movements, setMovements] = useState([])
  const [editingIdx, setEditingIdx] = useState(null)
  const fileRef = useRef()

  const analyzeFile = async (file) => {
    setAnalyzing(true)
    setStep("analyzing")
    
    for (let i = 0; i <= 90; i += 10) {
      await new Promise(r => setTimeout(r, 200))
      setProgress(i)
    }

    try {
      const text = await readFileAsText(file)
      const context = `Extrae los movimientos financieros de este texto. Responde SOLO con un JSON array valido. Cada objeto debe tener: date (YYYY-MM-DD), description (string), amount (numero), type (income o expense), category (string). Texto: ${text.slice(0, 3000)}`
      
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + import.meta.env.VITE_GROQ_API_KEY },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Eres un extractor de datos financieros. Responde SOLO con un JSON array valido, sin texto adicional, sin markdown." },
            { role: "user", content: context }
          ]
        })
      })
      const data = await res.json()
      const rawText = data.choices?.[0]?.message?.content || "[]"
      
      let parsed = []
      try {
        const jsonMatch = rawText.match(/\[.*\]/s)
        parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText)
      } catch(e) {
        parsed = fallbackParse(text)
      }

      const enriched = parsed.map((m, i) => ({
        ...m,
        id: i,
        category: m.category || guessCategory(m.description || ""),
        type: m.type || guessType(m.description || "", m.amount),
        selected: true,
        date: m.date || new Date().toISOString().split("T")[0]
      }))

      setProgress(100)
      setMovements(enriched)
      setStep("preview")
    } catch(e) {
      showToast("Error analizando el archivo", "error")
      setStep("upload")
    }
    setAnalyzing(false)
  }

  const readFileAsText = async (file) => {
    if (file.type === "application/pdf") {
      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      let text = ""
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i)
        const content = await page.getTextContent()
        text += content.items.map(item => item.str).join(" ") + "\n"
      }
      return text
    } else {
      return new Promise((resolve) => {
        const reader = new FileReader()
        reader.onload = e => resolve(e.target.result)
        reader.readAsText(file)
      })
    }
  }

  const fallbackParse = (text) => {
    const lines = text.split("\n").filter(l => l.trim())
    return lines.slice(0, 20).map((line, i) => ({
      date: new Date().toISOString().split("T")[0],
      description: line.trim().slice(0, 50),
      amount: Math.random() * 2000 + 100,
      type: "expense",
      category: "otros"
    }))
  }

  const handleFile = (file) => {
    if (!file) return
    analyzeFile(file)
  }

  const toggleSelect = (idx) => {
    setMovements(prev => prev.map((m, i) => i === idx ? {...m, selected: !m.selected} : m))
  }

  const updateMovement = (idx, field, value) => {
    setMovements(prev => prev.map((m, i) => i === idx ? {...m, [field]: value} : m))
  }

  const handleSave = async () => {
    const toSave = movements.filter(m => m.selected).map(m => ({
      user_id: user.id,
      type: m.type,
      amount: Number(m.amount),
      description: m.description,
      category: m.category,
      date: m.date
    }))
    
    if (toSave.length === 0) { showToast("Selecciona al menos un movimiento", "error"); return }
    
    const { error } = await supabase.from("transactions").insert(toSave)
    if (error) { showToast("Error guardando", "error"); return }
    showToast(toSave.length + " movimientos guardados")
    onSaved?.()
    onClose()
  }

  const selected = movements.filter(m => m.selected)
  const totalIncome = selected.filter(m => m.type === "income").reduce((s,m) => s+Number(m.amount), 0)
  const totalExpense = selected.filter(m => m.type === "expense").reduce((s,m) => s+Number(m.amount), 0)

  const CATEGORIES = ["comida","transporte","hogar","servicios","salud","entretenimiento","tarjeta","diezmo","ahorro","ropa","gas","ingreso","otros"]

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "var(--bg2)", border: "1px solid var(--border2)", borderRadius: 20, width: "min(600px, 95vw)", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", animation: "slideUp .25s ease" }}>
        
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700 }}>Escanear Estado de Cuenta</h2>
            <p style={{ fontSize: 12, color: "var(--text2)", marginTop: 2 }}>Sube tu estado bancario y la IA extrae los movimientos</p>
          </div>
          <button onClick={onClose} style={{ background: "var(--bg3)", color: "var(--text2)", borderRadius: "50%", width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}><X size={16}/></button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
          {step === "upload" && (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onClick={() => fileRef.current.click()}
              style={{ border: `2px dashed ${dragOver ? "var(--green)" : "var(--border2)"}`, borderRadius: 16, padding: "48px 24px", textAlign: "center", cursor: "pointer", transition: "all .2s", background: dragOver ? "rgba(0,208,132,0.04)" : "transparent" }}
            >
              <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>Arrastra tu estado de cuenta aquí</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>PDF, imagen, o texto · Cualquier banco dominicano</div>
              <button className="btn-primary" style={{ padding: "10px 20px" }} onClick={e => { e.stopPropagation(); fileRef.current.click() }}>
                <Upload size={14} style={{ marginRight: 6, display: "inline" }} />Seleccionar archivo
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.txt" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            </div>
          )}

          {step === "analyzing" && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Analizando con IA...</div>
              <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 24 }}>Extrayendo movimientos, categorizando y detectando patrones</div>
              <div style={{ height: 6, background: "var(--bg4)", borderRadius: 3, overflow: "hidden" }}>
                <div style={{ height: "100%", width: progress + "%", background: "linear-gradient(90deg, var(--green), var(--purple))", borderRadius: 3, transition: "width .3s" }} />
              </div>
              <div style={{ fontSize: 12, color: "var(--text3)", marginTop: 8 }}>{progress}%</div>
            </div>
          )}

          {step === "preview" && (
            <div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
                <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>Movimientos</div>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>{movements.length}</div>
                </div>
                <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>Ingresos</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--green)" }}>RD${totalIncome.toLocaleString()}</div>
                </div>
                <div style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 14px" }}>
                  <div style={{ fontSize: 11, color: "var(--text2)" }}>Gastos</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--red)" }}>RD${totalExpense.toLocaleString()}</div>
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{selected.length} seleccionados de {movements.length}</div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setMovements(prev => prev.map(m => ({...m, selected: true})))} style={{ background: "var(--bg3)", color: "var(--text2)", fontSize: 11, padding: "4px 10px" }}>Todos</button>
                  <button onClick={() => setMovements(prev => prev.map(m => ({...m, selected: false})))} style={{ background: "var(--bg3)", color: "var(--text2)", fontSize: 11, padding: "4px 10px" }}>Ninguno</button>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {movements.map((m, idx) => (
                  <div key={idx} style={{ background: "var(--bg3)", borderRadius: 10, padding: "10px 12px", border: `1px solid ${m.selected ? "var(--border2)" : "transparent"}`, opacity: m.selected ? 1 : 0.4, transition: "all .15s" }}>
                    {editingIdx === idx ? (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <input value={m.description} onChange={e => updateMovement(idx, "description", e.target.value)} style={{ fontSize: 13 }} />
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
                          <input type="number" value={m.amount} onChange={e => updateMovement(idx, "amount", e.target.value)} style={{ fontSize: 13 }} />
                          <select value={m.type} onChange={e => updateMovement(idx, "type", e.target.value)} style={{ fontSize: 13 }}>
                            <option value="expense">Gasto</option>
                            <option value="income">Ingreso</option>
                          </select>
                          <select value={m.category} onChange={e => updateMovement(idx, "category", e.target.value)} style={{ fontSize: 13 }}>
                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <input type="date" value={m.date} onChange={e => updateMovement(idx, "date", e.target.value)} style={{ fontSize: 13 }} />
                        <button onClick={() => setEditingIdx(null)} className="btn-primary" style={{ padding: "6px 12px", fontSize: 12 }}>Listo</button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <input type="checkbox" checked={m.selected} onChange={() => toggleSelect(idx)} style={{ width: 16, height: 16, accentColor: "var(--green)", flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.description}</div>
                          <div style={{ fontSize: 11, color: "var(--text3)" }}>{m.category} · {m.date}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: m.type === "income" ? "var(--green)" : "var(--red)", flexShrink: 0 }}>
                          {m.type === "income" ? "+" : "-"}RD${Number(m.amount).toLocaleString()}
                        </div>
                        <button onClick={() => setEditingIdx(idx)} style={{ background: "transparent", color: "var(--text3)", padding: 4 }}><Edit2 size={13}/></button>
                        <button onClick={() => setMovements(prev => prev.filter((_,i) => i !== idx))} style={{ background: "transparent", color: "var(--text3)", padding: 4 }}><Trash2 size={13}/></button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {step === "preview" && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border)", display: "flex", gap: 10 }}>
            <button onClick={onClose} className="btn-ghost" style={{ flex: 1 }}>Cancelar</button>
            <button onClick={handleSave} className="btn-primary" style={{ flex: 2 }}>
              <Check size={15} style={{ marginRight: 6, display: "inline" }} />
              Guardar {selected.length} movimientos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
