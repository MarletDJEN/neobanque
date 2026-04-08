import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Key, Clock, CheckCircle, AlertCircle, ArrowRight, Target } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function WithdrawalCodePage({ account, onSuccess }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeForm, setCodeForm] = useState({ code: '', requestId: '' });
  const [finalForm, setFinalForm] = useState({ requestId: '', condition: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMyRequests();
  }, []);

  const loadMyRequests = async () => {
    try {
      const res = await api.get('/transactions');
      // Filtrer les transactions de retrait et ajouter les demandes en cours
      const withdrawalTransactions = res.data.transactions.filter(t => t.type === 'withdrawal');
      
      // Récupérer aussi les demandes de retrait directement
      try {
        const withdrawalRes = await api.get('/withdrawal-requests/my-requests');
        const withdrawalRequests = withdrawalRes.data.requests || [];
        setRequests([...withdrawalTransactions, ...withdrawalRequests]);
      } catch (e) {
        // Si l'endpoint n'existe pas, utiliser seulement les transactions
        setRequests(withdrawalTransactions);
      }
    } catch (e) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleValidateCode = async (e) => {
    e.preventDefault();
    if (!codeForm.code.trim() || !codeForm.requestId) {
      toast.error('Code et demande requis');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/withdrawal-code/validate', {
        code: codeForm.code.trim(),
        requestId: codeForm.requestId
      });
      
      toast.success(res.data.message || 'Code validé avec succès');
      setCodeForm({ code: '', requestId: '' });
      await loadMyRequests();
      onSuccess?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la validation du code');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteWithdrawal = async (e) => {
    e.preventDefault();
    if (!finalForm.requestId || !finalForm.condition.trim()) {
      toast.error('Demande et condition finale requis');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post('/withdrawal-complete', {
        requestId: finalForm.requestId,
        finalCondition: finalForm.condition.trim()
      });
      
      toast.success(res.data.message || 'Retrait complété avec succès');
      setFinalForm({ requestId: '', condition: '' });
      await loadMyRequests();
      onSuccess?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la finalisation');
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10.5px] font-medium rounded-full"><Clock className="w-3 h-3" /> En attente</span>;
      case 'code_generated':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10.5px] font-medium rounded-full"><Key className="w-3 h-3" /> Code généré</span>;
      case 'step_completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Étape en cours</span>;
      case 'partial_completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Partiel (70%)</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Complété</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-[10.5px] font-medium rounded-full">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-[19px] font-semibold tracking-tight">Validation de retrait</h1>
        <p className="text-[12px] text-slate-500 mt-0.5">Entrez votre code de retrait ou complétez votre demande</p>
      </div>

      {/* Validation de code */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-teal-600" />
          Valider un code de retrait
        </h2>
        <form onSubmit={handleValidateCode} className="space-y-4">
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Sélectionner la demande</label>
            <select 
              value={codeForm.requestId} 
              onChange={(e) => setCodeForm(f => ({ ...f, requestId: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition"
              required
            >
              <option value="">Choisir une demande...</option>
              {requests.filter(r => r.status === 'code_generated').map(r => (
                <option key={r.id} value={r.id}>
                  {fmt(r.amount)} - {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Code de retrait (8 caractères)</label>
            <input 
              type="text" 
              value={codeForm.code} 
              onChange={(e) => setCodeForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="ABC12345" 
              maxLength={8}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition uppercase font-mono"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={actionLoading}
            className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Valider le code
          </button>
        </form>
      </div>

      {/* Finalisation de retrait */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-purple-600" />
          Compléter le retrait
        </h2>
        <form onSubmit={handleCompleteWithdrawal} className="space-y-4">
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Sélectionner la demande</label>
            <select 
              value={finalForm.requestId} 
              onChange={(e) => setFinalForm(f => ({ ...f, requestId: e.target.value }))}
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition"
              required
            >
              <option value="">Choisir une demande...</option>
              {requests.filter(r => r.status === 'partial_completed').map(r => (
                <option key={r.id} value={r.id}>
                  {fmt(r.amount)} - {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Condition finale (donnée par l'admin)</label>
            <input 
              type="text" 
              value={finalForm.condition} 
              onChange={(e) => setFinalForm(f => ({ ...f, condition: e.target.value }))}
              placeholder="Entrez la condition..." 
              className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition"
              required 
            />
          </div>
          <button 
            type="submit" 
            disabled={actionLoading}
            className="w-full py-2.5 bg-purple-700 hover:bg-purple-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition flex items-center justify-center gap-2"
          >
            {actionLoading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Compléter le retrait
          </button>
        </form>
      </div>

      {/* Liste des demandes */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="text-[15px] font-semibold mb-4">Mes demandes de retrait</h2>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-600">Aucune demande de retrait en cours</p>
          </div>
        ) : (
          <div className="space-y-3">
            {requests.map((req) => (
              <div key={req.id} className="border border-slate-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-slate-900">{fmt(req.amount)}</span>
                  {getStatusBadge(req.status)}
                </div>
                <p className="text-xs text-slate-600 mb-1">{req.label}</p>
                {req.current_percentage && (
                  <p className="text-xs text-purple-600">
                    <CheckCircle className="w-3 h-3 inline mr-1" />
                    Progression: {req.current_percentage?.toFixed(1)}% ({fmt(req.total_withdrawn)})
                  </p>
                )}
                {req.target_percentage && (
                  <p className="text-xs text-blue-600">
                    <Target className="w-3 h-3 inline mr-1" />
                    Objectif: {req.target_percentage}%
                  </p>
                )}
                {req.next_condition && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mt-2">
                    <span className="font-medium text-blue-700">Prochaine condition :</span>
                    <span className="ml-2 text-blue-900">{req.next_condition}</span>
                  </div>
                )}
                {req.code_expires_at && (
                  <p className="text-xs text-amber-600">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Expire: {fmtDate(req.code_expires_at)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
