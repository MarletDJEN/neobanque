import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { ArrowLeft, Plus, FileText, Calendar, User, Euro, Eye, CheckCircle, XCircle, Clock } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const fmtDate = (d) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function WithdrawalRequestsPage({ account, onRefresh }) {
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

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

  const handleGoToWithdrawals = () => {
    navigate('/withdrawals');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-slate-800">Demandes de retrait</h2>
            <p className="text-sm text-slate-500">Historique de vos demandes</p>
          </div>
        </div>
        <button
          onClick={handleGoToWithdrawals}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Nouvelle demande
        </button>
      </div>

      {/* Liste des demandes */}
      {requests.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Aucune demande de retrait</h3>
          <p className="text-slate-500 mb-6">Vous n'avez pas encore fait de demande de retrait</p>
          <button
            onClick={handleGoToWithdrawals}
            className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Faire une demande
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request.id} className="bg-white border border-slate-200 rounded-xl p-6">
              {/* En-tête */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{fmt(request.amount)}</p>
                    <p className="text-sm text-slate-500">vers {request.external_account_holder}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {getStatusText(request.status)}
                      </span>
                      <p className="text-xs text-slate-500">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {fmtDate(request.created_at)}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">IBAN</p>
                  <p className="font-mono text-sm">{request.external_iban}</p>
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
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
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

              {/* Actions rapides */}
              <div className="flex gap-3">
                {request.status === 'pending' && (
                  <button
                    onClick={() => navigate('/withdrawals')}
                    className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition flex items-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    En attente d'approbation
                  </button>
                )}
                {(request.status === 'code_generated' || request.status === 'step_completed') && (
                  <button
                    onClick={() => navigate('/withdrawals')}
                    className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition flex items-center gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Voir les détails
                  </button>
                )}
                {request.status === 'completed' && (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">Complété</span>
                  </div>
                )}
                {request.status === 'rejected' && (
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium">Rejeté</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Bouton d'actualisation */}
      <div className="mt-6 text-center">
        <button
          onClick={loadRequests}
          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
