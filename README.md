# Poubelle Connectee — ESP32 + React + API SMS BEFIANA

Systeme IoT de supervision du niveau de remplissage de poubelles, base sur des modules
**ESP32** equipes d'un capteur ultrason **HC-SR04**, relies a un tableau de bord web
moderne (**React + Vite + Framer Motion**), deployable sur **Vercel**, avec des alertes
**SMS automatiques via l'API BEFIANA** (Madagascar) des qu'une poubelle depasse son seuil
de remplissage.

Projet realise dans le cadre du mini-projet IoT — ESPA, Filiere Informatique L2,
module Communication Numerique et Transmission.

## Sommaire

1. [Architecture generale](#architecture-generale)
2. [Structure du depot](#structure-du-depot)
3. [Cablage de l'ESP32](#cablage-de-lesp32)
4. [Installation et deploiement](#installation-et-deploiement)
5. [Integration de l'API SMS BEFIANA](#integration-de-lapi-sms-befiana)
6. [Espace administrateur securise](#espace-administrateur-securise)
7. [Tests fonctionnels](#tests-fonctionnels)
8. [Limites connues et ameliorations futures](#limites-connues-et-ameliorations-futures)

## Architecture generale

```
┌──────────────┐   Wi-Fi/HTTP    ┌─────────────────┐   Redis    ┌──────────────┐
│ ESP32+HC-SR04│ ─────────────▶│  API Vercel (Node)   │◀────────▶│ Upstash Redis│
│ (mesure,     │  POST JSON      │  /api/enregistrer-   │            │ (persistance)│
│  calcul)     │                 │  niveau.js           │            └──────────────┘
└──────────────┘                 └───────────┬───────────┘
                                             │ si seuil depasse
                                             ▼
                                  ┌─────────────────┐
                                  │  API BEFIANA (SMS)   │
                                  │  api.befiana.cloud   │
                                  └─────────────────┘
                                             │
                                             ▼
                                     Agent de collecte
                                     (SMS d'alerte)

┌─────────────────┐   AJAX/fetch   ┌─────────────────┐
│ Navigateur (React)  │◀──────────────▶│  API Vercel (Node)   │
│ Dashboard + Admin   │                 │  /api/poubelles.js  │
└─────────────────┘                 │  /api/alertes.js    │
                                         │  /api/historique.js │
                                         └─────────────────┘
```

Le frontend React (Vite) et le backend (fonctions serverless dans `api/`) sont deployes
ensemble sur Vercel a partir de ce meme depot. Aucun serveur PHP/MySQL n'est necessaire :
toutes les donnees (poubelles, mesures, alertes, logs SMS, mot de passe admin) sont
persistees dans **Upstash Redis** (integration officielle du Vercel Marketplace).

## Structure du depot

```
poubelle-connectee/
├── api/                              Fonctions serverless Vercel (Node.js)
│   ├── _store.js                      Couche d'acces Redis (poubelles, mesures, alertes, logs, mot de passe)
│   ├── _auth.js                        Authentification admin (bcrypt + JWT + cookie httpOnly)
│   ├── _befiana.js                     Service d'envoi de SMS via l'API BEFIANA
│   ├── login.js / logout.js / me.js    Connexion / deconnexion / etat de session
│   ├── changer-mot-de-passe.js        Changement securise du mot de passe admin
│   ├── poubelles.js                    CRUD des poubelles (GET public, reste protege)
│   ├── enregistrer-niveau.js           Endpoint appele par l'ESP32 (POST, cle API dediee)
│   ├── historique.js                   Historique des mesures d'une poubelle
│   ├── alertes.js                      Liste et traitement des alertes
│   ├── envoyer-sms-test.js             Envoi manuel d'un SMS de test (espace admin)
│   └── sms-logs.js                     Journal des SMS envoyes
├── scripts/
│   └── generer-hash.js                Utilitaire pour generer un hash bcrypt local
├── src/                                Frontend React
│   ├── components/                     Navbar, Dashboard, GaugeCard, HistoriqueModal,
│   │                                    AlertesPanel, LoginAdmin, Admin
│   ├── hooks/                          useAuth.js, usePoubelles.js
│   ├── styles/global.css              Design responsive (mobile-first)
│   ├── App.jsx / main.jsx
├── arduino/
│   └── poubelle_connectee.ino         Firmware ESP32 (mesure + envoi HTTP)
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .env.example
```

## Cablage de l'ESP32

Le capteur HC-SR04 fonctionne en 5V alors que les broches GPIO de l'ESP32 tolerent au
maximum 3.3V. Un pont diviseur de tension est indispensable sur la broche ECHO :

| HC-SR04 | ESP32 |
|---|---|
| VCC | 5V (VIN) |
| TRIG | GPIO 5 |
| ECHO → R1 (2 kΩ) → point milieu → R2 (1 kΩ) → GND | GPIO 18 (point milieu du pont) |
| GND | GND commune |

Formule du pont diviseur : `Vsortie = Vecho x R2/(R1+R2) = 5V x 1k/(2k+1k) ≈ 1.66V x 2 ≈ 3.3V`

Une LED (+ resistance 220Ω) et un buzzer actif peuvent etre ajoutes respectivement sur
les broches GPIO 2 et GPIO 4 pour une alerte visuelle/sonore locale, en complement du SMS.

## Installation et deploiement

### 1. Cloner et installer les dependances

```bash
git clone https://github.com/rcchancetick-dev/poubelle-connectee.git
cd poubelle-connectee
npm install
```

### 2. Activer la persistance (Upstash Redis)

1. Dans le dashboard Vercel de ce projet : **Storage → Marketplace Database Providers → Upstash**.
2. Creer/connecter un compte Upstash (plan gratuit, 10 000 commandes/jour incluses).
3. Creer une base Redis et la lier au projet. Vercel injecte automatiquement
   `KV_REST_API_URL` et `KV_REST_API_TOKEN`.

### 3. Definir les variables d'environnement

Copier `.env.example` en `.env.local` (developpement local) et/ou les renseigner dans
**Vercel → Settings → Environment Variables** :

| Variable | Role |
|---|---|
| `KV_REST_API_URL` / `KV_REST_API_TOKEN` | Connexion Upstash Redis (injectees par l'integration) |
| `ADMIN_PASSWORD_INITIAL` | Mot de passe admin initial, hashe puis stocke dans Redis |
| `JWT_SECRET` | Cle de signature des sessions (`openssl rand -hex 32`) |
| `BEFIANA_API_KEY` | Cle API BEFIANA (voir section suivante) |
| `DEFAULT_ALERT_NUMBER` | Numero par defaut de l'agent de collecte (format Befiana, ex: `321234567`) |
| `ESP32_API_KEY` | Cle partagee avec le firmware ESP32 |

### 4. Deployer sur Vercel

```bash
npm install -g vercel
vercel login
vercel        # previsualisation
vercel --prod # mise en production
```

Ou via l'interface web : importer ce depot GitHub dans Vercel, renseigner les variables
d'environnement, puis cliquer sur **Deploy**. Vite est detecte automatiquement grace a
`vercel.json`.

### 5. Configurer et televerser le firmware ESP32

Dans `arduino/poubelle_connectee.ino`, modifier :

- `SSID_WIFI` / `MOT_DE_PASSE_WIFI` : identifiants du reseau Wi-Fi
- `URL_SERVEUR` : URL Vercel de production, ex. `https://poubelle-connectee.vercel.app/api/enregistrer-niveau`
- `CLE_API` : doit correspondre exactement a `ESP32_API_KEY`
- `ID_POUBELLE` : identifiant de la poubelle (1, 2 ou 3 par defaut dans les donnees de demo)

Televerser avec l'Arduino IDE (carte : *ESP32 Dev Module*, support ESP32 installe via
l'URL `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`).
Bibliotheque requise : **ArduinoJson** (gestionnaire de bibliotheques Arduino).

## Integration de l'API SMS BEFIANA

Ce projet utilise **SMS by BEFIANA**, un fournisseur SMS malgache, documente ici :
https://help.befiana.cloud/docs/introduction-a-lutilisation-de-lapi-sms-par-befiana/

### Obtenir une cle API

1. Creer un compte sur [befiana.cloud](https://www.befiana.cloud).
2. Aller dans l'onglet **Integration App** de l'application SMS.
3. Creer une cle API (nom + description), la copier et la stocker de maniere securisee.
4. Renseigner cette cle dans la variable d'environnement `BEFIANA_API_KEY`.

### Fonctionnement technique (implemente dans `api/_befiana.js`)

- **Domaine** : `https://api.befiana.cloud`
- **Endpoint d'envoi** : `POST /api/smsko/v1/send/`
- **Authentification** : en-tete `Authorization` contenant la cle API **brute** (sans
  prefixe `Bearer`), contrairement a beaucoup d'autres API SMS.
- **Corps de la requete** :
  ```json
  { "phone_number": "321234567", "message": "Texte du SMS" }
  ```
- **Format du numero exige par Befiana** : 9 chiffres locaux, **sans** le `0` initial et
  **sans** l'indicatif `+261`. Le fichier `_befiana.js` normalise automatiquement les
  numeros fournis sous n'importe quel format (`+261321234567`, `0321234567`,
  `321234567`) vers ce format attendu.

### Flux complet d'une alerte

1. L'ESP32 envoie `POST /api/enregistrer-niveau` avec `{ poubelle_id, distance_cm }`.
2. Le backend calcule le niveau de remplissage et l'enregistre dans Redis.
3. Si `niveau >= seuil_alerte` de la poubelle, une alerte est creee et
   `envoyerSmsBefiana()` (dans `api/_befiana.js`) envoie le SMS.
4. Chaque tentative (succes ou echec) est journalisee et consultable dans l'onglet
   **Administration** du tableau de bord (`/api/sms-logs`).

### Tester l'envoi de SMS sans materiel ESP32

```bash
curl -X POST https://votre-projet.vercel.app/api/enregistrer-niveau \
  -H "Content-Type: application/json" \
  -H "x-api-key: change_moi_en_production" \
  -d '{"poubelle_id": 1, "distance_cm": 8}'
```

Ou directement depuis l'espace admin du tableau de bord, via le formulaire
**"Test d'envoi SMS (BEFIANA)"**.

## Espace administrateur securise

- Le mot de passe admin est **hashe avec bcrypt** (jamais stocke en clair) et persiste
  dans Redis (`api/_store.js`), survivant aux redemarrages a froid des fonctions Vercel.
- La session est geree par un **cookie JWT httpOnly** (inaccessible en JavaScript
  cote navigateur, protege contre le vol par XSS).
- `POST /api/login` limite les tentatives a 5 par IP sur 10 minutes.
- Toutes les actions sensibles (CRUD poubelles, traitement d'alerte, envoi de SMS de
  test, consultation des logs) exigent une session valide, verifiee cote serveur.
- Le mot de passe se change depuis l'onglet **Administration**, en fournissant
  l'ancien mot de passe, le nouveau, et sa confirmation (8 caracteres minimum).

Premiere connexion : utiliser le mot de passe defini dans `ADMIN_PASSWORD_INITIAL`. Si
cette variable n'est pas definie, un mot de passe aleatoire est genere et affiche une
seule fois dans les Runtime Logs Vercel — a recuperer immediatement puis a changer.

## Tests fonctionnels

| # | Test | Resultat attendu |
|---|---|---|
| 1 | Mesure normale (poubelle vide) | Niveau proche de 0%, aucun SMS |
| 2 | Mesure au-dessus du seuil | Alerte creee, SMS recu via BEFIANA |
| 3 | Coupure Wi-Fi pendant l'envoi ESP32 | Reconnexion automatique, log d'erreur affiche |
| 4 | Cle BEFIANA invalide | `smsEnvoye: false`, erreur journalisee dans les logs SMS |
| 5 | CRUD poubelle (admin) | Ajout/modification/suppression fonctionnels |
| 6 | Rafraichissement automatique | Jauges et alertes mises a jour sans recharger la page |
| 7 | Changement de mot de passe | Nouveau mot de passe valide immediatement et de facon persistante |
| 8 | Acces admin sans authentification | Requetes protegees renvoient 401 |

## Limites connues et ameliorations futures

- **Persistance** : toutes les donnees dependent d'Upstash Redis (plan gratuit,
  10 000 commandes/jour). Pour un usage a plus grande echelle, surveiller la
  consommation ou passer a un plan payant.
- **Sender name personnalise** : BEFIANA permet de personnaliser le nom d'expediteur
  du SMS sur demande, mais certains operateurs peuvent le bloquer malgre tout — a
  verifier au cas par cas aupres du support BEFIANA.
- **Ameliorations futures** : remplacer HTTP par MQTT pour la transmission ESP32 (plus
  econome en energie), ajouter un panneau solaire pour l'autonomie du module, integrer
  un capteur de poids en complement de l'ultrason, et journaliser les tentatives de
  connexion admin (succes/echec, IP, horodatage) pour un audit de securite plus complet.
