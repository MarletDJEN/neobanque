import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSSE } from '../services/sse';
import Sidebar from '../components/dashboard/Sidebar';
import MobileTabBar from '../components/dashboard/MobileTabBar';
import Overview from '../components/dashboard/Overview.jsx';
import AccountPage from '../components/dashboard/AccountPage';
import CardPage from '../components/dashboard/CardPage';
import IbanRequestPage from '../components/dashboard/IbanRequestPage';
import IbanActivationPage from '../components/dashboard/IbanActivationPage';
import ActivationRequestPage from '../components/dashboard/ActivationRequestPage';
import TransactionsPage from '../components/dashboard/TransactionsPage.jsx';
import TransferPage from '../components/dashboard/TransferPage.jsx';
import ProfilePage from '../components/dashboard/ProfilePage.jsx';
import NotificationsPanel from '../components/dashboard/NotificationsPanel';
import WithdrawalCodePage from '../components/dashboard/WithdrawalCodePage';
import WithdrawalProgressPage from '../components/dashboard/WithdrawalProgressPage';
import { Clock, Menu, Ban, AlertCircle, Key, RefreshCw } from 'lucide-react';
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
  const { isConnected } = useSSE();
  const [activePage, setActivePage] = useState('overview');
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [card, setCard] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [lastAccountStatus, setLastAccountStatus] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDashboard();
      toast.success('Données actualisées !', { duration: 2000 });
    } catch (error) {
      toast.error('Erreur lors de l\'actualisation');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (userProfile?.role === 'admin') navigate('/admin', { replace: true });
  }, [userProfile, navigate]);

  const loadDashboard = useCallback(async () => {
    try {
      const { data } = await api.get('/me');
      const newAccount = data.account;
      
      // Détecter les changements de statut du compte
      if (lastAccountStatus && newAccount) {
        const wasInactive = !(lastAccountStatus?.status === 'active' && lastAccountStatus?.accountVerified && lastAccountStatus?.ibanStatus === 'active');
        const isActiveNow = newAccount?.status === 'active' && newAccount?.accountVerified && newAccount?.ibanStatus === 'active';
        
        console.log('DEBUG Changement statut compte:', {
          wasInactive,
          isActiveNow,
          lastStatus: lastAccountStatus?.status,
          newStatus: newAccount?.status,
          lastVerified: lastAccountStatus?.accountVerified,
          newVerified: newAccount?.accountVerified,
          lastIbanStatus: lastAccountStatus?.ibanStatus,
          newIbanStatus: newAccount?.ibanStatus
        });
        
        // Notification si le compte vient d'être pleinement activé
        if (wasInactive && isActiveNow) {
          console.log('DEBUG: Envoi notification compte activé');
          toast.success('Félicitations ! Votre compte et votre IBAN sont maintenant activés !', {
            duration: 6000,
            position: 'top-center',
            icon: 'success'
          });
          
          // Rediriger automatiquement vers overview pour voir les changements
          setTimeout(() => setActivePage('overview'), 1000);
        }
        
        // Notification si l'IBAN vient d'être attribué
        if (!lastAccountStatus?.iban && newAccount?.iban) {
          toast.success('IBAN attribué ! Vous pouvez maintenant effectuer le virement.', {
            duration: 4000,
            position: 'top-center'
          });
        }
        
        // Notification si l'IBAN vient d'être activé (passage de assigned/approved à active)
        if (lastAccountStatus?.ibanStatus !== 'active' && newAccount?.ibanStatus === 'active') {
          toast.success('IBAN activé ! Tous les services sont maintenant disponibles.', {
            duration: 5000,
            position: 'top-center',
            icon: 'success'
          });
        }
        
        // Notification si le statut du compte change (pending -> active)
        if (lastAccountStatus?.status === 'pending' && newAccount?.status === 'active') {
          toast.success('Compte activé par l\'administrateur !', {
            duration: 5000,
            position: 'top-center'
          });
        }
        
        // Notification si une carte vient d'être activée
        if (lastAccountStatus?.cardStatus !== 'active' && newAccount?.cardStatus === 'active') {
          toast.success('Carte bancaire activée !', {
            duration: 4000,
            position: 'top-center'
          });
        }
        
        // Notification si le KYC vient d'être approuvé
        if (lastAccountStatus?.kycStatus !== 'approved' && newAccount?.kycStatus === 'approved') {
          toast.success('Vérification d\'identité approuvée !', {
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
    
    let interval = null;
    
    const startPolling = () => {
      // Intervalle plus court pour une meilleure réactivité
      const pollingInterval = (
        (account?.ibanStatus === 'assigned' || account?.ibanStatus === 'approved') ? 2000 : // 2s si IBAN attribué en attente de virement
        (account?.status === 'pending') ? 3000 : // 3s si compte en attente de validation
        (account?.ibanStatus === 'pending' || account?.ibanStatus === 'requested') ? 2500 : // 2.5s si IBAN en attente
        (account?.cardStatus === 'pending' || account?.cardStatus === 'requested') ? 2500 : // 2.5s si carte en attente
        4000 // 4s par défaut (plus réactif)
      );
      
      if (interval) clearInterval(interval);
      
      interval = setInterval(() => {
        const shouldPoll = (
          account?.status === 'pending' || 
          account?.ibanStatus === 'pending' || 
          account?.ibanStatus === 'requested' ||
          (account?.iban && account?.ibanStatus === 'assigned' && !account?.accountVerified) ||
          (account?.iban && account?.ibanStatus === 'approved' && !account?.accountVerified) ||
          account?.cardStatus === 'pending' ||
          account?.cardStatus === 'requested'
        );
        
        if (shouldPoll) {
          console.log('Polling automatique des données...', { 
            status: account?.status, 
            ibanStatus: account?.ibanStatus,
            cardStatus: account?.cardStatus 
          });
          loadDashboard();
        } else {
          // Arrêter le polling si plus besoin
          console.log('Arrêt du polling automatique - compte complètement activé');
          clearInterval(interval);
          interval = null;
        }
      }, pollingInterval);
    };
    
    // Démarrer le polling immédiatement si nécessaire
    const needsPolling = (
      account?.status === 'pending' || 
      account?.ibanStatus === 'pending' || 
      account?.ibanStatus === 'requested' ||
      (account?.iban && account?.ibanStatus === 'assigned' && !account?.accountVerified) ||
      (account?.iban && account?.ibanStatus === 'approved' && !account?.accountVerified) ||
      account?.cardStatus === 'pending' ||
      account?.cardStatus === 'requested'
    );
    
    console.log('Configuration du polling automatique:', { needsPolling, account });
    
    if (needsPolling) {
      startPolling();
    }
    
    // Nettoyage au démontage
    return () => {
      if (interval) {
        console.log('Nettoyage du polling automatique');
        clearInterval(interval);
      }
    };
  }, [account, loadDashboard]);

  // Rafraîchir quand l'utilisateur revient sur l'onglet
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && account) {
        // Rafraîchir si l'utilisateur revient sur l'onglet et a des statuts en attente
        const hasPendingStatus = (
          account?.status === 'pending' || 
          account?.ibanStatus === 'pending' || 
          account?.ibanStatus === 'requested' ||
          account?.cardStatus === 'pending' ||
          account?.cardStatus === 'requested'
        );
        
        if (hasPendingStatus) {
          console.log('Utilisateur revenu sur l\'onglet - rafraîchissement des données');
          loadDashboard();
          toast.success('Vérification des mises à jour...', { 
            duration: 2000, 
            position: 'bottom-center' 
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [account]);

  // Ajouter un raccourci clavier pour rafraîchir
  useEffect(() => {
    const handleKeyPress = (e) => {
      // Ctrl+R ou Cmd+R pour rafraîchir manuellement
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        handleManualRefresh();
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, []);

  // Écouteurs d'événements personnalisés pour les mises à jour en temps réel
  useEffect(() => {
    const handleAccountVerified = (event) => {
      console.log('Événement accountVerified reçu:', event.detail);
      loadDashboard();
    };

    const handleIbanAssigned = (event) => {
      console.log('Événement ibanAssigned reçu:', event.detail);
      loadDashboard();
    };

    const handleStatusChanged = (event) => {
      console.log('Événement statusChanged reçu:', event.detail);
      loadDashboard();
    };

    const handleWithdrawalStepCompleted = (event) => {
      console.log('Événement withdrawalStepCompleted reçu:', event.detail);
      // Rafraîchir seulement si on est sur la page de progression
      if (activePage === 'withdrawal-progress' || activePage === 'transfer') {
        loadDashboard();
      }
    };

    // Ajouter les écouteurs
    window.addEventListener('accountVerified', handleAccountVerified);
    window.addEventListener('ibanAssigned', handleIbanAssigned);
    window.addEventListener('statusChanged', handleStatusChanged);
    window.addEventListener('withdrawalStepCompleted', handleWithdrawalStepCompleted);

    // Nettoyage
    return () => {
      window.removeEventListener('accountVerified', handleAccountVerified);
      window.removeEventListener('ibanAssigned', handleIbanAssigned);
      window.removeEventListener('statusChanged', handleStatusChanged);
      window.removeEventListener('withdrawalStepCompleted', handleWithdrawalStepCompleted);
    };
  }, [activePage, loadDashboard]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const isPending = userProfile?.accountStatus === 'pending' || account?.status === 'pending';
  const isSuspended = userProfile?.accountStatus === 'suspended' || account?.status === 'suspended' || account?.status === 'blocked';
  const isLockedOps = isPending || isSuspended;

  // Indicateur de connexion SSE
  const SseIndicator = () => (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full text-xs font-medium transition-all ${
      isConnected 
        ? 'bg-green-100 text-green-700 border border-green-200' 
        : 'bg-red-100 text-red-700 border border-red-200'
    }`}>
      <div className={`w-2 h-2 rounded-full ${
        isConnected ? 'bg-green-500' : 'bg-red-500 animate-pulse'
      }`} />
      {isConnected ? 'Temps réel' : 'Hors ligne'}
    </div>
  );

  const renderPage = () => {
    // Rafraîchir les données quand on navigue vers des pages critiques
    const criticalPages = ['activation', 'iban', 'card', 'overview'];
    if (criticalPages.includes(activePage)) {
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
      case 'activation':
        return <ActivationRequestPage account={account} onBack={() => setActivePage('overview')} onSuccess={loadDashboard} />;
      case 'transactions':
        return <TransactionsPage transactions={transactions} onRefresh={loadDashboard} />;
      case 'transfer':
        return <TransferPage account={account} onSuccess={loadDashboard} />;
      case 'withdrawal-progress':
        return <WithdrawalProgressPage account={account} onRefresh={loadDashboard} />;
      case 'withdrawal-code':
        return <WithdrawalCodePage />;
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
      <SseIndicator />
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
          <div className="bg-amber-50 border-b border-amber-200 px-4 md:px-5 py-2.5 md:py-2.5 flex items-center gap-2.5">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <p className="text-[11px] md:text-[12px] text-amber-800 font-medium leading-snug flex-1">
              Compte en <strong>attente de validation</strong> par l&apos;administrateur.
              <span className="text-amber-600 text-[10px] block mt-0.5">
                Mise à jour automatique toutes les 3 secondes...
              </span>
            </p>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-[10px] font-medium transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Vérification...' : 'Vérifier'}
            </button>
          </div>
        )}
        {account?.iban && !(account?.status === 'active' && account?.accountVerified) && (
          <div className="bg-blue-50 border-b border-blue-200 px-4 md:px-5 py-2.5 flex items-center gap-2.5 overflow-hidden">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-[11px] md:text-[12px] text-blue-800 font-medium leading-snug animate-pulse">
                IBAN <strong>inactif</strong> - Veuillez compléter le processus d&apos;activation pour utiliser tous les services.
                <span className="text-blue-600 text-[10px] block mt-0.5">
                  Vérification automatique toutes les 2 secondes...
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-[10px] font-medium transition disabled:opacity-50 flex-shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Vérification...' : 'Vérifier'}
            </button>
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
