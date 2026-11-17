import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { GraduationCap, Eye, EyeOff, Mail, Lock, User, ArrowRight, BookOpen, AlertCircle, Loader2 } from 'lucide-react'
import Button from '../components/common/Button'
import { signIn } from '../services/authService'

export default function Login() {
  const [tab, setTab] = useState('student') // 'student' | 'admin'
  const [showPass, setShowPass] = useState(false)
  const [form, setForm] = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  const handleChange = (e) => {
    setErrorMsg('')
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrorMsg('')
    setLoading(true)

    try {
      const res = await signIn(form.email, form.password, tab)
      if (res.success) {
        if (tab === 'admin') {
          navigate('/admin-dashboard')
        } else {
          navigate('/student-dashboard')
        }
      } else {
        setErrorMsg(res.error || 'Failed to authenticate. Please verify your credentials.')
      }
    } catch (err) {
      setErrorMsg(err.message || 'An unexpected error occurred.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sage-100/50 via-concrete-50 to-amber-50/30 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 group">
            <div className="w-12 h-12 rounded-2xl bg-sage-600 flex items-center justify-center shadow-lg group-hover:bg-sage-700 transition-colors">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold text-concrete-900 tracking-tight">
              Campus<span className="text-amber-500">Learn</span>
            </span>
          </Link>
          <p className="text-concrete-600 mt-2 text-sm">Sign in to access your portal</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-concrete-200/80 overflow-hidden">
          {/* Tab switcher */}
          <div className="flex border-b border-concrete-200">
            {['student', 'admin'].map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t)
                  setErrorMsg('')
                }}
                className={`flex-1 py-4 text-sm font-semibold transition-colors capitalize cursor-pointer
                  ${tab === t
                    ? 'text-sage-800 border-b-2 border-sage-600 bg-sage-50/60'
                    : 'text-concrete-500 hover:text-concrete-700'}`}
              >
                {t === 'student' ? '🎓' : '🛡️'} {t === 'student' ? 'Student' : 'Admin'}
              </button>
            ))}
          </div>

          <div className="p-8">
            <h2 className="text-xl font-bold text-concrete-900 mb-1">
              Welcome back
            </h2>
            <p className="text-sm text-concrete-600 mb-6">
              {tab === 'student' ? 'Access notes, PYQ, and college resources.' : 'Manage portal materials & students.'}
            </p>

            {errorMsg && (
              <div className="mb-5 p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email / Register Number */}
              <div>
                <label className="block text-sm font-medium text-concrete-700 mb-1.5">
                  {tab === 'student' ? 'Register Number or Email' : 'Admin Email'}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-concrete-400" />
                  <input
                    type={tab === 'student' ? 'text' : 'email'}
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder={tab === 'student' ? 'e.g. 2401CE10101' : 'admin@college.edu'}
                    required
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent bg-concrete-50 text-concrete-900 placeholder-concrete-400"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-concrete-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-concrete-400" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    required
                    className="w-full pl-10 pr-11 py-2.5 text-sm border border-concrete-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent bg-concrete-50 text-concrete-900 placeholder-concrete-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-concrete-400 hover:text-concrete-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-concrete-600 cursor-pointer">
                  <input type="checkbox" className="rounded accent-amber-500" />
                  Remember me
                </label>
                <button type="button" className="text-amber-600 hover:text-amber-700 font-semibold cursor-pointer">
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="accent"
                size="lg"
                disabled={loading}
                className="w-full shadow-md flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Demo access links */}
            <div className="mt-6 p-4 bg-sage-50 rounded-2xl border border-sage-200/80">
              <p className="text-xs font-semibold text-sage-800 mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Quick access (no credentials needed)
              </p>
              <div className="flex flex-col gap-1.5">
                <Link to="/student-dashboard" className="text-xs font-medium text-sage-700 hover:text-amber-600 flex items-center gap-1.5 transition-colors">
                  <User className="w-3 h-3 text-sage-600" /> → Student Dashboard
                </Link>
                <Link to="/admin-dashboard" className="text-xs font-medium text-sage-700 hover:text-amber-600 flex items-center gap-1.5 transition-colors">
                  <User className="w-3 h-3 text-sage-600" /> → Admin Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-concrete-600 mt-6 font-medium">
          New to CampusLearn?{' '}
          <span className="text-amber-600 font-semibold cursor-pointer hover:underline">
            Contact your administrator
          </span>
        </p>
      </div>
    </div>
  )
}
