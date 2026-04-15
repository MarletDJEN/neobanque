# Scripts SQL NeoBank

Ce dossier contient les scripts SQL pour la base de données NeoBank.

## 📁 Fichiers

- **`../db/schema.sql`** - Schéma principal de la base de données (le seul fichier nécessaire)
- **`apply-schema.js`** - Script Node.js pour appliquer le schéma
- **`seed.js`** - Données de test/démonstration
- **`create-withdrawal-requests-table.sql`** - Script de migration obsolète

## 🚀 Installation

```bash
# Appliquer le schéma principal
psql $DATABASE_URL -f server/db/schema.sql

# OU avec le script Node.js
node server/scripts/apply-schema.js
```

## 📋 Description

Le schéma principal (`schema.sql`) contient :
- ✅ Toutes les tables utilisateurs et transactions
- ✅ Système de retrait par étapes avec pourcentages variables
- ✅ Index optimisés pour les performances
- ✅ Contraintes et validations

---

**Note** : Un seul fichier `schema.sql` est nécessaire pour toute l'application.
