# 🏦 NovaBanque — Application Bancaire en Ligne

Application bancaire complète construite avec **React + Vite + Firebase**.

---

## 🚀 Stack technique

| Technologie | Usage |
|-------------|-------|
| React 18 | Interface utilisateur |
| Vite | Bundler / Dev server |
| Firebase Auth | Authentification (Email + Google) |
| Firestore | Base de données temps réel |
| Firebase Storage | Stockage documents KYC |
| Tailwind CSS | Styles et design system |
| Recharts | Graphiques et visualisations |
| React Router v6 | Navigation SPA |
| React Hot Toast | Notifications UI |
| date-fns | Formatage des dates |
| Lucide React | Icônes |

---

## 📁 Structure du projet

```
src/
├── components/
│   ├── auth/           # (extensible)
│   ├── dashboard/
│   │   ├── Sidebar.jsx          # Navigation latérale
│   │   ├── Overview.jsx         # Dashboard principal
│   │   ├── AccountPage.jsx      # Compte bancaire
│   │   ├── CardPage.jsx         # Carte virtuelle
│   │   ├── IbanRequestPage.jsx  # Demande IBAN/BIC
│   │   ├── TransactionsPage.jsx # Historique
│   │   ├── TransferPage.jsx     # Virements
│   │   ├── ProfilePage.jsx      # Profil + KYC
│   │   └── NotificationsPanel.jsx
│   └── shared/
│       ├── Badge.jsx            # Badges de statut
│       ├── Skeleton.jsx         # Loaders
│       └── index.jsx            # EmptyState, ConfirmModal
├── context/
│   └── AuthContext.jsx          # Auth global state
├── hooks/
│   └── index.js                 # useAccount, useTransactions, useNotifications
├── pages/
│   ├── AuthPage.jsx             # Login / Register / Forgot
│   ├── DashboardPage.jsx        # Layout client
│   └── AdminPage.jsx            # Panel administrateur
├── services/
│   └── firebase.js              # Config Firebase
├── styles/
│   └── index.css                # Tailwind + styles globaux
└── utils/
    └── index.js                 # Helpers (formatCurrency, etc.)
```

---

## ⚙️ Installation

### 1. Cloner et installer les dépendances

```bash
npm install
```

### 2. Créer un projet Firebase

1. Aller sur [https://console.firebase.google.com](https://console.firebase.google.com)
2. Créer un nouveau projet
3. Activer **Authentication** → Email/Password ET Google
4. Activer **Firestore Database** (mode production)
5. Activer **Storage**
6. Aller dans **Paramètres du projet → Ajouter une application Web**
7. Copier la configuration

### 3. Configurer Firebase

Modifier `src/services/firebase.js` :

```js
const firebaseConfig = {
  apiKey: "votre-api-key",
  authDomain: "votre-projet.firebaseapp.com",
  projectId: "votre-projet-id",
  storageBucket: "votre-projet.appspot.com",
  messagingSenderId: "votre-sender-id",
  appId: "votre-app-id"
};
```

### 4. Déployer les règles Firestore

Copier le contenu de `firestore.rules` dans :
**Firebase Console → Firestore → Règles**

### 5. Lancer l'application

```bash
npm run dev
```

L'application sera disponible sur [http://localhost:3000](http://localhost:3000)

---

## 👑 Créer un compte Admin

1. Inscrivez-vous normalement via l'interface
2. Dans **Firebase Console → Firestore → users → [votre-uid]**
3. Modifier le champ `role` : `"client"` → `"admin"`

Une fois admin, vous aurez accès à `/admin` depuis le dashboard.

---

## 🗄️ Structure Firestore

### Collection `users`
```json
{
  "uid": "string",
  "email": "string",
  "firstName": "string",
  "lastName": "string",
  "displayName": "string",
  "role": "client | admin",
  "kycStatus": "pending | submitted | approved | rejected",
  "phone": "string",
  "address": "string",
  "photoURL": "string",
  "createdAt": "timestamp"
}
```

### Collection `accounts`
```json
{
  "userId": "string",
  "balance": 0,
  "currency": "EUR",
  "iban": "string | null",
  "bic": "string | null",
  "ibanStatus": "none | pending | approved",
  "status": "active | inactive",
  "createdAt": "timestamp"
}
```

### Collection `transactions`
```json
{
  "userId": "string",
  "type": "deposit | withdrawal",
  "amount": 0,
  "label": "string",
  "note": "string",
  "createdAt": "timestamp"
}
```

### Collection `cards`
```json
{
  "userId": "string",
  "status": "pending | active | blocked",
  "type": "visa_debit",
  "maskedNumber": "**** **** **** 1234",
  "expiryMonth": "12",
  "expiryYear": "2028",
  "cvv": "string",
  "holderName": "string",
  "createdAt": "timestamp"
}
```

### Collection `requests`
```json
{
  "type": "iban_request",
  "userId": "string",
  "userEmail": "string",
  "userName": "string",
  "status": "pending | approved | rejected",
  "createdAt": "timestamp"
}
```

### Collection `notifications`
```json
{
  "userId": "string",
  "type": "string",
  "title": "string",
  "message": "string",
  "read": false,
  "createdAt": "timestamp"
}
```

---

## ✨ Fonctionnalités

### Espace Client
- ✅ Inscription (email + mot de passe)
- ✅ Connexion Google OAuth
- ✅ Réinitialisation mot de passe par email
- ✅ Dashboard avec graphique d'évolution du solde
- ✅ Consultation du compte et solde en temps réel
- ✅ Carte bancaire virtuelle Visa (demande + activation)
- ✅ Demande IBAN/BIC avec suivi d'étapes
- ✅ Historique des transactions avec filtres et recherche
- ✅ Virements entre clients internes
- ✅ Notifications temps réel (Firestore)
- ✅ KYC — Upload de pièce d'identité
- ✅ Modification du profil

### Espace Admin
- ✅ Vue d'ensemble (stats globales)
- ✅ Liste de tous les clients
- ✅ Validation et attribution IBAN + BIC
- ✅ Rejet de demandes IBAN
- ✅ Activation/blocage des cartes
- ✅ Dépôts et retraits sur n'importe quel compte
- ✅ Notifications automatiques aux clients
- ✅ Historique des demandes traitées

---

## 🔐 Sécurité

- Règles Firestore : chaque client ne voit que ses propres données
- L'admin a accès à tout
- Routes protégées côté React (PrivateRoute, AdminRoute)
- Firebase Auth gère les tokens JWT automatiquement
- HTTPS uniquement en production

---

## 🚢 Déploiement

```bash
# Build de production
npm run build

# Déployer sur Firebase Hosting
npm install -g firebase-tools
firebase login
firebase init hosting
firebase deploy
```

---

## 📱 Responsive

L'application est entièrement responsive :
- Sidebar rétractable sur mobile
- Grilles adaptatives (1 col → 4 cols)
- Cartes bancaires centrées sur mobile
