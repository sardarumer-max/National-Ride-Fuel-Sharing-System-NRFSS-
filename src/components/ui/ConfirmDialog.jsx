import { AlertTriangle, X } from 'lucide-react'

/**
 * Reusable confirmation dialog
 * Usage: <ConfirmDialog open={bool} onConfirm={fn} onCancel={fn} title="..." message="..." danger />
 */
export default function ConfirmDialog({ open, onConfirm, onCancel, title = 'Confirm', message = 'Are you sure?', confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, loading = false }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="glass rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-start gap-4 mb-5">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${danger ? 'bg-red-500/15' : 'bg-yellow-500/15'}`}>
            <AlertTriangle className={`w-5 h-5 ${danger ? 'text-red-400' : 'text-yellow-400'}`} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-bold text-text-primary">{title}</h3>
            <p className="text-sm text-text-dim mt-1 leading-relaxed">{message}</p>
          </div>
          <button onClick={onCancel} className="btn-ghost p-1.5 -mt-1 -mr-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} disabled={loading} className="btn-secondary flex-1 py-2.5 text-sm">
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
              danger
                ? 'bg-red-600/80 hover:bg-red-600 text-white disabled:opacity-50'
                : 'btn-primary'
            }`}
          >
            {loading
              ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              : confirmLabel
            }
          </button>
        </div>
      </div>
    </div>
  )
}
