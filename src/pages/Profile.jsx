import { useState, useEffect, useRef } from 'react'
import { Edit2, Star, Car, MapPin, Calendar, X, Save, Camera } from 'lucide-react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import Avatar from '../components/ui/Avatar'
import LoadingSpinner from '../components/ui/LoadingSpinner'
import { formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

const TABS = ['Info', 'Ride History', 'Reviews']

export default function Profile() {
  const { user, profile } = useAuthStore()
  const setProfile = useAuthStore(state => state.setProfile)
  const [tab, setTab] = useState('Info')
  const [rides, setRides] = useState([])
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [editForm, setEditForm] = useState({})
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  useEffect(() => { if (user) loadAll() }, [user])

  async function loadAll() {
    setLoading(true)
    const [{ data: ridesData }, { data: reviewsData }] = await Promise.all([
      supabase.from('rides').select('*').eq('driver_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('reviews').select('*, reviewer:users!reviews_reviewer_id_fkey(full_name, avatar_url)').eq('reviewee_id', user.id).order('created_at', { ascending: false }).limit(10),
    ])
    setRides(ridesData || [])
    setReviews(reviewsData || [])
    setLoading(false)
  }

  function startEdit() {
    setEditForm({ full_name: profile?.full_name, city: profile?.city, profession: profile?.profession, age: profile?.age })
    setEditing(true)
  }

  async function saveEdit() {
    const { data, error } = await supabase.from('users').update(editForm).eq('id', user.id).select().single()
    if (error) { toast.error('Update failed'); return }
    setProfile(data)
    setEditing(false)
    toast.success('Profile updated!')
  }

  async function uploadAvatar(file) {
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadErr) { toast.error('Upload failed: ' + uploadErr.message); setUploadingAvatar(false); return }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now()
    await supabase.from('users').update({ avatar_url: avatarUrl }).eq('id', user.id)
    setProfile({ ...profile, avatar_url: avatarUrl })
    setAvatarFile(null)
    setAvatarPreview(null)
    toast.success('Profile photo updated!')
    setUploadingAvatar(false)
  }

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    uploadAvatar(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null
  const completedRides = rides.filter(r => r.status === 'completed').length
  const totalSaved = completedRides * 450

  return (
    <div className="p-6">
      <h1 className="page-title mb-6">My Profile</h1>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="space-y-4">
          <div className="glass rounded-2xl p-6 text-center">
            {/* Avatar with upload */}
            <div className="relative inline-block mb-4">
              <Avatar url={profile?.avatar_url} name={profile?.full_name} size="2xl" className="mx-auto shadow-green-glow" />
              <button
                onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 w-8 h-8 bg-green-600 hover:bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg transition-all disabled:opacity-50"
                title="Change photo"
              >
                {uploadingAvatar
                  ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Camera className="w-3.5 h-3.5" />
                }
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>

            <h2 className="text-xl font-black text-text-primary">{profile?.full_name}</h2>
            <div className="flex items-center justify-center gap-2 mt-1">
              {profile?.is_verified ? (
                <span className="badge-green">Verified</span>
              ) : (
                <span className="badge-yellow">Pending Verification</span>
              )}
              {profile?.role === 'driver' && <span className="badge-blue">Driver</span>}
            </div>

            {avgRating && (
              <div className="flex items-center justify-center gap-1 mt-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className={`w-4 h-4 ${i < Math.round(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
                ))}
                <span className="text-sm font-bold text-text-primary ml-1">{avgRating}</span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-5">
              {[
                { label: 'Rides', value: rides.length },
                { label: 'Completed', value: completedRides },
                { label: 'Saved', value: formatPKR(totalSaved).replace('PKR ', '') },
              ].map(({ label, value }) => (
                <div key={label} className="glass rounded-xl py-2">
                  <div className="text-base font-black text-green-accent">{value}</div>
                  <div className="text-[10px] text-text-dim">{label}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 text-xs text-text-dim space-y-1.5">
              <p className="flex items-center justify-center gap-1"><Car className="w-3 h-3" /> {profile?.profession}</p>
              <p className="flex items-center justify-center gap-1"><MapPin className="w-3 h-3" /> {profile?.city}</p>
              <p className="flex items-center justify-center gap-1">
                <Calendar className="w-3 h-3" />
                Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-PK', { month: 'short', year: 'numeric' }) : ''}
              </p>
            </div>

            <button onClick={startEdit} className="btn-secondary w-full mt-5 py-2.5 text-sm">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="lg:col-span-2">
          <div className="flex border-b border-border mb-5">
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all -mb-px
                  ${tab === t ? 'border-green-accent text-green-accent' : 'border-transparent text-text-dim hover:text-text-primary'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {loading ? <LoadingSpinner className="py-12" /> : (
            <>
              {/* Info Tab */}
              {tab === 'Info' && (
                <div className="glass rounded-xl p-6 space-y-4">
                  {[
                    ['Full Name', profile?.full_name],
                    ['CNIC', profile?.cnic ? `${profile.cnic.slice(0, 5)}-*******-${profile.cnic.slice(-1)}` : '—'],
                    ['Mobile', profile?.mobile],
                    ['Email', profile?.email],
                    ['Age', profile?.age],
                    ['City', profile?.city],
                    ['Profession', profile?.profession],
                    ['Role', profile?.role],
                    ['Account Status', profile?.is_verified ? 'Verified' : 'Pending verification'],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between py-2 border-b border-border/50 last:border-0">
                      <span className="text-text-dim text-sm">{label}</span>
                      <span className="text-text-primary text-sm font-semibold">{value || '—'}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Ride History */}
              {tab === 'Ride History' && (
                <div>
                  {rides.length === 0 ? (
                    <div className="glass rounded-xl p-10 text-center text-text-dim">
                      <Car className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No rides posted yet</p>
                    </div>
                  ) : (
                    <div className="glass rounded-xl overflow-hidden">
                      <table className="data-table">
                        <thead><tr><th>Date</th><th>Route</th><th>Seats</th><th>Status</th></tr></thead>
                        <tbody>
                          {rides.map(r => (
                            <tr key={r.id}>
                              <td className="text-text-dim text-xs">{r.date}</td>
                              <td className="text-xs"><span className="font-semibold">{r.origin}</span> → {r.destination}</td>
                              <td className="text-text-dim">{r.available_seats}</td>
                              <td><span className={`badge text-xs py-1 ${r.status === 'completed' ? 'badge-green' : r.status === 'cancelled' ? 'badge-red' : 'badge-yellow'}`}>{r.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Reviews */}
              {tab === 'Reviews' && (
                <div>
                  {reviews.length === 0 ? (
                    <div className="glass rounded-xl p-10 text-center text-text-dim">
                      <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p>No reviews yet</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {reviews.map(r => (
                        <div key={r.id} className="glass-hover rounded-xl p-4">
                          <div className="flex items-center gap-3 mb-2">
                            <Avatar url={r.reviewer?.avatar_url} name={r.reviewer?.full_name} size="sm" />
                            <div className="flex-1">
                              <div className="text-sm font-bold text-text-primary">{r.reviewer?.full_name}</div>
                              <div className="flex gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star key={i} className={`w-3 h-3 ${i < r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-border'}`} />
                                ))}
                              </div>
                            </div>
                            <span className="text-xs text-text-dim">{new Date(r.created_at).toLocaleDateString()}</span>
                          </div>
                          {r.comment && <p className="text-sm text-text-dim italic">"{r.comment}"</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-bold text-text-primary">Edit Profile</h3>
              <button onClick={() => setEditing(false)} className="btn-ghost p-2"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              {[['full_name', 'Full Name', 'text'], ['city', 'City', 'text'], ['profession', 'Profession', 'text'], ['age', 'Age', 'number']].map(([k, l, t]) => (
                <div key={k}>
                  <label className="label">{l}</label>
                  <input type={t} className="input" value={editForm[k] || ''} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <button onClick={() => setEditing(false)} className="btn-secondary flex-1 py-3 text-sm">Cancel</button>
                <button onClick={saveEdit} className="btn-primary flex-1 py-3 text-sm"><Save className="w-4 h-4" /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
