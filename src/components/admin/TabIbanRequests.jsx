import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Check, X, User, RefreshCw, Clock, AlertCircle } from 'lucide-react';

function TabIbanRequests({ users, requests, load }) {
  const [loading, setLoading] = useState(false);
  const [manualIban, setManualIban] = useState({});
  const [showManualForm, setShowManualForm] = useState(false);

  // Filtrer les demandes IBAN
  const ibanRequests = requests.filter((r) => {
    return (
      r.type === 'iban_request' || 
      r.step === 'iban_request' ||
      (r.status && !r.step && !r.type) // Fallback
    );
  });

  const pending = ibanRequests.filter((r) => r.status === 'pending');
  const approved = ibanRequests.filter((r) => r.status === 'approved');
  const rejected = ibanRequests.filter((r) => r.status === 'rejected');

  const getUserInfo = (userId) => {
    if (!userId) return null;
    return users.find(u => u.id === userId);
  };

  const handleManualAssign = async (userId) => {
    const iban = manualIban[userId]?.iban?.trim();
    const bic = manualIban[userId]?.bic?.trim();
    
    if (!iban || !bic) {
      toast.error('IBAN et BIC sont requis');
      return;
    }
    
    // Validation minimale
    if (iban.length < 5) {
      toast.error('IBAN trop court (minimum 5 caractères)');
      return;
    }
    
    if (bic.length < 3) {
      toast.error('BIC trop court (minimum 3 caractères)');
      return;
    }
    
    if (!window.confirm(`Attribuer l'IBAN ${iban} et BIC ${bic} à cet utilisateur ?`)) return;
    
    setLoading(true);
    try {
      await api.post(`/admin/users/${userId}/iban`, { 
        iban,
        bic,
        activateIban: true 
      });
      
      toast.success('✅ IBAN et BIC attribués avec succès !');
      setManualIban(prev => ({ ...prev, [userId]: { iban: '', bic: '' } }));
      setShowManualForm(false);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur lors de l\'attribution');
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
      <div className="flex items-center justify-between">
        <h1 className="text-[18px] font-semibold">Demandes IBAN</h1>
        <button
          onClick={() => setShowManualForm(!showManualForm)}
          className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-[11px] font-medium transition"
        >
          {showManualForm ? 'Masquer' : 'Attribuer'} IBAN/BIC manuellement
        </button>
      </div>

      {/* Formulaire d'attribution manuelle */}
      {showManualForm && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
          <h3 className="text-[14px] font-semibold mb-2">🏦 Attribution personnalisée d'IBAN/BIC</h3>
          <p className="text-[11px] text-slate-600 mb-4">
            Entrez n'importe quel IBAN et BIC personnalisés. Les caractères seront conservés exactement comme saisis.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {users.filter(u => !u.iban || u.iban_status !== 'active').map(user => (
              <div key={user.id} className="bg-white border border-slate-100 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <User className="w-4 h-4 text-slate-600" />
                  <div>
                    <p className="font-medium text-[12px]">{user.displayName || 'Client'}</p>
                    <p className="text-[10px] text-slate-500">{user.email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">IBAN personnalisé</label>
                    <input
                      type="text"
                      placeholder="FR7630004000030000000000043"
                      value={manualIban[user.id]?.iban || ''}
                      onChange={(e) => setManualIban(prev => ({ 
                        ...prev, 
                        [user.id]: { ...prev[user.id], iban: e.target.value } 
                      }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-600 font-medium">BIC personnalisé</label>
                    <input
                      type="text"
                      placeholder="BNPAFRPPXXX"
                      value={manualIban[user.id]?.bic || ''}
                      onChange={(e) => setManualIban(prev => ({ 
                        ...prev, 
                        [user.id]: { ...prev[user.id], bic: e.target.value } 
                      }))}
                      className="w-full px-2 py-1.5 border border-slate-200 rounded text-[11px] focus:outline-none focus:border-teal-400"
                      style={{ fontFamily: 'monospace' }}
                    />
                  </div>
                  <button
                    onClick={() => handleManualAssign(user.id)}
                    disabled={loading}
                    className="w-full px-2 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white text-[11px] font-medium rounded transition"
                  >
                    {loading ? 'Attribution...' : 'Attribuer IBAN/BIC'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <Check className="w-4 h-4 text-green-500" />
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

      {/* Liste des demandes */}
      <div className="space-y-3">
        {ibanRequests.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="text-[13px]">Aucune demande IBAN en cours</p>
          </div>
        ) : (
          ibanRequests.map((request) => {
            const userInfo = getUserInfo(request.user_id || request.userId);
            return (
              <div key={request.id} className="bg-white border border-slate-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-medium text-[13px]">{userInfo?.displayName || 'Client'}</p>
                    <p className="text-[11px] text-slate-500">{userInfo?.email}</p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded-full text-[10px] font-medium ${
                      request.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                      request.status === 'approved' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {request.status === 'pending' ? 'En attente' :
                       request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-[12px] text-slate-700 mb-2">Date de demande</h4>
                    <p className="text-[12px] text-slate-600">{formatDate(request.created_at)}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-[12px] text-slate-700 mb-2">Statut</h4>
                    <p className="text-[12px] text-slate-600">
                      {request.status === 'pending' ? 'En attente de validation' :
                       request.status === 'approved' ? 'Approuvée' : 'Rejetée'}
                    </p>
                  </div>
                </div>

                {request.status === 'pending' && (
                  <div className="flex gap-2 pt-4 border-t">
                    <button
                      onClick={() => handleManualAssign(request.user_id || request.userId)}
                      disabled={loading}
                      className="flex-1 px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-60 text-white font-medium rounded-lg text-[11px] transition"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        'Attribuer IBAN/BIC'
                      )}
                    </button>
                  </div>
                )}

                {request.status === 'approved' && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
                    <p className="text-[11px] text-green-800">
                      ✅ Demande approuvée le {formatDate(request.updated_at || request.created_at)}
                    </p>
                  </div>
                )}

                {request.status === 'rejected' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
                    <p className="text-[11px] text-red-800">
                      ❌ Rejetée le {formatDate(request.updated_at || request.created_at)}
                      {request.reason && <span className="block mt-1">Raison: {request.reason}</span>}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default TabIbanRequests;
