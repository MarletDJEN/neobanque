# Correction du problème d'affichage IBAN/BIC

## Problème identifié
Quand l'admin valide l'IBAN (statut `assigned`), le client voyait toujours l'étape 1 "Demander IBAN" au lieu de l'étape de dépôt.

## Causes racines

### 1. Mappage incorrect des statuts IBAN
Dans `server/utils/serialize.js`, la fonction `ibanStatusToClient` ne gérait pas le statut `active` :

```javascript
// AVANT (incorrect)
export function ibanStatusToClient(ibanStatus) {
  if (ibanStatus === 'assigned') return 'approved';
  if (ibanStatus === 'requested') return 'pending';
  return 'none'; // ← 'active' retournait 'none' !
}
```

### 2. Logique de détermination d'étape incomplète
Dans `IbanActivationPage.jsx`, la logique ne gérait pas correctement le cas où :
- IBAN = `active` (validé par admin)
- `accountVerified` = `false` (pas encore de virement)

```javascript
// AVANT (problématique)
if (account?.status === 'active' && account?.accountVerified && account?.ibanStatus === 'active') {
  return 'completed'; // ← Trop restrictif
}
```

## Corrections apportées

### 1. Correction du mappage des statuts
**Fichier** : `server/utils/serialize.js`
```javascript
// APRÈS (correct)
export function ibanStatusToClient(ibanStatus) {
  if (ibanStatus === 'active') return 'active';     // ← Ajouté
  if (ibanStatus === 'assigned') return 'approved';
  if (ibanStatus === 'requested') return 'pending';
  return 'none';
}
```

### 2. Correction de la logique frontend
**Fichier** : `src/components/dashboard/IbanActivationPage.jsx`
```javascript
// APRÈS (correct)
const getInitialStep = () => {
  // Si le compte est fully activé (IBAN actif ET virement validé)
  if (account?.status === 'active' && account?.accountVerified && account?.ibanStatus === 'active') {
    return 'completed';
  }
  // Si l'IBAN est déjà attribué/approuvé mais pas encore actif
  if (account?.iban && (account?.ibanStatus === 'assigned' || account?.ibanStatus === 'approved')) {
    return 'deposit';
  }
  // Si l'IBAN est actif mais le compte pas encore vérifié (pas de virement)
  if (account?.iban && account?.ibanStatus === 'active' && !account?.accountVerified) {
    return 'deposit';
  }
  return 'request';
};
```

### 3. Correction pour l'interface admin
**Fichier** : `server/controllers/admin.controller.js`
```javascript
// APRÈS (correct)
ibanStatus:
  row.iban_status === 'active'    ? 'active'    :    // ← Ajouté
  row.iban_status === 'assigned'  ? 'approved'   :
  row.iban_status === 'requested' ? 'pending'   :
  'none',
```

## Flux corrigé

### Étape 1 : Demande IBAN
- Client : `ibanStatus = 'none'` → Affiche formulaire de demande
- Admin : Reçoit demande, attribue IBAN
- Backend : `iban_status = 'assigned'`

### Étape 2 : IBAN attribué
- Client : `ibanStatus = 'approved'` → Affiche étape de dépôt
- Client : Fait le virement de 500€
- Admin : Valide la preuve de virement
- Backend : `iban_status = 'active'`, `account_verified = true`

### Étape 3 : Compte activé
- Client : `ibanStatus = 'active'` + `accountVerified = true` → Affiche succès

## Tests à effectuer

1. **Nouveau client** : Doit voir "Demander IBAN"
2. **IBAN attribué** : Doit voir "Déposer 500€" 
3. **IBAN actif sans virement** : Doit rester sur "Déposer 500€"
4. **Compte fully activé** : Doit voir "Terminé" avec IBAN/BIC

## Impact
- ✅ Les clients voient maintenant la bonne étape après validation IBAN
- ✅ L'admin voit les statuts corrects dans son interface
- ✅ Le flux d'activation est cohérent de bout en bout
- ✅ Plus de confusion pour les utilisateurs
