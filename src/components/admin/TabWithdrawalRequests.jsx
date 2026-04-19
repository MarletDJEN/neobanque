import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { CheckCircle, XCircle, Clock, User, CreditCard, AlertCircle, Key, Plus, Trash2, Percent, ArrowRight, Flag } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TabWithdrawalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // Modal configuration étapes (approbation initiale)
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stepsForm, setStepsForm] = useState({ targetPercentage: 70, steps: [{ percentage: 70, condition: '' }] });

  // Modal décision après étape complétée (continuer ou finaliser)
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionRequest, setDecisionRequest] = useState(null);
  const [decisionForm, setDecisionForm] = useState({
    decision: 'continue',
    nextStepPercentage: 30,
    nextStepCondition: '',
    clientType: 'standard'
  });

  useEffect(() => { loadRequests(); }, []);

  const loadRequests = async () => {
    try {
      const res = await api.get('/admin/withdrawal-requests');
      setRequests(res.data.requests || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  // ---- Approbation initiale ----
  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      await api.post(`/admin/withdrawal-requests/${id}/approve`, {});
      toast.success('Demande approuvée (2 paliers de 50%)');
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const openStepsModal = (request) => {
    setSelectedRequest(request);
    setStepsForm({ targetPercentage: 70, steps: [{ percentage: 70, condition: '' }] });
    setShowStepsModal(true);
  };

  const handleConfigureAndApprove = async (requestId) => {
    setActionLoading(requestId);
    try {
      await api.post(`/admin/withdrawal-requests/${requestId}/approve`, {
        targetPercentage: stepsForm.targetPercentage,
        steps: stepsForm.steps
      });
      toast.success('Demande approuvée avec les étapes configurées');
      setShowStepsModal(false);
      setSelectedRequest(null);
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la configuration');
    } finally {
      setActionLoading(null);
    }
  };

  const addStep = () => {
    const used = stepsForm.steps.reduce((sum, s) => sum + s.percentage, 0);
    const remaining = stepsForm.targetPercentage - used;
    if (remaining <= 0) { toast.error('Pourcentage cible déjà atteint'); return; }
    setStepsForm(prev => ({ ...prev, steps: [...prev.steps, { percentage: remaining, condition: '' }] }));
  };

  const removeStep = (i) => setStepsForm(prev => ({ ...prev, steps: prev.steps.filter((_, idx) => idx !== i) }));
  const updateStep = (i, field, val) => setStepsForm(prev => ({
    ...prev, steps: prev.steps.map((s, idx) => idx === i ? { ...s, [field]: val } : s)
  }));

  // ---- Génération code par type (statut code_generated) ----
  const handleGenerateAndSendCode = async (request, stepOrder, clientType) => {
    setActionLoading(request.id);
    try {
      const res = await api.post(`/admin/withdrawal-requests/${request.id}/generate-and-send-code`, { stepOrder, clientType });
      toast.success(`Code ${clientType.toUpperCase()} généré : ${res.data.code}`);
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la génération du code');
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Décision après étape complétée (step_completed) ----
  const openDecisionModal = (request) => {
    setDecisionRequest(request);
    const alreadyWithdrawnPct = Number(request.current_percentage) || 0;
    const remaining = Math.max(1, Math.round(100 - alreadyWithdrawnPct));
    setDecisionForm({
      decision: 'continue',
      nextStepPercentage: Math.min(remaining, 30),
      nextStepCondition: '',
      clientType: 'standard'
    });
    setShowDecisionModal(true);
  };

  const handleDecision = async () => {
    if (!decisionRequest) return;
    setActionLoading(decisionRequest.id);
    try {
      const payload = { decision: decisionForm.decision };
      if (decisionForm.decision === 'continue') {
        payload.nextStepPercentage = decisionForm.nextStepPercentage;
        payload.nextStepCondition = decisionForm.nextStepCondition;
        payload.clientType = decisionForm.clientType;
      }
      const res = await api.post(`/admin/withdrawal-requests/${decisionRequest.id}/decide`, payload);
      if (decisionForm.decision === 'complete') {
        toast.success('✅ Virement validé à 100% ! Le client a été notifié.');
      } else {
        toast.success(`Nouveau code ${decisionForm.clientType.toUpperCase()} envoyé : ${res.data.code}`);
      }
      setShowDecisionModal(false);
      setDecisionRequest(null);
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la décision');
    } finally {
      setActionLoading(null);
    }
  };

  // ---- Rejet ----
  const handleReject = async (id) => {
    const reason = prompt('Motif du rejet :');
    if (!reason?.trim()) return;
    setActionLoading(id);
    try {
      await api.post(`/admin/withdrawal-requests/${id}/reject`, { reason });
      toast.success('Retrait rejeté');
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 text-[10.5px] font-medium rounded-full"><Clock className="w-3 h-3" /> En attente</span>;
      case 'code_generated': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10.5px] font-medium rounded-full"><Key className="w-3 h-3" /> Code généré</span>;
      case 'step_completed': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-[10.5px] font-medium rounded-full"><ArrowRight className="w-3 h-3" /> Étape complétée — décision requise</span>;
      case 'approved': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-[10.5px] font-medium rounded-full"><ArrowRight className="w-3 h-3" /> Approuvé — générer un code</span>;
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Complété</span>;
      case 'rejected': return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10.5px] font-medium rounded-full"><XCircle className="w-3 h-3" /> Rejeté</span>;
      default: return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CreditCard className="w-5 h-5 text-teal-600" />
        <h2 className="text-lg font-semibold">Demandes de retrait</h2>
        <span className="text-sm text-slate-500">({requests.length})</span>
      </div>

      {requests.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-100">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-600">Aucune demande de retrait</p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{req.name}</p>
                    <p className="text-xs text-slate-500">{req.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(req.status)}
                  <span className="text-xs text-slate-500">{fmtDate(req.created_at)}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium text-slate-700">Montant :</span><span className="ml-2 font-semibold text-teal-600">{fmt(req.amount)}</span></div>
                <div><span className="font-medium text-slate-700">Titulaire :</span><span className="ml-2 text-slate-900">{req.external_account_holder}</span></div>
                <div><span className="font-medium text-slate-700">IBAN :</span><span className="ml-2 font-mono text-xs text-slate-900">{req.external_iban}</span></div>
                <div><span className="font-medium text-slate-700">BIC :</span><span className="ml-2 font-mono text-xs text-slate-900">{req.external_bic}</span></div>
              </div>

              {req.label && <div><span className="font-medium text-slate-700">Motif :</span><span className="ml-2 text-slate-900">{req.label}</span></div>}

              {/* Progression */}
              {req.current_percentage > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-600">Progression</span>
                    <span className="text-xs font-medium">{Number(req.current_percentage).toFixed(1)}% ({fmt(req.total_withdrawn)})</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-teal-600 h-full rounded-full" style={{ width: `${Math.min(req.current_percentage, 100)}%` }} />
                  </div>
                </div>
              )}

              {/* Étapes */}
              {req.steps && req.steps.length > 0 && (
                <div>
                  <span className="font-medium text-slate-700 text-xs">Étapes :</span>
                  <div className="mt-1 space-y-1">
                    {req.steps.map((step, idx) => (
                      <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-medium ${step.is_completed ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {step.step_order}
                        </span>
                        <span>{step.percentage}% ({fmt(step.amount)})</span>
                        {step.is_completed && <CheckCircle className="w-3 h-3 text-green-600" />}
                        {step.condition && <span className="text-slate-400 italic">— {step.condition}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {req.reject_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                  <span className="font-medium text-red-700">Motif de rejet :</span>
                  <span className="ml-2 text-red-900">{req.reject_reason}</span>
                </div>
              )}

              {/* ---- Actions selon le statut ---- */}

              {/* PENDING : approuver / configurer / rejeter */}
              {req.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button onClick={() => handleApprove(req.id)} disabled={actionLoading === req.id}
                    className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2">
                    {actionLoading === req.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                    Approuver (2×50%)
                  </button>
                  <button onClick={() => openStepsModal(req)} disabled={actionLoading === req.id}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2">
                    <Percent className="w-4 h-4" /> Configurer
                  </button>
                  <button onClick={() => handleReject(req.id)} disabled={actionLoading === req.id}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2">
                    {actionLoading === req.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Rejeter
                  </button>
                </div>
              )}

              {/* APPROVED : générer le premier code */}
              {req.status === 'approved' && (
                <div className="space-y-2 pt-2">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-blue-900 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" /> Demande approuvée — Générer le premier code
                    </p>
                    <p className="text-xs text-blue-700 mt-1">
                      La demande a été approuvée. Générer le premier code pour que le client puisse commencer le virement.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'standard', label: 'Standard', color: 'bg-gray-600 hover:bg-gray-700' },
                      { type: 'premium', label: 'Premium', color: 'bg-purple-600 hover:bg-purple-700' },
                      { type: 'vip', label: 'VIP', color: 'bg-amber-600 hover:bg-amber-700' },
                      { type: 'business', label: 'Business', color: 'bg-green-600 hover:bg-green-700' },
                    ].map(({ type, label, color }) => (
                      <button key={type}
                        onClick={() => handleGenerateAndSendCode(req, 1, type)}
                        disabled={actionLoading === req.id}
                        className={`py-2 ${color} disabled:opacity-50 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-1`}>
                        {actionLoading === req.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-3 h-3" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* CODE_GENERATED : envoyer un code par type de client */}
              {req.status === 'code_generated' && (
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-medium text-slate-600">Générer et envoyer un code par type de client :</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { type: 'standard', label: 'Standard', color: 'bg-gray-600 hover:bg-gray-700' },
                      { type: 'premium', label: 'Premium', color: 'bg-purple-600 hover:bg-purple-700' },
                      { type: 'vip', label: 'VIP', color: 'bg-amber-600 hover:bg-amber-700' },
                      { type: 'business', label: 'Business', color: 'bg-green-600 hover:bg-green-700' },
                    ].map(({ type, label, color }) => (
                      <button key={type}
                        onClick={() => handleGenerateAndSendCode(req, (req.steps?.filter(s => !s.is_completed)[0]?.step_order) || 1, type)}
                        disabled={actionLoading === req.id}
                        className={`py-2 ${color} disabled:opacity-50 text-white font-medium text-xs rounded-lg transition flex items-center justify-center gap-1`}>
                        {actionLoading === req.id ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Key className="w-3 h-3" />}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP_COMPLETED : décision admin — continuer ou compléter */}
              {req.status === 'step_completed' && (
                <div className="pt-2 space-y-2">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                    <p className="text-sm font-semibold text-purple-900 flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" /> Étape complétée — Que souhaitez-vous faire ?
                    </p>
                    <p className="text-xs text-purple-700 mt-1">
                      Le client a validé son code. Vous pouvez demander une nouvelle étape ou valider totalement le virement.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => openDecisionModal(req)} disabled={actionLoading === req.id}
                      className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2">
                      {actionLoading === req.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                      Décider de la suite
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ---- Modal configuration des étapes (approbation initiale) ---- */}
      {showStepsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configurer les étapes de retrait</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">Pourcentage cible total</label>
                <input type="number" min="1" max="100" value={stepsForm.targetPercentage}
                  onChange={(e) => setStepsForm(prev => ({ ...prev, targetPercentage: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500" />
              </div>
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">Étapes</label>
                  <button onClick={addStep} className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Ajouter
                  </button>
                </div>
                <div className="space-y-2">
                  {stepsForm.steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input type="number" min="0.1" max="100" step="0.1" value={step.percentage}
                        onChange={(e) => updateStep(index, 'percentage', Number(e.target.value))}
                        className="w-20 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500" placeholder="%" />
                      <input type="text" value={step.condition}
                        onChange={(e) => updateStep(index, 'condition', e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500" placeholder="Condition (optionnel)" />
                      {stepsForm.steps.length > 1 && (
                        <button onClick={() => removeStep(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-slate-600">
                  Total: {stepsForm.steps.reduce((s, step) => s + step.percentage, 0)}% / {stepsForm.targetPercentage}%
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setShowStepsModal(false); setSelectedRequest(null); }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
                <button onClick={() => handleConfigureAndApprove(selectedRequest.id)}
                  disabled={actionLoading === selectedRequest.id || Math.abs(stepsForm.steps.reduce((s, step) => s + step.percentage, 0) - stepsForm.targetPercentage) > 1}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2">
                  {actionLoading === selectedRequest.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Approuver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---- Modal décision après étape complétée ---- */}
      {showDecisionModal && decisionRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-6 space-y-5">
              <div>
                <h3 className="text-lg font-semibold">Décision sur le virement</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Client : <strong>{decisionRequest.name}</strong> — {fmt(decisionRequest.amount)}
                  {decisionRequest.current_percentage > 0 && ` (${Number(decisionRequest.current_percentage).toFixed(1)}% déjà traité)`}
                </p>
              </div>

              {/* Choix : continuer ou compléter */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDecisionForm(f => ({ ...f, decision: 'continue' }))}
                  className={`p-3 rounded-xl border-2 text-left transition ${decisionForm.decision === 'continue' ? 'border-purple-500 bg-purple-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <ArrowRight className="w-5 h-5 text-purple-600 mb-1" />
                  <p className="font-semibold text-sm text-slate-900">Continuer</p>
                  <p className="text-xs text-slate-500 mt-0.5">Demander un nouveau code au client</p>
                </button>
                <button
                  onClick={() => setDecisionForm(f => ({ ...f, decision: 'complete' }))}
                  className={`p-3 rounded-xl border-2 text-left transition ${decisionForm.decision === 'complete' ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300'}`}>
                  <Flag className="w-5 h-5 text-green-600 mb-1" />
                  <p className="font-semibold text-sm text-slate-900">Valider à 100%</p>
                  <p className="text-xs text-slate-500 mt-0.5">Compléter totalement le virement</p>
                </button>
              </div>

              {/* Options supplémentaires si "continuer" */}
              {decisionForm.decision === 'continue' && (
                <div className="space-y-3 pt-1">
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Pourcentage de la prochaine étape</label>
                    <input type="number" min="1" max="100" value={decisionForm.nextStepPercentage}
                      onChange={(e) => setDecisionForm(f => ({ ...f, nextStepPercentage: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Montant estimé : {fmt(Number(decisionRequest.amount) * decisionForm.nextStepPercentage / 100)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Condition (optionnel)</label>
                    <input type="text" value={decisionForm.nextStepCondition}
                      onChange={(e) => setDecisionForm(f => ({ ...f, nextStepCondition: e.target.value }))}
                      placeholder="Ex: Vérification de fonds…"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-purple-500" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-600 mb-1 block">Type de code client</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { type: 'standard', label: 'Standard', color: 'bg-gray-500' },
                        { type: 'premium', label: 'Premium', color: 'bg-purple-500' },
                        { type: 'vip', label: 'VIP', color: 'bg-amber-500' },
                        { type: 'business', label: 'Business', color: 'bg-green-500' },
                      ].map(({ type, label, color }) => (
                        <button key={type}
                          onClick={() => setDecisionForm(f => ({ ...f, clientType: type }))}
                          className={`py-1.5 text-xs rounded-lg font-medium transition text-white ${decisionForm.clientType === type ? color + ' ring-2 ring-offset-1 ring-slate-400' : color + ' opacity-50 hover:opacity-75'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Confirmation si "compléter" */}
              {decisionForm.decision === 'complete' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-sm text-green-800 font-medium">⚠️ Confirmation</p>
                  <p className="text-xs text-green-700 mt-1">
                    Le virement sera marqué comme complété à 100%. Le solde restant ({fmt(Number(decisionRequest.amount) - Number(decisionRequest.total_withdrawn || 0))}) sera débité du compte client et le client sera notifié.
                  </p>
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button onClick={() => { setShowDecisionModal(false); setDecisionRequest(null); }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50">Annuler</button>
                <button onClick={handleDecision} disabled={actionLoading === decisionRequest.id}
                  className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 font-medium ${decisionForm.decision === 'complete' ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                  {actionLoading === decisionRequest.id ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> :
                    decisionForm.decision === 'complete' ? <Flag className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />
                  }
                  {decisionForm.decision === 'complete' ? 'Valider à 100%' : 'Envoyer le code'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
