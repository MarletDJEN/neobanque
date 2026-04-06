import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Upload, CheckCircle, AlertCircle, ArrowLeft, CreditCard, FileText } from 'lucide-react';

const fmt = (n) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function ActivationRequestPage({ account, onBack, onSuccess }) {
  const [currentStep, setCurrentStep] = useState('iban_request'); // 'iban_request' ou 'transfer_proof'
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
    
    if (file.size > 5 * 1024 * 1024) { // 5MB
      toast.error('L\'image ne doit pas dépasser 5MB');
      return;
    }
    
    setUploading(true);
    try {
      // Simuler l'upload - en production, utiliser un vrai service d'upload
      const fakeUrl = URL.createObjectURL(file);
      setFormData(prev => ({ ...prev, proofFile: file, proofUrl: fakeUrl }));
      toast.success('Image téléchargée avec succès');
    } catch (err) {
      toast.error('Erreur lors du téléchargement de l\'image');
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (currentStep === 'iban_request') {
      // Première étape : demande d'IBAN
      setSubmitting(true);
      try {
        await api.post('/request-account-activation', {
          step: 'iban_request'
        });
        
        toast.success('Demande d\'IBAN soumise !');
        setCurrentStep('transfer_proof'); // Passer à l'étape 2
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erreur lors de la soumission');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    } else if (currentStep === 'transfer_proof') {
      // Deuxième étape : preuve de virement
      if (!formData.proofFile) {
        toast.error('Veuillez télécharger la preuve de virement');
        return;
      }
      
      setSubmitting(true);
      try {
        await api.post('/request-account-activation', {
          step: 'transfer_proof',
          amount: parseFloat(formData.amount),
          proofUrl: formData.proofUrl
        });
        
        toast.success('Preuve de virement soumise avec succès !');
        onSuccess?.();
      } catch (err) {
        toast.error(err.response?.data?.error || 'Erreur lors de la soumission');
        console.error(err);
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="space-y-4 fade-in max-w-lg">
      <div className="flex items-center gap-3">
        <button 
          type="button" 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-lg transition"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-[19px] font-semibold tracking-tight">Activation de compte</h1>
          <p className="text-[12px] text-slate-500 mt-0.5">
            Processus de validation en deux étapes
          </p>
        </div>
      </div>

      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          currentStep === 'iban_request' ? 'bg-teal-100 text-teal-700' : 'bg-white text-slate-400'
        }`}>
          <CreditCard className="w-4 h-4" />
          <span className="text-[12px] font-medium">Étape 1: IBAN</span>
        </div>
        <div className="w-8 h-0.5 bg-slate-300"></div>
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          currentStep === 'transfer_proof' ? 'bg-teal-100 text-teal-700' : 'bg-white text-slate-400'
        }`}>
          <FileText className="w-4 h-4" />
          <span className="text-[12px] font-medium">Étape 2: Virement</span>
        </div>
      </div>

      {currentStep === 'iban_request' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-blue-800">
              <p className="font-medium mb-1">Étape 1 : Demande d'IBAN</p>
              <p className="text-blue-700">
                Cliquez sur "Soumettre la demande" pour recevoir votre IBAN. 
                Une fois approuvée, vous pourrez passer à l'étape 2.
              </p>
            </div>
          </div>
        </div>
      )}

      {currentStep === 'transfer_proof' && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
            <div className="text-[11.5px] text-blue-800">
              <p className="font-medium mb-1">Étape 2 : Virement de 500€</p>
              <ol className="list-decimal list-inside space-y-1 text-blue-700">
                <li>Effectuez un virement de 500€ vers votre IBAN</li>
                <li>Prenez une capture d'écran de la confirmation</li>
                <li>Téléchargez la preuve ci-dessous</li>
                <li>Attendez la validation par l'administrateur</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-slate-100 rounded-xl p-5 space-y-4">
        {currentStep === 'iban_request' ? (
          <div>
            <label className="text-[11px] text-slate-500 font-medium">Type de demande</label>
            <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px]">
              Demande d'IBAN et BIC
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Cette étape permettra de générer votre IBAN pour recevoir le virement
            </p>
          </div>
        ) : (
          <>
            <div>
              <label className="text-[11px] text-slate-500 font-medium">Montant du virement</label>
              <div className="mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[12px] font-mono">
                {fmt(500)}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Montant fixe obligatoire</p>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 font-medium">Preuve de virement</label>
              <div className="mt-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="proof-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="proof-upload"
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition text-[12px]"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Téléchargement...' : formData.proofFile ? 'Changer l\'image' : 'Télécharger la preuve'}
                </label>
              </div>
              
              {formData.proofFile && (
                <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-[11px] text-green-700">{formData.proofFile.name}</span>
                </div>
              )}
            </div>

            {formData.proofUrl && (
              <div>
                <label className="text-[11px] text-slate-500 font-medium">Aperçu de la preuve</label>
                <div className="mt-1 border border-slate-200 rounded-lg overflow-hidden">
                  <img 
                    src={formData.proofUrl} 
                    alt="Preuve de virement" 
                    className="w-full h-48 object-cover"
                  />
                </div>
              </div>
            )}
          </>
        )}

        <button
          type="submit"
          disabled={submitting || (currentStep === 'transfer_proof' && !formData.proofFile)}
          className="w-full bg-teal-700 text-white rounded-lg py-2.5 text-[12px] font-semibold hover:bg-teal-800 transition disabled:bg-slate-300 disabled:cursor-not-allowed"
        >
          {submitting ? 'Soumission...' : currentStep === 'iban_request' ? 'Soumettre la demande d\'IBAN' : 'Soumettre la preuve de virement'}
        </button>
      </form>
    </div>
  );
}
