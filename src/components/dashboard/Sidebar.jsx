import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  LayoutDashboard, Activity, CreditCard, ArrowLeftRight,
  Globe, User, Bell, LogOut, Shield, ChevronLeft, ChevronRight,
  Building2, Wallet, Zap
} from 'lucide-react';

const navItems = [
  { section: 'Principal' },
  { id: 'overview',      label: 'Dashboard',       icon: LayoutDashboard },
  { id: 'transactions',  label: 'Transactions',    icon: Activity },
  { id: 'card',          label: 'Ma carte',        icon: CreditCard },
  { id: 'transfer',      label: 'Virements',       icon: ArrowLeftRight },
  { section: 'Compte' },
  { id: 'account',       label: 'Mon compte',      icon: Wallet },
  { id: 'iban',          label: 'IBAN / BIC',      icon: Globe },
  { id: 'iban-activation', label: 'Activation IBAN', icon: Zap },
  { id: 'profile',       label: 'Mon profil',      icon: User },
  { id: 'notifications', label: 'Notifications',   icon: Bell, badge: true },
];

export default function Sidebar({ activePage, onNavigate, sidebarOpen, setSidebarOpen, unreadCount, variant = 'desktop', onClose }) {
  const { user, userProfile, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const isMobile = variant === 'mobile';
  const expanded = isMobile || sidebarOpen;

  const go = (id) => {
    onNavigate(id);
    if (isMobile) onClose?.();
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Déconnexion réussie');
    onClose?.();
    navigate('/');
  };

  const initials = userProfile
    ? `${userProfile.firstName?.[0] || ''}${userProfile.lastName?.[0] || ''}`.toUpperCase()
    : (user?.email?.[0] || 'U').toUpperCase();

  return (
    <aside className={`h-full bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ${isMobile ? 'w-full' : 'fixed left-0 top-0 z-30'} ${!isMobile && (sidebarOpen ? 'w-[215px]' : 'w-16')}`}>
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-5 border-b border-slate-50 ${!isMobile && !sidebarOpen ? 'relative' : ''}`}>
        <div className="w-8 h-8 bg-teal-700 rounded-lg flex items-center justify-center flex-shrink-0">
          <Building2 className="w-4 h-4 text-white" />
        </div>
        {expanded && (
          <>
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold tracking-tight leading-none">NeoBank</div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">v2.0</div>
            </div>
            {isMobile ? (
              <button type="button" onClick={onClose} className="p-2 -mr-1 rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Fermer le menu">
                <ChevronLeft className="w-5 h-5" />
              </button>
            ) : (
              <button type="button" onClick={() => setSidebarOpen(false)} className="text-slate-300 hover:text-slate-500">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
          </>
        )}
        {!expanded && !isMobile && (
          <button type="button" onClick={() => setSidebarOpen(true)} className="absolute right-0 translate-x-1/2 top-5 bg-white border border-slate-200 rounded-full p-0.5 text-slate-400 hover:text-slate-600">
            <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto space-y-0.5">
        {navItems.map((item, i) => {
          if (item.section) {
            if (!expanded) return null;
            return (
              <div key={i} className="text-[9.5px] font-mono text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">
                {item.section}
              </div>
            );
          }
          const Icon = item.icon;
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.id)}
              title={!expanded ? item.label : undefined}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg transition-all text-[12.5px] relative touch-manipulation min-h-[44px] md:min-h-0 ${
                active
                  ? 'bg-teal-50 text-teal-800 font-medium'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100'
              }`}
            >
              <Icon className="w-[15px] h-[15px] flex-shrink-0" />
              {expanded && <span className="flex-1 text-left">{item.label}</span>}
              {item.badge && unreadCount > 0 && (
                <span className={`${expanded ? '' : 'absolute top-1 right-1'} bg-red-500 text-white text-[9px] font-mono rounded-full min-w-[1rem] h-4 px-1 flex items-center justify-center`}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {isAdmin && (
          <>
            {expanded && <div className="text-[9.5px] font-mono text-slate-400 uppercase tracking-widest px-3 pt-3 pb-1">Admin</div>}
            <button
              type="button"
              onClick={() => { navigate('/admin'); onClose?.(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 md:py-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-all text-[12.5px] touch-manipulation min-h-[44px] md:min-h-0"
            >
              <Shield className="w-[15px] h-[15px] flex-shrink-0" />
              {expanded && <span>Espace Admin</span>}
            </button>
          </>
        )}
      </nav>

      {/* User block */}
      <div className="border-t border-slate-100 p-3 mt-auto">
        <div className={`flex items-center gap-2.5 ${!expanded && !isMobile ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-full bg-teal-50 flex items-center justify-center text-[11px] font-semibold text-teal-700 flex-shrink-0">
            {userProfile?.photoURL
              ? <img src={userProfile.photoURL} alt="" className="w-8 h-8 rounded-full object-cover" />
              : initials}
          </div>
          {expanded && (
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium truncate">{userProfile?.displayName || user?.email}</div>
              <div className="text-[10.5px] text-slate-400 truncate">Compte Standard</div>
            </div>
          )}
          <button type="button" onClick={handleLogout} title="Déconnexion" className="p-2 text-slate-300 hover:text-red-400 transition flex-shrink-0 rounded-lg hover:bg-red-50 touch-manipulation">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
