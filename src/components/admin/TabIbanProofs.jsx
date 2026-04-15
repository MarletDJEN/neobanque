import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Check, X, Eye, AlertCircle, Clock, CheckCircle, User, Calendar, Image } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

function TabIbanProofs({ users, requests, load }) {
  const [selectedProof, setSelectedProof] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filtrer les preuves de virement (transfer_proof depuis account_activation_requests)
  const transferProofs = requests.filter((r) => {
    // Les preuves peuvent venir de account_activation_requests ou avoir un type direct
    return (
      (r.step === 'transfer_proof' && r.status) || // Depuis account_activation_requests
      (r.type === 'transfer_proof' && r.status) || // Type direct si disponible
      (r.status === 'pending' && !r.step && !r.type) // Fallback pour les demandes sans step/type
    );
  });
  const pending = transferProofs.filter((r) => r.status === 'pending');
  const approved = transferProofs.filter((r) => r.status === 'approved');
  const rejected = transferProofs.filter((r) => r.status === 'rejected');

  const getUserInfo = (userId) => {
    if (!userId) {
      console.warn('getUserInfo appelé avec userId null/undefined');
      return null;
    }
    const userInfo = users.find(u => u.id === userId);
    if (!userInfo) {
      console.warn('Aucun utilisateur trouvé pour userId:', userId, 'utilisateurs disponibles:', users.map(u => ({ id: u.id, email: u.email })));
    }
    return userInfo;
  };

  const handleApprove = async (proofId, userId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir approuver cette preuve ?')) return;
    
    setLoading(true);
    try {
      // Approuver la preuve et activer l'IBAN
      await api.post(`/admin/users/${userId}/approve-iban-proof`, { proofId });
      
      // Mettre à jour le statut IBAN à 'active'
      await api.post(`/admin/users/${userId}/iban`, { 
        iban: '', // Garder l'IBAN existant
        bic: '',
        activateIban: true // Flag pour activation
      });
      
      toast.success('✅ Preuve approuvée ! IBAN activé');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'approbation');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (proofId, userId) => {
    const reason = window.prompt('Raison du rejet (optionnel):');
    if (reason === null) return;
    
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/reject-iban-proof`, { 
        proofId, 
        reason: reason || 'Preuve invalide' 
      });
      
      toast.success('❌ Preuve rejetée');
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors du rejet');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-4">
      <h1 className="text-[18px] font-semibold">Preuves de virement IBAN</h1>
      
      {/* Statistiques */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-500" />
            <h3 className="font-medium text-[13px]">En attente</h3>
          </div>
          <p className="text-2xl font-bold text-amber-600">{pending.length}</p>
        </div>
        
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <h3 className="font-medium text-[13px]">Approuvées</h3>
          </div>
          <p className="text-2xl font-bold text-green-600">{approved.length}</p>
        </div>
        
        <div className="bg-white border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <X className="w-4 h-4 text-red-500" />
            <h3 className="font-medium text-[13px]">Rejetées</h3>
          </div>
          <p className="text-2xl font-bold text-red-600">{rejected.length}</p>
        </div>
      </div>

      {/* Liste des preuves */}
      <div className="space-y-3">
        <h2 className="text-[16px] font-medium mb-4">
          {pending.length > 0 && `${pending.length} preuve(s) en attente`}
          {pending.length === 0 && 'Aucune preuve en attente'}
        </h2>
        
        {pending.length === 0 ? (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
            <AlertCircle className="w-12 h-12 text-blue-500 mx-auto mb-3" />
            <h3 className="text-[16px] font-medium text-blue-800 mb-2">Aucune preuve en attente</h3>
            <p className="text-[13px] text-blue-700 max-w-md mx-auto">
              Les clients n'ont pas encore envoyé de preuves de virement pour activation IBAN.
            </p>
          </div>
        ) : (
          pending.map((proof) => {
            const userInfo = getUserInfo(proof.user_id || proof.userId);
            return (
              <div key={proof.id} className="bg-white border rounded-2xl p-4 space-y-4">
                {/* En-tête avec infos client */}
                <div className="flex items-start gap-3 pb-4 border-b">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <User className="w-4 h-4 text-slate-400" />
                      <div>
                        <p className="font-medium text-[13px]">{userInfo?.displayName || 'Client'}</p>
                        <p className="text-[11px] text-slate-500">{userInfo?.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                        proof.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                        proof.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {proof.status === 'pending' ? 'En attente' :
                         proof.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Détails de la preuve */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-[12px] text-slate-700 mb-2">Montant</h4>
                    <p className="text-[14px] font-bold text-teal-600">{fmt(proof.amount || 500)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[12px] text-slate-700 mb-2">Date d'envoi</h4>
                    <p className="text-[12px] text-slate-600">{formatDate(proof.created_at)}</p>
                  </div>
                </div>

                {/* Preuve visuelle */}
                <div>
                  <h4 className="font-medium text-[12px] text-slate-700 mb-2">Preuve de virement</h4>
                  {proof.proof_url ? (
                    <div className="border rounded-lg p-2 bg-slate-50">
                      <img 
                        src={proof.proof_url} 
                        alt="Preuve de virement" 
                        className="max-w-full h-48 object-contain cursor-pointer"
                        onClick={() => setSelectedProof(proof.proof_url)}
                      />
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic">Aucune preuve visuelle</p>
                  )}
                </div>

                {/* Actions */}
                {proof.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleApprove(proof.id, proof.user_id || proof.userId)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-medium rounded-lg text-[11px] transition"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Check className="w-4 h-4" />
                      )}
                      {loading ? 'Approbation...' : 'Approuver'}
                    </button>
                    
                    <button
                      onClick={() => handleReject(proof.id, proof.user_id || proof.userId)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-medium rounded-lg text-[11px] transition"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                      {loading ? 'Rejet...' : 'Rejeter'}
                    </button>
                  </div>
                )}

                {/* Statut final */}
                {proof.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <p className="text-[11px] text-green-800">
                      ✅ IBAN activé le {formatDate(proof.updated_at || proof.created_at)}
                    </p>
                  </div>
                )}

                {proof.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <p className="text-[11px] text-red-800">
                      ❌ Rejetée le {formatDate(proof.updated_at || proof.created_at)}
                      {proof.reason && <span className="block mt-1">Raison: {proof.reason}</span>}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal pour afficher la preuve en grand */}
      {selectedProof && (
        <div 
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedProof(null)}
        >
          <div 
            className="bg-white rounded-2xl max-w-4xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-semibold text-[16px]">Preuve de virement</h3>
              <button
                onClick={() => setSelectedProof(null)}
                className="p-1 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <div className="p-4">
              <img 
                src={selectedProof} 
                alt="Preuve de virement" 
                className="max-w-full max-h-[70vh] object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TabIbanProofs;
