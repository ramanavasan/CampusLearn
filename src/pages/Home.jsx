import { Link } from 'react-router-dom'
import { GraduationCap, BookOpen, FileQuestion, Users, ArrowRight, CheckCircle2, Sparkles, Shield, Zap } from 'lucide-react'
import Button from '../components/common/Button'

const features = [
  {
    icon: BookOpen,
    title: 'Study Notes',
    description: 'Access subject-wise organized notes uploaded by faculty and top students.',
    color: 'sage',
  },
  {
    icon: FileQuestion,
    title: 'Previous Year Questions',
    description: 'Practise with a full archive of past exam papers sorted by year and subject.',
    color: 'amber',
  },
  {
    icon: Users,
    title: 'Community Sharing',
    description: 'Students can upload, share, and discover learning resources together.',
    color: 'concrete',
  },
]

const stats = [
  { label: 'Students Enrolled', value: '12,000+' },
  { label: 'Study Materials', value: '8,500+' },
  { label: 'Subjects Covered', value: '200+' },
  { label: 'College Branches', value: '15+' },
]

const highlights = [
  'Free access to all materials',
  'Mobile-friendly interface',
  'Semester-wise organization',
  'Download & offline access',
  'Admin-moderated content',
  'Exam-ready question banks',
]

const colorIconMap = {
  sage:     { bg: 'bg-sage-100',     border: 'border-sage-200',     icon: 'text-sage-700' },
  amber:    { bg: 'bg-amber-100',    border: 'border-amber-200',    icon: 'text-amber-600' },
  concrete: { bg: 'bg-concrete-100', border: 'border-concrete-200', icon: 'text-concrete-700' },
}

export default function Home() {
  return (
    <div className="bg-white">
      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-sage-950 via-sage-900 to-sage-800 text-white">
        {/* Decorative blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-sage-500/20 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-96 h-96 rounded-full bg-amber-500/15 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-36">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-sage-800/80 backdrop-blur border border-sage-600/50 rounded-full px-4 py-1.5 mb-6 text-sm font-medium text-sage-100">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              Your College Learning Portal
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
              Everything You Need to{' '}
              <span className="text-amber-400">Ace Your Exams</span>
            </h1>

            <p className="text-lg sm:text-xl text-sage-100/90 leading-relaxed mb-10 max-w-2xl">
              CampusLearn brings together notes, previous year question papers, and
              study resources — all in one clean, modern platform built for college students.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link to="/student-dashboard">
                <Button variant="white" size="lg" className="shadow-lg text-sage-900 hover:text-sage-950">
                  <GraduationCap className="w-5 h-5 text-sage-700" />
                  <span>Go to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-amber-600" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline-white" size="lg">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 60L1440 60L1440 0C1200 50 960 60 720 40C480 20 240 10 0 30L0 60Z" fill="#FFFFFF" />
          </svg>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────── */}
      <section className="py-14 bg-white border-b border-concrete-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map(({ label, value }, idx) => (
              <div key={label} className="text-center">
                <p className={`text-3xl font-extrabold mb-1 ${idx % 2 === 0 ? 'text-sage-700' : 'text-amber-600'}`}>
                  {value}
                </p>
                <p className="text-sm text-concrete-600 font-medium">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────── */}
      <section className="py-20 bg-concrete-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-concrete-900 mb-4 tracking-tight">
              Everything a Student Needs
            </h2>
            <p className="text-concrete-600 max-w-xl mx-auto">
              A focused set of tools to make your study life easier, organised, and collaborative.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-7">
            {features.map(({ icon: Icon, title, description, color }) => {
              const c = colorIconMap[color]
              return (
                <div
                  key={title}
                  className={`bg-white rounded-2xl border ${c.border} p-7 shadow-sm card-hover`}
                >
                  <div className={`w-12 h-12 rounded-xl ${c.bg} flex items-center justify-center mb-5`}>
                    <Icon className={`w-6 h-6 ${c.icon}`} />
                  </div>
                  <h3 className="text-lg font-bold text-concrete-900 mb-2">{title}</h3>
                  <p className="text-concrete-600 text-sm leading-relaxed">{description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Highlights ────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-sage-100 text-sage-800 px-3 py-1 rounded-full text-xs font-semibold mb-4 border border-sage-200">
                Modern Learning Hub
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold text-concrete-900 mb-5 tracking-tight">
                Why Students Choose{' '}
                <span className="text-sage-700">Campus</span><span className="text-amber-500">Learn</span>
              </h2>
              <p className="text-concrete-600 leading-relaxed mb-8">
                We built CampusLearn to solve a simple problem: study materials are
                scattered across groups and drives. We centralise everything so you can focus on learning.
              </p>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2.5 text-sm font-medium text-concrete-700">
                    <CheckCircle2 className="w-5 h-5 text-sage-600 flex-shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card stack */}
            <div className="relative flex justify-center lg:justify-end">
              <div className="relative w-80">
                <div className="absolute inset-0 bg-sage-200 rounded-3xl translate-x-4 translate-y-4" />
                <div className="relative bg-sage-800 rounded-3xl p-8 text-white shadow-xl border border-sage-700">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center">
                      <Shield className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">Verified Platform</p>
                      <p className="text-xs text-sage-200">Faculty-moderated content</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {['CS Notes — Semester 5', 'DSA Question Bank 2024', 'OS Lab Manual'].map((item) => (
                      <div key={item} className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-2.5">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span className="text-sm font-medium text-sage-50">{item}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 flex items-center gap-2 text-amber-300 text-sm font-medium">
                    <Zap className="w-4 h-4 text-amber-400" />
                    Instant access, zero paywall
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-10">
          <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white blur-2xl" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Start Learning Today
          </h2>
          <p className="text-amber-100 mb-8 text-lg leading-relaxed">
            Join thousands of college students already preparing smarter with CampusLearn.
          </p>
          <Link to="/login">
            <Button variant="white" size="lg" className="shadow-xl text-amber-800 hover:text-amber-900 font-bold">
              <span>Create Free Account</span>
              <ArrowRight className="w-4 h-4 text-amber-600" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
