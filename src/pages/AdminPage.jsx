import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Globe, CreditCard, ArrowLeftRight,
  FileText, TrendingUp, Shield, LogOut, CheckCircle,
  XCircle, AlertTriangle, Search, ChevronRight, ChevronLeft,
  Menu, X, Check, Ban, RefreshCw, User, Plus, Minus,
  MessageSquare, AlertCircle
} from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function Chip({ color = 'gray', children }) {
  const cls = {
    green: 'bg-teal-50 text-teal-800 border border-teal-200',
    amber: 'bg-amber-50 text-amber-800 border border-amber-200',
    red: 'bg-red-50 text-red-700 border border-red-200', 
    blue: 'bg-blue-50 text-blue-800 border border-blue-200',
    gray: 'bg-slate-100 text-slate-600 border border-slate-200',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium ${cls[color]}`}>{children}</span>;
}

function Avatar({ name = '', size = 'sm' }) {
  const initials = name.split(' ').map((w) => w[0] || '').join('').slice(0, 2).toUpperCase() || '?';
  const colors = ['bg-teal-100 text-teal-800', 'bg-blue-100 text-blue-800', 'bg-violet-100 text-violet-800', 'bg-amber-100 text-amber-800'];
  const color = colors[initials.charCodeAt(0) % colors.length];
  const sz = size === 'sm' ? 'w-8 h-8 text-[11px]' : size === 'lg' ? 'w-12 h-12 text-[13px]' : 'w-10 h-10 text-[12px]';
  return <div className={`${sz} ${color} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>{initials}</div>;
}

const TABS = [
  { id: 'overview', label: 'Aperçu', icon: LayoutDashboard },
  { id: 'clients', label: 'Comptes', icon: Users },
  { id: 'activation', label: 'Activation Comptes', icon: User },
  { id: 'kyc', label: 'KYC', icon: FileText },
  { id: 'iban', label: 'IBAN / BIC', icon: Globe },
  { id: 'cards', label: 'Cartes', icon: CreditCard },
  { id: 'tx', label: 'Dépôts / Retraits', icon: ArrowLeftRight },
  { id: 'modal', label: 'Modal', icon: MessageSquare },
];

export default function AdminPage() {
  const { isAdmin, logout, userProfile, user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [sidebarOpen, setSidebar] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const { data: d } = await api.get('/admin/data');
      setData(d);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Chargement admin impossible');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/dashboard');
      return;
    }
    load();
    const id = setInterval(load, 12000);
    return () => clearInterval(id);
  }, [isAdmin, navigate, load]);

  if (!isAdmin) return null;

  const users = data?.users || [];
  const accounts = data?.accounts || [];
  const requests = data?.requests || [];
  const cardsAdmin = data?.cards || [];
  const cardRequests = data?.cardRequests || [];
  const transactions = data?.transactions || [];
  const kycSubmissions = data?.kycSubmissions || [];

  const pendingIban = requests.filter((r) => (r.type === 'iban_request' || r.step === 'iban_request') && r.status === 'pending').length;
  const pendingKyc = kycSubmissions.filter((r) => r.status === 'pending').length;
  const pendingCards = cardRequests.filter((c) => c.status === 'pending').length; // Utiliser cardRequests
  const pendingAccounts = users.filter((u) => u.accountStatus === 'pending').length;
  const pendingActivations = requests.filter((r) => r.step === 'transfer_proof' && r.status === 'pending').length;
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const shared = { users, requests, accounts, cards: cardsAdmin, cardRequests, transactions, kycSubmissions, setTab, load, adminId: user?.id };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebar(false)} />}

      <aside
        className={`fixed top-0 left-0 h-full z-50 flex flex-col w-64 transition-transform duration-300 md:relative md:translate-x-0 md:w-56 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0F1923', borderRight: '0.5px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-2.5 px-3 sm:px-4 py-3 sm:py-4" style={{ borderBottom: '0.5px solid rgba(255,255,255,0.08)' }}>
          <div className="w-7 h-7 sm:w-8 sm:h-8 bg-teal-700 rounded-lg flex items-center justify-center flex-shrink-0">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] sm:text-[14px] font-semibold text-white tracking-tight truncate">NeoBank</div>
            <span className="text-[8px] sm:text-[9px] font-mono bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded font-bold">ADMIN</span>
          </div>
          <button type="button" onClick={() => setSidebar(false)} className="text-white/30 hover:text-white md:hidden p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        <nav className="flex-1 py-2 sm:py-3 px-2 space-y-0.5 overflow-y-auto">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = tab === item.id;
            const b = item.id === 'iban' ? pendingIban : item.id === 'kyc' ? pendingKyc : item.id === 'cards' ? pendingCards : item.id === 'activation' ? pendingActivations : 0;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { setTab(item.id); setSidebar(false); }}
                className="w-full flex items-center gap-2 sm:gap-2.5 px-3 py-2 sm:py-2.5 rounded-xl transition-all text-[11.5px] sm:text-[12.5px] relative"
                style={{ background: active ? 'rgba(255,255,255,0.1)' : 'transparent', color: active ? 'white' : 'rgba(255,255,255,0.5)' }}
              >
                <Icon className="w-[14px] h-[14px] sm:w-[15px] sm:h-[15px] flex-shrink-0" />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {b > 0 && <span className="bg-red-500 text-white text-[8px] sm:text-[9px] font-bold rounded-full w-3.5 h-3.5 sm:w-4 sm:h-4 flex items-center justify-center flex-shrink-0">{b}</span>}
              </button>
            );
          })}
        </nav>
        <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.08)', padding: '10px 12px' }}>
          <div className="bg-amber-400/10 border border-amber-400/20 rounded-xl p-2 sm:p-2.5 flex items-center gap-2 mb-2">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-amber-400 flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-amber-900 flex-shrink-0">
              {(userProfile?.displayName || 'A').slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[10.5px] sm:text-[11.5px] font-medium text-white truncate">{userProfile?.displayName || 'Admin'}</div>
            </div>
            <button type="button" onClick={async () => { await logout(); navigate('/'); }} className="text-white/30 hover:text-red-400 transition p-1">
              <LogOut className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => navigate('/dashboard')} className="w-full text-[10px] sm:text-[11px] text-white/30 hover:text-white/60 transition text-center py-1">
            Espace client →
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-h-screen">
        <header className="md:hidden flex items-center gap-3 px-3 sm:px-4 py-2.5 sm:py-3 bg-white border-b border-slate-100 sticky top-0 z-30">
          <button type="button" onClick={() => setSidebar(true)} className="text-slate-600 p-1">
            <Menu className="w-4.5 h-4.5 sm:w-5 sm:h-5" />
          </button>
          <span className="font-semibold text-[13px] sm:text-[14px]">NeoBank Admin</span>
        </header>
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto">
          {loading && !data ? (
            <p className="text-slate-500 text-[13px]">Chargement…</p>
          ) : (
            <>
              {tab === 'overview' && <TabOverview {...shared} totalBalance={totalBalance} pendingIban={pendingIban} pendingCards={pendingCards} pendingAccounts={pendingAccounts} pendingKyc={pendingKyc} pendingActivations={pendingActivations} />}
              {tab === 'clients' && <TabClients {...shared} />}
              {tab === 'activation' && <TabActivation {...shared} />}
              {tab === 'kyc' && <TabKyc {...shared} />}
              {tab === 'iban' && <TabIban {...shared} />}
              {tab === 'cards' && <TabCards {...shared} />}
              {tab === 'tx' && <TabTx {...shared} />}
              {tab === 'modal' && <TabModal {...shared} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function TabOverview({ users, totalBalance, pendingIban, pendingCards, pendingAccounts, pendingKyc, pendingActivations, setTab }) {
  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Vue d&apos;ensemble</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Clients', val: users.length, icon: Users, color: 'bg-teal-50 text-teal-700' },
          { label: 'Masse (EUR)', val: fmt(totalBalance), icon: TrendingUp, color: 'bg-blue-50 text-blue-700' },
          { label: 'IBAN attente', val: pendingIban, icon: Globe, color: pendingIban ? 'bg-amber-50 text-amber-700' : 'bg-slate-50' },
          { label: 'Activations', val: pendingActivations, icon: User, color: pendingActivations ? 'bg-red-50 text-red-600' : 'bg-slate-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
              <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center mb-2 sm:mb-3 ${s.color}`}>
                <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-500">{s.label}</p>
              <p className="text-[14px] sm:text-[18px] font-semibold font-mono mt-0.5">{s.val}</p>
            </div>
          );
        })}
      </div>
      {(pendingIban + pendingCards + pendingAccounts + pendingKyc + pendingActivations) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
          <span className="text-[11px] sm:text-[13px] text-amber-800 flex-1">Actions en attente — utilisez les onglets.</span>
          <button type="button" onClick={() => setTab('activation')} className="text-[11px] font-semibold text-amber-900 underline whitespace-nowrap">Activation</button>
        </div>
      )}
    </div>
  );
}

