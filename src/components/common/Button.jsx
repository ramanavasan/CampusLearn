/**
 * Button — reusable button component
 * Props: variant (primary | secondary | accent | outline | ghost | danger | white | outline-white)
 *        size (sm | md | lg)
 *        children, className, ...rest
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}) {
  const base =
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer'

  const variants = {
    primary:
      'bg-sage-600 text-white hover:bg-sage-700 active:bg-sage-800 focus:ring-sage-400 shadow-sm',
    secondary:
      'bg-sage-100 text-sage-800 hover:bg-sage-200 active:bg-sage-300 focus:ring-sage-300',
    accent:
      'bg-amber-500 text-white hover:bg-amber-600 active:bg-amber-700 focus:ring-amber-400 shadow-sm',
    outline:
      'border-2 border-sage-600 text-sage-700 hover:bg-sage-50 hover:border-sage-700 focus:ring-sage-400',
    ghost:
      'text-sage-700 hover:bg-sage-100/70 focus:ring-sage-400',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    white:
      'bg-white text-sage-800 hover:bg-sage-50 active:bg-sage-100 shadow-md focus:ring-white',
    'outline-white':
      'border-2 border-white text-white hover:bg-white/15 active:bg-white/20 focus:ring-white',
  }

  const sizes = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant] || variants.primary} ${sizes[size]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
}
