import clsx from 'clsx'

export default function GlassCard({ children, className = '', hover = false, glow = false }) {
  return (
    <div className={clsx(
      'glass p-6',
      hover && 'glass-hover cursor-pointer',
      glow && 'shadow-green-glow',
      className
    )}>
      {children}
    </div>
  )
}
