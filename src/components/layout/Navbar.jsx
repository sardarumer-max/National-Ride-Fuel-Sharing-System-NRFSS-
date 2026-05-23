import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, LogOut, User, Settings, Menu, X } from 'lucide-react'
import useAuthStore from '../../store/authStore'
import NotificationBell from '../ui/NotificationBell'
import Avatar from '../ui/Avatar'

export default function Navbar() {
  const { user, profile, signOut } = useAuthStore()
  const [menuOpen, setMenuOpen] = useState(false)
  const [dropOpen, setDropOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const isActive = (path) => location.pathname === path

  const handleSignOut = async () => {
    setDropOpen(false)
    setMenuOpen(false)
    try { await signOut() } catch (e) { console.warn('[Navbar] signOut error:', e) }
    navigate('/login')
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-green-glow group-hover:shadow-green-glow-lg transition-all">
              <img
                src="/logo.png"
                alt="NRFSS Logo"
                className="w-full h-full object-cover"
                style={{ objectPosition: '50% 20%', transform: 'scale(1.4)' }}
              />
            </div>
            <span className="text-xl font-black text-text-primary">
              NR<span className="text-green-accent">FSS</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {user ? (
              <>
                <NavLink to="/dashboard"  active={isActive('/dashboard')}>Dashboard</NavLink>
                <NavLink to="/post-ride"  active={isActive('/post-ride')}>Post Ride</NavLink>
                <NavLink to="/find-ride"  active={isActive('/find-ride')}>Find Ride</NavLink>
                <NavLink to="/my-rides"   active={isActive('/my-rides')}>My Rides</NavLink>
                <NavLink to="/calculator" active={isActive('/calculator')}>Calculator</NavLink>
                {profile?.role === 'admin' && (
                  <NavLink to="/admin" active={isActive('/admin')}>Admin</NavLink>
                )}
              </>
            ) : (
              <>
                <NavLink to="/"       active={isActive('/')}>Home</NavLink>
                <NavLink to="/safety" active={isActive('/safety')}>Safety</NavLink>
              </>
            )}
          </div>

          {/* Auth Section */}
          <div className="hidden md:flex items-center gap-2">
            {user ? (
              <>
                <NotificationBell />

                {/* Avatar dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setDropOpen(!dropOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/5 transition-all"
                  >
                    <Avatar url={profile?.avatar_url} name={profile?.full_name} size="sm" />
                    <span className="text-sm font-semibold text-text-primary hidden lg:block max-w-[120px] truncate">
                      {profile?.full_name?.split(' ')[0] || 'User'}
                    </span>
                    <ChevronDown className={`w-4 h-4 text-text-dim transition-transform ${dropOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {dropOpen && (
                    <div className="absolute right-0 top-full mt-2 w-52 glass rounded-xl py-2 shadow-card border border-border">
                      <DropItem icon={User}     label="My Profile"   onClick={() => { navigate('/profile'); setDropOpen(false) }} />
                      {profile?.role === 'admin' && (
                        <DropItem icon={Settings} label="Admin Panel" onClick={() => { navigate('/admin'); setDropOpen(false) }} />
                      )}
                      <div className="my-1 border-t border-border" />
                      <DropItem icon={LogOut} label="Sign Out" onClick={handleSignOut} danger />
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <Link to="/login"    className="btn-secondary py-2 px-5 text-sm">Login</Link>
                <Link to="/register" className="btn-primary py-2 px-5 text-sm">Register</Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button
            className="md:hidden p-2 rounded-xl text-text-dim hover:text-text-primary hover:bg-white/5"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-border py-4 space-y-1">
            {user ? (
              <>
                <MobileNavLink to="/dashboard"  onClick={() => setMenuOpen(false)}>Dashboard</MobileNavLink>
                <MobileNavLink to="/post-ride"  onClick={() => setMenuOpen(false)}>Post Ride</MobileNavLink>
                <MobileNavLink to="/find-ride"  onClick={() => setMenuOpen(false)}>Find Ride</MobileNavLink>
                <MobileNavLink to="/my-rides"   onClick={() => setMenuOpen(false)}>My Rides</MobileNavLink>
                <MobileNavLink to="/calculator" onClick={() => setMenuOpen(false)}>Calculator</MobileNavLink>
                <MobileNavLink to="/profile"    onClick={() => setMenuOpen(false)}>Profile</MobileNavLink>
                <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-red-400 text-sm font-medium rounded-xl hover:bg-red-500/10 transition-all">
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <MobileNavLink to="/"       onClick={() => setMenuOpen(false)}>Home</MobileNavLink>
                <MobileNavLink to="/safety" onClick={() => setMenuOpen(false)}>Safety</MobileNavLink>
                <div className="flex gap-2 px-4 pt-2">
                  <Link to="/login"    onClick={() => setMenuOpen(false)} className="btn-secondary py-2 px-4 text-sm flex-1">Login</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)} className="btn-primary py-2 px-4 text-sm flex-1">Register</Link>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {dropOpen && <div className="fixed inset-0 z-[-1]" onClick={() => setDropOpen(false)} />}
    </nav>
  )
}

function NavLink({ to, active, children }) {
  return (
    <Link
      to={to}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200
        ${active ? 'bg-green-accent/10 text-green-accent' : 'text-text-dim hover:text-text-primary hover:bg-white/5'}`}
    >
      {children}
    </Link>
  )
}

function MobileNavLink({ to, children, onClick }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-sm font-medium text-text-dim hover:text-text-primary hover:bg-white/5 rounded-xl transition-all"
    >
      {children}
    </Link>
  )
}

function DropItem({ icon: Icon, label, onClick, danger }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors
        ${danger ? 'text-red-400 hover:bg-red-500/10' : 'text-text-dim hover:text-text-primary hover:bg-white/5'}`}
    >
      <Icon className="w-4 h-4" />
      {label}
    </button>
  )
}
