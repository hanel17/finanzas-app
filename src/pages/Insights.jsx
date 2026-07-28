import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

const CAT_ICONS = { comida:'🍔', transporte:'🚗', hogar:'🏠', servicios:'⚡', salud:'💊', entretenimiento:'🎬', tarjeta:'💳', diezmo:'🙏', ahorro:'🏦', ropa:'👕', gas:'⛽', otros:'📦' }

export default function Insights() {
  const { user } = useAuth()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false })
      .then(({ data }) => { setTransactions(data||[]); setLoading(false) })
  }, [user])

  if (loading) return <div style={{ color:'var(--text2)', padding:40 }}>Cargando insights...</div>

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const lastMonth = new Date(now.getFullYear(), now.getMonth()-1)
  const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth()+1).padStart(2,'0')}`

  const thisMo = transactions.filter(t=>t.date?.startsWith(thisMonth)&&t.type==='expense')
  const lastMo = transactions.filter(t=>t.date?.startsWith(lastMonthStr)&&t.type==='expense')

  const byCategory = (txs) => txs.reduce((acc,t) => {
    acc[t.category] = (acc[t.category]||0)+Number(t.amount)
    return acc
  }, {})

  const thisStats = byCategory(thisMo)
  const lastStats = byCategory(lastMo)

  const allCats = [...new Set([...Object.keys(thisStats), ...Object.keys(lastStats)])]
  const compareData = allCats.map(c => ({
    name: (CAT_ICONS[c]||'📦')+' '+c,
    'Este mes': thisStats[c]||0,
    'Mes anterior': lastStats[c]||0,
  })).sort((a,b)=>b['Este mes']-a['Este mes'])

  const weeklyData = Array.from({length:4}, (_,i) => {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()-((3-i)*7))
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate()-((2-i)*7))
    const txs = transactions.filter(t => { const d=new Date(t.date); return d>=start&&d<end&&t.type==='expense' })
    return { name: `Sem ${i+1}`, gastos: txs.reduce((s,t)=>s+Number(t.amount),0) }
  })

  const totalThis = thisMo.reduce((s,t)=>s+Number(t.amount),0)
  const totalLast = lastMo.reduce((s,t)=>s+Number(t.amount),0)
  const change = totalLast>0?((totalThis-totalLast)/totalLast*100):0

  const insights = []
  if(change>10) insights.push({ icon:'⚠️', text:`Gastaste ${change.toFixed(0)}% más que el mes pasado`, type:'warn' })
  if(change<-10) insights.push({ icon:'🎉', text:`Gastaste ${Math.abs(change).toFixed(0)}% menos que el mes pasado`, type:'good' })
  if(thisStats['comida']>15000) insights.push({ icon:'🍔', text:`Comida representa RD$${(thisStats['comida']||0).toLocaleString()} este mes`, type:'info' })
  if(thisStats['entretenimiento']>5000) insights.push({ icon:'🎬', text:`Entretenimiento subió a RD$${(thisStats['entretenimiento']||0).toLocaleString()}`, type:'warn' })
  if(insights.length===0) insights.push({ icon:'✅', text:'Tus finanzas se ven estables este mes', type:'good' })

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <div>
        <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.5px' }}>Insights 📊</h1>
        <p style={{ fontSize:13, color:'var(--text2)', marginTop:4 }}>Patrones y tendencias de tus gastos</p>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(140px,1fr))', gap:12 }}>
        <div className="card">
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Este mes</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--red)' }}>RD${totalThis.toLocaleString()}</div>
          <div style={{ fontSize:11, color:change>0?'var(--red)':'var(--green)', marginTop:4 }}>{change>0?'↑':'↓'} {Math.abs(change).toFixed(0)}% vs mes anterior</div>
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Mes anterior</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--text)' }}>RD${totalLast.toLocaleString()}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Referencia</div>
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Mayor gasto</div>
          <div style={{ fontSize:15, fontWeight:700, color:'var(--yellow)' }}>
            {Object.entries(thisStats).sort((a,b)=>b[1]-a[1])[0]?.[0]||'—'}
          </div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>
            RD${(Object.entries(thisStats).sort((a,b)=>b[1]-a[1])[0]?.[1]||0).toLocaleString()}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize:11, color:'var(--text2)', marginBottom:6 }}>Transacciones</div>
          <div style={{ fontSize:20, fontWeight:700, color:'var(--blue)' }}>{thisMo.length}</div>
          <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>Este mes</div>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Alertas inteligentes</div>
        <div style={{ display:'flex', flexDirection:'column', gap:8, marginTop:12 }}>
          {insights.map((ins,i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 12px', borderRadius:10, background:ins.type==='good'?'rgba(0,208,132,0.08)':ins.type==='warn'?'rgba(255,77,109,0.08)':'rgba(76,201,240,0.08)', border:`1px solid ${ins.type==='good'?'rgba(0,208,132,0.2)':ins.type==='warn'?'rgba(255,77,109,0.2)':'rgba(76,201,240,0.2)'}` }}>
              <span style={{ fontSize:18 }}>{ins.icon}</span>
              <span style={{ fontSize:13 }}>{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Comparación este mes vs anterior</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={compareData.slice(0,6)} layout="vertical">
            <XAxis type="number" tick={{ fill:'#555', fontSize:11 }} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill:'#888', fontSize:11 }} width={90} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, fontSize:12 }} formatter={v=>`RD$${Number(v).toLocaleString()}`} />
            <Bar dataKey="Este mes" fill="#00d084" radius={[0,4,4,0]} />
            <Bar dataKey="Mes anterior" fill="#333" radius={[0,4,4,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div style={{ fontSize:14, fontWeight:600, marginBottom:16 }}>Tendencia semanal</div>
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={weeklyData}>
            <XAxis dataKey="name" tick={{ fill:'#555', fontSize:11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background:'var(--bg3)', border:'1px solid var(--border2)', borderRadius:8, fontSize:12 }} formatter={v=>`RD$${Number(v).toLocaleString()}`} />
            <Line type="monotone" dataKey="gastos" stroke="#4cc9f0" strokeWidth={2} dot={{ fill:'#4cc9f0', r:4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
