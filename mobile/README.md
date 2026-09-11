# Poubelle Connectee — Application mobile (React Native / Expo)

Application mobile compagnon du tableau de bord web, permettant de consulter
et gerer le systeme de poubelles connectees depuis un smartphone (Android/iOS),
avec **synchronisation en temps reel** sur la meme base de donnees que le site.

## Comment fonctionne la synchronisation

L'application mobile ne possede **aucune base de donnees propre**. Elle
consomme exactement les memes endpoints API que le site web deploye sur
Vercel (`https://poubelle-connectee.vercel.app/api/*`), qui lisent et
ecrivent dans la meme base Upstash Redis. Concretement :

- Une mesure envoyee par l'ESP32 apparait sur le site **et** sur l'app,
  au prochain cycle de rafraichissement (toutes les 15 secondes, identique
  au comportement web).
- Une action effectuee sur l'app (traiter une alerte, ajouter une poubelle,
  changer le mot de passe, regler l'intervalle de mesure) est immediatement
  visible sur le site, et inversement.
- Il n'y a donc pas de "synchronisation" a proprement parler a coder : les
  deux clients (web et mobile) sont simplement deux vues du meme etat
  serveur, comme deux onglets de navigateur ouverts sur le meme site.

## Fonctionnalites

### Onglet "Tableau de bord" (public, sans connexion)
- Jauges circulaires animees pour chaque poubelle (niveau, couleur selon seuil).
- Historique graphique au clic sur une poubelle (courbe des 50 dernieres mesures).
- Panneau des alertes en attente, avec statut d'envoi SMS.
- Rafraichissement automatique toutes les 15 secondes, avec pause en arriere-plan.

### Onglet "Historique" (necessite une connexion admin)
- Liste complete des alertes "poubelle pleine", triable par nom, date ou
  intervalle entre deux alertes.
- Tirer vers le bas pour rafraichir (pull-to-refresh natif).

### Onglet "Administration" (necessite une connexion admin)
- Connexion par mot de passe (memes identifiants que le site web).
- Ajout, consultation et suppression des poubelles.
- Reglage de l'intervalle de mesure de l'ESP32 (memes garde-fous que le site).
- Test d'envoi de SMS via l'API BEFIANA.
- Changement du mot de passe administrateur.
- Deconnexion.

Le bouton "Traiter" d'une alerte declenche une confirmation native
(`Alert.alert`), comme sur le site web.

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

Un QR code s'affiche dans le terminal : scannez-le avec l'application
**Expo Go** pour lancer l'application sur votre telephone, connecte au
meme reseau Wi-Fi que votre ordinateur.

## Configuration de l'URL de l'API

L'URL du backend est definie dans `app.json`, section `expo.extra.apiBaseUrl` :

```json
"extra": {
  "apiBaseUrl": "https://poubelle-connectee.vercel.app"
}
```

Remplacez cette valeur par l'URL exacte de votre deploiement Vercel si elle
differe. Aucune autre modification n'est necessaire.

## Authentification et cookies

L'espace admin du site utilise un cookie de session `httpOnly` (JWT). React
Native gere nativement les cookies via son implementation de `fetch`
(`credentials: 'include'`), donc la connexion fonctionne comme sur le site,
sans configuration supplementaire.

## A propos de CORS

Contrairement a un navigateur web, une application mobile native n'est
**pas soumise a la politique CORS**. Les appels a l'API Vercel depuis l'app
fonctionnent donc directement, sans modifier `vercel.json`.

## Limite connue : export PDF/Excel

L'export PDF/Excel de l'historique (avec graphique) reste une fonctionnalite
web (bibliotheques specifiquement navigateur : jsPDF, html2canvas, xlsx).
Pour generer ces exports, ouvrez le site web depuis un navigateur. L'onglet
"Historique" de l'app reste disponible en lecture pour la consultation rapide.

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
├── App.js
├── app.json
├── babel.config.js
├── package.json
├── src/
│   ├── config/api.js
│   ├── hooks/ (usePoubelles.js, useAuth.js)
│   ├── theme/colors.js
│   ├── components/ (CarteJauge.js, CarteAlerte.js)
│   └── screens/ (DashboardScreen.js, LoginScreen.js, AdminScreen.js, HistoriqueScreen.js)
└── README.md
```
