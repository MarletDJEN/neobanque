// src/components/shared/Badge.jsx

const colorMap = {
  green:  'bg-green-100 text-green-700 border-green-200',
  red:    'bg-red-100 text-red-600 border-red-200',
  amber:  'bg-amber-100 text-amber-700 border-amber-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
  slate:  'bg-slate-100 text-slate-600 border-slate-200',
};

export function Badge({ color = 'slate', children, className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${colorMap[color] || colorMap.slate} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }) {
  const config = {
    active:    { color: 'green',  label: 'Actif' },
    pending:   { color: 'amber',  label: 'En attente' },
    approved:  { color: 'green',  label: 'Approuvé' },
    rejected:  { color: 'red',    label: 'Rejeté' },
    blocked:   { color: 'red',    label: 'Bloqué' },
    submitted: { color: 'blue',   label: 'Soumis' },
    none:      { color: 'slate',  label: 'Non demandé' },
    inactive:  { color: 'slate',  label: 'Inactif' },
  };
  const { color, label } = config[status] || config.none;
  return <Badge color={color}>{label}</Badge>;
}
