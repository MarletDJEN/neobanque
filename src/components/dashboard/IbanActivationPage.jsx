import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Upload, CheckCircle, AlertCircle, ArrowLeft, CreditCard, FileText, Clock, AlertTriangle } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function IbanActivationPage({ account, onBack, onSuccess }) {
  // Déterminer l'étape initiale
  const getInitialStep = () => {
    // Si le compte est fully activé, aller directement à l'étape terminée
    if (account?.status === 'active' && account?.accountVerified && account?.ibanStatus === 'active') {
      return 'completed';
    }
    // Si l'IBAN est déjà attribué mais pas encore actif, aller à l'étape de dépôt
    if (account?.iban && (account?.ibanStatus === 'assigned' || account?.ibanStatus === 'approved')) {
      return 'deposit';
    }
    // Sinon, demander l'IBAN
    return 'request';
  };
  
  const [currentStep, setCurrentStep] = useState(getInitialStep);

  // Mettre à jour l'étape si les données du compte changent
  useEffect(() => {
    const newStep = getInitialStep();
    
    // Notifier les changements d'état
    if (currentStep !== newStep) {
      if (newStep === 'completed') {
        toast.success('IBAN entièrement activé ! Tous les services sont disponibles.');
      } else if (newStep === 'deposit' && currentStep === 'request') {
        toast.success('IBAN attribué ! Vous pouvez maintenant effectuer le dépôt.');
      }
      
      setCurrentStep(newStep);
    }
  }, [account?.status, account?.accountVerified, account?.ibanStatus, account?.iban, currentStep]);
  const [formData, setFormData] = useState({
    amount: '500',
    proofFile: null,
    proofUrl: ''
  });
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep === 'request') {
      // Étape 1 : Demande d'IBAN
      setSubmitting(true);
      try {
        await api.post('/request-iban');
        toast.success('Demande d\'IBAN envoyée !');
        onSuccess?.();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erreur lors de la demande d\'IBAN');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    } else if (currentStep === 'deposit') {
      // Étape 2 : Envoi de la preuve de dépôt
      if (!formData.proofFile) {
        toast.error('Veuillez télécharger la preuve de virement');
        return;
      }
      
      setSubmitting(true);
      try {
        await api.post('/request-account-activation', {
          step: 'transfer_proof',
          amount: 500,
          proofUrl: formData.proofUrl
        });
        
        toast.success('Preuve de virement envoyée ! En attente de validation...');
        onSuccess?.();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi de la preuve');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  // Étape 1 : Demande d'IBAN
  if (currentStep === 'request') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight">Activation IBAN</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">Processus d'activation en 3 étapes</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[13px] text-blue-800 mb-1">Étape 1/3 : Demande d'IBAN</h3>
            <p className="text-[11.5px] text-blue-700">Faites votre demande d'IBAN pour recevoir des virements.</p>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-6 text-center">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CreditCard className="w-7 h-7 text-teal-700" />
          </div>
          <h3 className="font-semibold text-[14px] mb-2">Demander votre IBAN</h3>
          <p className="text-[12px] text-slate-500 mb-5 max-w-xs mx-auto">
            Un administrateur vous attribuera un IBAN dans les 24h ouvrables.
          </p>
          <button 
            type="button" 
            onClick={handleSubmit} 
            disabled={submitting}
            className="inline-flex items-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition w-full sm:w-auto"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            {submitting ? 'Envoi en cours...' : 'Demander mon IBAN'}
          </button>
        </div>
      </div>
    );
  }

  // Étape 2 : Dépôt de 500€
  if (currentStep === 'deposit') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight">Activation IBAN</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">Processus d'activation en 3 étapes</p>
          </div>
        </div>

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

        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
          <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
          <div>
            <h3 className="font-semibold text-[13px] text-blue-800 mb-1">Étape 2/3 : Preuve de dépôt</h3>
            <p className="text-[11.5px] text-blue-700">
              Déposez 500€ sur votre IBAN et envoyez la preuve du virement.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-white border border-slate-100 rounded-xl p-6">
            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Upload className="w-7 h-7 text-teal-700" />
              </div>
              <h3 className="font-semibold text-[14px] mb-2">Preuve de virement</h3>
              <p className="text-[12px] text-slate-500 mb-4 max-w-xs mx-auto">
                Montant à déposer : <span className="font-bold text-teal-700">{fmt(500)}</span>
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
                  <span className="text-[10px] text-slate-400">PNG, JPG jusqu\'à 5MB</span>
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
          </div>

          <button
            type="submit"
            disabled={submitting || !formData.proofFile}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition"
          >
            {submitting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            {submitting ? 'Envoi en cours...' : 'Envoyer la preuve'}
          </button>
        </form>
      </div>
    );
  }

  // Étape 3 : Terminé
  if (currentStep === 'completed') {
    return (
      <div className="space-y-4 fade-in max-w-xl">
        <div className="flex items-center gap-3 mb-4">
          <button type="button" onClick={onBack} className="p-2 hover:bg-slate-100 rounded-lg">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[19px] font-semibold tracking-tight">Activation IBAN</h1>
            <p className="text-[12px] text-slate-500 mt-0.5">Processus terminé</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
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

  return null;
}
