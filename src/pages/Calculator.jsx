import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Calculator as CalcIcon, ChevronRight, RotateCcw, ArrowRight } from 'lucide-react'
import { calcFuelCost, FUEL_PRICES, formatPKR } from '../lib/fuelCalc'
import toast from 'react-hot-toast'

const STEPS = ['Inputs', 'Passengers', 'Results']

export default function Calculator() {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    distance: '', efficiency: '15', fuelType: 'petrol', price: '295', passengers: 2
  })
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('nrfss_calc_history') || '[]') } catch { return [] }
  })

  const set = (k) => (e) => {
    const v = e.target?.value ?? e
    setForm(f => ({
      ...f,
      [k]: v,
      ...(k === 'fuelType' ? { price: String(FUEL_PRICES[v] || 295) } : {})
    }))
  }

  const result = calcFuelCost(parseFloat(form.distance), parseFloat(form.efficiency), parseFloat(form.price), form.passengers)

  function handleNext() {
    if (step === 0 && (!form.distance || !form.efficiency || !form.price)) {
      toast.error('Fill all fields in Step 1'); return
    }
    setStep(s => Math.min(s + 1, 2))
  }

  function handleReset() {
    setForm({ distance: '', efficiency: '15', fuelType: 'petrol', price: '295', passengers: 2 })
    setStep(0)
  }

  function saveToHistory() {
    if (!result) return
    const entry = { ...form, ...result, date: new Date().toLocaleDateString() }
    const next = [entry, ...history].slice(0, 5)
    setHistory(next)
    localStorage.setItem('nrfss_calc_history', JSON.stringify(next))
    toast.success('Saved to history!')
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="page-title flex items-center gap-3">
          <CalcIcon className="w-8 h-8 text-green-accent" /> Fuel Cost Calculator
        </h1>
        <p className="page-subtitle">Calculate and split fuel costs before posting a ride</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 flex-1">
            <button
              onClick={() => i < step && setStep(i)}
              className={`w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center border-2 transition-all
                ${i === step ? 'bg-green-accent border-green-accent text-bg-primary'
                  : i < step ? 'bg-green-accent/20 border-green-accent text-green-accent'
                  : 'border-border text-text-dim'}`}
            >
              {i < step ? '✓' : i + 1}
            </button>
            <span className={`text-sm font-semibold ${i === step ? 'text-text-primary' : 'text-text-dim'}`}>{label}</span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px ${i < step ? 'bg-green-accent' : 'bg-border'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl p-8">
        {/* Step 1 */}
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label className="label">Total Distance (km) *</label>
              <input type="number" placeholder="e.g. 45" className="input" value={form.distance} onChange={set('distance')} autoFocus />
            </div>
            <div>
              <label className="label">Fuel Type</label>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(FUEL_PRICES).map(([type, price]) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => set('fuelType')(type)}
                    className={`p-3 rounded-xl border text-sm font-semibold transition-all
                      ${form.fuelType === type ? 'bg-green-accent/20 border-green-accent text-green-accent' : 'border-border text-text-dim hover:border-border-light'}`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                    <div className="text-xs mt-1 opacity-70">PKR {price}/L</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Fuel Efficiency (km/L)</label>
                <input type="number" placeholder="15" className="input" value={form.efficiency} onChange={set('efficiency')} />
              </div>
              <div>
                <label className="label">Fuel Price (PKR/L)</label>
                <input type="number" className="input" value={form.price} onChange={set('price')} />
              </div>
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label className="label text-base">Number of Passengers (excluding driver)</label>
              <p className="text-text-dim text-sm mb-6">Drag slider or use buttons to select passengers</p>
              <div className="text-center mb-6">
                <span className="text-7xl font-black gradient-text">{form.passengers}</span>
                <span className="text-text-dim text-xl ml-2">passenger{form.passengers !== 1 ? 's' : ''}</span>
              </div>
              <input
                type="range" min={1} max={6} value={form.passengers}
                onChange={e => set('passengers')(parseInt(e.target.value))}
                className="w-full accent-green-500 cursor-pointer"
                style={{ height: '6px' }}
              />
              <div className="flex justify-between text-xs text-text-dim mt-2">
                {[1,2,3,4,5,6].map(n => <span key={n}>{n}</span>)}
              </div>
            </div>
            <div className="p-4 glass rounded-xl border border-green-accent/20">
              <p className="text-text-dim text-sm mb-2">Cost splitting among:</p>
              <div className="flex flex-wrap gap-2">
                {['Driver', ...Array.from({ length: form.passengers }, (_, i) => `Passenger ${i + 1}`)].map(p => (
                  <span key={p} className="badge-green">{p}</span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Results */}
        {step === 2 && result && (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Total Fuel Cost', value: formatPKR(result.totalCost), sub: `${result.liters}L consumed` },
                { label: 'Per Passenger', value: formatPKR(result.costPerPassenger), sub: `Split ${result.people} ways`, highlight: true },
                { label: 'Fuel Consumed', value: `${result.liters}L`, sub: `${form.distance}km @ ${form.efficiency}km/L` },
              ].map(({ label, value, sub, highlight }) => (
                <div key={label} className={`rounded-xl p-4 text-center border ${highlight ? 'bg-green-accent/10 border-green-accent/30' : 'glass border-border'}`}>
                  <div className={`text-2xl font-black ${highlight ? 'text-green-accent' : 'text-text-primary'}`}>{value}</div>
                  <div className="text-xs font-bold text-text-dim mt-1 uppercase tracking-wide">{label}</div>
                  <div className="text-xs text-text-dim/60 mt-0.5">{sub}</div>
                </div>
              ))}
            </div>

            <div className="glass rounded-xl p-4 text-sm text-text-dim space-y-1.5">
              {[
                ['Distance', `${form.distance} km`],
                ['Fuel Type', form.fuelType],
                ['Fuel Price', `PKR ${form.price}/L`],
                ['Efficiency', `${form.efficiency} km/L`],
                ['People', `${result.people} (driver + ${form.passengers})`],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span>{k}</span><span className="text-text-primary font-semibold">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button onClick={saveToHistory} className="btn-secondary flex-1 py-3 text-sm">Save to History</button>
              <Link to="/post-ride" className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2">
                <ArrowRight className="w-4 h-4" /> Use for Ride Post
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)} className="btn-secondary py-3 px-6">Back</button>
          )}
          {step < 2 && (
            <button onClick={handleNext} className="btn-primary flex-1 py-3">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
          {step === 2 && (
            <button onClick={handleReset} className="btn-ghost flex-1 py-3">
              <RotateCcw className="w-4 h-4" /> New Calculation
            </button>
          )}
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Calculation History</h2>
          <div className="space-y-3">
            {history.map((entry, i) => (
              <div key={i} className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-text-primary">{entry.date} · {entry.distance}km · {entry.passengers} passengers</div>
                  <div className="text-xs text-text-dim mt-0.5">{entry.fuelType} · {entry.efficiency}km/L</div>
                </div>
                <div className="text-right">
                  <div className="text-green-accent font-black">{formatPKR(entry.costPerPassenger)}</div>
                  <div className="text-xs text-text-dim">per person</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
