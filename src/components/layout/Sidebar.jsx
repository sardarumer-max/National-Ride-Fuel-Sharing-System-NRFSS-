import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Car, Search, Calculator,
  User, Shield, LogOut, ChevronRight, List, MessageCircle
} from 'lucide-react'
import useAuthStore from '../../store/authStore'
import Avatar from '../ui/Avatar'

const navItems = [
  { path: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/post-ride',  icon: Car,             label: 'Post a Ride' },
  { path: '/find-ride',  icon: Search,          label: 'Find a Ride' },
  { path: '/my-rides',   icon: List,            label: 'My Rides' },
  { path: '/calculator', icon: Calculator,      label: 'Fuel Calculator' },
  { path: '/profile',    icon: User,            label: 'My Profile' },
  { path: '/safety',     icon: Shield,          label: 'Safety & Trust' },
]

export default function Sidebar() {
  const { profile, signOut } = useAuthStore()
  const location = useLocation()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    try { await signOut() } catch (e) { console.warn('[Sidebar] signOut error (ignored):', e) }
    navigate('/login')
  }

  return (
    <aside className="w-64 min-h-[calc(100vh-64px)] border-r border-border bg-bg-secondary flex-shrink-0 flex flex-col">
      {/* User Card */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <Avatar url={profile?.avatar_url} name={profile?.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-text-primary truncate">{profile?.full_name || 'User'}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              {profile?.is_verified ? (
                <span className="badge-green text-xs py-0.5">Verified</span>
              ) : (
                <span className="badge-yellow text-xs py-0.5">Pending</span>
              )}
              {profile?.role === 'admin' && (
                <span className="badge-blue text-xs py-0.5">Admin</span>
              )}
              {profile?.role === 'driver' && (
                <span className="badge-gray text-xs py-0.5">Driver</span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="glass rounded-lg py-1.5">
            <div className="text-sm font-bold text-green-accent">{profile?.total_rides || 0}</div>
            <div className="text-[10px] text-text-dim">Rides</div>
          </div>
          <div className="glass rounded-lg py-1.5">
            <div className="text-sm font-bold text-green-accent">{profile?.avg_rating || '—'}</div>
            <div className="text-[10px] text-text-dim">Rating</div>
          </div>
          <div className="glass rounded-lg py-1.5">
            <div className="text-sm font-bold text-green-accent">{profile?.city?.slice(0, 4) || '—'}</div>
            <div className="text-[10px] text-text-dim">City</div>
          </div>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path
          return (
            <Link key={path} to={path} className={`sidebar-link ${active ? 'active' : ''}`}>
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">{label}</span>
              {active && <ChevronRight className="w-3 h-3" />}
            </Link>
          )
        })}

        {profile?.role === 'admin' && (
          <>
            <div className="my-2 border-t border-border" />
            <Link to="/admin" className={`sidebar-link ${location.pathname === '/admin' ? 'active' : ''}`}>
              <Shield className="w-4 h-4 flex-shrink-0" />
              <span className="flex-1">Admin Panel</span>
            </Link>
          </>
        )}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium
                     text-red-400 hover:bg-red-500/10 transition-all duration-200"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
