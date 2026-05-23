import clsx from 'clsx'

export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-8 h-8', lg: 'w-12 h-12' }
  return (
    <div className={clsx('flex items-center justify-center', className)}>
      <div className={clsx(
        sizes[size],
        'border-2 border-border border-t-green-accent rounded-full animate-spin'
      )} />
    </div>
  )
}
