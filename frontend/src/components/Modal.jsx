import { useEffect, useRef } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Modal — reusable confirmation / info dialog
 *
 * Props:
 *   open        boolean
 *   onClose     () => void
 *   onConfirm   () => void   (optional — omit for info-only modals)
 *   title       string
 *   message     string | ReactNode
 *   confirmText string       default "Confirm"
 *   cancelText  string       default "Cancel"
 *   variant     'danger' | 'warning' | 'info'  default 'danger'
 *   loading     boolean
 */
const variantMap = {
  danger:  { btn: 'bg-red-600 hover:bg-red-500 text-white',    icon: '⚠️' },
  warning: { btn: 'bg-amber-600 hover:bg-amber-500 text-white', icon: '⚡' },
  info:    { btn: 'bg-primary-600 hover:bg-primary-500 text-white', icon: 'ℹ️' },
};

const Modal = ({
  open,
  onClose,
  onConfirm,
  title       = 'Confirm action',
  message     = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  variant     = 'danger',
  loading     = false,
}) => {
  const overlayRef = useRef(null);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const { btn, icon } = variantMap[variant] ?? variantMap.danger;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-surface-card border border-surface-border rounded-2xl shadow-2xl p-6 space-y-5 animate-fade-in-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{icon}</span>
            <h3 className="text-base font-semibold text-slate-100">{title}</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-1 rounded-lg text-slate-500 hover:text-slate-300">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="text-sm text-slate-400 leading-relaxed pl-9">{message}</div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button onClick={onClose} disabled={loading} className="btn-secondary">
            {cancelText}
          </button>
          {onConfirm && (
            <button onClick={onConfirm} disabled={loading} className={`btn ${btn}`}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing…
                </span>
              ) : confirmText}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
