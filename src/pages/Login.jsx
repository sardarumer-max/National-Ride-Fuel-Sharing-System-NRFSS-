import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Shield, Eye, EyeOff, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [showPwd, setShowPwd] = useState(false)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [resetEmail, setResetEmail] = useState('')
  const [showReset, setShowReset] = useState(false)

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }))

  async function handleLogin(e) {
    e.preventDefault()
    if (!form.identifier || !form.password) { toast.error('Please fill all fields'); return }
    setLoading(true)
    try {
      // Supabase Auth always uses email
      const email = form.identifier.includes('@') ? form.identifier : null
      if (!email) {
        // Look up email by mobile
        const { data } = await supabase.from('users').select('email').eq('mobile', form.identifier).single()
        if (!data?.email) throw new Error('No account found with this mobile number')
        form.identifier = data.email
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: form.identifier.toLowerCase().trim(),
        password: form.password,
      })
      if (error) throw error
      toast.success('Welcome back!')
      navigate('/dashboard')
    } catch (err) {
      if (err.message?.includes('Invalid login')) toast.error('Incorrect email or password')
      else toast.error(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordReset(e) {
    e.preventDefault()
    if (!resetEmail) { toast.error('Enter your email'); return }
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/login`,
    })
    if (error) toast.error(error.message)
    else { toast.success('Password reset email sent!'); setShowReset(false) }
  }

  return (
    <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto mb-4 rounded-2xl overflow-hidden shadow-green-glow">
            <img
              src="/logo.png"
              alt="NRFSS Logo"
              className="w-full h-full object-cover"
              style={{ objectPosition: '50% 22%', transform: 'scale(1.35)' }}
            />
          </div>
          <h1 className="text-3xl font-black text-text-primary">Welcome Back</h1>
          <p className="text-text-dim mt-2 text-sm">Sign in to your NRFSS account</p>
        </div>

        <form onSubmit={handleLogin} className="glass p-8 rounded-2xl space-y-5">
          <div>
            <label className="label">Email or Mobile Number</label>
            <input
              type="text"
              placeholder="you@email.com or 0300-1234567"
              className="input"
              value={form.identifier}
              onChange={set('identifier')}
              autoFocus
            />
          </div>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="label mb-0">Password</label>
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-xs text-green-accent hover:underline"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <input
                type={showPwd ? 'text' : 'password'}
                placeholder="Your password"
                className="input pr-11"
                value={form.password}
                onChange={set('password')}
              />
              <button
                type="button"
                onClick={() => setShowPwd(!showPwd)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-primary"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full py-4 text-base">
            {loading
              ? <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <><LogIn className="w-5 h-5" /> Sign In</>
            }
          </button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-dim text-xs">OR</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button
            type="button"
            onClick={() => toast('Google sign-in requires OAuth setup in Supabase dashboard.')}
            className="btn-secondary w-full py-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="" />
            Continue with Google
          </button>

          <p className="text-center text-sm text-text-dim">
            New to NRFSS?{' '}
            <Link to="/register" className="text-green-accent hover:underline font-semibold">Create account</Link>
          </p>
        </form>

        {/* Forgot Password Modal */}
        {showReset && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass rounded-2xl p-8 w-full max-w-sm">
              <h3 className="text-lg font-bold text-text-primary mb-2">Reset Password</h3>
              <p className="text-text-dim text-sm mb-5">Enter your email and we'll send you a reset link.</p>
              <form onSubmit={handlePasswordReset} className="space-y-4">
                <input
                  type="email"
                  placeholder="your@email.com"
                  className="input"
                  value={resetEmail}
                  onChange={e => setResetEmail(e.target.value)}
                  autoFocus
                />
                <div className="flex gap-3">
                  <button type="button" onClick={() => setShowReset(false)} className="btn-secondary flex-1 py-3">Cancel</button>
                  <button type="submit" className="btn-primary flex-1 py-3">Send Reset Link</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
