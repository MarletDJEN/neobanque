import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { ArrowLeftRight, Clock, CheckCircle, Key, AlertCircle, TrendingUp, User, CreditCard } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => format(new Date(d), "d MMM yyyy 'à' HH:mm", { locale: fr });

export default function WithdrawalProgressPage({ account, onRefresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeInput, setCodeInput] = useState('');
  const [submittingCode, setSubmittingCode] = useState(null);

  useEffect(() => {
    loadWithdrawalRequests();
  }, []);

  const loadWithdrawalRequests = async () => {
    try {
      const res = await api.get('/client/withdrawal-requests');
      setRequests(res.data.requests || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (requestId) => {
    if (!codeInput.trim()) {
      toast.error('Veuillez entrer un code');
      return;
    }
    
    setSubmittingCode(requestId);
    try {
      await api.post(`/client/withdrawal-requests/${requestId}/submit-code`, { code: codeInput.trim() });
      toast.success('Code validé !');
      setCodeInput('');
      await loadWithdrawalRequests();
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Code invalide');
    } finally {
      setSubmittingCode(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10.5px] font-medium rounded-full"><Clock className="w-3 h-3" /> En attente</span>;
      case 'code_generated': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10.5px] font-medium rounded-full"><Key className="w-3 h-3" /> Code généré</span>;
      case 'step_completed': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Étape complétée</span>;
      case 'approved':
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Complété</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10.5px] font-medium rounded-full"><AlertCircle className="w-3 h-3" /> Rejeté</span>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-teal-600" />
        <h1 className="text-[19px] font-semibold tracking-tight">Suivi des virements</h1>
        <span className="text-sm text-slate-500">({requests.length})</span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Aucune demande de virement en cours</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
              {/* En-tête avec statut */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Virement vers {req.external_account_holder}</p>
                    <p className="text-xs text-slate-500">IBAN: {req.external_iban?.slice(0, 8)}****</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(req.status)}
                  <span className="text-xs text-slate-500">{fmtDate(req.created_at)}</span>
                </div>
              </div>

              {/* Détails du virement */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm bg-slate-50 rounded-lg p-3">
                <div><span className="font-medium text-slate-700">Montant total :</span><span className="ml-2 font-semibold text-teal-600">{fmt(req.amount)}</span></div>
                <div><span className="font-medium text-slate-700">Déjà versé :</span><span className="ml-2 font-semibold text-blue-600">{fmt(req.total_withdrawn || 0)}</span></div>
                <div><span className="font-medium text-slate-700">Reste à verser :</span><span className="ml-2 font-semibold text-orange-600">{fmt(Number(req.amount) - Number(req.total_withdrawn || 0))}</span></div>
                <div><span className="font-medium text-slate-700">Bénéficiaire :</span><span className="ml-2 text-slate-900">{req.external_account_holder}</span></div>
              </div>

              {/* Barre de progression */}
              {req.current_percentage > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Progression du virement</span>
                    <span className="text-sm font-bold text-teal-600">{Number(req.current_percentage).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500 ease-out flex items-center justify-end pr-1"
                      style={{ width: `${Math.min(req.current_percentage, 100)}%` }}
                    >
                      {req.current_percentage >= 10 && (
                        <span className="text-[10px] text-white font-medium">{Number(req.current_percentage).toFixed(0)}%</span>
                      )}
                    </div>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {fmt(req.total_withdrawn || 0)} / {fmt(req.amount)} versés
                  </div>
                </div>
              )}

              {/* Étapes détaillées */}
              {req.steps && req.steps.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Étapes du virement</h4>
                  <div className="space-y-2">
                    {req.steps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-3 text-sm p-2 bg-slate-50 rounded-lg">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-medium ${
                          step.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {step.is_completed ? <CheckCircle className="w-3 h-3" /> : step.step_order}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{step.percentage}%</span>
                            <span className="text-slate-500">({fmt(step.amount)})</span>
                            {step.is_completed && <CheckCircle className="w-3 h-3 text-green-600" />}
                          </div>
                          {step.condition && <span className="text-xs text-slate-400">{step.condition}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Zone de saisie du code */}
              {req.status === 'code_generated' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    Code de virement reçu
                  </h4>
                  <p className="text-xs text-blue-700 mb-3">
                    Entrez le code que vous avez reçu par email pour faire progresser votre virement
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={codeInput}
                      onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                      placeholder="CODE-XXXX"
                      className="flex-1 px-3 py-2 border border-blue-300 rounded-lg text-sm font-mono focus:outline-none focus:border-blue-500"
                      maxLength={12}
                    />
                    <button
                      onClick={() => submitCode(req.id)}
                      disabled={submittingCode === req.id || !codeInput.trim()}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center gap-2"
                    >
                      {submittingCode === req.id ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      Valider
                    </button>
                  </div>
                </div>
              )}

              {/* Message si complété */}
              {req.status === 'completed' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-green-800">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-semibold">Virement complété avec succès !</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Le montant total de {fmt(req.amount)} a été versé sur le compte de {req.external_account_holder}
                  </p>
                </div>
              )}

              {/* Message si rejeté */}
              {req.status === 'rejected' && req.reject_reason && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <AlertCircle className="w-5 h-5" />
                    <span className="font-semibold">Virement rejeté</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">Motif : {req.reject_reason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
