import { useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { Globe, Clock, CheckCircle2, Info } from 'lucide-react';

const copy = (v, l) => { navigator.clipboard.writeText(v); toast.success(`${l} copié !`); };

export default function IbanRequestPage({ account, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const status = account?.ibanStatus || 'none';

  const request = async () => {
    setLoading(true);
    try {
      await api.post('/request-iban');
      toast.success('Demande envoyée !');
      onRefresh?.();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 fade-in max-w-xl">
      <div><h1 className="text-[19px] font-semibold tracking-tight">IBAN / BIC</h1><p className="text-[12px] text-slate-500 mt-0.5">Coordonnées bancaires internationales</p></div>
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 flex gap-2.5">
        <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <p className="text-[11.5px] text-blue-700">L&apos;IBAN vous permet de recevoir des virements. Le BIC identifie votre banque.</p>
      </div>

      {status === 'none' && (
        <div className="bg-white border border-slate-100 rounded-xl p-8 text-center">
          <div className="w-14 h-14 bg-teal-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-7 h-7 text-teal-700" />
          </div>
          <h3 className="font-semibold text-[14px] mb-2">Demandez votre IBAN</h3>
          <p className="text-[12px] text-slate-500 mb-5 max-w-xs mx-auto">Traitement par un administrateur sous 24h ouvrables.</p>
          <button type="button" onClick={request} disabled={loading} className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-60 text-white font-semibold rounded-xl text-[12px] transition">
            {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Globe className="w-4 h-4" />}
            Demander mon IBAN
          </button>
        </div>
      )}

      {status === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-8 text-center">
          <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-7 h-7 text-amber-500 animate-pulse" />
          </div>
          <h3 className="font-semibold text-amber-800 mb-2">Demande en cours</h3>
          <p className="text-[12px] text-amber-600 max-w-xs mx-auto">Un administrateur va attribuer votre IBAN et BIC.</p>
        </div>
      )}

      {status === 'approved' && (
        <div className="space-y-3">
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-3.5 flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-teal-600" />
            <p className="text-[12px] font-medium text-teal-700">Votre IBAN est actif</p>
          </div>
          <div className="bg-white border border-slate-100 rounded-xl p-5 space-y-2">
            {[['IBAN', account?.iban], ['BIC / SWIFT', account?.bic], ['Banque', 'NeoBank SA'], ['Devise', 'EUR']].map(([label, value]) => (
              <div key={label} className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="text-[9.5px] text-slate-400 font-mono mb-0.5">{label}</div>
                  <div className="text-[11.5px] font-mono font-medium">{value || '—'}</div>
                </div>
                {value && (
                  <button type="button" onClick={() => copy(value, label)} className="w-7 h-7 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-400 hover:text-teal-600 transition">
                    <span className="text-xs">⎘</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
