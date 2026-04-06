import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CreditCard, Eye, EyeOff, Plus } from 'lucide-react';

export default function CardPage({ card, onRefresh }) {
  const { userProfile } = useAuth();
  const [showDetails, setShowDetails] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const requestCard = async () => {
    setRequesting(true);
    try {
      await api.post('/request-card');
      toast.success('Demande de carte envoyée !');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    } finally {
      setRequesting(false);
    }
  };

  const blockCard = async () => {
    try {
      await api.post('/card/block');
      toast.success('Carte bloquée');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    }
  };

  const bgColor = card?.status === 'active' ? 'bg-teal-700' : card?.status === 'blocked' ? 'bg-slate-600' : 'bg-slate-500';

  return (
    <div className="space-y-4 fade-in">
      <div><h1 className="text-[19px] font-semibold tracking-tight">Carte bancaire</h1><p className="text-[12px] text-slate-500 mt-0.5">Carte virtuelle</p></div>

      {!card ? (
        <div className="bg-white border border-slate-100 rounded-xl p-10 text-center">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-teal-700" />
          </div>
          <h3 className="font-semibold mb-2">Aucune carte</h3>
          <p className="text-[12px] text-slate-500 mb-5">Demandez votre carte Visa Débit virtuelle</p>
          <button type="button" onClick={requestCard} disabled={requesting}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition">
            {requesting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus className="w-4 h-4" />}
            Demander ma carte
          </button>
        </div>
      ) : (
        <>
          <div className="flex justify-center">
            <div className={`w-full max-w-sm ${bgColor} rounded-2xl p-5 text-white relative overflow-hidden card-shine`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-10 translate-x-10" />
              <div className="absolute bottom-0 left-10 w-16 h-16 bg-white/5 rounded-full translate-y-8" />
              <p className="text-[11px] opacity-80 mb-6">NeoBank</p>
              <p className="text-[15px] font-mono tracking-widest mb-2">•••• •••• •••• {card.last4}</p>
              <div className="flex justify-between text-[11px] opacity-90">
                <div>
                  <span className="block opacity-60">Expire</span>
                  {card.expiryMonth}/{card.expiryYear}
                </div>
                <div className="text-right">
                  <span className="block opacity-60">CVV {!showDetails && '•••'}</span>
                  {showDetails ? '•••' : '•••'}
                </div>
              </div>
              <p className="text-[10px] mt-4 opacity-70 truncate">{card.holderName || userProfile?.displayName}</p>
            </div>
          </div>
          <div className="flex justify-center gap-2 flex-wrap">
            <button type="button" onClick={() => setShowDetails((s) => !s)} className="text-[12px] text-slate-600 flex items-center gap-1.5">
              {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {showDetails ? 'Masquer' : 'Afficher'} CVV
            </button>
            {card.status === 'active' && (
              <button type="button" onClick={blockCard} className="text-[12px] text-red-600 font-medium">
                Bloquer la carte
              </button>
            )}
          </div>
          <p className="text-center text-[11px] text-slate-500">
            {card.status === 'pending' && 'En attente d’activation par l’administrateur'}
            {card.status === 'blocked' && 'Carte bloquée'}
            {card.status === 'active' && 'Carte active'}
          </p>
        </>
      )}
    </div>
  );
}
