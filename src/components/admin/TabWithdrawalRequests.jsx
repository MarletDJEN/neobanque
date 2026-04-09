import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { CheckCircle, XCircle, Clock, User, CreditCard, AlertCircle, Key, Plus, Trash2, Percent } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TabWithdrawalRequests() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [showStepsModal, setShowStepsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [stepsForm, setStepsForm] = useState({
    targetPercentage: 70,
    steps: [
      { percentage: 70, condition: '' }
    ]
  });

  useEffect(() => {
    loadRequests();
  }, []);

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

  const handleGenerateCode = async (id) => {
    if (!selectedRequest) return;
    
    setActionLoading(id);
    try {
      const res = await api.post(`/admin/withdrawal-requests/${id}/generate-code`, {
        targetPercentage: stepsForm.targetPercentage,
        steps: stepsForm.steps
      });
      toast.success('Code généré avec succès');
      setShowStepsModal(false);
      setStepsForm({
        targetPercentage: 70,
        steps: [{ percentage: 70, condition: '' }]
      });
      setSelectedRequest(null);
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la génération du code');
    } finally {
      setActionLoading(null);
    }
  };

  const openStepsModal = (request) => {
    setSelectedRequest(request);
    setStepsForm({
      targetPercentage: 70,
      steps: [{ percentage: 70, condition: '' }]
    });
    setShowStepsModal(true);
  };

  const addStep = () => {
    const usedPercentage = stepsForm.steps.reduce((sum, step) => sum + step.percentage, 0);
    const remainingPercentage = stepsForm.targetPercentage - usedPercentage;
    
    if (remainingPercentage <= 0) {
      toast.error('Pourcentage cible déjà atteint');
      return;
    }
    
    setStepsForm(prev => ({
      ...prev,
      steps: [...prev.steps, { percentage: remainingPercentage, condition: '' }]
    }));
  };

  const removeStep = (index) => {
    setStepsForm(prev => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index)
    }));
  };

  const updateStep = (index, field, value) => {
    setStepsForm(prev => ({
      ...prev,
      steps: prev.steps.map((step, i) => 
        i === index ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleReject = async (id) => {
    const reason = prompt('Motif du rejet :');
    if (!reason?.trim()) return;
    
    setActionLoading(id);
    try {
      await api.post(`/admin/withdrawal-requests/${id}/reject`, { reason });
      toast.success('Retrait rejeté avec succès');
      await loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionLoading(null);
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
      case 'approved':
      case 'completed':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-[10.5px] font-medium rounded-full"><CheckCircle className="w-3 h-3" /> Complété</span>;
      case 'rejected':
        return <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-[10.5px] font-medium rounded-full"><XCircle className="w-3 h-3" /> Rejeté</span>;
      default:
        return null;
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
                <div>
                  <span className="font-medium text-slate-700">Montant :</span>
                  <span className="ml-2 font-semibold text-teal-600">{fmt(req.amount)}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">Titulaire :</span>
                  <span className="ml-2 text-slate-900">{req.external_account_holder}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">IBAN :</span>
                  <span className="ml-2 font-mono text-xs text-slate-900">{req.external_iban}</span>
                </div>
                <div>
                  <span className="font-medium text-slate-700">BIC :</span>
                  <span className="ml-2 font-mono text-xs text-slate-900">{req.external_bic}</span>
                </div>
              </div>

              {req.label && (
                <div>
                  <span className="font-medium text-slate-700">Motif :</span>
                  <span className="ml-2 text-slate-900">{req.label}</span>
                </div>
              )}

              {req.code_expires_at && (
                <div className="text-xs text-blue-600">
                  <Key className="w-3 h-3 inline mr-1" />
                  Code expire: {fmtDate(req.code_expires_at)}
                </div>
              )}
              {req.current_percentage && (
                <div className="text-xs text-purple-600">
                  <Percent className="w-3 h-3 inline mr-1" />
                  Progression: {typeof req.current_percentage === 'number' ? req.current_percentage.toFixed(1) : req.current_percentage}% ({fmt(req.total_withdrawn)})
                </div>
              )}
              {req.target_percentage && (
                <div className="text-xs text-blue-600">
                  <CheckCircle className="w-3 h-3 inline mr-1" />
                  Objectif: {req.target_percentage}%
                </div>
              )}
              {req.steps && req.steps.length > 0 && (
                <div className="mt-2">
                  <span className="font-medium text-slate-700 text-xs">Étapes :</span>
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
              {req.reject_reason && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-2">
                  <span className="font-medium text-red-700">Motif de rejet :</span>
                  <span className="ml-2 text-red-900">{req.reject_reason}</span>
                </div>
              )}
              {req.final_condition && (
                <div className="bg-green-50 border border-green-100 rounded-lg p-2">
                  <span className="font-medium text-green-700">Condition finale :</span>
                  <span className="ml-2 text-green-900">{req.final_condition}</span>
                </div>
              )}

              {req.status === 'pending' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => openStepsModal(req)}
                    disabled={actionLoading === req.id}
                    className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {actionLoading === req.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Percent className="w-4 h-4" />
                    )}
                    Configurer étapes
                  </button>
                  <button
                    onClick={() => handleReject(req.id)}
                    disabled={actionLoading === req.id}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2"
                  >
                    {actionLoading === req.id ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                    Rejeter
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de configuration des étapes */}
      {showStepsModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">Configurer les étapes de retrait</h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Pourcentage cible total
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={stepsForm.targetPercentage}
                  onChange={(e) => setStepsForm(prev => ({ ...prev, targetPercentage: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Étapes de retrait
                  </label>
                  <button
                    onClick={addStep}
                    className="px-3 py-1 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter
                  </button>
                </div>
                
                <div className="space-y-2">
                  {stepsForm.steps.map((step, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <div className="flex-1">
                        <input
                          type="number"
                          min="0.1"
                          max="100"
                          step="0.1"
                          value={step.percentage}
                          onChange={(e) => updateStep(index, 'percentage', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                          placeholder="%"
                        />
                      </div>
                      <div className="flex-1">
                        <input
                          type="text"
                          value={step.condition}
                          onChange={(e) => updateStep(index, 'condition', e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-teal-500"
                          placeholder="Condition"
                        />
                      </div>
                      {stepsForm.steps.length > 1 && (
                        <button
                          onClick={() => removeStep(index)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="mt-2 text-xs text-slate-600">
                  Total: {stepsForm.steps.reduce((sum, step) => sum + step.percentage, 0)}% / {stepsForm.targetPercentage}%
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowStepsModal(false);
                    setSelectedRequest(null);
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  onClick={() => handleGenerateCode(selectedRequest.id)}
                  disabled={actionLoading === selectedRequest.id || stepsForm.steps.reduce((sum, step) => sum + step.percentage, 0) !== stepsForm.targetPercentage}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading === selectedRequest.id ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Générer code
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
