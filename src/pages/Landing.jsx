import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  Shield, Car, Search, CheckCircle, Zap, MapPin,
  Users, TrendingDown, Star, ArrowRight, ChevronRight,
  Globe, Mail, Phone, MessageCircle
} from 'lucide-react'

const STATS = [
  { label: 'Verified Users', target: 12000, suffix: '+' },
  { label: 'Rides Matched', target: 8500, suffix: '+' },
  { label: 'Cities Covered', target: 24, suffix: '' },
  { label: 'Fuel Saved (L)', target: 95000, suffix: '+' },
]

const FEATURES = [
  {
    icon: MapPin,
    title: 'Smart Route Matching',
    desc: 'Our algorithm finds riders going the same way as you with up to 95% route overlap. Zero wasted detours.',
  },
  {
    icon: Zap,
    title: 'Instant Fuel Splitting',
    desc: 'Fuel costs are calculated automatically using current Pakistani fuel prices and split evenly among all passengers.',
  },
  {
    icon: Shield,
    title: 'CNIC Verified Profiles',
    desc: 'Every user is manually reviewed by our admin team using their Pakistani CNIC before they can post or join any ride.',
  },
  {
    icon: TrendingDown,
    title: 'Ride History & Analytics',
    desc: 'Track every trip, monitor your savings, and build a trusted rating — all stored permanently and securely.',
  },
]

const TESTIMONIALS = [
  { name: 'Ahmed K.', city: 'Lahore', profession: 'Software Engineer', rating: 5, text: 'I save PKR 8,000 every month commuting from DHA to Gulberg. This app changed everything.' },
  { name: 'Sana M.', city: 'Islamabad', profession: 'Bank Officer', rating: 5, text: 'The CNIC verification gives me peace of mind. I know everyone in my car is verified and safe.' },
  { name: 'Bilal A.', city: 'Karachi', profession: 'Doctor', rating: 5, text: 'Route matching is incredibly accurate. Found a co-rider on day 1. Couldn\'t be easier.' },
]

function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      setCount(Math.floor(progress * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target, duration, start])
  return count
}

