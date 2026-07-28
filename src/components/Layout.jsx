import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ArrowLeftRight, CreditCard, Target, Bot, LogOut, Menu, X, TrendingUp } from 'lucide-react'
import Toast from './Toast'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Movimientos' },
  { to: '/cards', icon: CreditCard, label: 'Tarjetas' },
  { to: '/goals', icon: Target, label: 'Metas' },
  { to: '/insights', icon: TrendingUp, label: 'Insights' },
  { to: '/ai', icon: Bot, label: 'Asistente IA' },
]

export default function Layout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const isMobile = window.innerWidth <= 768

  const handleSignOut = async () => { await signOut(); navigate('/login') }

  const Sidebar = ({ mobile = false }) => (
    <aside style={{
      width: mobile ? '100%' : 220,
      background: 'var(--bg2)',
      borderRight: mobile ? 'none' : '1px solid var(--border)',
      display: 'flex', flexDirection: 'column',
      padding: mobile ? '0' : '20px 0',
      height: mobile ? '100%' : '100vh',
      position: mobile ? 'relative' : 'sticky',
      top: 0,
    }}>
      <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: 'var(--green)', letterSpacing: '-0.5px' }}>💰 HR Finanzas</div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{user?.email}</div>
        </div>
        {mobile && <button onClick={() => setMenuOpen(false)} style={{ background: 'transparent', color: 'var(--text2)', padding: 4 }}><X size={20} /></button>}
      </div>
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {navItems.map(({ to, icon: Icon, label }) => {
          const active = to === '/' ? location.pathname === '/' : location.pathname.startsWith(to)
          return (
            <NavLink key={to} to={to} onClick={() => setMenuOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10,
                color: active ? 'var(--green)' : 'var(--text2)',
                background: active ? 'rgba(0,208,132,0.08)' : 'transparent',
                fontSize: 13.5, fontWeight: active ? 600 : 400,
                transition: 'all .15s',
              }}>
              <Icon size={17} />{label}
              {label === 'Asistente IA' && <span style={{ marginLeft: 'auto', fontSize: 9, background: 'var(--purple)', color: '#fff', padding: '2px 6px', borderRadius: 20, fontWeight: 600 }}>NEW</span>}
            </NavLink>
          )
        })}
      </nav>
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border)' }}>
        <button onClick={handleSignOut} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'transparent', color: 'var(--text3)', fontSize: 13 }}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <div className="hide-mobile"><Sidebar /></div>

      {menuOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }} onClick={() => setMenuOpen(false)} />
          <div style={{ position: 'relative', width: 260, background: 'var(--bg2)', height: '100%', animation: 'slideIn .25s ease', zIndex: 1 }}>
            <Sidebar mobile />
          </div>
        </div>
      )}

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className="hide-desktop" style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg2)', position: 'sticky', top: 0, zIndex: 100 }}>
          <button onClick={() => setMenuOpen(true)} style={{ background: 'transparent', color: 'var(--text)', padding: 4 }}><Menu size={22} /></button>
          <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--green)' }}>💰 HR Finanzas</span>
          <div style={{ width: 30 }} />
        </div>

        <main style={{ flex: 1, padding: 'clamp(16px, 3vw, 32px)', maxWidth: 1100, width: '100%', margin: '0 auto' }}>
          <Outlet />
        </main>
      </div>

      <Toast />
    </div>
  )
}
