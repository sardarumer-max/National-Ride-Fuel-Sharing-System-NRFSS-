import { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, CheckCircle, AlertCircle, Camera, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import Avatar from '../components/ui/Avatar'
import toast from 'react-hot-toast'

const CITIES = ['Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala']
const CNIC_REGEX = /^\d{5}-\d{7}-\d{1}$/

function formatCNIC(value) {
  const digits = value.replace(/\D/g, '').slice(0, 13)
  if (digits.length <= 5) return digits
  if (digits.length <= 12) return `${digits.slice(0,5)}-${digits.slice(5)}`
  return `${digits.slice(0,5)}-${digits.slice(5,12)}-${digits.slice(12)}`
}

// ────────────────────────────────────────────────────────────
// CRITICAL: Field MUST be defined OUTSIDE Register to prevent
// React from treating it as a new component on every render,
// which would cause inputs to lose focus after one character.
// ────────────────────────────────────────────────────────────
function Field({ id, label, children, error }) {
  return (
    <div>
      <label htmlFor={id} className="label">{label}</label>
      {children}
      {error && (
        <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
          <AlertCircle className="w-3 h-3" />{error}
        </p>
      )}
    </div>
  )
}

export default function Register() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [isDriver, setIsDriver] = useState(false)
  const [avatarFile, setAvatarFile] = useState(null)
  const [avatarPreview, setAvatarPreview] = useState(null)
  const avatarInputRef = useRef(null)
  const [form, setForm] = useState({
    full_name: '', cnic: '', mobile: '', email: '', age: '',
    city: '', profession: '', password: '', confirmPassword: '',
    vehicle_type: 'car', fuel_efficiency: '15', terms: false,
  })
  const [errors, setErrors] = useState({})

  function handleAvatarChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  function removeAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (avatarInputRef.current) avatarInputRef.current.value = ''
  }

  const set = (key) => (e) => {
    let value = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    if (key === 'cnic') value = formatCNIC(value)
    setForm(f => ({ ...f, [key]: value }))
    setErrors(prev => ({ ...prev, [key]: null }))
  }

  function validate() {
    const errs = {}
    if (!form.full_name.trim()) errs.full_name = 'Full name is required'
    if (!CNIC_REGEX.test(form.cnic)) errs.cnic = 'Format: 00000-0000000-0'
    if (!form.mobile.trim()) errs.mobile = 'Mobile number is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Valid email required'
    const age = parseInt(form.age)
    if (!age || age < 18 || age > 70) errs.age = 'Age must be 18–70'
    if (!form.city) errs.city = 'Please select a city'
    if (!form.profession.trim()) errs.profession = 'Profession is required'
    if (form.password.length < 8) errs.password = 'Minimum 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    if (!form.terms) errs.terms = 'You must agree to terms'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      // ── Step 1: Create Supabase Auth user ──────────────────────────
      // Pass ALL profile data as metadata so the DB trigger can use it
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email.toLowerCase().trim(),
        password: form.password,
        options: {
          data: {
            full_name:  form.full_name.trim(),
            cnic:       form.cnic.trim(),
            mobile:     form.mobile.trim(),
            age:        parseInt(form.age),
            city:       form.city,
            profession: form.profession.trim(),
            role:       isDriver ? 'driver' : 'user',
          }
        }
      })

      if (authError) throw authError

      const userId = authData.user?.id

      // ── Step 2: Handle confirmation required case ───────────────────
      if (!userId) {
        // Supabase returned null user — email confirmation is required
        // OR email is already registered (unconfirmed)
        toast.success('Check your email for a confirmation link, then log in!')
        navigate('/login')
        return
      }

      // ── Step 3: Upload avatar if provided ──────────────────────────
      let avatarUrl = null
      if (avatarFile && userId) {
        const ext = avatarFile.name.split('.').pop()
        const path = `${userId}.${ext}`
        const { error: uploadErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path)
          avatarUrl = urlData.publicUrl
        } else {
          console.warn('Avatar upload failed (non-fatal):', uploadErr.message)
        }
      }

      // ── Step 4: Upsert profile (trigger may have already run) ───────
      const profilePayload = {
        id:          userId,
        full_name:   form.full_name.trim(),
        cnic:        form.cnic.trim(),
        mobile:      form.mobile.trim(),
        email:       form.email.toLowerCase().trim(),
        age:         parseInt(form.age),
        city:        form.city,
        profession:  form.profession.trim(),
        role:        isDriver ? 'driver' : 'user',
        is_verified: false,
        ...(avatarUrl && { avatar_url: avatarUrl }),
      }
      const { error: profileError } = await supabase.from('users').upsert(profilePayload, { onConflict: 'id' })
      if (profileError && profileError.code !== '23505') {
        console.warn('Profile upsert warning (non-fatal):', profileError.message)
      }

      // ── Step 5: Insert vehicle if driver ───────────────────────────
      if (isDriver) {
        await supabase.from('vehicles').upsert({
          user_id:         userId,
          type:            form.vehicle_type,
          fuel_type:       'petrol',
          fuel_efficiency: parseFloat(form.fuel_efficiency),
          seats:           form.vehicle_type === 'bike' ? 1 : form.vehicle_type === 'van' ? 7 : 4,
        }, { onConflict: 'user_id' })
      }

      toast.success('Account created! You can now log in.')
      navigate('/login')
    } catch (err) {
      console.error('Registration error:', err)
      const message = err?.message || 'Registration failed'
      if (message.includes('already registered') || message.includes('User already registered')) {
        toast.error('This email is already registered. Please log in instead.')
      } else if (message.includes('cnic')) {
        toast.error('This CNIC is already registered.')
      } else if (message.includes('mobile')) {
        toast.error('This mobile number is already registered.')
      } else if (message.includes('Password')) {
        toast.error('Password must be at least 6 characters.')
      } else {
        toast.error(message)
      }
    } finally {
      setLoading(false)
    }
  }

  const pwdStrength = form.password.length === 0 ? 0
    : form.password.length < 6 ? 1
    : form.password.length < 10 ? 2 : 3

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-green-glow">
            <img
              src="/logo.png"
              alt="NRFSS Logo"
              className="w-full h-full object-cover"
              style={{ objectPosition: '50% 22%', transform: 'scale(1.35)' }}
            />
          </div>
          <h1 className="text-3xl font-black text-text-primary">Create Account</h1>
          <p className="text-text-dim mt-2 text-sm">Join Pakistan's verified ride sharing network</p>
        </div>

        <form onSubmit={handleSubmit} className="glass p-8 rounded-2xl space-y-5">
          {/* Avatar Upload */}
          <div className="flex flex-col items-center gap-3 pb-2">
            <div className="relative">
              {avatarPreview ? (
                <div className="relative">
                  <img src={avatarPreview} alt="Preview" className="w-24 h-24 rounded-2xl object-cover shadow-green-glow" />
                  <button type="button" onClick={removeAvatar}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition-all">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  className="w-24 h-24 rounded-2xl border-2 border-dashed border-border hover:border-green-accent/50 bg-bg-card flex flex-col items-center justify-center gap-2 text-text-dim hover:text-green-accent transition-all group"
                >
                  <Camera className="w-6 h-6" />
                  <span className="text-xs font-medium">Photo</span>
                </button>
              )}
              {!avatarPreview && (
                <button type="button" onClick={() => avatarInputRef.current?.click()}
                  className="mt-2 text-xs text-green-accent hover:underline block text-center w-full">
                  Upload profile photo (optional)
                </button>
              )}
            </div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Row 1 */}

          <div className="grid grid-cols-2 gap-4">
            <Field id="full_name" label="Full Name" error={errors.full_name}>
              <input
                id="full_name" type="text" placeholder="Ahmed Khalid"
                className="input" value={form.full_name} onChange={set('full_name')}
              />
            </Field>
            <Field id="cnic" label="CNIC" error={errors.cnic}>
              <input
                id="cnic" type="text" placeholder="00000-0000000-0"
                className="input font-mono" value={form.cnic} onChange={set('cnic')} maxLength={15}
              />
            </Field>
          </div>

          {/* Row 2 */}
          <div className="grid grid-cols-2 gap-4">
            <Field id="mobile" label="Mobile Number" error={errors.mobile}>
              <input
                id="mobile" type="tel" placeholder="0300-1234567"
                className="input" value={form.mobile} onChange={set('mobile')}
              />
            </Field>
            <Field id="email" label="Email Address" error={errors.email}>
              <input
                id="email" type="email" placeholder="you@example.com"
                className="input" value={form.email} onChange={set('email')}
              />
            </Field>
          </div>

          {/* Row 3 */}
          <div className="grid grid-cols-2 gap-4">
            <Field id="age" label="Age" error={errors.age}>
              <input
                id="age" type="number" placeholder="25" min={18} max={70}
                className="input" value={form.age} onChange={set('age')}
              />
            </Field>
            <Field id="city" label="City" error={errors.city}>
              <select id="city" className="select" value={form.city} onChange={set('city')}>
                <option value="">Select city</option>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </Field>
          </div>

          {/* Profession */}
          <Field id="profession" label="Profession" error={errors.profession}>
            <input
              id="profession" type="text" placeholder="e.g. Software Engineer"
              className="input" value={form.profession} onChange={set('profession')}
            />
          </Field>

          {/* Vehicle Owner Toggle */}
          <div className="glass rounded-xl p-4">
            <label className="flex items-center justify-between cursor-pointer">
              <div>
                <p className="text-sm font-bold text-text-primary">I'm a Vehicle Owner / Driver</p>
                <p className="text-xs text-text-dim mt-0.5">Enable to add vehicle details</p>
              </div>
              <div
                onClick={() => setIsDriver(d => !d)}
                className={`relative w-12 h-6 rounded-full transition-all duration-300 cursor-pointer ${isDriver ? 'bg-green-accent' : 'bg-border'}`}
              >
                <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all duration-300 ${isDriver ? 'left-7' : 'left-1'}`} />
              </div>
            </label>
            {isDriver && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Field id="vehicle_type" label="Vehicle Type">
                  <select id="vehicle_type" className="select" value={form.vehicle_type} onChange={set('vehicle_type')}>
                    <option value="bike">Bike</option>
                    <option value="car">Car</option>
                    <option value="van">Van</option>
                  </select>
                </Field>
                <Field id="fuel_efficiency" label="Fuel Efficiency (km/L)">
                  <input
                    id="fuel_efficiency" type="number" placeholder="15"
                    className="input" value={form.fuel_efficiency} onChange={set('fuel_efficiency')}
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Password Row */}
          <div className="grid grid-cols-2 gap-4">
            <Field id="password" label="Password" error={errors.password}>
              <div className="relative">
                <input
                  id="password"
                  type={showPwd ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  className="input pr-11"
                  value={form.password}
                  onChange={set('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(p => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary"
                >
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {form.password && (
                <div className="mt-2 flex gap-1">
                  {[1, 2, 3].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-all ${
                        i <= pwdStrength
                          ? pwdStrength === 1 ? 'bg-red-500'
                          : pwdStrength === 2 ? 'bg-yellow-500'
                          : 'bg-green-accent'
                          : 'bg-border'
                      }`}
                    />
                  ))}
                </div>
              )}
            </Field>
            <Field id="confirmPassword" label="Confirm Password" error={errors.confirmPassword}>
              <input
                id="confirmPassword" type="password" placeholder="Repeat password"
                className="input" value={form.confirmPassword} onChange={set('confirmPassword')}
              />
            </Field>
          </div>

          {/* Terms */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox" checked={form.terms}
              onChange={set('terms')} className="mt-0.5 accent-green-500 w-4 h-4"
            />
            <span className="text-sm text-text-dim">
              I agree to the{' '}
              <Link to="/safety" className="text-green-accent hover:underline">Terms of Service</Link>
              {' '}and{' '}
              <Link to="/safety" className="text-green-accent hover:underline">Privacy Policy</Link>
            </span>
          </label>
          {errors.terms && (
            <p className="text-red-400 text-xs flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.terms}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><CheckCircle className="w-5 h-5" /> Create Account</>
            }
          </button>

          <p className="text-center text-sm text-text-dim">
            Already have an account?{' '}
            <Link to="/login" className="text-green-accent hover:underline font-semibold">Sign in</Link>
          </p>
        </form>
      </div>
    </div>
  )
}
