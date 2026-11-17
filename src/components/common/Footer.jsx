import { Link } from 'react-router-dom'
import { GraduationCap, Github, Twitter, Mail } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-concrete-900 text-concrete-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg bg-sage-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold text-white">
                Campus<span className="text-amber-400">Learn</span>
              </span>
            </Link>
            <p className="text-sm text-concrete-400 leading-relaxed max-w-sm">
              A modern learning management portal where students access and share
              educational materials — notes, previous year questions, and more.
            </p>
            <div className="flex gap-3 mt-4">
              {[Github, Twitter, Mail].map((Icon, i) => (
                <button
                  key={i}
                  className="w-8 h-8 rounded-lg bg-concrete-800 flex items-center justify-center hover:bg-amber-600 text-concrete-300 hover:text-white transition-colors cursor-pointer"
                >
                  <Icon className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Quick Links</h4>
            <ul className="space-y-2">
              {[
                { label: 'Home', to: '/' },
                { label: 'Notes', to: '/notes' },
                { label: 'PYQ', to: '/pyq' },
                { label: 'Dashboard', to: '/student-dashboard' },
              ].map(({ label, to }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-concrete-400 hover:text-amber-400 transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-sm font-semibold text-white mb-3 uppercase tracking-wider">Support</h4>
            <ul className="space-y-2 text-sm text-concrete-400">
              <li className="hover:text-amber-400 cursor-pointer transition-colors">Help Center</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors">Privacy Policy</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors">Terms of Service</li>
              <li className="hover:text-amber-400 cursor-pointer transition-colors">Contact Us</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-concrete-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-concrete-500">© 2026 CampusLearn. All rights reserved.</p>
          <p className="text-xs text-concrete-500">Styled with Sage Green, Concrete Grey & Burnt Amber.</p>
        </div>
      </div>
    </footer>
  )
}
