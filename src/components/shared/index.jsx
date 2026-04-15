// src/components/shared/EmptyState.jsx
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
          <Icon className="w-8 h-8 text-slate-300" />
        </div>
      )}
      <h3 className="font-semibold text-slate-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-slate-400 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// src/components/shared/ConfirmModal.jsx
export function ConfirmModal({ open, title, description, onConfirm, onCancel, confirmLabel = 'Confirmer', danger = false }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in">
        <h3 className="font-bold text-slate-800 text-lg mb-2">{title}</h3>
        {description && <p className="text-sm text-slate-500 mb-6">{description}</p>}
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition">
            Annuler
          </button>
          <button onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium text-white transition ${
              danger ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
