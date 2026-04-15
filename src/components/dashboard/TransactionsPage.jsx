import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Search, TrendingUp, TrendingDown, ArrowLeftRight, Minus } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function formatTxDate(createdAt) {
  if (!createdAt) return '—';
  const d = typeof createdAt === 'string' ? new Date(createdAt) : createdAt?.toDate?.() || new Date(createdAt);
  return format(d, "d MMM yyyy 'à' HH:mm", { locale: fr });
}

export default function TransactionsPage({ transactions, onRefresh }) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [witAmt, setWitAmt] = useState('');
  const [loading, setLoading] = useState(false);

  const filtered = transactions.filter((tx) => {
    const matchSearch = !search || (tx.label || '').toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || tx.type === filter;
    return matchSearch && matchFilter;
  });

  const totalIn = transactions.filter((t) => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter((t) => t.type === 'withdrawal').reduce((s, t) => s + t.amount, 0);

  const doWithdraw = async (e) => {
    e.preventDefault();
    const amount = parseFloat(witAmt);
    if (!amount || amount <= 0) return toast.error('Montant invalide');
    setLoading(true);
    try {
      await api.post('/withdraw', { amount, label: 'Retrait compte' });
      toast.success('Retrait enregistré');
      setWitAmt('');
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight">Transactions</h1>
        <p className="text-[12px] text-slate-500 mt-0.5">{transactions.length} opération(s) au total</p>
      </div>

      {onRefresh && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div></div>
          <form onSubmit={doWithdraw} className="bg-white border border-slate-100 rounded-xl p-4 flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-[10px] text-slate-500 font-medium">Retrait (€)</label>
              <input type="number" min="0.01" step="0.01" value={witAmt} onChange={(e) => setWitAmt(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-lg text-[12px]" placeholder="0,00" />
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-[12px] font-semibold flex items-center gap-1">
              <Minus className="w-4 h-4" /> Retirer
            </button>
          </form>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingDown className="w-4 h-4 text-teal-700" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-0.5">Total crédités</div>
            <div className="text-[18px] font-semibold font-mono text-teal-700 tracking-tight">{fmt(totalIn)}</div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 rounded-xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 bg-red-50 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 mb-0.5">Total débités</div>
            <div className="text-[18px] font-semibold font-mono text-red-600 tracking-tight">{fmt(totalOut)}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-[12px] focus:outline-none focus:border-teal-400 transition" />
        </div>
        <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1">
          { [['all', 'Tout'], ['deposit', 'Crédits'], ['withdrawal', 'Débits']].map(([val, label]) => (
            <button key={val} type="button" onClick={() => setFilter(val)}
              className={`px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition ${filter === val ? 'bg-teal-700 text-white' : 'text-slate-500 hover:bg-slate-50'}`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-[12px] text-slate-400">Aucune transaction trouvée</div>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtered.map((tx) => {
              const isCredit = tx.type === 'deposit';
              const isTransfer = tx.label?.toLowerCase().includes('virement');
              const date = formatTxDate(tx.createdAt);
              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50/50 transition">
                  <div className={`w-8 h-8 rounded-[10px] flex items-center justify-center flex-shrink-0 ${
                    isTransfer ? 'bg-blue-50 text-blue-700' : isCredit ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {isTransfer ? <ArrowLeftRight className="w-3.5 h-3.5" /> : isCredit ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-medium truncate">
                    {tx.label || (isCredit ? (tx.bank_name ? `Dépôt ${tx.bank_name}` : 'Dépôt') : 'Retrait')}
                  </p>
                    <p className="text-[10.5px] text-slate-400">{date}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-semibold font-mono text-[12.5px] ${isCredit ? 'text-teal-700' : 'text-red-600'}`}>
                      {isCredit ? '+' : '-'}{fmt(tx.amount)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
