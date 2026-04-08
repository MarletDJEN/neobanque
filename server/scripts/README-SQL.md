# NeoBank - Code SQL Complet

Ce document contient l'intégralité du schéma SQL pour le projet NeoBank avec le système de retrait par étapes et pourcentages variables.

## 📁 Fichiers SQL

### 1. `complete-schema.sql` (Recommandé)
- **Usage** : Installation complète de la base de données
- **Contenu** : Toutes les tables, index, vues, triggers et fonctions
- **Commande** : `psql $DATABASE_URL -f server/scripts/complete-schema.sql`

### 2. Scripts individuels (si mise à jour)

#### `create-withdrawal-requests-table.sql`
- Crée la table `withdrawal_requests` avec gestion des étapes

#### `create-withdrawal-codes-table.sql`
- Crée la table `withdrawal_codes` pour les codes temporaires

#### `add-transfer-columns.sql`
- Ajoute les colonnes pour virements externes à `transactions`

#### `update-withdrawal-requests-schema.sql`
- Met à jour la table `withdrawal_requests` pour les étapes multiples

## 🏗️ Structure des Tables

### Tables Principales
- **`users`** : Utilisateurs du système bancaire
- **`transactions`** : Historique complet des transactions
- **`cards`** : Cartes bancaires émises
- **`notifications`** : Notifications système

### Tables KYC & Vérification
- **`kyc_submissions`** : Soumissions KYC
- **`iban_requests`** : Demandes IBAN
- **`card_requests`** : Demandes de cartes
- **`account_activation_requests`** : Demandes d'activation

### Tables Système de Retrait
- **`withdrawal_requests`** : Demandes de retrait (nouveau système)
- **`withdrawal_steps`** : Étapes individuelles de retrait
- **`withdrawal_codes`** : Codes temporaires de validation

### Tables Utilitaires
- **`modal_messages`** : Messages modaux ciblés

## 🔄 Flux de Retrait par Étapes

1. **Création demande** → `withdrawal_requests.status = 'pending'`
2. **Configuration admin** → Définit `target_percentage` et `withdrawal_steps`
3. **Génération code** → `withdrawal_requests.status = 'code_generated'`
4. **Validation client** → Débiter premier pourcentage
5. **Étapes suivantes** → `withdrawal_requests.status = 'step_completed'`
6. **Finalisation** → `withdrawal_requests.status = 'completed'`

## 📊 Vues Utilitaires

### `withdrawal_stats`
Statistiques mensuelles des retraits :
- Nombre total de demandes
- Demandes complétées/rejetées
- Montants totaux et moyens

### `pending_withdrawals`
Vue des demandes en cours avec état calculé :
- `expired` : Code expiré
- `waiting_code` : En attente de code
- `code_active` : Code généré et valide
- `in_progress` : Étapes en cours

## 🔧 Fonctions et Triggers

### `update_balance_after_transaction()`
Met automatiquement à jour les soldes utilisateurs lors des transactions.

### `cleanup_expired_codes()`
Nettoie les codes expirés (peut être appelé périodiquement).

## 🚀 Installation Rapide

```bash
# 1. Installation complète (recommandé)
psql $DATABASE_URL -f server/scripts/complete-schema.sql

# 2. Vérification
psql $DATABASE_URL -c "\dt"  # Liste des tables
psql $DATABASE_URL -c "\dv"  # Liste des vues
```

## 📈 Caractéristiques du Système

### Sécurité
- ✅ Transactions atomiques avec rollback
- ✅ Validation des soldes en temps réel
- ✅ Codes uniques et expirables
- ✅ Contraintes CHECK sur tous les montants

### Performance
- ✅ Index optimisés pour les requêtes fréquentes
- ✅ Vues matérialisées pour les statistiques
- ✅ Partitionnement implicite par dates

### Flexibilité
- ✅ Pourcentages variables (1-100%)
- ✅ Nombre illimité d'étapes
- ✅ Conditions personnalisées par étape
- ✅ Validation admin ou automatique

## 🎯 Exemples de Configurations

### Retrait 70% en une fois
```sql
INSERT INTO withdrawal_steps (withdrawal_request_id, step_order, percentage, condition, amount)
VALUES (uuid, 1, 70, 'Validation initiale', montant * 0.7);
```

### Retrait 100% en 3 étapes
```sql
INSERT INTO withdrawal_steps (withdrawal_request_id, step_order, percentage, condition, amount)
VALUES 
  (uuid, 1, 30, 'Première condition', montant * 0.3),
  (uuid, 2, 40, 'Deuxième condition', montant * 0.4),
  (uuid, 3, 30, 'Condition finale', montant * 0.3);
```

## 🔍 Maintenance

### Nettoyage périodique
```sql
-- Nettoyer les codes expirés
SELECT cleanup_expired_codes();

-- Archiver les transactions anciennes (optionnel)
CREATE TABLE transactions_archive AS 
SELECT * FROM transactions 
WHERE created_at < NOW() - INTERVAL '2 years';
```

### Sauvegarde
```bash
# Sauvegarde complète
pg_dump $DATABASE_URL > neobank-backup.sql

# Restauration
psql $DATABASE_URL < neobank-backup.sql
```

---

**Note** : Le schéma est conçu pour PostgreSQL 13+ avec l'extension `pgcrypto` activée.
