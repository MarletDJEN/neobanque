/**
 * Anciens hooks Firestore — remplacés par /api et refreshProfile dans les pages.
 * Conservés pour éviter une import cassée si un module externe les référence.
 */
export function useAccount() {
  return { account: null, loading: false };
}

export function useTransactions() {
  return { transactions: [], loading: false };
}

export function useNotifications() {
  return { notifications: [], unreadCount: 0 };
}
