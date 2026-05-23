/**
 * Avatar component — shows profile picture or initials fallback
 * Usage: <Avatar url={profile.avatar_url} name={profile.full_name} size="md" />
 */
export default function Avatar({ url, name, size = 'md', className = '' }) {
  const sizes = {
    xs:  'w-7 h-7 text-xs',
    sm:  'w-9 h-9 text-xs',
    md:  'w-11 h-11 text-sm',
    lg:  'w-16 h-16 text-lg',
    xl:  'w-20 h-20 text-xl',
    '2xl': 'w-28 h-28 text-3xl',
  }

  const initials = name
    ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'U'

  const sizeClass = sizes[size] || sizes.md

  if (url) {
    return (
      <img
        src={url}
        alt={name || 'User'}
        className={`${sizeClass} rounded-xl object-cover flex-shrink-0 ${className}`}
        onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling?.style && (e.currentTarget.nextSibling.style.display = 'flex') }}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br from-green-600 to-green-800 flex items-center justify-center text-white font-bold flex-shrink-0 ${className}`}
    >
      {initials}
    </div>
  )
}
