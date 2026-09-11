# Poubelle Connectee — Application mobile (React Native / Expo)

Application mobile compagnon du tableau de bord web, permettant de consulter
et gerer le systeme de poubelles connectees depuis un smartphone (Android/iOS),
avec **synchronisation en temps reel** sur la meme base de donnees que le site.

## Nouveautes de cette version

- **Export PDF et Excel natifs sur mobile** (auparavant limites au web) :
  l'onglet "Historique" propose desormais deux boutons d'export fonctionnels
  directement sur le telephone.
- **Mode sombre / mode clair**, avec un troisieme choix "Systeme" qui suit
  automatiquement le reglage du telephone. Toutes les couleurs de texte ont
  ete choisies pour rester parfaitement lisibles dans les deux modes.

## Comment fonctionne la synchronisation

L'application mobile ne possede **aucune base de donnees propre**. Elle
consomme exactement les memes endpoints API que le site web deploye sur
Vercel (`https://poubelle-connectee.vercel.app/api/*`), qui lisent et
ecrivent dans la meme base Upstash Redis.

## Fonctionnalites

### Onglet "Tableau de bord" (public, sans connexion)
- Jauges circulaires animees, code couleur adapte au theme actif.
- Historique graphique au clic sur une poubelle.
- Panneau des alertes en attente, avec statut d'envoi SMS.
- Rafraichissement automatique toutes les 15 secondes.

### Onglet "Historique" (necessite une connexion admin)
- Liste complete des alertes, triable par nom, date ou intervalle.
- **Export PDF** : genere un document avec un tableau recapitulatif
  (nombre d'alertes par poubelle) suivi du detail complet, via `expo-print`
  (rendu HTML natif). Ouvre ensuite la feuille de partage du telephone
  (enregistrer, envoyer par email/WhatsApp, imprimer...).
- **Export Excel** : genere un classeur `.xlsx` a deux feuilles
  (Historique + Statistiques), via `xlsx` (SheetJS) + `expo-file-system`,
  puis ouvre la meme feuille de partage.
- Tirer vers le bas pour rafraichir.

### Onglet "Administration" (necessite une connexion admin)
- **Section "Apparence"** : trois boutons (Systeme / Clair / Sombre) pour
  choisir le theme. Le choix est memorise et applique immediatement.
- Connexion par mot de passe, CRUD des poubelles, reglage de l'intervalle
  de mesure ESP32, test d'envoi SMS, changement du mot de passe.

Le bouton "Traiter" d'une alerte declenche une confirmation native.

## Prerequis

- Node.js 18 ou plus recent
- Un compte Expo (gratuit) : https://expo.dev
- L'application **Expo Go** installee sur votre telephone

## Installation et lancement en developpement

```bash
cd mobile
npm install
npx expo start
```

## Details techniques des exports

Contrairement au web (qui utilise `jsPDF` + `html2canvas` + `xlsx`
directement dans le navigateur), ces bibliotheques ne fonctionnent pas sur
React Native. L'implementation mobile (`src/services/export.js`) utilise :

- **PDF** : `expo-print` convertit une chaine HTML en PDF via le moteur de
  rendu natif du systeme (WebView), sans dependance externe.
- **Excel** : `xlsx` (SheetJS) genere le classeur encode en base64 (pas
  d'acces disque direct possible depuis le JS pur en React Native),
  `expo-file-system` ecrit ce contenu dans le cache de l'application.
- **Partage** : dans les deux cas, `expo-sharing` ouvre la feuille de
  partage native (Android : "Partager via...", iOS : feuille d'action),
  permettant d'enregistrer le fichier, de l'envoyer par email/WhatsApp, ou
  de l'ouvrir dans une autre application (Excel, Adobe Acrobat, etc.).

Ces trois modules (`expo-print`, `expo-sharing`, `expo-file-system`) sont
deja references dans `package.json` : `npm install` suffit, aucune
configuration native supplementaire n'est necessaire (ils fonctionnent
directement dans Expo Go).

## Details techniques du mode sombre/clair

`src/theme/ThemeContext.js` expose un hook `useTheme()` accessible partout
dans l'application, avec :

- `couleurs` : la palette active (`clair` ou `sombre`), a utiliser dans
  chaque composant au lieu de couleurs codees en dur.
- `modeActif` : `'clair'` ou `'sombre'`, calcule a partir de la preference
  et du reglage systeme du telephone (`useColorScheme`).
- `preference` et `definirPreference()` : pour lire/modifier le choix de
  l'utilisateur (`'systeme'`, `'clair'` ou `'sombre'`), memorise via
  `AsyncStorage` et applique au demarrage suivant.

Les couleurs de texte ont ete choisies avec un contraste eleve dans les
deux modes :
- Mode clair : texte quasi noir (`#0f172a`) sur fond blanc/gris tres clair.
- Mode sombre : texte quasi blanc (`#f8fafc`) sur fond bleu-nuit tres
  fonce (`#0f172a`), en evitant le piege frequent du gris moyen sur gris
  moyen qui rend un dark mode illisible.

Le composant `SelecteurTheme.js` (visible dans l'onglet Administration,
section "Apparence") permet de changer de mode a tout moment.

## Configuration de l'URL de l'API

```json
"extra": {
  "apiBaseUrl": "https://poubelle-connectee.vercel.app"
}
```
dans `app.json`.

## Authentification, cookies et CORS

Identique aux versions precedentes : cookie `httpOnly` gere nativement par
`fetch` (`credentials: 'include'`), et aucune contrainte CORS pour une app
mobile native (contrairement a un navigateur web).

## Construire une version installable (APK / IPA)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --platform android
eas build --platform ios
```

## Structure du dossier

```
mobile/
├── App.js                              Point d'entree, ThemeProvider + navigation
├── app.json / babel.config.js / package.json
├── src/
│   ├── config/api.js                    Client HTTP partage avec le web
│   ├── hooks/ (usePoubelles.js, useAuth.js)
│   ├── theme/
│   │   └── ThemeContext.js              Mode clair/sombre (NOUVEAU)
│   ├── services/
│   │   └── export.js                    Export PDF/Excel natifs (NOUVEAU)
│   ├── components/
│   │   ├── CarteJauge.js, CarteAlerte.js
│   │   └── SelecteurTheme.js            Bascule clair/sombre/systeme (NOUVEAU)
│   └── screens/
│       ├── DashboardScreen.js, LoginScreen.js
│       ├── AdminScreen.js                Inclut la section "Apparence"
│       └── HistoriqueScreen.js           Inclut les boutons d'export
└── README.md
```
