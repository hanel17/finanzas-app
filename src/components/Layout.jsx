import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { LayoutDashboard, ArrowLeftRight, CreditCard, Target, LogOut } from 'lucide-react'

export default function Layout() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const navItems = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Inicio' },
    { to: '/transactions', icon: <ArrowLeftRight size={20} />, label: 'Movimientos' },
    { to: '/cards', icon: <CreditCard size={20} />, label: 'Tarjetas' },
    { to: '/goals', icon: <Target size={20} />, label: 'Metas' },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <aside style={{ width: 220, background: 'var(--bg2)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', padding: '24px 0' }}>
        <div style={{ padding: '0 20px 24px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--green)' }}>💰 FinanzasApp</div>
          <div style={{ fontSize: 12, color: 'var(--gray)', marginTop: 4 }}>{user?.email}</div>
        </div>
        <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {navItems.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 12px', borderRadius: 8,
                color: isActive ? 'var(--green)' : 'var(--text2)',
                background: isActive ? 'rgba(34,197,94,0.1)' : 'transparent',
                fontSize: 14, fontWeight: 500, transition: 'all .15s'
              })}>
              {icon}{label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: '0 12px' }}>
          <button onClick={handleSignOut}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'transparent', color: 'var(--gray)', fontSize: 14 }}>
            <LogOut size={18} /> Cerrar sesión
          </button>
        </div>
      </aside>
      <main style={{ flex: 1, padding: 32, overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  )
}
