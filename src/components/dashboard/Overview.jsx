import { useAuth } from '../../context/AuthContext';
import { getClientGreeting } from '../../utils/greeting';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, ArrowRight, Globe, ArrowLeftRight, Activity, AlertCircle, CheckCircle2, Clock, Ban } from 'lucide-react';
import ModalMessage from './ModalMessage.jsx';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function txDate(tx) {
  if (!tx.createdAt) return '—';
  const d = typeof tx.createdAt === 'string' ? new Date(tx.createdAt) : tx.createdAt?.toDate?.() || new Date(tx.createdAt);
  return format(d, "d MMM, HH:mm", { locale: fr });
}

export default function Overview({ account, transactions, notifications, onNavigate, card }) {
  const { userProfile, user } = useAuth();
  const { salut, name } = getClientGreeting(userProfile, user);

  const totalIn  = transactions.filter(t => t.type === 'deposit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalOut = transactions.filter(t => t.type === 'withdrawal').reduce((s, t) => s + (t.amount || 0), 0);
  const epargne  = totalIn - totalOut;
  const chartData = buildChart(transactions, account?.balance || 0);
  const recent = transactions.slice(0, 5);
  const accStatus = userProfile?.accountStatus || 'pending';
  const statusRow =
    accStatus === 'active'
      ? { Icon: CheckCircle2, text: 'Compte actif', cls: 'text-teal-700 bg-teal-50 border-teal-100' }
      : accStatus === 'suspended'
        ? { Icon: Ban, text: 'Compte suspendu', cls: 'text-red-700 bg-red-50 border-red-100' }
        : { Icon: Clock, text: 'En attente de validation', cls: 'text-amber-800 bg-amber-50 border-amber-100' };
  const StatusIcon = statusRow.Icon;

  return (
    <div className="space-y-4 md:space-y-5 fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[13px] text-slate-500 font-medium leading-tight first-letter:uppercase">
            {format(new Date(), "EEEE d MMMM yyyy", { locale: fr })}
          </p>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-tight text-slate-900 mt-1 leading-tight">
            <span className="text-teal-800">{salut}</span>
            {name ? (
              <>
                <span className="text-slate-400 font-normal">, </span>
                <span className="text-slate-900">{name}</span>
              </>
            ) : null}
          </h1>
          <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg border text-[11px] font-medium ${statusRow.cls}`}>
            <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" />
            {statusRow.text}
          </div>
        </div>
        {userProfile?.kycStatus === 'pending' && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium px-3 py-2 rounded-xl shrink-0 self-start">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            KYC à compléter
          </div>
        )}
      </div>

      {/* KYC Banner */}
      {userProfile?.kycStatus === 'pending' && !userProfile?.accountStatus === 'suspended' && (
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
                IBAN <strong>inactif</strong> - Veuillez compléter le processus d'activation pour utiliser tous les services.
              </p>
            </div>
          </div>
        )}
        {userProfile?.kycStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="w-9 h-9 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold text-amber-900">Vérification d'identité requise</p>
            <p className="text-[12px] text-amber-800/90 mt-0.5 leading-snug">Complétez votre KYC pour débloquer IBAN, virements et carte.</p>
          </div>
          <button type="button" onClick={() => onNavigate('profile')} className="w-full sm:w-auto bg-amber-600 text-white text-[12px] font-semibold px-4 py-2.5 rounded-xl hover:bg-amber-700 transition flex-shrink-0 touch-manipulation">
            Vérifier mon identité
          </button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Solde disponible',  value: fmt(account?.balance), color: 'text-teal-700', sub: 'Compte courant', up: true },
          { label: 'Dépenses du mois', value: fmt(totalOut), color: 'text-amber-700',  sub: 'Total débits', up: false },
          { label: 'Virements reçus',  value: fmt(totalIn),  color: 'text-blue-700',   sub: `${transactions.filter(t=>t.type==='deposit').length} opération(s)` },
          { label: 'Épargne estimée',  value: fmt(epargne),  color: 'text-slate-800',  sub: 'Entrées – sorties' },
        ].map((m, i) => (
          <div key={i} className="bg-white border border-slate-100 rounded-2xl p-3.5 sm:p-4 shadow-sm">
            <div className="text-[10px] sm:text-[11px] text-slate-500 mb-1 tracking-wide uppercase font-medium">{m.label}</div>
            <div className={`text-[16px] sm:text-[19px] font-semibold font-mono tracking-tight leading-none break-all ${m.color}`}>{m.value}</div>
            <div className={`text-[10px] sm:text-[10.5px] mt-1.5 flex items-center gap-1 ${m.up ? 'text-teal-700' : 'text-slate-400'}`}>
              {m.up && <TrendingUp className="w-2.5 h-2.5 flex-shrink-0" />}
              <span className="line-clamp-2">{m.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main row */}
      <div className="flex flex-col xl:grid xl:grid-cols-[1fr_minmax(260px,300px)] gap-4">
        {/* Transactions */}
        <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2 mb-3.5">
            <span className="text-[13px] sm:text-[14px] font-semibold text-slate-800">Dernières transactions</span>
            <button type="button" onClick={() => onNavigate('transactions')} className="text-[11px] sm:text-[12px] text-teal-700 font-medium flex items-center gap-1 shrink-0 touch-manipulation py-1">
              Voir tout <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-0.5">
            {recent.length === 0 && (
              <p className="text-[12px] text-slate-400 text-center py-8">Aucune transaction</p>
            )}
            {recent.map(tx => {
              const isCredit = tx.type === 'deposit';
              const isTransfer = tx.label?.toLowerCase().includes('virement');
              const date = txDate(tx);
              return (
                <div key={tx.id} className="flex items-center gap-3 py-2.5 min-h-[52px] border-b border-slate-50 last:border-0">
                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                    isTransfer ? 'bg-blue-50 text-blue-800' : isCredit ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-700'
                  }`}>
                    {isTransfer ? <ArrowLeftRight className="w-3.5 h-3.5" /> : isCredit ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium truncate">
                      {tx.label || (isCredit ? (tx.bank_name ? `Dépôt ${tx.bank_name}` : 'Dépôt') : 'Retrait')}
                    </p>
                    <p className="text-[10.5px] text-slate-400">{date}</p>
                  </div>
                  <span className={`text-[12.5px] font-semibold font-mono ${isCredit ? 'text-teal-700' : 'text-red-600'}`}>
                    {isCredit ? '+' : '-'}{fmt(tx.amount)}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3.5 pt-3.5 border-t border-slate-50">
            <button type="button" onClick={() => onNavigate('transfer')} className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 text-[11.5px] font-medium hover:bg-white hover:border-slate-200 transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]">
              <ArrowLeftRight className="w-3.5 h-3.5" /> Virement
            </button>
            <button type="button" onClick={() => onNavigate('transactions')} className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 text-[11.5px] font-medium hover:bg-white hover:border-slate-200 transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[44px]">
              <Activity className="w-3.5 h-3.5" /> Historique
            </button>
          </div>
        </div>

        {/* Right col */}
        <div className="flex flex-col gap-4">
          {/* Card visual */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[13px] font-medium mb-3">Ma carte bancaire</p>
            <div className="bg-teal-700 rounded-[12px] p-4 text-white relative overflow-hidden card-shine mb-2.5">
              <div className="absolute top-0 right-0 w-20 h-20 bg-white/5 rounded-full -translate-y-8 translate-x-8" />
              <div className="w-6 h-4 bg-white/25 rounded-sm mb-3.5" />
              <div className="font-mono text-[12.5px] tracking-widest mb-3 opacity-90">•••• •••• •••• {card?.last4 || '——'}</div>
              <div className="flex justify-between items-end text-[10.5px] opacity-80">
                <div><div className="text-[9px] opacity-70 mb-0.5">TITULAIRE</div>{(userProfile?.displayName || '——').toUpperCase()}</div>
                <div><div className="text-[9px] opacity-70 mb-0.5">EXPIRE</div>12/28</div>
                <div className="text-[13px] font-bold">VISA</div>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex-1 bg-teal-50 text-teal-800 rounded-lg py-1.5 text-center text-[11px] font-medium">Active</div>
              <button type="button" onClick={() => onNavigate('card')} className="flex-1 bg-slate-50 border border-slate-100 rounded-xl py-2 text-center text-[11px] font-medium hover:bg-white transition touch-manipulation min-h-[40px]">Gérer</button>
            </div>
          </div>

          {/* IBAN */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2.5 gap-2">
              <p className="text-[13px] font-semibold text-slate-800">IBAN / BIC</p>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                account?.iban && account?.status === 'active' && account?.accountVerified ? 'bg-teal-50 text-teal-800'
                : account?.iban ? 'bg-amber-50 text-amber-700'
                : 'bg-slate-100 text-slate-500'
              }`}>
                {account?.iban && account?.status === 'active' && account?.accountVerified ? 'Actif' : account?.iban ? 'Inactif' : 'Non demandé'}
              </span>
            </div>
            {account?.iban ? (
              <div className="space-y-1.5">
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[9.5px] text-slate-400 font-mono mb-1">IBAN</div>
                  <div className="text-[11px] font-mono font-medium tracking-wide">{account.iban}</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-2">
                  <div className="text-[9.5px] text-slate-400 font-mono mb-1">BIC</div>
                  <div className="text-[11px] font-mono font-medium">{account.bic}</div>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => onNavigate('iban')} className="w-full bg-slate-50 border border-slate-100 rounded-xl py-3 text-[12px] font-medium text-teal-700 hover:bg-teal-50 transition flex items-center justify-center gap-1.5 touch-manipulation min-h-[48px]">
                <Globe className="w-3.5 h-3.5" /> Demander mon IBAN
              </button>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[13px] font-semibold text-slate-800 mb-2.5">Actions rapides</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Retrait', page: 'transactions' },
                { label: 'Virement', page: 'transfer' },
                ...(account?.iban && account?.status === 'active' && account?.accountVerified ? [] : [{ label: 'Activation', page: 'activation' }]),
                { label: 'Support',  page: 'profile' },
              ].map(a => (
                <button key={a.label} type="button" onClick={() => onNavigate(a.page)}
                  className="bg-slate-50 border border-slate-100 rounded-xl py-2.5 text-[12px] font-medium hover:bg-white hover:border-slate-200 transition touch-manipulation min-h-[44px]">
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <ModalMessage />
    </div>
  );
}

function parseTxDate(tx) {
  if (!tx.createdAt) return new Date(0);
  if (typeof tx.createdAt === 'string') return new Date(tx.createdAt);
  return tx.createdAt?.toDate?.() || new Date(tx.createdAt);
}

function buildChart(transactions, currentBalance) {
  if (!transactions.length) return [];
  const sorted = [...transactions].sort((a, b) => parseTxDate(a) - parseTxDate(b));
  let balance = currentBalance;
  const points = [];
  [...sorted].reverse().forEach((tx) => {
    points.unshift({ balance: Math.round(balance), date: format(parseTxDate(tx), 'dd/MM') });
    balance = tx.type === 'deposit' ? balance - tx.amount : balance + tx.amount;
  });
  return points.slice(-10);
}
