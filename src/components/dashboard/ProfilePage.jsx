import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Upload, CheckCircle2, Clock, AlertCircle, XCircle } from 'lucide-react';

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function ProfilePage({ onSaved }) {
  const { userProfile, setUserProfile } = useAuth();
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    address: '',
  });
  const [selfieFile, setSelfieFile] = useState(null);
  const [idFile, setIdFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [kycLoading, setKycLoading] = useState(false);
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!userProfile) return;
    const parts = (userProfile.displayName || userProfile.name || '').split(/\s+/);
    setForm({
      firstName: userProfile.firstName || parts[0] || '',
      lastName: userProfile.lastName || parts.slice(1).join(' ') || '',
      phone: userProfile.phone || '',
      address: userProfile.address || '',
    });
  }, [userProfile]);

  const save = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.patch('/profile', {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        address: form.address,
      });
      setUserProfile((p) => ({ ...p, ...data.user }));
      toast.success('Profil mis à jour !');
      onSaved?.();
    } catch {
      toast.error('Erreur');
    } finally {
      setLoading(false);
    }
  };

  const uploadKyc = async () => {
    if (!selfieFile || !idFile) {
      toast.error('Veuillez sélectionner les deux documents');
      return;
    }
    
    // Valider la taille des fichiers (max 5MB)
    if (selfieFile.size > 5 * 1024 * 1024 || idFile.size > 5 * 1024 * 1024) {
      toast.error('Les fichiers ne doivent pas dépasser 5MB');
      return;
    }
    
    // Valider le type des fichiers
    if (!selfieFile.type.startsWith('image/') || !idFile.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner des images valides (JPG, PNG, etc.)');
      return;
    }
    
    setKycLoading(true);
    try {
      const selfieUrl = await readFileAsDataUrl(selfieFile);
      const documentUrl = await readFileAsDataUrl(idFile);
      const { data } = await api.post('/kyc/submit', { selfieUrl, documentUrl });
      setUserProfile((p) => ({ ...p, ...data.user }));
      setSelfieFile(null);
      setIdFile(null);
      toast.success('Demande KYC envoyée avec succès !');
      onSaved?.();
    } catch (e) {
      console.error('Erreur KYC:', e);
      const errorMessage = e.response?.data?.error || 'Erreur lors de l\'envoi des documents';
      toast.error(errorMessage);
    } finally {
      setKycLoading(false);
    }
  };

  const kycConf = {
    pending: { icon: AlertCircle, bg: 'bg-amber-50 border-amber-200', text: 'text-amber-800', sub: 'text-amber-600', label: 'Non vérifié', desc: 'Soumettez une pièce d’identité' },
    submitted: { icon: Clock, bg: 'bg-blue-50 border-blue-200', text: 'text-blue-800', sub: 'text-blue-600', label: 'En cours de vérification', desc: 'Document reçu' },
    approved: { icon: CheckCircle2, bg: 'bg-teal-50 border-teal-200', text: 'text-teal-800', sub: 'text-teal-600', label: 'Identité vérifiée', desc: 'Votre identité a été confirmée' },
    rejected: { icon: XCircle, bg: 'bg-red-50 border-red-200', text: 'text-red-800', sub: 'text-red-600', label: 'Document rejeté', desc: 'Soumettez un autre document' },
  };
  const kyc = kycConf[userProfile?.kycStatus] || kycConf.pending;
  const KycIcon = kyc.icon;

  return (
    <div className="space-y-4 fade-in max-w-xl">
      <div><h1 className="text-[19px] font-semibold tracking-tight">Mon profil</h1></div>
      <div className={`${kyc.bg} border rounded-xl p-4 flex items-start gap-3`}>
        <KycIcon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${kyc.text}`} />
        <div>
          <p className={`text-[12.5px] font-semibold ${kyc.text}`}>{kyc.label}</p>
          <p className={`text-[11.5px] mt-0.5 ${kyc.sub}`}>{kyc.desc}</p>
        </div>
      </div>
      <form onSubmit={save} className="bg-white border border-slate-100 rounded-xl p-5 space-y-3.5">
        <p className="text-[13px] font-medium">Informations personnelles</p>
        <div className="grid grid-cols-2 gap-3">
          { [['firstName', 'Prénom'], ['lastName', 'Nom']].map(([k, ph]) => (
            <div key={k}>
              <input value={form[k]} onChange={set(k)} placeholder={ph} required
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px]" />
            </div>
          ))}
        </div>
        <input value={form.phone} onChange={set('phone')} placeholder="Téléphone"
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px]" />
        <textarea value={form.address} onChange={set('address')} placeholder="Adresse" rows={2}
          className="w-full px-3 py-2 border border-slate-200 rounded-xl text-[12px]" />
        <button type="submit" disabled={loading} className="w-full py-2.5 bg-teal-700 text-white rounded-xl text-[12px] font-semibold disabled:opacity-50">
          {loading ? '…' : 'Enregistrer'}
        </button>
      </form>
      {userProfile?.kycStatus !== 'approved' && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-3">
          <p className="text-[13px] font-medium flex items-center gap-2"><Upload className="w-4 h-4" /> Vérification d'identité (KYC)</p>
          
          <div className="text-[11px] text-slate-500 space-y-1">
            <p>• Format : Images uniquement (JPG, PNG, etc.)</p>
            <p>• Taille maximale : 5MB par fichier</p>
            <p>• Documents requis : Selfie + Pièce d'identité</p>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Selfie (photo portrait)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setSelfieFile(e.target.files?.[0] || null)} 
                className="block w-full text-[12px] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" 
              />
              {selfieFile && (
                <div className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {selfieFile.name} ({(selfieFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
            
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">Pièce d'identité (carte d'identité, passeport, etc.)</label>
              <input 
                type="file" 
                accept="image/*" 
                onChange={(e) => setIdFile(e.target.files?.[0] || null)} 
                className="block w-full text-[12px] file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100" 
              />
              {idFile && (
                <div className="mt-1 text-[10px] text-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {idFile.name} ({(idFile.size / 1024 / 1024).toFixed(2)} MB)
                </div>
              )}
            </div>
          </div>
          
          <button 
            type="button" 
            onClick={uploadKyc} 
            disabled={kycLoading || !selfieFile || !idFile}
            className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[12px] font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
          >
            {kycLoading ? 'Envoi en cours...' : 'Envoyer les documents'}
          </button>
        </div>
      )}
    </div>
  );
}
