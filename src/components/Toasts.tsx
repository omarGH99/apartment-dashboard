import { CheckCircle2, CircleAlert, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function Toasts() {
  const { toasts, dismissToast } = useApp();
  return (
    <div className="toast-wrap" aria-live="polite" role="status">
      {toasts.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' ? (
            <CheckCircle2 aria-hidden="true" />
          ) : (
            <CircleAlert aria-hidden="true" />
          )}
          {t.msg}
          <button onClick={() => dismissToast(t.id)} aria-label="Dismiss notification">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
