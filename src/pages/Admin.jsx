import { useEffect, useState } from 'react'
import { Shield, Users, Car, CheckCircle, Ban, Clock } from 'lucide-react'
import { supabase } from '../lib/supabase'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { getInitials } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

export default function Admin() {
  const [stats, setStats] = useState({})
  const [users, setUsers] = useState([])
  const [rides, setRides] = useState([])
  const [pendingUsers, setPendingUsers] = useState([])
  const [tab, setTab] = useState('Stats')
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [
      { count: totalUsers },
      { count: pendingCount },
      { count: activeRides },
      { count: completedRides },
      { data: allUsers },
      { data: allRides },
      { data: pending },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('is_verified', false),
      supabase.from('rides').select('id', { count: 'exact', head: true }).in('status', ['upcoming', 'active']),
      supabase.from('rides').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('users').select('id, full_name, cnic, mobile, city, is_verified, role, created_at').order('created_at', { ascending: false }).limit(50),
      supabase.from('rides').select('*, users!rides_driver_id_fkey(full_name)').order('created_at', { ascending: false }).limit(30),
      supabase.from('users').select('id, full_name, cnic, mobile, city, profession, age, created_at').eq('is_verified', false).order('created_at', { ascending: false }),
    ])
    setStats({ totalUsers, pendingCount, activeRides, completedRides })
    setUsers(allUsers || [])
    setRides(allRides || [])
    setPendingUsers(pending || [])
    setLoading(false)
  }

  async function verifyUser(userId) {
    const { error } = await supabase.from('users').update({ is_verified: true }).eq('id', userId)
    if (error) { toast.error('Verification failed'); return }
    await supabase.from('notifications').insert({ user_id: userId, type: 'account_verified', message: 'Your NRFSS account has been verified! You can now post and join rides.' })
    toast.success('User verified!')
    setPendingUsers(p => p.filter(u => u.id !== userId))
    setUsers(u => u.map(user => user.id === userId ? { ...user, is_verified: true } : user))
    setStats(s => ({ ...s, pendingCount: (s.pendingCount || 1) - 1 }))
  }

  async function suspendUser(userId) {
    const { error } = await supabase.from('users').update({ is_verified: false }).eq('id', userId)
    if (error) { toast.error('Action failed'); return }
    toast.success('User suspended')
    setUsers(u => u.map(user => user.id === userId ? { ...user, is_verified: false } : user))
  }

  const TABS = ['Stats', 'Users', 'Rides', 'Verification Queue']

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-gradient flex items-center justify-center shadow-green-glow">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="page-title mb-0">Admin Panel</h1>
            <p className="page-subtitle">Manage users, rides, and verifications</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px transition-all
              ${tab === t ? 'border-green-accent text-green-accent' : 'border-transparent text-text-dim hover:text-text-primary'}`}
          >
            {t}
            {t === 'Verification Queue' && stats.pendingCount > 0 && (
              <span className="ml-2 badge-red text-xs">{stats.pendingCount}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? <LoadingSpinner className="py-16" /> : (
        <>
          {/* Stats Tab */}
          {tab === 'Stats' && (
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              {[
                { icon: Users, label: 'Total Users', value: stats.totalUsers || 0, color: 'text-green-accent' },
                { icon: Clock, label: 'Pending Verification', value: stats.pendingCount || 0, color: 'text-yellow-400' },
                { icon: Car, label: 'Active Rides', value: stats.activeRides || 0, color: 'text-green-accent' },
                { icon: CheckCircle, label: 'Completed Rides', value: stats.completedRides || 0, color: 'text-green-accent' },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="stat-card">
                  <div className="stat-icon"><Icon className="w-5 h-5" /></div>
                  <div>
                    <div className={`text-3xl font-black ${color}`}>{value}</div>
                    <div className="text-xs text-text-dim mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Users Tab */}
          {tab === 'Users' && (
            <div className="glass rounded-xl overflow-x-auto">
              <table className="data-table min-w-full">
                <thead><tr><th>Name</th><th>CNIC</th><th>Mobile</th><th>City</th><th>Status</th><th>Role</th><th>Actions</th></tr></thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="font-semibold text-text-primary">{u.full_name}</td>
                      <td className="font-mono text-text-dim text-xs">{u.cnic ? `${u.cnic.slice(0,5)}-***` : '—'}</td>
                      <td className="text-text-dim text-xs">{u.mobile}</td>
                      <td className="text-text-dim text-xs">{u.city}</td>
                      <td>{u.is_verified ? <span className="badge-green">Verified</span> : <span className="badge-yellow">Pending</span>}</td>
                      <td><span className={`badge text-xs ${u.role === 'admin' ? 'badge-blue' : u.role === 'driver' ? 'badge-green' : 'badge-gray'}`}>{u.role}</span></td>
                      <td>
                        <div className="flex gap-2">
                          {!u.is_verified && (
                            <button onClick={() => verifyUser(u.id)} className="text-xs bg-green-accent/20 hover:bg-green-accent/30 text-green-accent border border-green-accent/30 rounded-lg px-3 py-1.5 font-semibold transition-all">
                              Verify
                            </button>
                          )}
                          {u.is_verified && (
                            <button onClick={() => suspendUser(u.id)} className="text-xs bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg px-3 py-1.5 font-semibold transition-all">
                              Suspend
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Rides Tab */}
          {tab === 'Rides' && (
            <div className="glass rounded-xl overflow-x-auto">
              <table className="data-table min-w-full">
                <thead><tr><th>Driver</th><th>Route</th><th>Date</th><th>Seats</th><th>Status</th></tr></thead>
                <tbody>
                  {rides.map(r => (
                    <tr key={r.id}>
                      <td className="font-semibold text-text-primary">{r.users?.full_name}</td>
                      <td className="text-xs text-text-dim">{r.origin} → {r.destination}</td>
                      <td className="text-text-dim text-xs">{r.date}</td>
                      <td className="text-text-dim">{r.available_seats}</td>
                      <td><span className={`badge text-xs ${r.status === 'completed' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Verification Queue */}
          {tab === 'Verification Queue' && (
            <div>
              {pendingUsers.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                  <CheckCircle className="w-12 h-12 text-green-accent mx-auto mb-3" />
                  <h3 className="text-lg font-bold text-text-primary">All caught up!</h3>
                  <p className="text-text-dim text-sm mt-1">No pending verifications at this time.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {pendingUsers.map(u => (
                    <div key={u.id} className="glass-hover rounded-xl p-5">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-11 h-11 rounded-xl bg-green-gradient flex items-center justify-center text-white font-bold">
                          {getInitials(u.full_name)}
                        </div>
                        <div>
                          <div className="font-bold text-text-primary">{u.full_name}</div>
                          <div className="text-xs text-text-dim">{u.profession} · {u.city}</div>
                        </div>
                      </div>
                      <div className="space-y-1.5 text-xs text-text-dim mb-4">
                        <div className="flex justify-between">
                          <span>CNIC</span>
                          <span className="font-mono text-text-primary">{u.cnic}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mobile</span>
                          <span className="text-text-primary">{u.mobile}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Age</span>
                          <span className="text-text-primary">{u.age}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Registered</span>
                          <span className="text-text-primary">{new Date(u.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => suspendUser(u.id)}
                          className="flex-1 py-2 text-xs font-semibold text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-all flex items-center justify-center gap-1">
                          <Ban className="w-3 h-3" /> Reject
                        </button>
                        <button onClick={() => verifyUser(u.id)}
                          className="flex-1 py-2 text-xs font-semibold text-green-accent border border-green-accent/30 rounded-lg hover:bg-green-accent/10 transition-all flex items-center justify-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
