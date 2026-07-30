import React, { useState } from 'react'
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#020617', color: '#fff', position: 'relative' }}>
      
      {/* Botón flotante de 3 rayitas (☰) solo visible en móvil */}
      <button 
        className="mobile-toggle-btn"
        onClick={() => setMobileMenuOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={22} color="#fff" />
      </button>

      {/* Overlay oscuro */}
      <div 
        className={`mobile-backdrop ${mobileMenuOpen ? 'active' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Sidebar / Menú Lateral */}
      <aside className={`sidebar-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        
        {/* Cabecera del Menú */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#312e81', padding: 8, borderRadius: 10 }}>
              <Wallet size={20} color="#818cf8" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>HR Finanzas</h2>
              <span style={{ fontSize: 11, color: '#64748b' }}>{user?.email || 'hanel171320@gmail.com'}</span>
            </div>
          </div>

          {/* Botón X para cerrar en móvil */}
          <button 
            className="mobile-close-btn"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={20} color="#94a3b8" />
          </button>
        </div>

        {/* Lista de Navegación */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
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
                  padding: '12px 14px',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
      <main className="main-content">
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
