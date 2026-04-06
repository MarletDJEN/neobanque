/** Statut IBAN côté client (UI existante) */
export function ibanStatusToClient(ibanStatus) {
  if (ibanStatus === 'assigned') return 'approved';
  if (ibanStatus === 'requested') return 'pending';
  return 'none';
}

export function accountStatusForUi(row) {
  if (!row.account_verified) return 'pending';
  if (row.status === 'suspended' || row.status === 'blocked') return 'suspended';
  return 'active';
}

export function toUserProfile(row) {
  const parts = (row.name || '').trim().split(/\s+/);
  const firstName = parts[0] || '';
  const lastName = parts.slice(1).join(' ') || '';
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName,
    lastName,
    displayName: row.name,
    role: row.role,
    accountVerified: row.account_verified,
    accountStatus: accountStatusForUi(row),
    kycStatus: row.kyc_status,
    iban: row.iban,
    bic: row.bic,
    ibanStatus: ibanStatusToClient(row.iban_status),
    cardStatus: row.card_status,
    phone: row.phone,
    address: row.address,
    status: row.status,
    createdAt: row.created_at,
  };
}

export function toAccount(row) {
  return {
    id: row.id,
    balance: Number(row.balance),
    currency: 'EUR',
    iban: row.iban,
    bic: row.bic,
    ibanStatus: ibanStatusToClient(row.iban_status),
    status: row.status,
  };
}

export function toTransactionRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type,
    amount: Number(row.amount),
    status: row.status,
    label: row.label,
    counterpartyUserId: row.counterparty_user_id,
    createdAt: row.created_at?.toISOString?.() || row.created_at,
  };
}