function TabClients({ users, accounts, load }) {
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);
  const [ibanForm, setIbanForm] = useState({});
  const filtered = users.filter((u) => !q || `${u.displayName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const acc = (id) => accounts.find((a) => a.id === id);
  const verify = async (id) => {
    console.log('DEBUG frontend: appel verify pour userId:', id);
    await api.post(`/admin/users/${id}/verify`);
    toast.success('✅ Compte client validé avec succès !');
    load();
  };
  const suspend = async (id) => {
    await api.post(`/admin/users/${id}/status`, { status: 'suspended' });
    toast.success('Compte suspendu');
    load();
  };
  const activate = async (id) => {
    await api.post(`/admin/users/${id}/status`, { status: 'active' });
    toast.success('Réactivé');
    load();
  };
  const approveKycQuick = async (id) => {
    await api.post(`/admin/users/${id}/kyc-quick`);
    toast.success('KYC approuvé');
    load();
  };
  const assignIban = async (userId) => {
    const f = ibanForm[userId] || {};
    if (!f.iban?.trim() || !f.bic?.trim()) return toast.error('IBAN et BIC requis');
    try {
      await api.post(`/admin/users/${userId}/iban`, { iban: f.iban.trim(), bic: f.bic.trim() });
      toast.success('IBAN attribué avec succès');
      setIbanForm(prev => ({ ...prev, [userId]: {} })); // Vider le formulaire
      load();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erreur lors de l\'attribution IBAN');
    }
  };

  if (selected) {
    const u = users.find((x) => x.id === selected);
    const a = acc(selected);
    if (!u) return null;
    return (
      <div className="space-y-4">
        <button type="button" onClick={() => setSelected(null)} className="flex items-center gap-1 text-[12px] text-slate-500">
          <ChevronLeft className="w-4 h-4" /> Retour
        </button>
        <div className="bg-white border rounded-2xl p-3 sm:p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
            <Avatar name={u.displayName || u.email} size="lg" />
            <div className="flex-1">
              <p className="font-semibold text-[14px] sm:text-base">{u.displayName}</p>
              <p className="text-[11px] sm:text-[12px] text-slate-500">{u.email}</p>
              <Chip color={u.accountStatus === 'active' ? 'green' : u.accountStatus === 'suspended' ? 'red' : 'amber'}>
                {u.accountStatus}
              </Chip>
            </div>
          </div>
          <p className="text-[12px] sm:text-[13px] font-mono font-semibold text-teal-700">{fmt(a?.balance)}</p>
          
          {/* Informations IBAN/BIC */}
          <div className="mt-3 p-3 bg-slate-50 rounded-xl">
            <p className="text-[11px] font-semibold text-slate-700 mb-2">Informations bancaires</p>
            {u.iban ? (
              <div className="space-y-1">
                <p className="text-[10px] font-mono text-slate-600">IBAN: {u.iban}</p>
                <p className="text-[10px] font-mono text-slate-600">BIC: {u.bic || 'Non défini'}</p>
                <Chip color={u.ibanStatus === 'approved' ? 'green' : u.ibanStatus === 'pending' ? 'amber' : 'gray'}>
                  {u.ibanStatus === 'approved' ? 'Attribué' : u.ibanStatus === 'pending' ? 'En attente' : 'Aucun'}
                </Chip>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] text-slate-500">Aucun IBAN attribué</p>
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    placeholder="IBAN" 
                    className="px-2 py-1 border rounded text-[10px] font-mono"
                    value={ibanForm[u.id]?.iban || ''}
                    onChange={(e) => setIbanForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], iban: e.target.value } }))}
                  />
                  <input 
                    placeholder="BIC" 
                    className="px-2 py-1 border rounded text-[10px] font-mono"
                    value={ibanForm[u.id]?.bic || ''}
                    onChange={(e) => setIbanForm(prev => ({ ...prev, [u.id]: { ...prev[u.id], bic: e.target.value } }))}
                  />
                </div>
                <button 
                  type="button" 
                  onClick={() => assignIban(u.id)}
                  className="w-full py-1.5 bg-teal-600 text-white rounded text-[10px] font-medium"
                >
                  Attribuer IBAN
                </button>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {u.accountStatus === 'pending' && (
              <button type="button" onClick={() => verify(u.id)} className="col-span-1 sm:col-span-2 py-2.5 bg-teal-700 text-white rounded-xl text-[11px] sm:text-[12px] font-semibold flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Valider le compte
              </button>
            )}
            {u.accountStatus === 'active' && (
              <button type="button" onClick={() => suspend(u.id)} className="py-2 bg-red-50 text-red-700 rounded-xl text-[11px] sm:text-[12px] border border-red-200 flex items-center justify-center gap-1">
                <Ban className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Suspendre
              </button>
            )}
            {u.accountStatus === 'suspended' && (
              <button type="button" onClick={() => activate(u.id)} className="py-2 bg-teal-50 text-teal-800 rounded-xl text-[11px] sm:text-[12px] border flex items-center justify-center gap-1">
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Réactiver
              </button>
            )}
            {u.kycStatus === 'pending' || u.kycStatus === 'submitted' ? (
              <button type="button" onClick={() => approveKycQuick(u.id)} className="py-2 bg-blue-50 text-blue-800 rounded-xl text-[11px] sm:text-[12px] border border-blue-200">
                Valider KYC
              </button>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Comptes clients</h1>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher…"
          className="w-full pl-9 pr-4 py-2.5 bg-white border rounded-xl text-[12px]" />
      </div>
      <div className="space-y-2">
        {filtered.map((u) => {
          const account = acc(u.id);
          return (
            <button type="button" key={u.id} onClick={() => setSelected(u.id)}
              className="w-full bg-white border rounded-2xl p-3 sm:p-4 text-left hover:border-teal-200">
              <div className="flex items-start gap-3">
                <Avatar name={u.displayName || u.email} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[12px] sm:text-[13px] font-medium truncate">{u.displayName}</p>
                    <Chip color={u.accountStatus === 'active' ? 'green' : u.accountStatus === 'suspended' ? 'red' : 'amber'}>
                      {u.accountStatus}
                    </Chip>
                  </div>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 truncate mb-2">{u.email}</p>
                  
                  {/* Informations supplémentaires */}
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    <Chip color="blue">
                      KYC: {u.kycStatus === 'approved' ? '✅' : u.kycStatus === 'pending' ? '⏳' : '❌'}
                    </Chip>
                    {u.iban ? (
                      <Chip color="green">
                        IBAN: ✅
                      </Chip>
                    ) : (
                      <Chip color="gray">
                        IBAN: ❌
                      </Chip>
                    )}
                    <span className="text-slate-500">
                      Créé: {new Date(u.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-[11px] sm:text-[13px] block">{fmt(account?.balance)}</span>
                  <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-300 ml-auto mt-0.5" />
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TabKyc({ kycSubmissions, load }) {
  const [reasons, setReasons] = useState({});
  const pending = kycSubmissions.filter((r) => r.status === 'pending');
  const approve = async (id) => {
    await api.post(`/admin/kyc/${id}/approve`);
    toast.success('KYC approuvé');
    load();
  };
  const reject = async (id) => {
    const reason = (reasons[id] || '').trim();
    if (!reason) return toast.error('Motif requis');
    await api.post(`/admin/kyc/${id}/reject`, { reason });
    toast.success('KYC rejeté');
    load();
  };
  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Demandes KYC</h1>
      {pending.length === 0 && <p className="text-slate-500 text-[13px]">Aucune demande en attente.</p>}
      {pending.map((req) => (
        <div key={req.id} className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
          <p className="font-medium text-[12px] sm:text-[13px]">{req.name || req.email}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
            {req.selfie_url && (
              <a href={req.selfie_url} target="_blank" rel="noreferrer" className="text-[11px] sm:text-[12px] text-teal-700 underline">Voir selfie</a>
            )}
            {req.document_url && (
              <a href={req.document_url} target="_blank" rel="noreferrer" className="text-[11px] sm:text-[12px] text-teal-700 underline">Voir pièce</a>
            )}
          </div>
          <textarea value={reasons[req.id] || ''} onChange={(e) => setReasons((x) => ({ ...x, [req.id]: e.target.value }))}
            placeholder="Motif de rejet" className="w-full mt-3 px-3 py-2 border rounded-xl text-[11px] sm:text-[12px]" rows={2} />
          <div className="flex flex-col sm:flex-row gap-2 mt-2">
            <button type="button" onClick={() => approve(req.id)} className="flex-1 py-2 bg-teal-700 text-white rounded-xl text-[11px] sm:text-[12px] font-semibold flex items-center justify-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Approuver
            </button>
            <button type="button" onClick={() => reject(req.id)} className="flex-1 py-2 bg-red-50 text-red-700 rounded-xl text-[11px] sm:text-[12px] border border-red-200 flex items-center justify-center gap-1">
              <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Rejeter
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TabIban({ users, requests, load }) {
  // Montrer TOUTES les demandes IBAN pour debug
  const allIbanRequests = requests.filter((r) => (r.type === 'iban_request' || r.step === 'iban_request'));
  const pending = allIbanRequests.filter((r) => r.status === 'pending');
  const [ibanForm, setIbanForm] = useState({});

  // Debug pour voir les demandes
  console.log('Toutes les requests:', requests);
  console.log('Toutes les demandes IBAN (tous statuts):', allIbanRequests);
  console.log('Demandes IBAN filtrées (pending seulement):', pending);

  const assign = async (userId) => {
    const f = ibanForm[userId] || {};
    if (!f.iban?.trim()) return toast.error('IBAN requis');
    
    // Validation basique du format
    const cleanIban = f.iban.replace(/\s/g, '').toUpperCase();
    if (!/^FR\d{25}$/.test(cleanIban)) {
      return toast.error('Format IBAN invalide. Format: FRXX XXXX XXXX XXXX XXXX XXXX XXX');
    }
    
    try {
      await api.post(`/admin/users/${userId}/iban`, { 
        iban: cleanIban, 
        bic: f.bic?.trim() || 'BNPAFRPPXXX' 
      });
      toast.success('IBAN attribué avec succès !');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'attribution');
    }
  };

  const getUserInfo = (userId) => {
    return users.find(u => u.id === userId);
  };

  // Formater l'IBAN automatiquement
  const formatIban = (value) => {
    const clean = value.replace(/\s/g, '').toUpperCase();
    return clean.replace(/(.{4})(.{4})(.{4})(.{4})(.{4})(.{3})/, '$1 $2 $3 $4 $5 $6');
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Attribution IBAN</h1>
      
      {/* Debug info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
        <p className="text-[11px] text-blue-800">
          <strong>Debug:</strong> {allIbanRequests.length} demande(s) IBAN trouvée(s) au total
        </p>
        <p className="text-[11px] text-blue-700">
          {pending.length} en attente, {allIbanRequests.length - pending.length} déjà traitée(s)
        </p>
      </div>

      {allIbanRequests.length === 0 ? (
        <p className="text-slate-500 text-[13px]">Aucune demande d'IBAN trouvée.</p>
      ) : (
        <>
          {pending.length === 0 ? (
            <p className="text-amber-600 text-[13px] mb-4">Aucune demande d'IBAN en attente.</p>
          ) : (
            <p className="text-teal-600 text-[13px] mb-4">{pending.length} demande(s) d'IBAN en attente:</p>
          )}
          
          {allIbanRequests.map((r) => {
            const userInfo = getUserInfo(r.user_id || r.userId);
            return (
              <div key={r.id} className="bg-white border rounded-2xl p-3 sm:p-4 space-y-3">
                {/* Informations du client */}
                <div className="flex items-start gap-3">
                  <Avatar name={userInfo?.displayName || userInfo?.email || 'Client'} size="lg" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[12px] sm:text-[13px]">{userInfo?.displayName || 'Client'}</p>
                    <p className="text-[11px] sm:text-[12px] text-slate-500">{userInfo?.email}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      <Chip color={userInfo?.accountStatus === 'active' ? 'green' : userInfo?.accountStatus === 'suspended' ? 'red' : 'amber'}>
                        {userInfo?.accountStatus || 'pending'}
                      </Chip>
                      <Chip color="blue">
                        KYC: {userInfo?.kycStatus === 'approved' ? '✅' : '⏳'}
                      </Chip>
                      {userInfo?.phone && (
                        <span className="text-[10px] text-slate-400">{userInfo.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Date de la demande */}
                <div className="text-[11px] text-slate-400">
                  Demandé le {new Date(r.created_at).toLocaleDateString('fr-FR')} à {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                
                {/* Statut de la demande */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-slate-600">Statut:</span>
                  <Chip color={r.status === 'pending' ? 'amber' : r.status === 'approved' ? 'green' : 'red'}>
                    {r.status}
                  </Chip>
                </div>
                
                {/* Formulaire IBAN/BIC */}
                {r.status === 'pending' && (
                  <div className="space-y-3 border-t pt-3">
                    <p className="text-[12px] font-medium text-slate-700">Attribuer un IBAN manuellement</p>
                    <div className="space-y-2">
                      <div>
                        <label className="text-[10px] text-slate-500">IBAN (27 caractères)</label>
                        <input 
                          placeholder="FRXX XXXX XXXX XXXX XXXX XXXX XXX" 
                          className="w-full px-3 py-2 border rounded-xl text-[11px] sm:text-[12px] font-mono"
                          value={ibanForm[r.user_id || r.userId]?.iban || ''}
                          onChange={(e) => setIbanForm((x) => ({ 
                            ...x, 
                            [r.user_id || r.userId]: { 
                              ...x[r.user_id || r.userId], 
                              iban: formatIban(e.target.value) 
                            } 
                          }))}
                          maxLength={27}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-500">BIC (optionnel)</label>
                        <input 
                          placeholder="BNPAFRPPXXX" 
                          className="w-full px-3 py-2 border rounded-xl text-[11px] sm:text-[12px] font-mono"
                          value={ibanForm[r.user_id || r.userId]?.bic || ''}
                          onChange={(e) => setIbanForm((x) => ({ 
                            ...x, 
                            [r.user_id || r.userId]: { 
                              ...x[r.user_id || r.userId], 
                              bic: e.target.value.toUpperCase() 
                            } 
                          }))}
                          maxLength={11}
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {r.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                    <p className="text-[11px] text-green-800">
                      <strong>IBAN déjà attribué</strong> - Cette demande a été traitée
                    </p>
                  </div>
                )}
                
                <button 
                  type="button" 
                  onClick={() => r.status === 'pending' ? assign(r.user_id || r.userId) : null}
                  disabled={r.status !== 'pending'}
                  className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-[11px] sm:text-[12px] font-semibold disabled:bg-slate-300 disabled:cursor-not-allowed"
                >
                  {r.status === 'pending' ? 'Attribuer l\'IBAN' : 'Déjà traitée'}
                </button>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}

function TabActivation({ users, requests, load }) {
  const [activationUsers, setActivationUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [batchForm, setBatchForm] = useState({ generateIban: false, initialBalance: '' });
  const [rejectionReasons, setRejectionReasons] = useState({});
  const pending = requests.filter((r) => r.step === 'transfer_proof' && r.status === 'pending');

  // Debug pour voir les demandes de preuve de virement
  console.log('Demandes transfer_proof filtrées:', pending);

  // Charger les utilisateurs qui peuvent être activés directement
  useEffect(() => {
    const loadUsersForActivation = async () => {
      try {
        setLoadingUsers(true);
        const { data } = await api.get('/admin/users/activation');
        setActivationUsers(data.users || []);
      } catch (e) {
        console.error('Erreur chargement utilisateurs pour activation:', e);
      } finally {
        setLoadingUsers(false);
      }
    };
    loadUsersForActivation();
  }, [load]);

  const getUserInfo = (userId) => {
    return users.find(u => u.id === userId);
  };

  const approveActivation = async (userId, requestId) => {
    try {
      // Approuver la preuve de virement
      await api.post(`/admin/activation-requests/${requestId}/approve`);
      
      // Activer le compte client
      await api.post(`/admin/users/${userId}/verify`);
      
      toast.success('Compte activé avec succès !');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'activation');
    }
  };

  const rejectActivation = async (requestId) => {
    const reason = rejectionReasons[requestId]?.trim();
    if (!reason) return toast.error('Motif de rejet requis');
    
    try {
      await api.post(`/admin/activation-requests/${requestId}/reject`, { reason });
      toast.success('Demande rejetée');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors du rejet');
    }
  };

  const directActivate = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/verify`, batchForm);
      toast.success('Compte activé directement !');
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'activation');
    }
  };

  const batchActivate = async () => {
    if (selectedUsers.length === 0) return toast.error('Sélectionnez des comptes à activer');
    
    try {
      for (const userId of selectedUsers) {
        await api.post(`/admin/users/${userId}/verify`, batchForm);
      }
      toast.success(`${selectedUsers.length} compte(s) activé(s) !`);
      setSelectedUsers([]);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'activation');
    }
  };

  const toggleUserSelection = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  return (
    <div className="space-y-6">
      <h1 className="text-[18px] font-semibold">Activation Comptes</h1>
      
      {/* Activation directe des comptes */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
        <h2 className="text-[14px] font-medium text-slate-700">Activation directe (sans demande client)</h2>
        
        {/* Contrôles pour l'activation en lot */}
        <div className="flex flex-col sm:flex-row gap-3 p-3 bg-slate-50 rounded-xl">
          <label className="flex items-center gap-2 text-[12px]">
            <input 
              type="checkbox" 
              checked={batchForm.generateIban}
              onChange={(e) => setBatchForm(prev => ({ ...prev, generateIban: e.target.checked }))}
              className="rounded"
            />
            Générer IBAN automatiquement
          </label>
          <input 
            type="number" 
            placeholder="Solde initial (€)" 
            value={batchForm.initialBalance}
            onChange={(e) => setBatchForm(prev => ({ ...prev, initialBalance: e.target.value }))}
            className="px-3 py-1.5 border rounded-lg text-[12px] w-32"
          />
          {selectedUsers.length > 0 && (
            <button 
              onClick={batchActivate}
              className="px-4 py-1.5 bg-teal-700 text-white rounded-lg text-[12px] font-medium"
            >
              Activer ({selectedUsers.length})
            </button>
          )}
        </div>

        {loadingUsers ? (
          <p className="text-slate-500 text-[13px]">Chargement...</p>
        ) : activationUsers.length === 0 ? (
          <p className="text-slate-500 text-[13px]">Aucun compte en attente d'activation.</p>
        ) : (
          <div className="space-y-2">
            {activationUsers.map((user) => (
              <div key={user.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl">
                <input 
                  type="checkbox"
                  checked={selectedUsers.includes(user.id)}
                  onChange={() => toggleUserSelection(user.id)}
                  className="rounded"
                />
                <Avatar name={user.displayName || user.email} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate">{user.displayName}</p>
                  <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
                  <div className="flex gap-2 mt-1">
                    <Chip color={user.accountStatus === 'pending' ? 'amber' : 'red'}>
                      {user.accountStatus}
                    </Chip>
                    <Chip color="blue">
                      KYC: {user.kycStatus === 'approved' ? '✅' : '⏳'}
                    </Chip>
                  </div>
                </div>
                <button 
                  onClick={() => directActivate(user.id)}
                  className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-[11px] font-medium"
                >
                  Activer
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Demandes d'activation existantes */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4">
        <h2 className="text-[14px] font-medium text-slate-700">Demandes client en attente</h2>
        {pending.length === 0 && <p className="text-slate-500 text-[13px]">Aucune demande d'activation en attente.</p>}
        
        {pending.map((r) => {
          const userInfo = getUserInfo(r.user_id || r.userId);
          return (
          <div key={r.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
            {/* Informations du client */}
            <div className="flex items-start gap-3">
              <Avatar name={userInfo?.displayName || userInfo?.email || 'Client'} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[12px] sm:text-[13px]">{userInfo?.displayName || 'Client'}</p>
                <p className="text-[11px] sm:text-[12px] text-slate-500">{userInfo?.email}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Chip color={userInfo?.accountStatus === 'active' ? 'green' : userInfo?.accountStatus === 'suspended' ? 'red' : 'amber'}>
                    {userInfo?.accountStatus || 'pending'}
                  </Chip>
                  <Chip color="blue">
                    {userInfo?.kycStatus || 'unknown'}
                  </Chip>
                </div>
              </div>
            </div>
            
            {/* Détails de la demande */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-600">Montant du virement :</span>
                <span className="font-mono text-[12px] font-semibold text-teal-700">{fmt(r.amount)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-600">Demandé le :</span>
                <span className="text-[11px] text-slate-500">
                  {new Date(r.created_at).toLocaleDateString('fr-FR')} à {new Date(r.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
            
            {/* Preuve de virement */}
            {r.proof_url && (
              <div>
                <p className="text-[11px] text-slate-600 mb-2">Preuve de virement :</p>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <img 
                    src={r.proof_url} 
                    alt="Preuve de virement" 
                    className="w-full h-auto max-h-64 object-contain bg-white"
                  />
                </div>
                <a 
                  href={r.proof_url} 
                  target="_blank" 
                  rel="noreferrer"
                  className="text-[11px] text-teal-600 underline mt-2 inline-block"
                >
                  Ouvrir dans un nouvel onglet
                </a>
              </div>
            )}
            
            {/* Motif de rejet */}
            <div>
              <textarea
                value={rejectionReasons[r.id] || ''}
                onChange={(e) => setRejectionReasons(prev => ({ ...prev, [r.id]: e.target.value }))}
                placeholder="Motif de rejet (si applicable)"
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[11px] sm:text-[12px]"
                rows={2}
              />
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => approveActivation(r.user_id || r.userId, r.id)}
                className="flex-1 py-2.5 bg-teal-700 text-white rounded-xl text-[11px] sm:text-[12px] font-semibold flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                Approuver et Activer
              </button>
              <button
                type="button"
                onClick={() => rejectActivation(r.id)}
                className="flex-1 py-2 bg-red-50 text-red-700 rounded-xl text-[11px] sm:text-[12px] border border-red-200 flex items-center justify-center gap-1"
              >
                <XCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> 
                Rejeter
              </button>
            </div>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function TabCards({ cards, cardRequests, users, load }) {
  const pending = cardRequests.filter((c) => c.status === 'pending'); // Utiliser cardRequests
  const [cardForms, setCardForms] = useState({});

  const getUserInfo = (userId) => {
    return users.find(u => u.id === userId);
  };

  const activateCard = async (userId, cardId) => {
    const form = cardForms[cardId] || {};
    
    try {
      // Activer la carte avec les informations fournies
      await api.post(`/admin/users/${userId}/card/activate`, {
        fullNumber: form.fullNumber?.replace(/\s/g, ''), // Enlever les espaces
        expiryMonth: form.expiryMonth || '12',
        expiryYear: form.expiryYear || '2028',
        cvv: form.cvv?.trim()
      });
      
      toast.success('Carte activée avec succès !');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'activation');
    }
  };

  const blockCard = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/card/block`);
      toast.success('Carte bloquée');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Cartes Bancaires</h1>
      
      {/* Cartes en attente */}
      <div className="space-y-4">
        <h2 className="text-[14px] font-medium text-slate-700">Demandes en attente</h2>
        {pending.length === 0 && <p className="text-slate-500 text-[13px]">Aucune demande de carte en attente.</p>}
        
        {pending.map((c) => {
          const userInfo = getUserInfo(c.userId || c.user_id);
          return (
          <div key={c.id} className="bg-white border rounded-2xl p-3 sm:p-4 space-y-3">
            {/* Informations du client */}
            <div className="flex items-start gap-3">
              <Avatar name={userInfo?.displayName || userInfo?.email || 'Client'} size="lg" />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[12px] sm:text-[13px]">{userInfo?.displayName || 'Client'}</p>
                <p className="text-[11px] sm:text-[12px] text-slate-500">{userInfo?.email}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Chip color="amber">Demande de carte</Chip>
                  <Chip color={userInfo?.accountStatus === 'active' ? 'green' : 'amber'}>
                    {userInfo?.accountStatus || 'pending'}
                  </Chip>
                </div>
              </div>
            </div>
            
            {/* Détails de la carte */}
            <div className="bg-slate-50 rounded-xl p-3 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-600">Type de carte :</span>
                <span className="text-[11px] font-medium">Visa Débit</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[11px] text-slate-600">Demandée le :</span>
                <span className="text-[11px] text-slate-500">
                  {new Date(c.created_at).toLocaleDateString('fr-FR')}
                </span>
              </div>
            </div>
            
            {/* Formulaire d'activation */}
            <div className="space-y-3 border-t pt-3">
              <p className="text-[12px] font-medium text-slate-700">Détails de la carte à activer :</p>
              <div className="space-y-2">
                <div>
                  <label className="text-[10px] text-slate-500">Numéro complet (16 chiffres)</label>
                  <input
                    type="text"
                    maxLength={19}
                    className="w-full px-2 py-1.5 border rounded-lg text-[11px] font-mono"
                    value={cardForms[c.id]?.fullNumber || ''}
                    onChange={(e) => setCardForms(prev => ({ 
                      ...prev, 
                      [c.id]: { ...prev[c.id], fullNumber: e.target.value.replace(/\s/g, '').replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim() }
                    }))}
                    placeholder="1234 5678 9012 3456"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500">CVV</label>
                    <input
                      type="text"
                      maxLength={3}
                      className="w-full px-2 py-1.5 border rounded-lg text-[11px] font-mono"
                      value={cardForms[c.id]?.cvv || ''}
                      onChange={(e) => setCardForms(prev => ({ 
                        ...prev, 
                        [c.id]: { ...prev[c.id], cvv: e.target.value.replace(/\D/g, '') }
                      }))}
                      placeholder="123"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Mois</label>
                    <select
                      className="w-full px-2 py-1.5 border rounded-lg text-[11px]"
                      value={cardForms[c.id]?.expiryMonth || '12'}
                      onChange={(e) => setCardForms(prev => ({ 
                        ...prev, 
                        [c.id]: { ...prev[c.id], expiryMonth: e.target.value }
                      }))}
                    >
                      {Array.from({length: 12}, (_, i) => (
                        <option key={i+1} value={String(i+1).padStart(2, '0')}>
                          {String(i+1).padStart(2, '0')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500">Année</label>
                    <select
                      className="w-full px-2 py-1.5 border rounded-lg text-[11px]"
                      value={cardForms[c.id]?.expiryYear || '2028'}
                      onChange={(e) => setCardForms(prev => ({ 
                        ...prev, 
                        [c.id]: { ...prev[c.id], expiryYear: e.target.value }
                      }))}
                    >
                      {Array.from({length: 10}, (_, i) => (
                        <option key={i} value={2026 + i}>
                          {2026 + i}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => activateCard(c.userId || c.user_id, c.id)}
                className="flex-1 py-2.5 bg-teal-700 text-white rounded-xl text-[11px] sm:text-[12px] font-semibold flex items-center justify-center gap-1"
              >
                <CheckCircle className="w-3.5 h-3.5" /> 
                Activer la carte
              </button>
              <button
                type="button"
                onClick={() => blockCard(c.userId || c.user_id)}
                className="py-2 bg-red-50 text-red-700 rounded-xl text-[11px] sm:text-[12px] border border-red-200 flex items-center justify-center gap-1"
              >
                <Ban className="w-3.5 h-3.5" /> 
                Bloquer
              </button>
            </div>
          </div>
          );
        })}
      </div>
      
      {/* Cartes actives */}
      <div className="space-y-4">
        <h2 className="text-[14px] font-medium text-slate-700">Cartes actives</h2>
        {cards.filter(c => c.status === 'active').length === 0 && (
          <p className="text-slate-500 text-[13px]">Aucune carte active.</p>
        )}
        
        {cards.filter(c => c.status === 'active').map((c) => {
          const userInfo = getUserInfo(c.userId || c.user_id);
          return (
          <div key={c.id} className="bg-white border rounded-2xl p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex-1">
              <p className="font-medium text-[12px] sm:text-[13px]">{userInfo?.displayName || c.email}</p>
              <p className="font-mono text-[11px] sm:text-[12px] text-slate-600">
                **** **** **** {c.last4 || c.last_four || '****'}
              </p>
              <p className="text-[10px] text-slate-400">
                Expire {c.expiryMonth || '12'}/{c.expiryYear || '2028'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => blockCard(c.userId || c.user_id)}
              className="w-full sm:w-auto px-4 py-2 bg-red-50 text-red-700 rounded-xl text-[11px] sm:text-[12px] border border-red-200 flex items-center justify-center gap-1"
            >
              <Ban className="w-3.5 h-3.5" /> Bloquer
            </button>
          </div>
          );
        })}
      </div>
    </div>
  );
}


function TabModal({ users }) {
  const [activeMessages, setActiveMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(true);

  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [targetAudience, setTargetAudience] = useState('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMessages = async () => {
    try {
      const { data } = await api.get('/admin/modal-message');
      setActiveMessages(data.messages || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => { fetchMessages(); }, []);

  const filteredUsers = users.filter((u) =>
    u.role !== 'admin' &&
    ((u.displayName || u.name)?.toLowerCase().includes(userSearch.toLowerCase()) ||
     u.email?.toLowerCase().includes(userSearch.toLowerCase()))
  );

  const handleSubmit = async () => {
    if (!title.trim() && !message.trim()) {
      return toast.error('Titre ou message requis');
    }
    if (targetAudience === 'specific' && !targetUserId) {
      return toast.error('Sélectionnez un client');
    }
    setSaving(true);
    try {
      await api.post('/admin/modal-message', { title, message, isActive, targetAudience, targetUserId: targetAudience === 'specific' ? targetUserId : undefined });
      toast.success('Message enregistré');
      setTitle('');
      setMessage('');
      setTargetUserId('');
      setUserSearch('');
      setTargetAudience('all');
      fetchMessages();
    } catch (e) {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/admin/modal-message/${id}`);
      toast.success('Message désactivé');
      fetchMessages();
    } catch (e) {
      toast.error('Erreur');
    }
  };

  const selectedUser = users.find((u) => u.id === targetUserId);

  return (
    <div className="space-y-5">
      <h1 className="text-[18px] font-semibold">Messages Modaux</h1>

      {/* Formulaire */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">
        <h2 className="text-[13px] font-semibold text-slate-700">Nouveau message</h2>

        <div>
          <label className="text-[11px] text-slate-500 font-medium">Titre</label>
          <input
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Instructions de virement"
          />
        </div>

        <div>
          <label className="text-[11px] text-slate-500 font-medium">Message</label>
          <textarea
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 h-28 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Contenu du message affiché au client..."
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Public cible</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={targetAudience}
              onChange={(e) => { setTargetAudience(e.target.value); setTargetUserId(''); setUserSearch(''); }}
            >
              <option value="all">Tous les clients</option>
              <option value="pending">Comptes en attente</option>
              <option value="active">Comptes actifs</option>
              <option value="suspended">Comptes suspendus</option>
              <option value="specific">Client spécifique</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Statut</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={isActive}
              onChange={(e) => setIsActive(e.target.value === 'true')}
            >
              <option value="true">Actif (visible)</option>
              <option value="false">Inactif (masqué)</option>
            </select>
          </div>
        </div>

        {/* Sélection client spécifique */}
        {targetAudience === 'specific' && (
          <div className="border border-teal-100 bg-teal-50 rounded-xl p-3 space-y-2">
            <label className="text-[11px] text-teal-700 font-medium">Rechercher un client</label>
            <input
              className="w-full px-3 py-2 border border-teal-200 rounded-xl text-[12px] bg-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Nom ou email du client..."
            />
            {userSearch && (
              <div className="max-h-40 overflow-y-auto space-y-1">
                {filteredUsers.length === 0 && (
                  <p className="text-[11px] text-slate-400 text-center py-2">Aucun client trouvé</p>
                )}
                {filteredUsers.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => { setTargetUserId(u.id); setUserSearch(u.displayName || u.name); }}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition ${
                      targetUserId === u.id ? 'bg-teal-600 text-white' : 'bg-white hover:bg-teal-100'
                    }`}
                  >
                    <div className="w-6 h-6 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                      {u.displayName?.slice(0, 2).toUpperCase() || u.name?.slice(0, 2).toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-medium truncate">{u.displayName || u.name}</p>
                      <p className={`text-[10px] truncate ${targetUserId === u.id ? 'text-teal-100' : 'text-slate-400'}`}>{u.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedUser && (
              <div className="flex items-center gap-2 bg-teal-600 text-white px-3 py-2 rounded-lg">
                <div className="w-6 h-6 rounded-full bg-teal-400 flex items-center justify-center text-[9px] font-bold">
                  {selectedUser.displayName?.slice(0, 2).toUpperCase() || selectedUser.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium">{selectedUser.displayName || selectedUser.name}</p>
                  <p className="text-[10px] text-teal-200">{selectedUser.email}</p>
                </div>
                <button type="button" onClick={() => { setTargetUserId(''); setUserSearch(''); }} className="text-teal-200 hover:text-white">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="w-full bg-teal-700 text-white rounded-xl py-2.5 text-[12px] font-medium hover:bg-teal-800 transition disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Envoyer le message'}
        </button>
      </div>

      {/* Messages actifs */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5">
        <h2 className="text-[13px] font-semibold text-slate-700 mb-3">Messages actifs</h2>
        {loadingMessages ? (
          <p className="text-[12px] text-slate-400">Chargement...</p>
        ) : activeMessages.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-[12px]">Aucun message actif</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeMessages.map((m) => (
              <div key={m.id} className="border border-slate-100 rounded-xl p-3 flex gap-3">
                <div className={`w-2 rounded-full flex-shrink-0 ${
                  m.target_audience === 'specific' ? 'bg-violet-400' : 
                  m.target_audience === 'all' ? 'bg-teal-400' : 
                  m.target_audience === 'pending' ? 'bg-amber-400' :
                  m.target_audience === 'active' ? 'bg-green-400' :
                  'bg-red-400'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[12px] font-semibold text-slate-800 truncate">{m.title || '(sans titre)'}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                      m.target_audience === 'specific' ? 'bg-violet-100 text-violet-700' :
                      m.target_audience === 'all' ? 'bg-teal-100 text-teal-700' :
                      m.target_audience === 'pending' ? 'bg-amber-100 text-amber-700' :
                      m.target_audience === 'active' ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {m.target_audience === 'specific' ? `Client spécifique` :
                       m.target_audience === 'all' ? 'Tous' :
                       m.target_audience === 'pending' ? 'En attente' :
                       m.target_audience === 'active' ? 'Actifs' : 'Suspendus'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{m.message}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeactivate(m.id)}
                  className="text-slate-300 hover:text-red-500 transition flex-shrink-0 p-1"
                  title="Désactiver"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TabTx({ users, load }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [label, setLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const clients = users.filter((u) => u.role !== 'admin');

  const filteredUsers = clients.filter((u) =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const selected = clients.find((u) => u.id === selectedUser);

  const handleSubmit = async () => {
    if (!selectedUser) return toast.error('Sélectionnez un client');
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) return toast.error('Montant invalide');
    if (type === 'deposit' && !bankName?.trim()) return toast.error('Nom de la banque requis');

    setSaving(true);
    try {
      const endpoint = type === 'deposit'
        ? `/admin/users/${selectedUser}/deposit`
        : `/admin/users/${selectedUser}/withdraw`;
      const payload = type === 'deposit' 
        ? { amount: amt, bankName: bankName.trim(), label: label.trim() || undefined }
        : { amount: amt, label: label.trim() || undefined };
      await api.post(endpoint, payload);
      toast.success(type === 'deposit' ? `+${amt} € crédité` : `-${amt} € débité`);
      setAmount('');
      setLabel('');
      setBankName('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-[18px] font-semibold">Dépôts / Retraits</h1>

      <div className="bg-white border border-slate-100 rounded-2xl p-5 space-y-4">

        {/* Recherche client */}
        <div>
          <label className="text-[11px] text-slate-500 font-medium">Client</label>
          <input
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={userSearch}
            onChange={(e) => { setUserSearch(e.target.value); setSelectedUser(''); }}
            placeholder="Rechercher par nom ou email..."
          />
          {userSearch && !selected && (
            <div className="mt-1 border border-slate-100 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-[11px] text-slate-400 text-center py-3">Aucun client trouvé</p>
              ) : filteredUsers.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => { setSelectedUser(u.id); setUserSearch(u.name); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {u.name?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">{u.name}</p>
                    <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(u.balance || 0)}
                  </span>
                </button>
              ))}
            </div>
          )}
          {selected && (
            <div className="mt-2 flex items-center gap-2 bg-teal-50 border border-teal-100 px-3 py-2 rounded-xl">
              <div className="w-8 h-8 rounded-full bg-teal-200 text-teal-800 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                {selected.name?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800">{selected.name}</p>
                <p className="text-[10px] text-slate-500">{selected.email} · Solde : {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(selected.balance || 0)}</p>
              </div>
              <button type="button" onClick={() => { setSelectedUser(''); setUserSearch(''); }} className="text-slate-300 hover:text-red-400 transition">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Type */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setType('deposit')}
            className={`py-3 rounded-xl border-2 text-[12px] font-medium transition flex items-center justify-center gap-2 ${
              type === 'deposit' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Plus className="w-4 h-4" /> Dépôt
          </button>
          <button
            type="button"
            onClick={() => setType('withdraw')}
            className={`py-3 rounded-xl border-2 text-[12px] font-medium transition flex items-center justify-center gap-2 ${
              type === 'withdraw' ? 'border-red-400 bg-red-50 text-red-600' : 'border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            <Minus className="w-4 h-4" /> Retrait
          </button>
        </div>

        {/* Montant */}
        <div>
          <label className="text-[11px] text-slate-500 font-medium">Montant (EUR)</label>
          <div className="relative mt-1">
            <input
              type="number"
              min="0.01"
              step="0.01"
              className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">€</span>
          </div>
        </div>

        {/* Nom de la banque (uniquement pour les dépôts) */}
        {type === 'deposit' && (
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Nom de la banque *</label>
            <input
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              placeholder="Ex: BNP Paribas, Société Générale..."
            />
          </div>
        )}

        {/* Libellé optionnel */}
        <div>
          <label className="text-[11px] text-slate-500 font-medium">Libellé <span className="text-slate-300">(optionnel)</span></label>
          <input
            className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px] mt-1 focus:outline-none focus:ring-2 focus:ring-teal-500"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="Ex: Crédit de bienvenue"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !selectedUser || !amount || (type === 'deposit' && !bankName?.trim())}
          className={`w-full rounded-xl py-2.5 text-[12px] font-medium transition disabled:opacity-40 ${
            type === 'deposit'
              ? 'bg-teal-700 hover:bg-teal-800 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          }`}
        >
          {saving ? 'Traitement...' : type === 'deposit' ? `Créditer ${amount ? amount + ' €' : ''}` : `Débiter ${amount ? amount + ' €' : ''}`}
        </button>
      </div>
    </div>
  );
}
