import { useState } from 'react'
import { Outlet, NavLink, Link, useNavigate } from 'react-router-dom'
import {
  GraduationCap,
  LayoutDashboard,
  BookOpen,
  FileQuestion,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  ChevronRight,
} from 'lucide-react'

const studentNav = [
  { label: 'Dashboard', to: '/student-dashboard', icon: LayoutDashboard },
  { label: 'Notes',     to: '/notes',              icon: BookOpen },
  { label: 'PYQ',       to: '/pyq',                icon: FileQuestion },
]

const adminNav = [
  { label: 'Dashboard', to: '/admin-dashboard', icon: LayoutDashboard },
  { label: 'Students',  to: '/admin-dashboard', icon: Users },
  { label: 'Settings',  to: '/admin-dashboard', icon: Settings },
]

/**
 * DashboardLayout — sidebar + topbar layout for authenticated pages
 * Props: role ("student" | "admin")
 */
export default function DashboardLayout({ role = 'student' }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const navigate = useNavigate()
  const links = role === 'admin' ? adminNav : studentNav
  const userLabel = role === 'admin' ? 'Admin' : 'Student'

  const SidebarContent = () => (
    <div className="flex flex-col h-full text-white">
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-2.5 px-5 py-5 border-b border-sage-700/60"
        onClick={() => setSidebarOpen(false)}
      >
        <div className="w-8 h-8 rounded-xl bg-sage-500/40 border border-sage-400/30 flex items-center justify-center">
          <GraduationCap className="w-5 h-5 text-white" />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">
          Campus<span className="text-amber-400">Learn</span>
        </span>
      </Link>

      {/* Role badge */}
      <div className="px-5 py-3">
        <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
          {userLabel} Portal
        </span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {links.map(({ label, to, icon: Icon }) => (
          <NavLink
            key={label}
            to={to}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
              ${isActive
                ? 'bg-white/20 text-white shadow-sm font-semibold'
                : 'text-sage-100/80 hover:bg-white/10 hover:text-white'}`
            }
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <span>{label}</span>
            <ChevronRight className="ml-auto w-3.5 h-3.5 opacity-60" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom: profile + logout */}
      <div className="px-3 py-4 border-t border-sage-700/60 space-y-2">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/10">
          <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            {role === 'admin' ? 'A' : 'S'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {role === 'admin' ? 'Admin User' : 'Student User'}
            </p>
            <p className="text-xs text-sage-200 truncate">{userLabel}</p>
          </div>
        </div>
        <button
          onClick={() => navigate('/login')}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-sage-100 hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
        >
          <LogOut className="w-5 h-5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-concrete-50 flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-sage-900 via-sage-800 to-sage-900 flex-shrink-0 shadow-lg">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative z-10 flex flex-col w-72 bg-gradient-to-b from-sage-900 via-sage-800 to-sage-900 shadow-2xl">
            <button
              className="absolute top-4 right-4 p-1.5 rounded-xl bg-white/10 text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-concrete-200/80 shadow-sm">
          <div className="flex items-center gap-4 px-4 sm:px-6 h-16">
            {/* Mobile menu button */}
            <button
              className="lg:hidden p-2 rounded-xl text-concrete-600 hover:bg-concrete-100 transition-colors"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-concrete-400" />
                <input
                  type="text"
                  placeholder="Search materials..."
                  className="w-full pl-10 pr-4 py-2 text-sm bg-concrete-50 border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent text-concrete-800 placeholder-concrete-400"
                />
              </div>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {/* Notification bell */}
              <button className="relative p-2 rounded-xl text-concrete-600 hover:bg-concrete-100 transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
              </button>

              {/* Avatar */}
              <div className="w-9 h-9 rounded-xl bg-sage-600 flex items-center justify-center text-white font-bold text-sm shadow">
                {role === 'admin' ? 'A' : 'S'}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto custom-scroll">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
