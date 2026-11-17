/**
 * StatCard — dashboard metric card
 * Props: icon, label, value, color, trend
 */
export default function StatCard({ icon: Icon, label, value, color = 'sage', trend }) {
  const colorMap = {
    sage:     { bg: 'bg-sage-100',     icon: 'text-sage-700',   badge: 'bg-sage-100 text-sage-800' },
    green:    { bg: 'bg-sage-100',     icon: 'text-sage-700',   badge: 'bg-sage-100 text-sage-800' },
    blue:     { bg: 'bg-sage-100',     icon: 'text-sage-700',   badge: 'bg-sage-100 text-sage-800' },
    amber:    { bg: 'bg-amber-100',    icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-800' },
    orange:   { bg: 'bg-amber-100',    icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-800' },
    purple:   { bg: 'bg-amber-50',     icon: 'text-amber-700',  badge: 'bg-amber-100 text-amber-800' },
    concrete: { bg: 'bg-concrete-100', icon: 'text-concrete-700', badge: 'bg-concrete-200 text-concrete-800' },
  }
  const c = colorMap[color] || colorMap.sage

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-concrete-200/80 p-5 card-hover">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${c.bg}`}>
          <Icon className={`w-5 h-5 ${c.icon}`} />
        </div>
        {trend && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.badge}`}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-concrete-900 mb-0.5">{value}</p>
      <p className="text-sm text-concrete-600">{label}</p>
    </div>
  )
}
