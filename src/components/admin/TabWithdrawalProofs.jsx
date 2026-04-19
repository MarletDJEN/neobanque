import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { CheckCircle, XCircle, Eye, Download, AlertCircle, Clock, User, Calendar, Image as ImageIcon, FileText, Filter } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function TabWithdrawalProofs({ load }) {
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectionReasons, setRejectionReasons] = useState({});

  useEffect(() => {
    loadProofs();
  }, []);

  const loadProofs = async () => {
    try {
      const { data } = await api.get('/admin/withdrawal-proofs');
      setProofs(data.proofs || []);
    } catch (e) {
      toast.error('Erreur lors du chargement des preuves');
    } finally {
      setLoading(false);
    }
  };

  const filteredProofs = proofs.filter(proof => {
    if (filter === 'all') return true;
    return proof.status === filter;
  });

  const handleApproveProof = async (proofId) => {
    setActionLoading(proofId);
    try {
      await api.post(`/admin/withdrawal-proofs/${proofId}/approve`);
      toast.success('Preuve approuvée - Étape validée');
      setRejectionReasons(prev => ({ ...prev, [proofId]: '' }));
      loadProofs();
      load(); // Recharger les données principales
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'approbation');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectProof = async (proofId) => {
    const reason = rejectionReasons[proofId]?.trim();
    if (!reason) {
      toast.error('Motif de rejet requis');
      return;
    }

    setActionLoading(proofId);
    try {
      await api.post(`/admin/withdrawal-proofs/${proofId}/reject`, { reason });
      toast.success('Preuve rejetée');
      setRejectionReasons(prev => ({ ...prev, [proofId]: '' }));
      loadProofs();
      load(); // Recharger les données principales
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors du rejet');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'text-amber-600 bg-amber-50';
      case 'approved': return 'text-green-600 bg-green-50';
      case 'rejected': return 'text-red-600 bg-red-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'approved': return 'Approuvée';
      case 'rejected': return 'Rejetée';
      default: return status;
    }
  };

  const renderProofContent = (proof) => {
    if (proof.proof_data) {
      // Image base64
      return (
        <div className="border rounded-lg overflow-hidden">
          <img 
            src={proof.proof_data} 
            alt="Preuve de virement" 
            className="w-full h-auto max-h-64 object-contain bg-white"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'flex';
            }}
          />
          <div className="p-4 bg-slate-100 flex items-center gap-3" style={{ display: 'none' }}>
            <ImageIcon className="w-8 h-8 text-slate-400" />
            <div>
              <p className="text-sm font-medium">Image non disponible</p>
              <p className="text-xs text-slate-500">Le fichier n'a pas pu être chargé</p>
            </div>
          </div>
        </div>
      );
    } else if (proof.proof_url) {
      // URL externe
      return (
        <div className="border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-slate-400" />
            <div className="flex-1">
              <p className="text-sm font-medium">Document externe</p>
              <p className="text-xs text-slate-500 truncate">{proof.proof_url}</p>
            </div>
            <a
              href={proof.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium hover:bg-teal-700 transition flex items-center gap-1"
            >
              <Eye className="w-3 h-3" />
              Ouvrir
            </a>
          </div>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="text-slate-500">Chargement...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Preuves de virement</h2>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Toutes ({proofs.length})</option>
            <option value="pending">En attente ({proofs.filter(p => p.status === 'pending').length})</option>
            <option value="approved">Approuvées ({proofs.filter(p => p.status === 'approved').length})</option>
            <option value="rejected">Rejetées ({proofs.filter(p => p.status === 'rejected').length})</option>
          </select>
        </div>
      </div>

      {/* Liste des preuves */}
      {filteredProofs.length === 0 ? (
        <div className="text-center py-8">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">
            {filter === 'all' ? 'Aucune preuve de virement' : `Aucune preuve ${filter === 'pending' ? 'en attente' : filter === 'approved' ? 'approuvée' : 'rejetée'}`}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProofs.map((proof) => (
            <div key={proof.id} className="bg-white border border-slate-200 rounded-xl p-6">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{proof.client_name || 'Client'}</p>
                    <p className="text-sm text-slate-500">{proof.client_email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(proof.status)}`}>
                        {getStatusText(proof.status)}
                      </span>
                      <p className="text-xs text-slate-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {fmtDate(proof.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Étape {proof.step_order}</p>
                  <p className="font-semibold text-teal-700">{fmt(proof.step_amount)}</p>
                </div>
              </div>

              {/* Détails du virement */}
              <div className="bg-slate-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-600">Montant total du virement:</p>
                    <p className="font-semibold text-slate-800">{fmt(proof.total_amount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">Bénéficiaire:</p>
                    <p className="font-semibold text-slate-800">{proof.external_account_holder}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">IBAN:</p>
                    <p className="font-mono text-sm">{proof.external_iban}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">BIC:</p>
                    <p className="font-mono text-sm">{proof.external_bic}</p>
                  </div>
                </div>
              </div>

              {/* Preuve */}
              <div className="mb-4">
                <h3 className="font-medium text-slate-800 mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Preuve de virement
                </h3>
                {renderProofContent(proof)}
              </div>

              {/* Motif de rejet */}
              {proof.status === 'rejected' && proof.admin_notes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-2">
                    <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Motif de rejet</p>
                      <p className="text-sm text-red-700">{proof.admin_notes}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              {proof.status === 'pending' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Motif de rejet (si applicable)</label>
                    <textarea
                      value={rejectionReasons[proof.id] || ''}
                      onChange={(e) => setRejectionReasons(prev => ({ ...prev, [proof.id]: e.target.value }))}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                      rows={2}
                      placeholder="Entrez le motif du rejet..."
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleApproveProof(proof.id)}
                      disabled={actionLoading === proof.id}
                      className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === proof.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Traitement...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          Approuver et valider l'étape
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleRejectProof(proof.id)}
                      disabled={actionLoading === proof.id}
                      className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {actionLoading === proof.id ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Traitement...
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          Rejeter
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
