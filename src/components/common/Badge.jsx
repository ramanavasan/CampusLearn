/**
 * Badge — inline label badge
 * Props: children, variant (sage | amber | concrete | green | orange | red | gray)
 */
export default function Badge({ children, variant = 'sage' }) {
  const variants = {
    sage:     'bg-sage-100 text-sage-800 border border-sage-200/60',
    amber:    'bg-amber-100 text-amber-800 border border-amber-200/60',
    concrete: 'bg-concrete-200 text-concrete-800 border border-concrete-300/60',
    blue:     'bg-sage-100 text-sage-800 border border-sage-200/60',
    green:    'bg-sage-100 text-sage-800 border border-sage-200/60',
    orange:   'bg-amber-100 text-amber-800 border border-amber-200/60',
    purple:   'bg-amber-100 text-amber-800 border border-amber-200/60',
    red:      'bg-red-100 text-red-700 border border-red-200/60',
    gray:     'bg-concrete-100 text-concrete-700 border border-concrete-200',
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${variants[variant] || variants.sage}`}>
      {children}
    </span>
  )
}
