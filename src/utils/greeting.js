/** Salutation française + nom affiché pour l'espace client */
export function getClientGreeting(userProfile, user) {
  const hour = new Date().getHours();
  const salut = hour >= 6 && hour < 18 ? 'Bonjour' : 'Bonsoir';
  const name =
    userProfile?.displayName?.trim() ||
    [userProfile?.firstName, userProfile?.lastName].filter(Boolean).join(' ').trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    '';
  return { salut, name: name || 'bienvenue' };
}
