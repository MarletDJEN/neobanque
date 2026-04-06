import { LayoutDashboard, Activity, ArrowLeftRight, CreditCard, Menu } from 'lucide-react';

const tabs = [
  { id: 'overview', label: 'Accueil', icon: LayoutDashboard },
  { id: 'transactions', label: 'Mouv.', icon: Activity },
  { id: 'transfer', label: 'Virement', icon: ArrowLeftRight },
  { id: 'card', label: 'Carte', icon: CreditCard },
];

export default function MobileTabBar({ activePage, onNavigate, onOpenMenu }) {
  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/80 shadow-[0_-4px_24px_-4px_rgba(15,23,42,0.08)]"
      style={{ paddingBottom: 'max(0.35rem, env(safe-area-inset-bottom))' }}
      aria-label="Navigation principale"
    >
      <div className="flex items-stretch justify-around max-w-lg mx-auto px-1 pt-1">
        {tabs.map(({ id, label, icon: Icon }) => {
          const active = activePage === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onNavigate(id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl touch-manipulation transition-colors ${
                active ? 'text-teal-700' : 'text-slate-400 active:text-slate-600'
              }`}
            >
              <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : ''}`} strokeWidth={active ? 2.5 : 2} />
              <span className={`text-[9px] font-medium truncate max-w-full leading-tight ${active ? 'text-teal-800' : ''}`}>{label}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className={`flex flex-col items-center justify-center gap-0.5 flex-1 min-w-0 py-2 px-1 rounded-xl touch-manipulation transition-colors ${
            ['account', 'iban', 'profile', 'notifications'].includes(activePage) ? 'text-teal-700' : 'text-slate-400 active:text-slate-600'
          }`}
        >
          <Menu className="w-5 h-5" strokeWidth={2} />
          <span className="text-[9px] font-medium leading-tight">Plus</span>
        </button>
      </div>
    </nav>
  );
}
