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
  MessageSquare, AlertCircle, Upload, Trash2
} from 'lucide-react';
import TabIban from '../components/admin/TabIban';
import TabWithdrawalRequests from '../components/admin/TabWithdrawalRequests';
import TabWithdrawalProofs from '../components/admin/TabWithdrawalProofs';

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
  { id: 'clients', label: 'Comptes Clients', icon: Users },
  { id: 'iban', label: 'IBAN', icon: Globe },
  { id: 'withdrawal-requests', label: 'Retraits', icon: ArrowLeftRight },
  { id: 'withdrawal-proofs', label: 'Preuves Retrait', icon: Upload },
  { id: 'cards', label: 'Cartes', icon: CreditCard },
  { id: 'transactions', label: 'Transactions', icon: TrendingUp },
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
  }, [isAdmin, navigate, load]);

  if (!isAdmin) return null;
  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Chargement admin…</p>
      </div>
    );
  }

  const { users, requests, accounts, cards: cardsAdmin, cardRequests, transactions, kycSubmissions } = data;

  // Calculer les compteurs pour l'aperçu
  const pendingAccounts = users.filter((u) => u.accountStatus === 'pending').length;
  const pendingKyc = kycSubmissions.filter((r) => r.status === 'pending').length;
  const pendingIban = requests.filter((r) => (r.type === 'iban_request' || r.step === 'iban_request') && r.status === 'pending').length;
  const pendingCards = cardRequests.filter((c) => c.status === 'pending').length; // Utiliser cardRequests
  const pendingActivations = requests.filter((r) => r.step === 'transfer_proof' && r.status === 'pending').length;
  const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
  const shared = { users, requests, accounts, cards: cardsAdmin, cardRequests, transactions, kycSubmissions, setTab, load, adminId: user?.id };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">NeoBank Admin</h2>
        </div>
        <nav className="flex-1 p-2 space-y-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-teal-50 text-teal-700 border border-teal-200'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
          >
            <LogOut className="w-4 h-4" />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile menu */}
      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebar(false)} />
          <aside className="relative flex flex-col w-64 bg-white">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800">NeoBank Admin</h2>
              <button onClick={() => setSidebar(false)} className="text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-2 space-y-1">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                      tab === t.id
                        ? 'bg-teal-50 text-teal-700 border border-teal-200'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {t.label}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-100">
              <button
                onClick={logout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition"
              >
                <LogOut className="w-4 h-4" />
                Déconnexion
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
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
              {tab === 'iban' && <TabIban {...shared} />}
              {tab === 'withdrawal-requests' && <TabWithdrawalRequests {...shared} />}
              {tab === 'withdrawal-proofs' && <TabWithdrawalProofs {...shared} load={load} />}
              {tab === 'cards' && <TabCards {...shared} />}
              {tab === 'transactions' && <TabTx {...shared} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// TabOverview component
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
            <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3 sm:p-4">
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
          <button type="button" onClick={() => setTab('iban')} className="text-[11px] font-semibold text-amber-900 underline whitespace-nowrap">Voir les demandes IBAN</button>
        </div>
      )}
    </div>
  );
}

