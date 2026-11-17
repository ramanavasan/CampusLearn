import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { GraduationCap, Menu, X, BookOpen, LogIn } from 'lucide-react'
import Button from './Button'

const navLinks = [
  { label: 'Home',   to: '/' },
  { label: 'Notes',  to: '/notes' },
  { label: 'PYQ',    to: '/pyq' },
]

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-concrete-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-sage-600 flex items-center justify-center shadow-md group-hover:bg-sage-700 transition-colors">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-concrete-900 tracking-tight">
              Campus<span className="text-amber-500">Learn</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navLinks.map(({ label, to }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-4 py-2 rounded-xl text-sm font-medium transition-colors
                  ${isActive
                    ? 'text-sage-800 bg-sage-100 font-semibold'
                    : 'text-concrete-700 hover:text-sage-700 hover:bg-sage-50'}`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* CTA buttons */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/student-dashboard">
              <Button variant="ghost" size="sm">
                <BookOpen className="w-4 h-4 text-sage-600" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="accent" size="sm">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-xl text-concrete-600 hover:bg-concrete-100 transition-colors"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-concrete-200 bg-white px-4 pb-4 pt-2 space-y-1">
          {navLinks.map(({ label, to }) => (
            <NavLink
              key={to}
              to={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors
                ${isActive
                  ? 'text-sage-800 bg-sage-100 font-semibold'
                  : 'text-concrete-700 hover:text-sage-700 hover:bg-sage-50'}`
              }
            >
              {label}
            </NavLink>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link to="/student-dashboard" onClick={() => setMenuOpen(false)}>
              <Button variant="outline" size="sm" className="w-full">
                <BookOpen className="w-4 h-4" />
                <span>Dashboard</span>
              </Button>
            </Link>
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              <Button variant="accent" size="sm" className="w-full">
                <LogIn className="w-4 h-4" />
                <span>Sign In</span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  )
}
