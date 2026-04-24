import { Outlet, NavLink } from 'react-router-dom'
import { House, FileBarChart2, Database, TrendingUp, Fingerprint, Mic } from 'lucide-react'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const mobileItems = [
  { name: 'Home', to: '/', icon: House, end: true },
  { name: 'Reports', to: '/reports', icon: FileBarChart2 },
  { name: 'Clean Room', to: '/data-clean-room', icon: Database },
  { name: 'Twin', to: '/causal-twin', icon: TrendingUp },
  { name: 'Persona', to: '/persona-probe', icon: Fingerprint },
  { name: 'Voice', to: '/voice-bias', icon: Mic },
]

function Layout() {
  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-grid-glow bg-[size:46px_46px] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.24),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.2),transparent_45%)]" />
      <div className="relative z-10 flex w-full min-h-screen">
        <Sidebar />
        <main className="flex-1 w-full px-4 pb-10 pt-6 sm:px-6 lg:px-8 overflow-auto">
          <Topbar />
          <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {mobileItems.map((item) => {
              const Icon = item.icon

              return (
                <NavLink
                  key={item.name}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      isActive
                        ? 'border-cyan-300/45 bg-cyan-500/20 text-cyan-100'
                        : 'border-slate-400/25 bg-slate-900/55 text-slate-300'
                    }`
                  }
                >
                  <Icon size={13} />
                  {item.name}
                </NavLink>
              )
            })}
          </nav>
          <div className="mt-6 w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

export default Layout
