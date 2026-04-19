import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Key, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

function formatTimeRemaining(expiresAt) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires - now;
  if (diff <= 0) return 'Disponible maintenant';
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function getProgressPercentage(expiresAt) {
  const now = new Date();
  const expires = new Date(expiresAt);
  const startTime = new Date(expires.getTime() - 24 * 60 * 60 * 1000);
  const totalTime = 24 * 60 * 60 * 1000;
  const elapsed = now - startTime;
  return Math.min(Math.max((elapsed / totalTime) * 100, 0), 100);
}

export default function WithdrawalCodePage({ account, onSuccess }) {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [codeForm, setCodeForm] = useState({ code: '', requestId: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMyRequests();
    const interval = setInterval(() => {
      setRequests(prev => [...prev]);
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadMyRequests = async () => {
    try {
      const withdrawalRes = await api.get('/client/withdrawal-requests');
      setRequests(withdrawalRes.data.requests || []);
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10.5px] font-medium rounded-full"><Clock className="w-3 h-3" /> En attente</span>;
      case 'code_generated':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10.5px] font-medium rounded-full"><Key className="w-3 h-3" /> Code disponible</span>;
      case 'step_completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Étape validée</span>;
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Complété</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10.5px] font-medium rounded-full"><AlertCircle className="w-3 h-3" /> Rejeté</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-[10.5px] font-medium rounded-full">{status}</span>;
    }
  };

  const activeRequests = requests.filter(r => r.status === 'code_generated' || r.status === 'step_completed');

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
        <p className="text-[12px] text-slate-500 mt-0.5">Entrez votre code de retrait reçu par notification</p>
      </div>

      {/* Formulaire de validation du code */}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h2 className="text-[15px] font-semibold mb-4 flex items-center gap-2">
          <Key className="w-4 h-4 text-teal-600" />
          Valider un code de retrait
        </h2>

        {activeRequests.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-slate-100">
            <Key className="w-10 h-10 text-slate-400 mx-auto mb-2" />
            <p className="text-slate-600 text-sm">Aucun code de retrait disponible</p>
            <p className="text-slate-400 text-xs mt-1">Attendez qu'un code vous soit envoyé par notification</p>
          </div>
        ) : (
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
                {activeRequests.map(r => (
                  <option key={r.id} value={r.id}>
                    {fmt(r.amount)} — {r.status === 'code_generated' ? 'Code disponible' : 'Prochaine étape'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10.5px] font-medium text-slate-500 mb-1.5 block">Code de retrait (reçu par notification)</label>
              <input
                type="text"
                value={codeForm.code}
                onChange={(e) => setCodeForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: PREMIUMA4B7"
                maxLength={20}
                className="w-full px-3 py-2.5 border border-slate-200 rounded-xl text-[12px] bg-slate-50 focus:outline-none focus:border-teal-400 focus:bg-white transition uppercase font-mono tracking-wider"
                required
              />
              <p className="text-[10px] text-slate-400 mt-1">Format: STANDARD, PREMIUM, VIP ou BUSINESS + 4 caractères</p>
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
        )}
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
                {req.label && <p className="text-xs text-slate-600 mb-1">{req.label}</p>}

                {/* Progression */}
                {req.current_percentage !== undefined && Number(req.current_percentage) > 0 && (
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">Progression du virement</span>
                      <span className="text-xs font-medium text-slate-900">
                        {Number(req.current_percentage).toFixed(1)}% ({fmt(req.total_withdrawn)})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(Number(req.current_percentage) || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Compte à rebours 24h */}
                {req.status === 'code_generated' && req.code_expires_at && new Date(req.code_expires_at) > new Date() && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-medium text-amber-800">Délai d'attente :</span>
                      <span className="text-lg font-bold text-amber-900 ml-auto">{formatTimeRemaining(req.code_expires_at)}</span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-1.5 overflow-hidden mt-2">
                      <div
                        className="bg-gradient-to-r from-amber-400 to-amber-500 h-full rounded-full transition-all duration-1000"
                        style={{ width: `${getProgressPercentage(req.code_expires_at)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Étapes */}
                {req.steps && req.steps.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs font-medium text-slate-600">Étapes :</span>
                    <div className="mt-1 space-y-1">
                      {req.steps.map((step, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                          <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${
                            step.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {step.step_order}
                          </span>
                          <span>{step.percentage}% ({fmt(step.amount)})</span>
                          {step.is_completed && <CheckCircle className="w-3 h-3 text-green-600" />}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Prochaine condition */}
                {req.next_condition && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-2 mt-2">
                    <span className="font-medium text-blue-700 text-xs">Prochaine condition :</span>
                    <span className="ml-2 text-blue-900 text-xs">{req.next_condition}</span>
                  </div>
                )}

                {/* Étape validée — en attente de décision admin */}
                {req.status === 'step_completed' && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-medium text-purple-800">Étape validée — En attente</span>
                    </div>
                    <p className="text-xs text-purple-700 mt-1">
                      L'administrateur va générer un nouveau code ou valider totalement votre virement.
                    </p>
                  </div>
                )}

                {/* Virement complété */}
                {req.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Virement complété à 100% !</span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
