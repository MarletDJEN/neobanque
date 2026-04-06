import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Eye, EyeOff, Building2, ArrowRight, Mail, Lock, User, CheckCircle2, XCircle } from 'lucide-react';

function PasswordStrength({ password, rules }) {
  if (!password) return null;
  const errors = rules(password);
  const total = 5;
  const passed = total - errors.length;
  const pct = (passed / total) * 100;
  const color = pct <= 40 ? '#E24B4A' : pct <= 60 ? '#EF9F27' : pct <= 80 ? '#378ADD' : '#1D9E75';
  const label = pct <= 40 ? 'Faible' : pct <= 60 ? 'Moyen' : pct <= 80 ? 'Fort' : 'Excellent';
  const allRules = [
    { text: 'Au moins 8 caractères', ok: password.length >= 8 },
    { text: 'Une lettre majuscule', ok: /[A-Z]/.test(password) },
    { text: 'Une lettre minuscule', ok: /[a-z]/.test(password) },
    { text: 'Un chiffre', ok: /[0-9]/.test(password) },
    { text: 'Un caractère spécial', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  return (
    <div className="mt-2 space-y-2">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: color }} />
        </div>
        <span className="text-[11px] font-medium" style={{ color }}>{label}</span>
      </div>
      <div className="grid grid-cols-1 gap-0.5">
        {allRules.map((r, i) => (
          <div key={i} className="flex items-center gap-1.5">
            {r.ok
              ? <CheckCircle2 className="w-3 h-3 flex-shrink-0" style={{ color: '#1D9E75' }} />
              : <XCircle className="w-3 h-3 flex-shrink-0" style={{ color: '#888' }} />}
            <span className={`text-[11px] ${r.ok ? 'text-teal-300' : 'text-slate-500'}`}>{r.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function apiErrorMessage(err) {
  const msg = err.response?.data?.error;
  if (msg) return msg;
  if (err.code === 'ERR_NETWORK') return 'API injoignable — lancez le serveur (npm run dev) et PostgreSQL.';
  return err.message || 'Une erreur est survenue';
}

export default function AuthPage() {
  const [mode, setMode] = useState('login');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', confirmPassword: '', firstName: '', lastName: '' });
  const { login, register, passwordRules, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  useEffect(() => {
    if (!user) return;
    if (isAdmin) navigate('/admin', { replace: true });
    else navigate('/dashboard', { replace: true });
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(form.email, form.password);
        toast.success('Connexion réussie');
      } else if (mode === 'register') {
        if (form.password !== form.confirmPassword) {
          toast.error('Les mots de passe ne correspondent pas');
          return;
        }
        const errs = passwordRules(form.password);
        if (errs.length) {
          toast.error('Mot de passe trop faible');
          return;
        }
        await register(form.email, form.password, form.firstName, form.lastName);
        toast.success('Compte créé — en attente de validation par un administrateur.');
        setTimeout(() => navigate('/dashboard'), 500); // Délai pour stabiliser le state
      } else {
        toast.error('Réinitialisation : contactez le support ou votre administrateur.');
        setMode('login');
      }
    } catch (err) {
      if (err.message?.startsWith('PASSWORD_RULES:')) {
        toast.error('Mot de passe trop faible — vérifiez les règles');
      } else {
        toast.error(apiErrorMessage(err));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-[100dvh] min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 overflow-hidden">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-teal-700/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm flex flex-col justify-center min-h-0">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-10 h-10 bg-teal-700 rounded-xl flex items-center justify-center shadow-lg shadow-teal-900/50">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <span className="text-[22px] font-semibold text-white tracking-tight">NeoBank</span>
          </div>
          <p className="text-slate-400 text-[13px]">
            {mode === 'login' && 'Connexion sécurisée — API NeoBank'}
            {mode === 'register' && 'Ouvrez votre compte'}
            {mode === 'forgot' && 'Assistance mot de passe'}
          </p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-2xl">
          {mode !== 'forgot' && (
            <div className="flex bg-white/5 rounded-xl p-1 mb-5">
              { [['login', 'Connexion'], ['register', 'Inscription']].map(([m, l]) => (
                <button key={m} type="button" onClick={() => setMode(m)}
                  className={`flex-1 py-2 text-[13px] font-medium rounded-lg transition-all ${mode === m ? 'bg-teal-700 text-white shadow' : 'text-slate-400 hover:text-white'}`}>
                  {l}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'register' && (
              <div className="grid grid-cols-2 gap-2">
                { [['firstName', 'Prénom'], ['lastName', 'Nom']].map(([k, ph]) => (
                  <div key={k} className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                    <input name={k} value={form[k]} onChange={set(k)} placeholder={ph} required autoComplete={k}
                      className="w-full pl-8 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-[12.5px] placeholder-slate-500 focus:outline-none focus:border-teal-500 focus:bg-white/8 transition" />
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input type="email" value={form.email} onChange={set('email')} placeholder="Adresse email" required={mode !== 'forgot'} autoComplete="email"
                className="w-full pl-8 pr-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-[12.5px] placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input type={showPwd ? 'text' : 'password'} value={form.password} onChange={set('password')}
                    placeholder="Mot de passe" required autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    className="w-full pl-8 pr-10 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-[12.5px] placeholder-slate-500 focus:outline-none focus:border-teal-500 transition" />
                  <button type="button" onClick={() => setShowPwd((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {mode === 'register' && form.password.length > 0 && (
                  <PasswordStrength password={form.password} rules={passwordRules} />
                )}
              </div>
            )}

            {mode === 'register' && (
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input type={showPwd2 ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')}
                  placeholder="Confirmer le mot de passe" required autoComplete="new-password"
                  className={`w-full pl-8 pr-10 py-2.5 bg-white/5 border rounded-xl text-white text-[12.5px] placeholder-slate-500 focus:outline-none transition ${
                    form.confirmPassword && form.confirmPassword !== form.password ? 'border-red-500/50' : 'border-white/10 focus:border-teal-500'
                  }`} />
                <button type="button" onClick={() => setShowPwd2((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition">
                  {showPwd2 ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            )}

            {mode === 'login' && (
              <div className="text-right -mt-1">
                <button type="button" onClick={() => setMode('forgot')} className="text-[11.5px] text-teal-400 hover:text-teal-300 transition">
                  Mot de passe oublié ?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading || (mode === 'register' && form.confirmPassword !== form.password)}
              className="w-full py-2.5 bg-teal-700 hover:bg-teal-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition flex items-center justify-center gap-2 text-[13px] mt-1">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <><span>{mode === 'login' ? 'Se connecter' : mode === 'register' ? 'Créer mon compte' : 'Continuer'}</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {mode === 'forgot' && (
            <p className="text-[12px] text-slate-400 mt-4 text-center">
              La réinitialisation par e-mail sera gérée par votre backend (service mail). Contactez le support NeoBank.
            </p>
          )}

          {mode === 'forgot' && (
            <button type="button" onClick={() => setMode('login')} className="w-full mt-4 text-[12.5px] text-slate-400 hover:text-white transition text-center block">
              ← Retour à la connexion
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-4">
          Chiffrement TLS · JWT · bcrypt · PostgreSQL
        </p>
      </div>
    </div>
  );
}
