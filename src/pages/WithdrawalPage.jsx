import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Upload, CheckCircle, XCircle, Clock, AlertCircle, FileText, Euro, User, Calendar, TrendingUp, Key } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function WithdrawalPage() {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  
  // Formulaire de demande
  const [form, setForm] = useState({
    amount: '',
    externalIban: '',
    externalBic: '',
    externalAccountHolder: '',
    reason: ''
  });
  
  // Preuve de virement
  const [proofFile, setProofFile] = useState(null);
  const [proofUrl, setProofUrl] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/dashboard');
      return;
    }
    loadRequests();
  }, [user, navigate]);

  const loadRequests = async () => {
    try {
      const { data } = await api.get('/client/withdrawal-requests');
      setRequests(data.requests || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des demandes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    if (!form.amount || !form.externalIban || !form.externalBic || !form.externalAccountHolder) {
      toast.error('Veuillez remplir tous les champs obligatoires');
      return;
    }

    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (amount > (userProfile?.balance || 0)) {
      toast.error('Solde insuffisant');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/client/withdrawal-requests', {
        amount,
        externalIban: form.externalIban.trim(),
        externalBic: form.externalBic.trim(),
        externalAccountHolder: form.externalAccountHolder.trim(),
        reason: form.reason.trim()
      });
      toast.success('Demande de retrait soumise avec succès');
      setForm({ amount: '', externalIban: '', externalBic: '', externalAccountHolder: '', reason: '' });
      setShowForm(false);
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la soumission');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB
        toast.error('Le fichier ne doit pas dépasser 5MB');
        return;
      }
      setProofFile(file);
      setProofUrl('');
    }
  };

  const handleGenerateCode = async (requestId) => {
    setUploadingProof(true);
    try {
      const { data } = await api.post(`/client/withdrawal-requests/${requestId}/generate-code`, {
        clientType: 'standard'
      });
      toast.success(`Code généré : ${data.code}`);
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la génération du code');
    } finally {
      setUploadingProof(false);
    }
  };

  const handleUploadProof = async (requestId) => {
    if (!proofFile && !proofUrl) {
      toast.error('Veuillez fournir une preuve (fichier ou URL)');
      return;
    }

    setUploadingProof(true);
    try {
      let proofData = {};
      if (proofFile) {
        const reader = new FileReader();
        reader.onload = async (e) => {
          proofData = { proof: e.target.result, filename: proofFile.name };
          await submitProof(requestId, proofData);
        };
        reader.readAsDataURL(proofFile);
      } else {
        proofData = { proof_url: proofUrl };
        await submitProof(requestId, proofData);
      }
    } catch (e) {
      toast.error('Erreur lors du téléchargement de la preuve');
      setUploadingProof(false);
    }
  };

  const submitProof = async (requestId, proofData) => {
    try {
      await api.post(`/client/withdrawal-requests/${requestId}/submit-proof`, proofData);
      toast.success('Preuve soumise avec succès');
      setProofFile(null);
      setProofUrl('');
      loadRequests();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de la soumission');
    } finally {
      setUploadingProof(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'approved': case 'code_generated': return 'text-blue-600 bg-blue-50';
      case 'step_completed': return 'text-purple-600 bg-purple-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvé';
      case 'code_generated': return 'Code généré';
      case 'step_completed': return 'Étape complétée';
      case 'completed': return 'Complété';
      case 'rejected': return 'Rejeté';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">Demandes de retrait</h1>
                <p className="text-slate-500">Gérez vos demandes de virement</p>
              </div>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Nouvelle demande
            </button>
          </div>
        </div>

        {/* Formulaire de demande */}
        {showForm && (
          <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Nouvelle demande de retrait</h2>
            <form onSubmit={handleSubmitRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Montant (EUR) *</label>
                  <div className="relative">
                    <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      max={userProfile?.balance || 0}
                      value={form.amount}
                      onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                      className="pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Solde disponible: {fmt(userProfile?.balance || 0)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Titulaire du compte *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={form.externalAccountHolder}
                      onChange={(e) => setForm(prev => ({ ...prev, externalAccountHolder: e.target.value }))}
                      className="pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      placeholder="Nom du titulaire"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IBAN externe *</label>
                  <input
                    type="text"
                    value={form.externalIban}
                    onChange={(e) => setForm(prev => ({ ...prev, externalIban: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                    placeholder="FR7630004000030000000000043"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">BIC externe *</label>
                  <input
                    type="text"
                    value={form.externalBic}
                    onChange={(e) => setForm(prev => ({ ...prev, externalBic: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono"
                    placeholder="BNPAFRPPXXX"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Motif</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  rows={3}
                  placeholder="Motif du retrait..."
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
                >
                  {submitting ? 'Soumission...' : 'Soumettre la demande'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Liste des demandes */}
        <div className="space-y-4">
          {requests.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center shadow-sm">
              <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">Aucune demande de retrait</p>
            </div>
          ) : (
            requests.map((request) => (
              <div key={request.id} className="bg-white rounded-xl p-6 shadow-sm">
                {/* En-tête */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                      <TrendingUp className="w-5 h-5 text-teal-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{fmt(request.amount)}</p>
                      <p className="text-sm text-slate-500">vers {request.external_account_holder}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                      {getStatusText(request.status)}
                    </span>
                    <p className="text-xs text-slate-500 mt-1">
                      <Calendar className="w-3 h-3 inline mr-1" />
                      {fmtDate(request.created_at)}
                    </p>
                  </div>
                </div>

                {/* Barre de progression */}
                {(request.status === 'approved' || request.status === 'code_generated' || request.status === 'step_completed') && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-slate-600 mb-2">
                      <span>Progression: {request.current_percentage || 0}%</span>
                      <span>Objectif: {request.target_percentage || 100}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div
                        className="bg-teal-600 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${request.current_percentage || 0}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Étape actuelle */}
                {request.next_condition && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">Prochaine étape</p>
                        <p className="text-sm text-amber-700">{request.next_condition}</p>
                        {request.step_amount && (
                          <p className="text-sm text-amber-600 mt-1">
                            Montant à débloquer: {fmt(request.step_amount)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Génération de code */}
                {(request.status === 'approved' || request.status === 'step_completed') && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-slate-800 mb-3">Générer un code de virement</h3>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-amber-800">Instructions</p>
                          <p className="text-sm text-amber-700">
                            1. Faites le virement du montant indiqué<br/>
                            2. Téléversez la preuve du virement<br/>
                            3. L'admin validera et le virement progressera
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleGenerateCode(request.id)}
                      disabled={uploadingProof}
                      className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition disabled:opacity-50 flex items-center gap-2"
                    >
                      <Key className="w-4 h-4" />
                      {uploadingProof ? 'Génération...' : 'Générer un code'}
                    </button>
                  </div>
                )}

                {/* Preuve de virement */}
                {request.status === 'code_generated' && (
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-slate-800 mb-3">Soumettre la preuve de virement</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                          Upload de preuve (image, max 5MB)
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        />
                        {proofFile && (
                          <p className="text-sm text-slate-600 mt-1">
                            Fichier sélectionné: {proofFile.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Ou URL de la preuve</label>
                        <input
                          type="url"
                          value={proofUrl}
                          onChange={(e) => setProofUrl(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                          placeholder="https://..."
                        />
                      </div>
                      <button
                        onClick={() => handleUploadProof(request.id)}
                        disabled={uploadingProof}
                        className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        {uploadingProof ? 'Téléchargement...' : 'Soumettre la preuve'}
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages de statut */}
                {request.status === 'completed' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <p className="font-medium text-green-800">Virement complété avec succès !</p>
                    </div>
                  </div>
                )}

                {request.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-2">
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-800">Demande rejetée</p>
                        {request.reject_reason && (
                          <p className="text-sm text-red-700 mt-1">Motif: {request.reject_reason}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
