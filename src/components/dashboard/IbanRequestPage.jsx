import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Globe, Clock, CheckCircle2, Info, Upload, AlertTriangle, CreditCard } from 'lucide-react';

const copy = (v, l) => { navigator.clipboard.writeText(v); toast.success(`${l} copié !`); };

export default function IbanRequestPage({ account, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    amount: '500',
    proofFile: null,
    proofUrl: ''
  });
  
  // Déterminer l'état actuel
  const status = account?.ibanStatus || 'none';
  
  // Debug pour voir les données
  console.log('DEBUG IbanRequestPage:', { account, status, iban: account?.iban, ibanProof: account?.ibanProof });
  
  const handleRequestIban = async () => {
    setLoading(true);
    try {
      await api.post('/request-iban');
      toast.success('Demande d\'IBAN envoyée !');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image (PNG, JPG, etc.)');
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }
    
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target.result;
        setFormData(prev => ({ ...prev, proofFile: file, proofUrl: base64Url }));
        toast.success('Image téléchargée avec succès');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      toast.error('Erreur lors du téléchargement de l\'image');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitDeposit = async () => {
    if (!formData.proofFile) {
      toast.error('Veuillez télécharger la preuve de virement');
      return;
    }
    
    setLoading(true);
    try {
      await api.post('/request-account-activation', {
        step: 'transfer_proof',
        amount: 500,
        proofUrl: formData.proofUrl
      });
      
      toast.success('Preuve de virement envoyée ! En attente de validation...');
      onRefresh?.();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi de la preuve');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Étape 1 : Demander l'IBAN
  if (status === 'none' || status === 'requested') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div><h1 className="text-[19px] font-semibold tracking-tight">IBAN / BIC</h1><p className="text-[12px] text-slate-500 mt-0.5">Coordonnées bancaires internationales</p></div>
        
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-[11.5px] text-blue-700">L'IBAN vous permet de recevoir des virements. Après attribution, vous devrez déposer 500€ pour l'activer.</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-teal-700" />
          </div>
          <h3 className="font-semibold text-[14px] mb-2">Demander votre IBAN</h3>
          <p className="text-[12px] text-slate-500 mb-5 max-w-xs mx-auto">
            Un administrateur vous attribuera un IBAN dans les 24h ouvrables.
          </p>
          <button 
            type="button" 
            onClick={handleRequestIban} 
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition w-full sm:w-auto"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Globe className="w-4 h-4" />
            )}
            {loading ? 'Envoi en cours...' : 'Demander mon IBAN'}
          </button>
        </div>
      </div>
    );
  }

  // Étape 2 : Dépôt de 500€
  if (status === 'assigned') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div><h1 className="text-[19px] font-semibold tracking-tight">IBAN / BIC</h1><p className="text-[12px] text-slate-500 mt-0.5">Activation de votre IBAN</p></div>

        {/* Alerte IBAN inactif */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[13px] text-amber-800 mb-1">IBAN attribué mais inactif</h3>
            <p className="text-[11.5px] text-amber-700">
              Votre IBAN <span className="font-mono bg-amber-100 px-1 rounded">{account?.iban}</span> a été attribué mais est temporairement inactif.
            </p>
            <p className="text-[11.5px] text-amber-700 mt-1">
              Effectuez un dépôt de 500€ et envoyez la preuve pour l'activer définitivement.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-7 h-7 text-teal-700" />
            </div>
            <h3 className="font-semibold text-[14px] mb-2">Preuve de virement</h3>
            <p className="text-[12px] text-slate-500 mb-4 max-w-xs mx-auto">
              Montant à déposer : <span className="font-bold text-teal-700">500,00 €</span>
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-700 mb-2">
              Télécharger la preuve de virement
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-teal-300 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="proof-upload"
              />
              <label 
                htmlFor="proof-upload" 
                className="cursor-pointer inline-flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <div className="w-8 h-8 border-2 border-teal-300 border-t-teal-600 rounded-full animate-spin" />
                ) : (
                  <Upload className="w-8 h-8 text-slate-400" />
                )}
                <span className="text-[12px] text-slate-600">
                  {uploading ? 'Téléchargement...' : 'Cliquez pour télécharger'}
                </span>
                <span className="text-[10px] text-slate-400">PNG, JPG jusqu'à 5MB</span>
              </label>
            </div>

            {formData.proofUrl && (
              <div className="mt-4">
                <p className="text-[11px] font-medium text-slate-700 mb-2">Aperçu :</p>
                <img 
                  src={formData.proofUrl} 
                  alt="Preuve de virement" 
                  className="max-w-full h-48 object-cover rounded-lg border"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSubmitDeposit}
            disabled={loading || !formData.proofFile}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition mt-6"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            {loading ? 'Envoi en cours...' : 'Envoyer la preuve'}
          </button>
        </div>
      </div>
    );
  }

  // Étape 3 : IBAN actif
  if (status === 'active') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div><h1 className="text-[19px] font-semibold tracking-tight">IBAN / BIC</h1><p className="text-[12px] text-slate-500 mt-0.5">Coordonnées bancaires internationales</p></div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="font-semibold text-[16px] text-green-800 mb-2">IBAN activé !</h3>
          <p className="text-[13px] text-green-700 mb-4 max-w-sm mx-auto">
            Votre IBAN est maintenant complètement actif. Vous pouvez recevoir des virements.
          </p>
          <div className="bg-white border border-green-100 rounded-lg p-4">
            <p className="text-[11px] font-mono text-slate-800">
              {account?.iban}
            </p>
            <p className="text-[10px] text-slate-500 mt-1">
              BIC: {account?.bic || 'BNPAFRPPXXX'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback : si aucun statut ne correspond, afficher un message
  return (
    <div className="space-y-4 fade-in max-w-xl">
      <div><h1 className="text-[19px] font-semibold tracking-tight">IBAN / BIC</h1><p className="text-[12px] text-slate-500 mt-0.5">Coordonnées bancaires internationales</p></div>
      
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <h3 className="font-semibold text-[13px] text-amber-800 mb-2">État inconnu</h3>
        <p className="text-[11px] text-amber-700 mb-2">
          Statut IBAN : <span className="font-mono">{status}</span>
        </p>
        <p className="text-[11px] text-amber-700">
          IBAN : <span className="font-mono">{account?.iban || 'Non défini'}</span>
        </p>
        <p className="text-[11px] text-amber-700">
          Preuve : <span className="font-mono">{account?.ibanProof ? 'Oui' : 'Non'}</span>
        </p>
        <button 
          onClick={() => onRefresh?.()} 
          className="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg text-[11px]"
        >
          Actualiser
        </button>
      </div>
    </div>
  );
}
