import { useState } from 'react'
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'

// Páginas
import Dashboard from './pages/Dashboard'
import CycleConfig from './pages/CycleConfig'
import Transactions from './pages/Transactions'
import Cards from './pages/Cards'
import Goals from './pages/Goals'
import Insights from './pages/Insights'
import AI from './pages/AI'
import Login from './pages/Login'
import Register from './pages/Register'

import { LayoutDashboard, ArrowLeftRight, CreditCard, Target, Lightbulb, Bot, Sliders, Wallet, Menu, X } from 'lucide-react'

function MainLayout({ children }) {
  const location = useLocation()
  const { user } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (location.pathname === '/login' || location.pathname === '/register') {
    return children
  }

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#020617', color: '#fff' }}>
      
      {/* Topbar para Pantallas Móviles con Botón Hamburguesa ☰ */}
      <header className="mobile-header" style={{
        display: 'none',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#090d16',
        borderBottom: '1px solid #1e293b',
        position: 'sticky',
        top: 0,
        zIndex: 40
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ background: '#312e81', padding: 6, borderRadius: 8 }}>
            <Wallet size={18} color="#818cf8" />
          </div>
          <span style={{ fontWeight: 700, fontSize: 16 }}>HR Finanzas</span>
        </div>
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>

        {/* Backdrop / Fondo Oscuro al abrir en móvil */}
        {mobileMenuOpen && (
          <div 
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.7)',
              zIndex: 49,
              backdropFilter: 'blur(2px)'
            }}
          />
        )}

        {/* Sidebar (Escritorio Fijo / Móvil Desplegable) */}
        <aside 
          className={`sidebar-drawer ${mobileMenuOpen ? 'open' : ''}`}
          style={{
            width: 240,
            background: '#090d16',
            borderRight: '1px solid #1e293b',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 24,
            flexShrink: 0,
            zIndex: 50
          }}
        >
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
                  onClick={() => setMobileMenuOpen(false)}
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

        {/* Contenido Principal */}
        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>
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
          <Route path="/ia" element={<AI />} />
          <Route path="/cycle-config" element={<CycleConfig />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </MainLayout>
    </AuthProvider>
  )
}
