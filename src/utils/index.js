// src/utils/index.js

/**
 * Formate un montant en euros
 */
export function formatCurrency(amount, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount || 0);
}

/**
 * Génère un IBAN français fictif (pour tests admin)
 */
export function generateFakeIBAN() {
  const bankCode = '30004';
  const branchCode = '00001';
  const accountNum = String(Math.floor(Math.random() * 10000000000)).padStart(11, '0');
  const key = '00';
  return `FR76 ${bankCode} ${branchCode} ${accountNum.slice(0,3)} ${accountNum.slice(3,6)} ${accountNum.slice(6)} ${key}`;
}

/**
 * Génère un BIC fictif
 */
export function generateFakeBIC() {
  return 'NOVAFR2XXXX';
}

/**
 * Masque un IBAN pour l'affichage
 */
export function maskIBAN(iban) {
  if (!iban) return '';
  return iban.replace(/\S{4}(?=\S{4})/g, '**** ').trim();
}

/**
 * Formate une date Firestore Timestamp
 */
export function formatDate(timestamp, formatStr = 'dd/MM/yyyy') {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('fr-FR').format(date);
}

/**
 * Calcule les initiales d'un nom complet
 */
export function getInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

/**
 * Délai artificiel (pour les skeletons / loading states)
 */
export function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Vérifie si un email est valide
 */
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Tronque un texte
 */
export function truncate(str, maxLen = 30) {
  if (!str) return '';
  return str.length <= maxLen ? str : str.slice(0, maxLen) + '…';
}

/**
 * Couleur de statut
 */
export function getStatusColor(status) {
  const map = {
    active: 'green',
    pending: 'amber',
    approved: 'green',
    rejected: 'red',
    blocked: 'red',
    none: 'slate',
    submitted: 'blue',
  };
  return map[status] || 'slate';
}
