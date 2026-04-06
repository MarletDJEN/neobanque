import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftRight, Info } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function TransferPage({ account, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ email: '', amount: '', label: '' });
  const [loading, setLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const previewAmt = parseFloat(form.amount) || 0;
  const balanceAfter = (account?.balance || 0) - previewAmt;

  const submit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return; }
    if (amount > (account?.balance || 0)) { toast.error('Solde insuffisant'); return; }
    if (form.email.trim().toLowerCase() === user?.email?.toLowerCase()) { toast.error('Impossible de vous virer à vous-même'); return; }
    setLoading(true);
    try {
      await api.post('/transfer', {
        toEmail: form.email.trim(),
        amount,
        label: form.label || undefined,
      });
      toast.success('Virement effectué !');
      setForm({ email: '', amount: '', label: '' });
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du virement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in max-w-lg">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight">Virement</h1>
        <p className="text-[12px] text-slate-500 mt-0.5">Transférer vers un compte NeoBank (même banque)</p>
      </div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0" />
        <p className="text-[11.5px] text-blue-700">Solde disponible : <strong>{fmt(account?.balance)}</strong></p>
      </div>
      <form onSubmit={submit} className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Email du bénéficiaire</label>
          <input type="email" value={form.email} onChange={set('email')} placeholder="beneficiaire@email.com" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Montant (€)</label>
            <input type="number" value={form.amount} onChange={set('amount')} min="0.01" step="0.01" placeholder="0,00" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Motif (optionnel)</label>
            <input type="text" value={form.label} onChange={set('label')} placeholder="Loyer…"
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
          <span className="text-[11px] text-slate-500">Solde après virement</span>
          <span className={`text-[13px] font-semibold font-mono ${balanceAfter < 0 ? 'text-red-600' : 'text-slate-800'}`}>
            {fmt(balanceAfter)}
          </span>
        </div>
        <button type="submit" disabled={loading}
          className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition flex items-center justify-center gap-2">
          {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
          Confirmer le virement
        </button>
      </form>
    </div>
  );
}