function StatCounter({ label, target, suffix }) {
  const [started, setStarted] = useState(false)
  const ref = useRef()
  const count = useCounter(target, 2000, started)

  useEffect(() => {
    const observer = new IntersectionObserver(([e]) => e.isIntersecting && setStarted(true), { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className="text-center">
      <div className="text-4xl lg:text-5xl font-black gradient-text counter">
        {count.toLocaleString()}{suffix}
      </div>
      <div className="text-text-dim text-sm mt-2 font-medium">{label}</div>
    </div>
  )
}

export default function Landing() {
  return (
    <div className="bg-bg-primary overflow-hidden">
      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4 overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-accent/5 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-green-deep/8 rounded-full blur-[100px] animate-float" style={{animationDelay:'1.5s'}} />
          <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#22c55e" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto text-center">
          {/* Logo image above headline */}
          <div className="flex justify-center mb-6">
            <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-green-glow-lg">
              <img
                src="/logo.png"
                alt="NRFSS Logo"
                className="w-full h-full object-cover"
                style={{ objectPosition: '50% 22%', transform: 'scale(1.35)' }}
              />
            </div>
          </div>

          {/* Pill badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 border-green-accent/30">
            <span className="w-2 h-2 bg-green-accent rounded-full animate-glow" />
            <span className="text-green-accent text-sm font-semibold">Pakistan's First Verified Ride Sharing Platform</span>
          </div>

          <h1 className="text-5xl lg:text-7xl font-black text-text-primary leading-[1.05] mb-6 text-balance">
            Commute Smarter.{' '}
            <span className="gradient-text">Split Costs.</span>
            <br />Ride Together.
          </h1>
          <p className="text-text-dim text-lg lg:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            Pakistan's first coordinated fuel-sharing platform. Connect with verified commuters on your route,
            cut costs by up to 75%, and help reduce traffic congestion.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link to="/register" className="btn-primary text-base px-8 py-4 shadow-green-glow-lg">
              <Car className="w-5 h-5" /> Post a Ride
            </Link>
            <Link to="/find-ride" className="btn-secondary text-base px-8 py-4">
              <Search className="w-5 h-5" /> Find a Ride
            </Link>
          </div>

          {/* Pill Stats */}
          <div className="flex flex-wrap justify-center gap-3">
            {['12,000+ Verified Users', '8,500+ Rides Matched', '35% Average Cost Saved'].map(s => (
              <div key={s} className="glass px-5 py-2 rounded-full text-sm text-text-dim border-green-accent/20">
                <span className="text-green-accent font-bold">{s.split(' ')[0]}</span>{' '}{s.split(' ').slice(1).join(' ')}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Animated Counter Strip */}
      <section className="border-y border-border bg-bg-secondary py-16">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {STATS.map(s => <StatCounter key={s.label} {...s} />)}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow"><CheckCircle className="w-4 h-4" /> How It Works</div>
            <h2 className="text-4xl font-black text-text-primary">Three Steps to Smarter Commuting</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', icon: Shield, title: 'Register & Verify', desc: 'Sign up with your CNIC. Our admin team manually verifies every account before you access the platform.' },
              { n: '02', icon: Car,    title: 'Post or Find a Ride', desc: 'Post your daily route or search for verified drivers going your way. Our algorithm finds the best matches.' },
              { n: '03', icon: Zap,    title: 'Split Costs Automatically', desc: 'Fuel costs are calculated instantly using live PKR prices and split fairly among all passengers.' },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="glass-hover p-8 rounded-2xl group">
                <div className="text-5xl font-black gradient-text mb-6 opacity-30 group-hover:opacity-100 transition-opacity">{n}</div>
                <div className="w-12 h-12 rounded-xl bg-green-accent/10 border border-green-accent/20 flex items-center justify-center text-green-accent mb-5">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-text-primary mb-3">{title}</h3>
                <p className="text-text-dim text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4 bg-bg-secondary border-y border-border">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow"><Zap className="w-4 h-4" /> Features</div>
            <h2 className="text-4xl font-black text-text-primary">Everything You Need to Commute Smarter</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="glass-hover p-6 rounded-xl flex gap-5">
                <div className="w-12 h-12 rounded-xl bg-green-gradient flex items-center justify-center text-white flex-shrink-0 shadow-green-glow">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary mb-2">{title}</h3>
                  <p className="text-text-dim text-sm leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <div className="section-eyebrow"><Star className="w-4 h-4" /> Testimonials</div>
            <h2 className="text-4xl font-black text-text-primary">Trusted by Pakistani Commuters</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(({ name, city, profession, rating, text }) => (
              <div key={name} className="glass-hover p-6 rounded-xl">
                <div className="flex text-yellow-400 mb-4">
                  {Array.from({ length: rating }).map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400" />)}
                </div>
                <p className="text-text-dim text-sm leading-relaxed mb-5 italic">"{text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-green-gradient flex items-center justify-center text-white text-sm font-bold">
                    {name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-text-primary">{name}</div>
                    <div className="text-xs text-text-dim">{profession} · {city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-20 px-4 bg-green-gradient">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Ready to Commute Smarter?</h2>
          <p className="text-white/80 mb-8 text-lg">Join 12,000+ verified commuters saving money every day across Pakistan.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/register" className="bg-white text-green-deep font-black px-8 py-4 rounded-xl hover:shadow-2xl transition-all hover:scale-105 flex items-center gap-2 justify-center">
              <Users className="w-5 h-5" /> Register Free
            </Link>
            <Link to="/safety" className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all flex items-center gap-2 justify-center">
              <Shield className="w-5 h-5" /> Learn About Safety
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-bg-secondary border-t border-border py-12 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src="/logo.png"
                    alt="NRFSS"
                    className="w-full h-full object-cover"
                    style={{ objectPosition: '50% 20%', transform: 'scale(1.4)' }}
                  />
                </div>
                <span className="text-lg font-black">NR<span className="text-green-accent">FSS</span></span>
              </div>
              <p className="text-text-dim text-sm leading-relaxed mb-4">
                Pakistan's first coordinated ride and fuel sharing platform. Safe, verified, affordable.
              </p>
              <div className="flex gap-3">
                {[Globe, Mail, Phone, MessageCircle].map((Icon, i) => (
                  <button key={i} className="w-8 h-8 rounded-lg glass flex items-center justify-center text-text-dim hover:text-green-accent hover:border-green-accent/30 transition-all">
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Quick Links</h4>
              <div className="space-y-2">
                {[['/', 'Home'], ['/register', 'Register'], ['/find-ride', 'Find a Ride'], ['/safety', 'Safety Policy']].map(([to, label]) => (
                  <Link key={to} to={to} className="block text-sm text-text-dim hover:text-green-accent transition-colors">{label}</Link>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-text-dim">
                <p>support@nrfss.pk</p>
                <p>+92-51-111-NRFSS</p>
                <p>Islamabad, Pakistan</p>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-6 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-text-dim text-xs">© 2025 NRFSS. All rights reserved.</p>
            <p className="text-text-dim text-xs">Made for Pakistan's commuters</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
