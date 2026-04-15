# Système de retrait avec codes générés par l'admin

## Changement majeur
Les clients ne peuvent plus générer de codes de retrait eux-mêmes. Seul l'administrateur peut générer des codes et définir les conditions de retrait.

## Flux modifié

### 1. Client : Demande de retrait
- Client remplit formulaire de demande de retrait
- Informations requises : montant, IBAN externe, BIC, titulaire
- Statut : `pending` en attente de validation admin

### 2. Admin : Génération du code
- Admin voit la demande dans l'interface "Retraits"
- Admin définit :
  - **Pourcentage cible** : % total à retirer (ex: 80%)
  - **Étapes** : Conditions progressives avec pourcentages
  - **Conditions** : Texte des conditions à remplir

### 3. Système : Génération automatique
- Code unique de 8 caractères (ex: `A1B2C3D4`)
- Validité : 4 heures
- Notification envoyée au client avec le code

### 4. Client : Validation du code
- Client reçoit le code par notification
- Client saisit le code pour débloquer la première étape
- Première étape : Pourcentage défini par l'admin

### 5. Processus par étapes
- Chaque étape a son propre pourcentage et condition
- Client doit valider chaque code successivement
- Processus continue jusqu'au pourcentage cible

## Configuration admin

### Formulaire de génération de code
```javascript
{
  targetPercentage: 80,  // 80% du montant total
  steps: [
    {
      percentage: 30,      // 30% du montant
      condition: "Présenter pièce d'identité en agence"
    },
    {
      percentage: 25,      // 25% du montant  
      condition: "Justificatif de domicile récent"
    },
    {
      percentage: 25,      // 25% du montant
      condition: "Confirmation téléphonique"
    }
  ]
}
```

### Calcul des montants
- Montant total demandé : 1000$
- Étape 1 : 30% = 300$
- Étape 2 : 25% = 250$
- Étape 3 : 25% = 250$
- Total : 80% = 800$

## Sécurité et contrôle

### Avantages pour l'admin
- **Contrôle total** : Décide qui peut retirer et comment
- **Conditions personnalisées** : Adaptées à chaque situation
- **Validation progressive** : Plusieurs points de contrôle
- **Traçabilité** : Chaque étape est loggée

### Protection contre les abus
- **Codes uniques** : Génération aléatoire sécurisée
- **Expiration** : 4 heures pour limiter la fenêtre
- **Validation admin** : Chaque demande est revue
- **Conditions obligatoires** : Pas de retrait sans validation

## Interface utilisateur

### Page client "Code Retrait"
- Affiche les demandes en cours
- Formulaire de validation de code
- Historique des retraits effectués
- **Message clair** : "L'administrateur vous fournira le code"

### Page admin "Retraits"
- Liste des demandes pending
- Formulaire de génération de code avec pourcentages
- Suivi des étapes de validation
- Statut des codes générés

## Notifications automatiques

### Pour le client
- **Code généré** : "L'administrateur a généré un code : A1B2C3D4"
- **Première étape** : "Code validé : 30% débloqué"
- **Étape suivante** : "Prochaine condition à remplir"
- **Retrait terminé** : "Retrait complété avec succès"

### Pour l'admin
- **Nouvelle demande** : "Client demande retrait de 1000$"
- **Code utilisé** : "Client a validé le code A1B2C3D4"
- **Retrait complété** : "Processus de retrait terminé"

## Base de données

### Tables utilisées
- **withdrawal_requests** : Demandes de retrait
- **withdrawal_codes** : Codes générés avec expiration
- **withdrawal_steps** : Étapes avec pourcentages et conditions
- **transactions** : Historique des retraits effectués

### Champs importants
```sql
withdrawal_requests:
- target_percentage: NUMERIC(5,2)     -- % cible
- current_percentage: NUMERIC(5,2)   -- % déjà retiré
- next_condition: TEXT                -- Prochaine condition
- withdrawal_code: TEXT               -- Code généré

withdrawal_steps:
- percentage: NUMERIC(5,2)            -- % de l'étape
- condition: TEXT                     -- Condition à remplir
- is_completed: BOOLEAN               -- État de l'étape
```

## Cas d'usage

### Retrait standard (80%)
1. Client demande 1000$
2. Admin génère code avec 3 étapes (30% + 25% + 25%)
3. Client reçoit code et valide étape 1 (300$)
4. Client valide étape 2 (250$)
5. Client valide étape 3 (250$)
6. Total retiré : 800$ (80%)

### Retrait d'urgence (100%)
1. Client demande retrait urgent
2. Admin génère code avec une seule étape (100%)
3. Client valide et retrait immédiat

### Retrait progressif (50%)
1. Client demande 2000$
2. Admin définit 10 étapes de 5% chacune
3. Client valide progressivement sur plusieurs jours
4. Contrôle renforcé à chaque étape

## Sécurité renforcée

### Génération de codes
- **Aléatoire** : 8 caractères alphanumériques
- **Unique** : Vérification d'unicité en base
- **Expiré** : Auto-destruction après 4 heures
- **Usage unique** : Marqué comme utilisé après validation

### Validation
- **Double auth** : Code + ID demande requis
- **Vérification** : Solde disponible avant chaque étape
- **Transaction** : Opération atomique avec rollback
- **Audit** : Log complet de chaque action

## Résultats attendus
- **Contrôle admin** : L'admin décide des conditions de retrait
- **Sécurité** : Plusieurs points de validation
- **Flexibilité** : Pourcentages et conditions personnalisables
- **Traçabilité** : Historique complet des actions
- **Protection** : Contre les retraits non autorisés
