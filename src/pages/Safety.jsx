import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Shield, CheckCircle, FileText, Flag, ChevronDown, ChevronUp } from 'lucide-react'

const FAQS = [
  {
    q: 'How is identity verified?',
    a: 'Every user submits their CNIC (Computerized National Identity Card) number during registration. Our admin team manually cross-checks all submissions and approves accounts within 24 hours. No account can post or join rides until verified.',
  },
  {
    q: 'What if a driver or passenger cancels last minute?',
    a: 'The system automatically notifies all affected parties via in-app notifications. You can immediately search for alternative rides. We track cancellation patterns — repeated cancellations result in account suspension.',
  },
  {
    q: 'How are disputes between riders handled?',
    a: 'Contact our support team via email within 48 hours of a trip. We review ride logs, chat history, and both parties\' accounts. Decisions are made within 72 hours and enforced through our admin panel.',
  },
  {
    q: 'Is my CNIC data safe?',
    a: 'CNIC numbers are stored encrypted in our Supabase PostgreSQL database with Row Level Security enabled. We never display full CNICs publicly — only partially masked versions are shown. Data is never shared with third parties.',
  },
  {
    q: 'Can I share rides with strangers?',
    a: 'Yes, but all strangers on NRFSS are verified. You can view their ratings, profession, and ride history before accepting or requesting a ride. You can also filter by "Verified Only" when searching.',
  },
]

export default function Safety() {
  const [openFaq, setOpenFaq] = useState(null)

  return (
    <div className="bg-bg-primary">
      {/* Hero */}
      <section className="py-24 px-4 text-center relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-green-accent/[0.03] rounded-full blur-[120px]" />
        </div>
        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="w-24 h-24 bg-green-gradient rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-green-glow-lg animate-float">
            <Shield className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-5xl font-black text-text-primary mb-4">Your Safety is Our Priority</h1>
          <p className="text-text-dim text-lg leading-relaxed max-w-2xl mx-auto">
            NRFSS is built on trust. Every user is verified, every ride is logged, and every issue is handled promptly.
            Here's how we keep you safe.
          </p>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="py-16 px-4 bg-bg-secondary border-y border-border">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          {[
            {
              icon: CheckCircle,
              title: 'Identity Verification',
              points: ['CNIC number required on registration', 'Manual admin review of every account', 'Age verification (18–70 only)', 'No anonymous riders or drivers'],
            },
            {
              icon: FileText,
              title: 'Ride Logs & Records',
              points: ['Every trip stored permanently in Supabase', 'Origin, destination, time all logged', 'Passenger manifests for every ride', 'Immutable audit trail for disputes'],
            },
            {
              icon: Flag,
              title: 'Report & Response System',
              points: ['Report any driver or passenger in one tap', 'Admin review within 24 hours', 'Suspension for repeated violations', 'Anonymous reporting option available'],
            },
          ].map(({ icon: Icon, title, points }) => (
            <div key={title} className="glass-hover p-6 rounded-xl">
              <div className="w-12 h-12 rounded-xl bg-green-accent/10 border border-green-accent/20 flex items-center justify-center text-green-accent mb-5">
                <Icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-text-primary mb-4">{title}</h3>
              <ul className="space-y-2">
                {points.map(p => (
                  <li key={p} className="flex items-start gap-2 text-sm text-text-dim">
                    <CheckCircle className="w-3.5 h-3.5 text-green-accent mt-0.5 flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Verification Timeline */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <div className="section-eyebrow"><Shield className="w-4 h-4" /> Verification Process</div>
            <h2 className="text-3xl font-black text-text-primary">How We Verify Every Account</h2>
          </div>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-px bg-border" />
            {[
              { step: '01', title: 'Register with CNIC', desc: 'Provide your full name, CNIC, mobile, and profession during sign-up.' },
              { step: '02', title: 'Email Confirmation', desc: 'Verify your email address via a confirmation link sent by Supabase Auth.' },
              { step: '03', title: 'Admin Review', desc: 'Our admin team manually reviews your CNIC and details within 24 hours.' },
              { step: '04', title: 'Account Activated', desc: 'Once verified, you receive a notification and can immediately post or join rides.' },
            ].map(({ step, title, desc }, i) => (
              <div key={step} className="relative flex gap-6 pb-10 last:pb-0">
                <div className="relative z-10 flex-shrink-0">
                  <div className="w-12 h-12 rounded-xl bg-bg-secondary border border-green-accent flex items-center justify-center">
                    <span className="text-sm font-black text-green-accent">{step}</span>
                  </div>
                </div>
                <div className="pt-2 pb-4">
                  <h3 className="font-bold text-text-primary mb-1">{title}</h3>
                  <p className="text-text-dim text-sm">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-4 bg-bg-secondary border-t border-border">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <div className="section-eyebrow">FAQs</div>
            <h2 className="text-3xl font-black text-text-primary">Frequently Asked Questions</h2>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq, i) => (
              <div key={i} className={`glass rounded-xl overflow-hidden transition-all duration-300 ${openFaq === i ? 'border-green-accent/30' : ''}`}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left group"
                >
                  <span className={`font-semibold text-sm transition-colors ${openFaq === i ? 'text-green-accent' : 'text-text-primary group-hover:text-green-accent'}`}>
                    {faq.q}
                  </span>
                  {openFaq === i
                    ? <ChevronUp className="w-4 h-4 text-green-accent flex-shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-text-dim flex-shrink-0" />
                  }
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5">
                    <p className="text-text-dim text-sm leading-relaxed">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto glass rounded-2xl p-10 text-center border-green-accent/20">
          <Shield className="w-10 h-10 text-green-accent mx-auto mb-4" />
          <h2 className="text-3xl font-black text-text-primary mb-3">Trust the Process. Join NRFSS Today.</h2>
          <p className="text-text-dim mb-6">Join Pakistan's most trusted ride sharing community.</p>
          <Link to="/register" className="btn-primary py-4 px-8 text-base inline-flex shadow-green-glow-lg">
            <CheckCircle className="w-5 h-5" /> Get Verified & Start Riding
          </Link>
        </div>
      </section>
    </div>
  )
}
