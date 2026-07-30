import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Páginas del proyecto
import Dashboard from './pages/Dashboard'
import CycleConfig from './pages/CycleConfig'
import Transactions from './pages/Transactions'
import Cards from './pages/Cards'
import Goals from './pages/Goals'
import Insights from './pages/Insights'
import Copilot from './pages/Copilot'

import { LayoutDashboard, ArrowLeftRight, CreditCard, Target, Lightbulb, Bot, Sliders, Wallet } from 'lucide-react'

function MainLayout({ children }) {
  const location = useLocation()
  const { user } = useAuth()

  const navItems = [
    { path: '/', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { path: '/movimientos', label: 'Movimientos', icon: <ArrowLeftRight size={18} /> },
    { path: '/tarjetas', label: 'Tarjetas', icon: <CreditCard size={18} /> },
    { path: '/metas', label: 'Metas', icon: <Target size={18} /> },
    { path: '/insights', label: 'Insights', icon: <Lightbulb size={18} /> },
    { path: '/ia', label: 'Asistente IA', icon: <Bot size={18} />, badge: 'NEW' },
    { path: '/cycle-config', label: 'Ciclo Financiero', icon: <Sliders size={18} /> },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', color: '#fff' }}>
      
      {/* Sidebar Lateral */}
      <aside style={{ width: 240, background: '#090d16', borderRight: '1px solid #1e293b', padding: 20, display: 'flex', flexDirection: 'column', gap: 24, flexShrink: 0 }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#312e81', padding: 8, borderRadius: 10 }}>
            <Wallet size={20} color="#818cf8" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>HR Finanzas</h2>
            <span style={{ fontSize: 11, color: '#64748b' }}>{user?.email || 'hanel171320@gmail.com'}</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#10b981' : '#94a3b8',
                  background: isActive ? '#064e3b20' : 'transparent',
                  borderLeft: isActive ? '3px solid #10b981' : '3px solid transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span style={{ background: '#4f46e5', color: '#fff', fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 10 }}>
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Área Principal */}
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </main>

    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/movimientos" element={<Transactions />} />
          <Route path="/tarjetas" element={<Cards />} />
          <Route path="/metas" element={<Goals />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="/ia" element={<Copilot />} />
          <Route path="/cycle-config" element={<CycleConfig />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </AuthProvider>
  )
}
