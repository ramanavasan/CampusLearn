/**
 * Card — reusable card wrapper
 * Props: className, hover (bool), children
 */
export default function Card({ children, className = '', hover = false }) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-sm border border-concrete-200/80 p-6
        ${hover ? 'card-hover cursor-pointer' : ''}
        ${className}
      `}
    >
      {children}
    </div>
  )
}
