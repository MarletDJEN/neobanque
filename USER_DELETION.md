# Suppression de comptes clients - Administration

## Fonctionnalité ajoutée
L'administrateur peut maintenant supprimer définitivement les comptes clients.

## Accès
- **Interface** : Page d'administration > Onglet "Comptes clients"
- **Bouton** : "Supprimer" (rouge, avec icône corbeille)
- **Route API** : `DELETE /api/admin/users/:id`

## Processus de suppression

### 1. Confirmation
- Boîte de dialogue de confirmation native du navigateur
- Message d'avertissement clair sur l'irréversibilité
- Mention des données qui seront supprimées

### 2. Opérations de suppression (ordre important)
```sql
-- Tables dépendantes d'abord
DELETE FROM withdrawal_steps WHERE withdrawal_request_id IN (SELECT id FROM withdrawal_requests WHERE user_id = $1);
DELETE FROM withdrawal_codes WHERE withdrawal_request_id IN (SELECT id FROM withdrawal_requests WHERE user_id = $1);
DELETE FROM withdrawal_requests WHERE user_id = $1;
DELETE FROM notifications WHERE user_id = $1;
DELETE FROM transactions WHERE user_id = $1;
DELETE FROM cards WHERE user_id = $1;
DELETE FROM card_requests WHERE user_id = $1;
DELETE FROM iban_requests WHERE user_id = $1;
DELETE FROM account_activation_requests WHERE user_id = $1;
DELETE FROM kyc_submissions WHERE user_id = $1;
DELETE FROM modal_messages WHERE target_user_id = $1;

-- Table principale en dernier
DELETE FROM users WHERE id = $1;
```

### 3. Sécurité et validation
- **Vérification** : Seuls les comptes `role = 'client'` peuvent être supprimés
- **Transaction** : Toute l'opération est dans une transaction PostgreSQL
- **Rollback** : Annulation complète en cas d'erreur
- **Audit** : Log console avec ID et email de l'utilisateur supprimé

## Données supprimées
- **Compte utilisateur** : Informations de base, identifiants
- **Transactions** : Historique complet des transactions
- **Cartes bancaires** : Cartes actives et demandes
- **IBAN** : Demandes et attributions IBAN
- **KYC** : Soumissions et documents
- **Notifications** : Historique des notifications
- **Demandes diverses** : Activation, retraits, etc.
- **Messages modaux** : Messages ciblés à cet utilisateur

## Contraintes respectées
- **ON DELETE CASCADE** : Certaines tables se suppriment automatiquement
- **Clés étrangères** : Ordre de suppression respecte les dépendances
- **Intégrité** : Pas de données orphelines laissées

## Interface utilisateur

### Bouton de suppression
- **Style** : Rouge avec icône Trash2
- **Placement** : Dans la grille d'actions avec les autres boutons admin
- **Accessibilité** : Visible pour tous les comptes clients

### Feedback utilisateur
- **Confirmation** : Dialog native avant suppression
- **Succès** : Toast "Compte client supprimé définitivement"
- **Erreur** : Message d'erreur spécifique si échec
- **Rafraîchissement** : Liste des utilisateurs rechargée automatiquement

## Logs et audit
```javascript
console.log(`ADMIN DELETE: User ${id} (${user.email}) deleted by admin`);
```

## Restrictions
- **Admins protégés** : Impossible de supprimer un compte `role = 'admin'`
- **Client uniquement** : Seuls les comptes clients sont supprimables
- **Irréversible** : Aucune fonction de restauration prévue

## Sécurité
- **Middleware** : Authentification et autorisation admin requises
- **Validation** : Vérification existence et rôle de l'utilisateur
- **Transaction** : Protection contre les suppressions partielles

## Cas d'usage
- **Nettoyage** : Supprimer les comptes test ou inactifs
- **Conformité** : Répondre aux demandes de suppression RGPD
- **Sécurité** : Supprimer les comptes compromis

## Notes techniques
- **Performance** : Suppression en lots pour optimiser les grosses bases
- **Scalabilité** : Gère les comptes avec beaucoup de données
- **Maintenance** : Logs pour traçabilité et audit
