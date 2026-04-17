import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeftRight, Info, TrendingUp, Eye } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function TransferPage({ account, onSuccess }) {
  const { user } = useAuth();
  const [form, setForm] = useState({ accountHolder: '', iban: '', bic: '', amount: '', label: '' });
  const [loading, setLoading] = useState(false);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [showProgress, setShowProgress] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const previewAmt = parseFloat(form.amount) || 0;
  const balanceAfter = (account?.balance || 0) - previewAmt;

  useEffect(() => {
    loadWithdrawalRequests();
  }, []);

  const loadWithdrawalRequests = async () => {
    try {
      const res = await api.get('/withdrawal-requests');
      setWithdrawalRequests(res.data.requests || []);
    } catch (e) {
      console.error('Erreur lors du chargement des demandes:', e);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!amount || amount <= 0) { toast.error('Montant invalide'); return; }
    if (amount > (account?.balance || 0)) { toast.error('Solde insuffisant'); return; }
    if (!form.accountHolder.trim()) { toast.error('Le nom du titulaire est requis'); return; }
    if (!form.iban.trim()) { toast.error('IBAN requis'); return; }
    if (!form.bic.trim()) { toast.error('BIC/SWIFT requis'); return; }
    setLoading(true);
    try {
      await api.post('/withdrawal-request', {
        accountHolder: form.accountHolder.trim(),
        iban: form.iban.trim(),
        bic: form.bic.trim(),
        amount,
        label: form.label || undefined,
      });
      toast.success('Demande de retrait soumise ! En attente de validation admin.');
      setForm({ accountHolder: '', iban: '', bic: '', amount: '', label: '' });
      await loadWithdrawalRequests();
      onSuccess?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors du virement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Virements</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">Effectuer et suivre vos demandes de virement</p>
        </div>
        {withdrawalRequests.length > 0 && (
          <button
            onClick={() => setShowProgress(!showProgress)}
            className="px-3 py-1.5 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded-lg text-[11.5px] font-medium transition flex items-center gap-1"
          >
            <Eye className="w-3 h-3" />
            {showProgress ? 'Masquer' : 'Voir'} la progression
          </button>
        )}
      </div>

      {/* Section progression des virements */}
      {showProgress && withdrawalRequests.length > 0 && (
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Virements en cours ({withdrawalRequests.length})
          </h3>
          <div className="space-y-3">
            {withdrawalRequests.map((req) => (
              <div key={req.id} className="bg-white rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{fmt(req.amount)}</p>
                    <p className="text-xs text-slate-500">vers {req.external_account_holder}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    req.status === 'completed' ? 'bg-green-100 text-green-700' :
                    req.status === 'code_generated' ? 'bg-blue-100 text-blue-700' :
                    req.status === 'step_completed' ? 'bg-purple-100 text-purple-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {req.status === 'pending' ? 'En attente' :
                     req.status === 'code_generated' ? 'Code généré' :
                     req.status === 'step_completed' ? 'Étape complétée' :
                     req.status === 'completed' ? 'Complété' : req.status}
                  </span>
                </div>
                
                {/* Barre de progression */}
                {req.current_percentage > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Progression</span>
                      <span className="text-xs font-medium text-teal-600">{Number(req.current_percentage).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(req.current_percentage, 100)}%` }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {fmt(req.total_withdrawn || 0)} / {fmt(req.amount)} versés
                    </div>
                  </div>
                )}

                {/* Étapes */}
                {req.steps && req.steps.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100">
                    <div className="flex gap-1">
                      {req.steps.map((step, idx) => (
                        <div
                          key={idx}
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                            step.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {step.is_completed ? '!' : step.step_order}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Formulaire de nouvelle demande */}
      <div className="max-w-lg">
        <div>
          <h2 className="text-[17px] font-semibold tracking-tight">Nouvelle demande de retrait</h2>
          <p className="text-[12px] text-slate-500 mt-0.5">Effectuer une demande de retrait vers un compte externe</p>
        </div>
      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex items-center gap-2">
        <Info className="w-4 h-4 text-amber-500 flex-shrink-0" />
        <p className="text-[11.5px] text-amber-700">Votre demande sera traitée par l'administrateur</p>
      </div>
      <form onSubmit={submit} className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
        <div>
          <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Nom du titulaire du compte</label>
          <input type="text" value={form.accountHolder} onChange={set('accountHolder')} placeholder="Jean Dupont" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
        </div>
        <div>
          <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">IBAN</label>
          <input type="text" value={form.iban} onChange={set('iban')} placeholder="Entrez votre IBAN" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
        </div>
        <div>
          <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">BIC/SWIFT</label>
          <input type="text" value={form.bic} onChange={set('bic')} placeholder="Entrez votre BIC" required
            className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Montant (€)</label>
            <input type="number" value={form.amount} onChange={set('amount')} min="0.01" step="0.01" placeholder="0,00" required
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition" />
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Motif du virement</label>
            <input type="text" value={form.label} onChange={set('label')} placeholder="Loyer, remboursement..."
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
          Soumettre la demande
        </button>
      </form>
      </div>
    </div>
  );
}
