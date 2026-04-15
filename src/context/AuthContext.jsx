import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, setToken, getToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const applySession = useCallback((payload) => {
    if (!payload?.token || !payload?.user) {
      setToken(null);
      setUser(null);
      setUserProfile(null);
      return;
    }
    setToken(payload.token);
    setUser({ id: payload.user.id, email: payload.user.email });
    setUserProfile(payload.user);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setUserProfile(null);
  }, []);

  const refreshProfile = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setUserProfile(null);
      return null;
    }
    try {
      const { data } = await api.get('/me');
      setUser({ id: data.user.id, email: data.user.email });
      setUserProfile(data.user);
      return data;
    } catch (error) {
      // Si l'API n'est pas disponible, ne pas effacer le token
      if (error.code === 'ERR_NETWORK') {
        console.warn('API indisponible, mode déconnecté');
        return null;
      }
      if (error.response?.status === 401) {
        // Token invalide ou expiré
        setToken(null);
        setUser(null);
        setUserProfile(null);
        return null;
      }
      setToken(null);
      setUser(null);
      setUserProfile(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await refreshProfile();
      } catch (error) {
        console.error('Erreur lors du chargement du profil:', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [refreshProfile]);

  const passwordRules = (pwd) => {
    const errors = [];
    if (pwd.length < 8) errors.push('Au moins 8 caractères');
    if (!/[A-Z]/.test(pwd)) errors.push('Une lettre majuscule');
    if (!/[a-z]/.test(pwd)) errors.push('Une lettre minuscule');
    if (!/[0-9]/.test(pwd)) errors.push('Un chiffre');
    if (!/[^A-Za-z0-9]/.test(pwd)) errors.push('Un caractère spécial (!@#$…)');
    return errors;
  };

  const login = async (email, password) => {
    const { data } = await api.post('/login', { email, password });
    applySession(data);
  };

  const register = async (email, password, firstName, lastName) => {
    const errors = passwordRules(password);
    if (errors.length) throw new Error('PASSWORD_RULES:' + errors.join('|'));
    const name = `${firstName} ${lastName}`.trim();
    const { data } = await api.post('/register', { email, password, name });
    applySession(data);
  };

  const isAdmin = userProfile?.role === 'admin';

  return (
    <AuthContext.Provider value={{
      user,
      userProfile,
      loading,
      isAdmin,
      login,
      register,
      logout,
      setUserProfile,
      refreshProfile,
      passwordRules,
    }}>
      {loading ? (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
          <div className="w-9 h-9 border-2 border-teal-600 border-t-transparent rounded-full animate-spin" aria-hidden />
          <p className="text-sm font-medium">Chargement de la session…</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être dans AuthProvider');
  return ctx;
}
