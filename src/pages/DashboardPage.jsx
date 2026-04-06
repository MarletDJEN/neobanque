import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/dashboard/Sidebar';
import MobileTabBar from '../components/dashboard/MobileTabBar';
import Overview from '../components/dashboard/Overview.jsx';
import AccountPage from '../components/dashboard/AccountPage';
import CardPage from '../components/dashboard/CardPage';
import IbanRequestPage from '../components/dashboard/IbanRequestPage';
import IbanActivationPage from '../components/dashboard/IbanActivationPage';
import TransactionsPage from '../components/dashboard/TransactionsPage.jsx';
import TransferPage from '../components/dashboard/TransferPage.jsx';
import ProfilePage from '../components/dashboard/ProfilePage.jsx';
import NotificationsPanel from '../components/dashboard/NotificationsPanel';
import { Clock, Menu, Ban, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

function PendingBanner({ suspended }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${suspended ? 'bg-red-100' : 'bg-amber-100'}`}>
        {suspended ? <Ban className="w-8 h-8 text-red-600" /> : <Clock className="w-8 h-8 text-amber-600" />}
      </div>
      <h3 className="text-[16px] font-semibold mb-2">{suspended ? 'Compte suspendu' : 'Fonctionnalité indisponible'}</h3>
      <p className="text-[13px] text-slate-500 max-w-sm">
        {suspended
          ? 'Votre compte a été désactivé. Vous ne pouvez pas utiliser cette fonctionnalité.'
          : 'Votre compte doit d&apos;abord être validé par un administrateur.'}
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const { userProfile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [activePage, setActivePage] = useState('overview');
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [card, setCard] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastAccountStatus, setLastAccountStatus] = useState(null);

  useEffect(() => {
    if (userProfile?.role === 'admin') navigate('/admin', { replace: true });
  }, [userProfile, navigate]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      const newAccount = data.account;
      
      // Détecter les changements de statut du compte
      if (lastAccountStatus && newAccount) {
        const wasInactive = !(lastAccountStatus?.status === 'active' && lastAccountStatus?.accountVerified);
        const isActiveNow = newAccount?.status === 'active' && newAccount?.accountVerified;
        
        console.log('DEBUG Changement statut compte:', {
          wasInactive,
          isActiveNow,
          lastStatus: lastAccountStatus?.status,
          newStatus: newAccount?.status,
          lastVerified: lastAccountStatus?.accountVerified,
          newVerified: newAccount?.accountVerified
        });
        
        // Notification si le compte vient d'être activé
        if (wasInactive && isActiveNow) {
          console.log('DEBUG: Envoi notification compte activé');
          toast.success('🎉 Votre compte est maintenant activé !', {
            duration: 5000,
            position: 'top-center'
          });
        }
        
        // Notification si l'IBAN vient d'être attribué
        if (!lastAccountStatus?.iban && newAccount?.iban) {
          toast.success('📋 Votre IBAN a été attribué !', {
            duration: 4000,
            position: 'top-center'
          });
        }
      }
      
      setAccount(newAccount);
      setLastAccountStatus(newAccount);
      setTransactions(data.transactions || []);
      setNotifications(data.notifications || []);
      setCard(data.card);
    } catch (error) {
      if (error.response?.status === 401) {
        // Token invalide ou expiré, rediriger vers la page de login
        navigate('/', { replace: true });
        return;
      }
      toast.error('Erreur lors du chargement des données');
      console.error('Dashboard load error:', error);
    }
  }, [navigate, lastAccountStatus]);

  useEffect(() => {
    // Charger les données au montage
    loadDashboard();
    
    // Polling simple uniquement pour les comptes en attente
    const interval = setInterval(() => {
      if (account?.status === 'pending' || account?.ibanStatus === 'pending') {
        loadDashboard();
      }
    }, 8000); // Toutes les 8 secondes
    
    // Nettoyer quand on démonte
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isPending = userProfile?.accountStatus === 'pending' || account?.status === 'pending';
  const isSuspended = userProfile?.accountStatus === 'suspended' || account?.status === 'suspended' || account?.status === 'blocked';
  const isLockedOps = isPending || isSuspended;

  const renderPage = () => {
    // Rafraîchir les données quand on navigue vers la page d'activation
    if (activePage === 'activation') {
      setTimeout(() => loadDashboard(), 100);
    }
    
    if (isLockedOps && ['transfer', 'iban', 'card'].includes(activePage)) {
      return <PendingBanner suspended={isSuspended} />;
    }
    switch (activePage) {
      case 'overview':
        return (
          <Overview
            account={account}
            card={card}
            transactions={transactions}
            notifications={notifications}
            onNavigate={setActivePage}
          />
        );
      case 'account':
        return <AccountPage account={account} />;
      case 'card':
        return <CardPage card={card} onRefresh={loadDashboard} />;
      case 'iban':
        return <IbanRequestPage account={account} onRefresh={loadDashboard} />;
      case 'iban-activation':
        return <IbanActivationPage account={account} onBack={() => setActivePage('overview')} onSuccess={loadDashboard} />;
      case 'transactions':
        return <TransactionsPage transactions={transactions} onRefresh={loadDashboard} />;
      case 'transfer':
        return <TransferPage account={account} onSuccess={loadDashboard} />;
      case 'profile':
        return <ProfilePage onSaved={loadDashboard} />;
      case 'notifications':
        return (
          <NotificationsPanel
            notifications={notifications}
            onChanged={loadDashboard}
          />
        );
      default:
        return (
          <Overview account={account} card={card} transactions={transactions} onNavigate={setActivePage} />
        );
    }
  };

  const mainMarginClass = sidebarOpen ? 'md:ml-[215px]' : 'md:ml-16';

  return (
    <div className="flex h-[100dvh] min-h-0 bg-slate-50 overflow-hidden">
      <div className="hidden md:block">
        <Sidebar
          activePage={activePage}
          onNavigate={setActivePage}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          unreadCount={unreadCount}
        />
      </div>

      <div
        className={`md:hidden fixed inset-0 z-50 transition-[visibility] duration-200 ${mobileMenuOpen ? 'visible' : 'invisible'}`}
        aria-hidden={!mobileMenuOpen}
      >
        <button
          type="button"
          className={`absolute inset-0 bg-slate-900/40 transition-opacity duration-200 ${mobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setMobileMenuOpen(false)}
          aria-label="Fermer le menu"
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 w-[min(288px,88vw)] max-w-full bg-white shadow-2xl transition-transform duration-200 ease-out ${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <Sidebar
            variant="mobile"
            onClose={() => setMobileMenuOpen(false)}
            activePage={activePage}
            onNavigate={setActivePage}
            sidebarOpen
            setSidebarOpen={setSidebarOpen}
            unreadCount={unreadCount}
          />
        </aside>
      </div>

      <main className={`flex-1 flex flex-col min-w-0 overflow-y-auto overscroll-y-contain transition-[margin] duration-300 ml-0 ${mainMarginClass} pb-[4.75rem] md:pb-0 h-full`}>
        <header className="md:hidden sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-white/90 backdrop-blur-md border-b border-slate-100/90 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 -ml-1 rounded-xl text-slate-700 hover:bg-slate-100 active:bg-slate-200 touch-manipulation"
            aria-label="Ouvrir le menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-semibold tracking-tight text-slate-900 truncate">NeoBank</p>
            <p className="text-[10px] text-slate-500 font-medium">Espace client</p>
          </div>
        </header>

        {isSuspended && (
          <div className="bg-red-50 border-b border-red-200 px-4 md:px-5 py-2.5 flex items-start gap-2.5">
            <Ban className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] md:text-[12px] text-red-900 font-medium leading-snug">
              Votre compte est <strong>suspendu ou bloqué</strong>. Contactez le support.
            </p>
          </div>
        )}
        {isPending && !isSuspended && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-5 py-2.5 md:py-2.5 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] md:text-[12px] text-amber-800 font-medium leading-snug">
              Compte en <strong>attente de validation</strong> par l&apos;administrateur.
            </p>
          </div>
        )}
        {account?.iban && !(account?.status === 'active' && account?.accountVerified) && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 md:px-5 py-2.5 flex items-center gap-2.5 overflow-hidden">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] md:text-[12px] text-blue-800 font-medium leading-snug animate-pulse">
                IBAN <strong>inactif</strong> - Veuillez compléter le processus d&apos;activation pour utiliser tous les services.
              </p>
            </div>
          </div>
        )}
        <div className="max-w-5xl mx-auto w-full px-4 py-4 md:p-5 flex-1">{renderPage()}</div>
      </main>

      <MobileTabBar
        activePage={activePage}
        onNavigate={setActivePage}
        onOpenMenu={() => setMobileMenuOpen(true)}
      />
    </div>
  );
}
