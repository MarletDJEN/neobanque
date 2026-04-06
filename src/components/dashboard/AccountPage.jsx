import { useState } from 'react';
import { Copy, Eye, EyeOff, CheckCircle2, Clock, AlertCircle, Ban } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const fmt = n => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n || 0);
const copy = (text, label) => { navigator.clipboard.writeText(text); toast.success(`${label} copié !`); };

export default function AccountPage({ account }) {
  const { userProfile } = useAuth();
  const [showBalance, setShowBalance] = useState(true);
  if (!account) return <div className="text-center py-20 text-[12px] text-slate-400">Chargement...</div>;
  const ibanStatus = account.ibanStatus || 'none';
  const profileStatus = userProfile?.accountStatus || 'pending';
  const lineStatus = account?.status || 'pending';
  const accountStatusConf = {
    pending:   { label: 'En attente de validation',  color: 'text-amber-800',  bg: 'bg-amber-50 border-amber-200',  icon: Clock },
    active:    { label: 'Compte actif',             color: 'text-teal-800',    bg: 'bg-teal-50 border-teal-200',     icon: CheckCircle2 },
    suspended: { label: 'Compte suspendu',          color: 'text-red-800',     bg: 'bg-red-50 border-red-200',       icon: Ban },
  };
  const ast = accountStatusConf[profileStatus] || accountStatusConf.pending;
  const AstIcon = ast.icon;
  const statusConf = {
    none:     { icon: AlertCircle, color: 'slate', label: 'Non demandé' },
    pending:  { icon: Clock,       color: 'amber', label: 'En attente de validation' },
    approved: { icon: CheckCircle2,color: 'teal',  label: 'Actif' },
  };
  const s = statusConf[ibanStatus] || statusConf.none;
  const SIcon = s.icon;

  return (
    <div className="space-y-4 fade-in">
      <div><h1 className="text-[19px] font-semibold tracking-tight">Mon compte</h1><p className="text-[12px] text-slate-500 mt-0.5">Détails de votre compte bancaire</p></div>

      <div className={`rounded-2xl border p-4 flex items-start gap-3 ${ast.bg}`}>
        <AstIcon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${ast.color}`} />
        <div>
          <p className={`text-[13px] font-semibold ${ast.color}`}>Statut du compte</p>
          <p className={`text-[12px] mt-0.5 ${ast.color} opacity-90`}>{ast.label}</p>
          {lineStatus !== profileStatus && (
            <p className="text-[11px] text-slate-600 mt-1">Ligne bancaire côté banque : {lineStatus === 'active' ? 'active' : lineStatus === 'suspended' ? 'suspendue' : 'en attente'}</p>
          )}
        </div>
      </div>

      <div className="bg-teal-700 rounded-2xl p-6 text-white relative overflow-hidden card-shine">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-12 translate-x-12" />
        <div className="relative">
          <p className="text-teal-200 text-[12px]">Solde disponible</p>
          <div className="flex items-center gap-3 mt-1">
            <p className="text-[32px] font-semibold tracking-tight">{showBalance ? fmt(account.balance) : '•••••••'}</p>
            <button onClick={() => setShowBalance(s => !s)} className="text-teal-300 hover:text-white transition">
              {showBalance ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <SIcon className="w-4 h-4 text-teal-200" />
            <span className="text-[12px] text-teal-200">{s.label}</span>
            <span className="text-teal-400 text-[11px] ml-2">{account.currency || 'EUR'} · Compte courant</span>
          </div>
        </div>
      </div>
      {ibanStatus === 'approved' && account.iban && (
        <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-2">
          <h3 className="text-[13px] font-medium mb-3">Coordonnées bancaires</h3>
          {[['IBAN', account.iban], ['BIC / SWIFT', account.bic]].map(([label, value]) => (
            <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <div>
                <div className="text-[9.5px] text-slate-400 font-mono mb-0.5">{label}</div>
                <div className="text-[11.5px] font-mono font-medium tracking-wide">{value}</div>
              </div>
              <button onClick={() => copy(value, label)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 hover:border-teal-300 transition">
                <Copy className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {ibanStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 text-[12.5px]">Demande IBAN en cours de traitement</p>
            <p className="text-[11.5px] text-amber-600 mt-1">Un administrateur va valider votre demande prochainement.</p>
          </div>
        </div>
      )}
      <div className="bg-white border border-slate-100 rounded-xl p-5">
        <h3 className="text-[13px] font-medium mb-4">Informations du compte</h3>
        {[['Type','Compte courant'],['Devise',account.currency||'EUR'],['Statut ligne',account.status==='active'?'Actif':account.status==='suspended'?'Suspendue':'En attente'],['Identifiant',account.id]].map(([k,v]) => (
          <div key={k} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
            <span className="text-[12px] text-slate-500">{k}</span>
            <span className="text-[12px] font-medium font-mono">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
