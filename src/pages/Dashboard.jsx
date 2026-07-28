import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, Wallet, Target, Plus, ArrowRight } from 'lucide-react'
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Link } from 'react-router-dom'
import QuickAdd from '../components/QuickAdd'

const COLORS = ['#00d084','#4cc9f0','#ffd60a','#ff4d6d','#7b2fff','#f77f00','#06d6a0','#e63946']
const CAT_ICONS = { comida:'🍔', transporte:'🚗', hogar:'🏠', servicios:'⚡', salud:'💊', entretenimiento:'🎬', tarjeta:'💳', diezmo:'🙏', ahorro:'🏦', ropa:'👕', gas:'⛽', otros:'📦' }

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState({ profile: null, cards: [], expenses: [], transactions: [], goals: [] })
  const [loading, setLoading] = useState(true)
  const [showQuickAdd, setShowQuickAdd] = useState(false)

  const load = useCallback(async () => {
    const [p, c, e, t, g] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('credit_cards').select('*').eq('user_id', user.id),
      supabase.from('fixed_expenses').select('*').eq('user_id', user.id),
      supabase.from('transactions').select('*').eq('user_id', user.id).order('date', { ascending: false }).limit(10),
      supabase.from('savings_goals').select('*').eq('user_id', user.id),
    ])
    setData({ profile: p.data, cards: c.data||[], expenses: e.data||[], transactions: t.data||[], goals: g.data||[] })
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 16 }} />)}
    </div>
  )

  const { profile, cards, expenses, transactions, goals } = data
  const totalIncome = (profile?.monthly_income||0) + (profile?.spouse_income||0)
  const totalFixed = expenses.reduce((s,e) => s+Number(e.amount), 0)
  const totalDebt = cards.reduce((s,c) => s+Number(c.current_balance), 0)
  const monthTx = transactions.filter(t => t.date?.startsWith(new Date().toISOString().slice(0,7)))
  const monthExpenses = monthTx.filter(t => t.type==='expense').reduce((s,t)=>s+Number(t.amount),0)
  const monthIncome = monthTx.filter(t => t.type==='income').reduce((s,t)=>s+Number(t.amount),0)
  const available = totalIncome - totalFixed

  const pieData = expenses.reduce((acc,e) => {
    const f = acc.find(a => a.name===e.category)
    if(f) f.value+=Number(e.amount)
    else acc.push({name:e.category, value:Number(e.amount)})
    return acc
  }, [])

  const chartData = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'].slice(0,new Date().getMonth()+1).map((m,i) => {
    const mo = String(i+1).padStart(2,'0')
    const txs = transactions.filter(t=>t.date?.includes(`-${mo}-`))
    return { name: m, gastos: txs.filter(t=>t.type==='expense').reduce((s,t)=>s+Number(t.amount),0), ingresos: txs.filter(t=>t.type==='income').reduce((s,t)=>s+Number(t.amount),0) }
  })

  const StatCard = ({ icon, label, value, color, sub }) => (
    <div className="card fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</span>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
            Hola, {profile?.full_name?.split(' ')[0] || 'bienvenido'} 👋
          </div>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
            {new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
        </div>
        <button onClick={() => setShowQuickAdd(true)} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px' }}>
          <Plus size={16} /> Agregar
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <StatCard icon={<TrendingUp size={16}/>} label="Ingreso mensual" value={`RD$${totalIncome.toLocaleString()}`} color="var(--green)" sub={`Tú + pareja`} />
        <StatCard icon={<TrendingDown size={16}/>} label="Gastos fijos" value={`RD$${totalFixed.toLocaleString()}`} color="var(--red)" sub="Este mes" />
        <StatCard icon={<Wallet size={16}/>} label="Deuda tarjetas" value={`RD$${totalDebt.toLocaleString()}`} color="var(--yellow)" sub={`${cards.length} tarjetas`} />
        <StatCard icon={<Target size={16}/>} label="Disponible" value={`RD$${available.toLocaleString()}`} color="var(--blue)" sub="Para metas/ahorro" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Flujo del año</div>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d084" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#00d084" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="r" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ff4d6d" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#ff4d6d" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: '#555', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} formatter={v=>`RD$${Number(v).toLocaleString()}`} />
              <Area type="monotone" dataKey="ingresos" stroke="#00d084" fill="url(#g)" strokeWidth={2} />
              <Area type="monotone" dataKey="gastos" stroke="#ff4d6d" fill="url(#r)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Gastos por categoría</div>
          {pieData.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)', fontSize: 13 }}>Sin datos aún</div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={120}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} dataKey="value" paddingAngle={2}>
                    {pieData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border2)', borderRadius: 8, fontSize: 12 }} formatter={v=>`RD$${Number(v).toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 12px', marginTop: 8 }}>
                {pieData.slice(0,4).map((d,i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text2)' }}>
                    <div style={{ width: 7, height: 7, borderRadius: 2, background: COLORS[i%COLORS.length] }} />
                    {CAT_ICONS[d.name]||'📦'} {d.name}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {cards.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Tarjetas</div>
            <Link to="/cards" style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>Ver todas <ArrowRight size={12} /></Link>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {cards.map(c => {
              const pct = (Number(c.current_balance)/Number(c.credit_limit))*100
              const color = pct>70?'var(--red)':pct>40?'var(--yellow)':'var(--green)'
              return (
                <div key={c.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                    <span style={{ fontWeight: 500 }}>💳 {c.bank_name} — {c.card_name}</span>
                    <span style={{ color, fontWeight: 600 }}>RD${Number(c.current_balance).toLocaleString()}</span>
                  </div>
                  <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2 }}>
                    <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:color, borderRadius:2, transition:'width .5s' }} />
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginTop:4 }}>
                    <span>{pct.toFixed(0)}% usado</span>
                    <span>Vence {c.due_date}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Últimos movimientos</div>
          <Link to="/transactions" style={{ fontSize: 12, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 4 }}>Ver todos <ArrowRight size={12} /></Link>
        </div>
        {transactions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text3)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>💸</div>
            <p style={{ fontSize: 13 }}>Sin movimientos. Agrega el primero.</p>
            <button onClick={() => setShowQuickAdd(true)} className="btn-ghost" style={{ marginTop: 12, fontSize: 13 }}>+ Agregar movimiento</button>
          </div>
        ) : transactions.slice(0,6).map((t,i) => (
          <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 0', borderBottom: i<5?'1px solid var(--border)':'none' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:t.type==='income'?'rgba(0,208,132,0.1)':'rgba(255,77,109,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:17 }}>
                {CAT_ICONS[t.category]||'📦'}
              </div>
              <div>
                <div style={{ fontSize:13, fontWeight:500 }}>{t.description}</div>
                <div style={{ fontSize:11, color:'var(--text3)' }}>{t.category} · {t.date}</div>
              </div>
            </div>
            <div style={{ fontSize:14, fontWeight:600, color:t.type==='income'?'var(--green)':'var(--red)' }}>
              {t.type==='income'?'+':'-'}RD${Number(t.amount).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {goals.length > 0 && (
        <div className="card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:600 }}>Metas de ahorro</div>
            <Link to="/goals" style={{ fontSize:12, color:'var(--text2)', display:'flex', alignItems:'center', gap:4 }}>Ver todas <ArrowRight size={12} /></Link>
          </div>
          {goals.map(g => {
            const pct = (Number(g.current_amount)/Number(g.target_amount))*100
            return (
              <div key={g.id} style={{ marginBottom:12 }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:13, marginBottom:6 }}>
                  <span style={{ fontWeight:500 }}>🎯 {g.name}</span>
                  <span style={{ color:'var(--green)', fontWeight:600 }}>{pct.toFixed(0)}%</span>
                </div>
                <div style={{ height:6, background:'var(--bg4)', borderRadius:3 }}>
                  <div style={{ width:`${Math.min(pct,100)}%`, height:'100%', background:'var(--green)', borderRadius:3, transition:'width .5s' }} />
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--text3)', marginTop:4 }}>
                  <span>RD${Number(g.current_amount).toLocaleString()} ahorrado</span>
                  <span>Meta: RD${Number(g.target_amount).toLocaleString()}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showQuickAdd && <QuickAdd onClose={() => setShowQuickAdd(false)} onSaved={load} />}

      <button onClick={() => setShowQuickAdd(true)} style={{ position:'fixed', bottom:24, right:24, width:52, height:52, borderRadius:'50%', background:'var(--green)', color:'#000', fontSize:24, fontWeight:700, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 20px rgba(0,208,132,0.4)', zIndex:200 }}>
        <Plus size={22} />
      </button>
    </div>
  )
}