// TabClients component
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
  const assignIban = async (id) => {
    const iban = ibanForm[id]?.iban?.trim();
    const bic = ibanForm[id]?.bic?.trim();
    if (!iban || !bic) return toast.error('IBAN et BIC requis');
    await api.post(`/admin/users/${id}/iban`, { iban, bic });
    toast.success('IBAN attribué');
    load();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold">Comptes Clients</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher un client..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {selected && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{selected.displayName || selected.email}</h3>
            <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-600">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-600 font-medium">IBAN</label>
              <input
                type="text"
                value={ibanForm[selected.id]?.iban || ''}
                onChange={(e) => setIbanForm(prev => ({ ...prev, [selected.id]: { ...prev[selected.id], iban: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                placeholder="FR7630004000030000000000043"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600 font-medium">BIC</label>
              <input
                type="text"
                value={ibanForm[selected.id]?.bic || ''}
                onChange={(e) => setIbanForm(prev => ({ ...prev, [selected.id]: { ...prev[selected.id], bic: e.target.value } }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mt-1"
                placeholder="BNPAFRPP"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => assignIban(selected.id)} className="flex-1 bg-teal-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-teal-700">
              Attribuer IBAN
            </button>
            <button onClick={() => approveKycQuick(selected.id)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Approuver KYC
            </button>
            <button onClick={() => verify(selected.id)} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700">
              Valider compte
            </button>
            <button onClick={() => suspend(selected.id)} className="flex-1 bg-red-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-red-700">
              Suspendre
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 font-medium text-slate-700">Client</th>
                <th className="text-left p-3 font-medium text-slate-700">Statut</th>
                <th className="text-left p-3 font-medium text-slate-700">Solde</th>
                <th className="text-left p-3 font-medium text-slate-700">IBAN</th>
                <th className="text-left p-3 font-medium text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar name={u.displayName || u.email} />
                      <div>
                        <p className="font-medium">{u.displayName || 'N/A'}</p>
                        <p className="text-xs text-slate-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3">
                    <Chip color={u.accountStatus === 'active' ? 'green' : u.accountStatus === 'suspended' ? 'red' : 'amber'}>
                      {u.accountStatus || 'pending'}
                    </Chip>
                  </td>
                  <td className="p-3 font-mono">{fmt(acc(u.id)?.balance)}</td>
                  <td className="p-3 font-mono text-xs">{u.iban || '—'}</td>
                  <td className="p-3">
                    <button onClick={() => setSelected(u)} className="text-teal-600 hover:text-teal-700 text-xs font-medium">
                      Gérer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// TabCards component
function TabCards({ cards, cardRequests, users, load }) {
  const pending = cardRequests.filter((c) => c.status === 'pending'); // Utiliser cardRequests
  const [cardForms, setCardForms] = useState({});

  const getUserInfo = (userId) => {
    return users.find(u => u.id === userId);
  };

  const approveCard = async (cardId, userId) => {
    const form = cardForms[cardId];
    try {
      await api.post(`/admin/users/${userId}/card/activate`, {
        fullNumber: form.fullNumber,
        expiryMonth: form.expiryMonth,
        expiryYear: form.expiryYear,
        cvv: form.cvv
      });
      toast.success('Carte approuvée et activée');
      setCardForms(prev => ({ ...prev, [cardId]: {} }));
      load();
    } catch (e) {
      toast.error('Erreur lors de l\'approbation');
    }
  };

  const rejectCard = async (cardId, userId) => {
    try {
      await api.post(`/admin/users/${userId}/card/reject`);
      toast.success('Demande de carte rejetée');
      load();
    } catch (e) {
      toast.error('Erreur lors du rejet');
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Demandes de cartes</h1>
      {pending.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Aucune demande de carte en attente</p>
      ) : (
        pending.map(card => {
          const userInfo = getUserInfo(card.user_id || card.userId);
          return (
            <div key={card.id} className="bg-white border border-slate-100 rounded-xl p-4 space-y-3">
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
              
              {/* Formulaire d'approbation */}
              <div className="space-y-3 border-t pt-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">Numéro complet (16 chiffres)</label>
                    <input
                      type="text"
                      value={cardForms[card.id]?.fullNumber || ''}
                      onChange={(e) => setCardForms(prev => ({ ...prev, [card.id]: { ...prev[card.id], fullNumber: e.target.value } }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      placeholder="1234 5678 9012 3456"
                      maxLength={19}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">CVV (3 chiffres)</label>
                    <input
                      type="text"
                      value={cardForms[card.id]?.cvv || ''}
                      onChange={(e) => setCardForms(prev => ({ ...prev, [card.id]: { ...prev[card.id], cvv: e.target.value } }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      placeholder="123"
                      maxLength={3}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">Mois d'expiration</label>
                    <input
                      type="text"
                      value={cardForms[card.id]?.expiryMonth || ''}
                      onChange={(e) => setCardForms(prev => ({ ...prev, [card.id]: { ...prev[card.id], expiryMonth: e.target.value } }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      placeholder="12"
                      maxLength={2}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">Année d'expiration</label>
                    <input
                      type="text"
                      value={cardForms[card.id]?.expiryYear || ''}
                      onChange={(e) => setCardForms(prev => ({ ...prev, [card.id]: { ...prev[card.id], expiryYear: e.target.value } }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      placeholder="2028"
                      maxLength={4}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approveCard(card.id, card.user_id || card.userId)}
                    className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium rounded-lg text-[11px] transition"
                  >
                    Approuver et activer
                  </button>
                  <button
                    onClick={() => rejectCard(card.id, card.user_id || card.userId)}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg text-[11px] transition"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// TabTx component with deposit/withdrawal functionality
function TabTx({ users, load, transactions }) {
  const [selectedUser, setSelectedUser] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('deposit');
  const [label, setLabel] = useState('');
  const [bankName, setBankName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showTransactions, setShowTransactions] = useState(false);

  const clients = users.filter((u) => u.role !== 'admin');

  const filteredUsers = clients.filter((u) =>
    (u.displayName || u.name)?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const filtered = transactions.filter((t) => {
    const matchesSearch = !q || `${t.type} ${t.label}`.toLowerCase().includes(q.toLowerCase());
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const selected = clients.find((u) => u.id === selectedUser);
  const getUser = (userId) => users.find((u) => u.id === userId);

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
      toast.success(type === 'deposit' ? `+${amt} EUR crédité` : `-${amt} EUR débité`);
      setAmount('');
      setLabel('');
      setBankName('');
      setSelectedUser('');
      setUserSearch('');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold">Dépôts / Retraits</h1>
        <button
          onClick={() => setShowTransactions(!showTransactions)}
          className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition"
        >
          {showTransactions ? 'Masquer' : 'Voir'} les transactions
        </button>
      </div>

      {/* Deposit/Withdrawal Form */}
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
                  onClick={() => { setSelectedUser(u.id); setUserSearch(u.displayName || u.name); }}
                  className="w-full flex items-center gap-2 px-3 py-2 hover:bg-teal-50 transition text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-800 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                    {(u.displayName || u.name)?.slice(0, 2).toUpperCase() || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-slate-800 truncate">{u.displayName || u.name}</p>
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
                {(selected.displayName || selected.name)?.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-slate-800">{selected.displayName || selected.name}</p>
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
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-slate-400 font-medium">EUR</span>
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
          {saving ? 'Traitement...' : type === 'deposit' ? `Créditer ${amount ? amount + ' EUR' : ''}` : `Débiter ${amount ? amount + ' EUR' : ''}`}
        </button>
      </div>

      {/* Transactions List */}
      {showTransactions && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher une transaction..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-full focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Tous les types</option>
              <option value="deposit">Dépôts</option>
              <option value="withdrawal">Retraits</option>
              <option value="transfer">Virements</option>
            </select>
          </div>

          <div className="bg-white border border-slate-100 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left p-3 font-medium text-slate-700">Date</th>
                    <th className="text-left p-3 font-medium text-slate-700">Client</th>
                    <th className="text-left p-3 font-medium text-slate-700">Type</th>
                    <th className="text-left p-3 font-medium text-slate-700">Description</th>
                    <th className="text-right p-3 font-medium text-slate-700">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => {
                    const user = getUser(t.user_id);
                    return (
                      <tr key={t.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="p-3 text-slate-600">
                          {new Date(t.created_at).toLocaleDateString('fr-FR')}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <Avatar name={user?.displayName || user?.email} />
                            <span>{user?.displayName || user?.email}</span>
                          </div>
                        </td>
                        <td className="p-3">
                          <Chip color={t.type === 'deposit' ? 'green' : t.type === 'withdrawal' ? 'red' : 'blue'}>
                            {t.type === 'deposit' ? 'Dépôt' : t.type === 'withdrawal' ? 'Retrait' : 'Virement'}
                          </Chip>
                        </td>
                        <td className="p-3 text-slate-700">{t.label}</td>
                        <td className={`p-3 font-mono font-medium ${t.type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'deposit' ? '+' : '-'}{fmt(t.amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
