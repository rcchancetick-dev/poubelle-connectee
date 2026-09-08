/**
 * _store.js
 * Couche d'acces aux donnees, persistee dans Upstash Redis
 * (integration "Upstash" du Vercel Marketplace, anciennement "Vercel KV").
 *
 * Un store en memoire vivrait uniquement dans le processus de la fonction
 * serverless. Sur Vercel, chaque fonction peut redemarrer a froid ou etre
 * routee vers une instance differente a tout moment : Redis (Upstash) est
 * un stockage externe qui survit a ces redemarrages.
 *
 * NOUVEAU : chaque poubelle possede desormais un champ "intervalleSommeil"
 * (en secondes), pilotable depuis l'espace admin du site. Ce champ est
 * renvoye a l'ESP32 dans la reponse de /api/enregistrer-niveau, qui l'utilise
 * pour regler la duree de son prochain deep sleep -- sans jamais reflasher
 * le firmware. Seuls le Wi-Fi, l'URL du serveur et la cle API restent geres
 * uniquement cote firmware (impossible de les piloter a distance, puisque
 * l'ESP32 en a besoin avant meme de pouvoir contacter le serveur).
 */

import { Redis } from '@upstash/redis';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

function client() {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error(
      "Upstash Redis non configure : definissez KV_REST_API_URL et KV_REST_API_TOKEN " +
      "(installez l'integration Upstash depuis Vercel > Storage > Marketplace Database Providers)."
    );
  }
  return new Redis({ url, token });
}

let redisInstance = null;
function redis() {
  if (!redisInstance) redisInstance = client();
  return redisInstance;
}

// Intervalle de sommeil par defaut (secondes) applique aux nouvelles poubelles
// et utilise comme valeur de repli si le champ est absent d'une poubelle existante.
const INTERVALLE_SOMMEIL_DEFAUT_SECONDES = 300; // 5 minutes

const DONNEES_DEMO_POUBELLES = [
  { id: 1, nom: 'Poubelle Bibliotheque', emplacement: 'Entree principale - Bibliotheque', hauteurCm: 60, seuilAlerte: 80, numeroAlerteSms: '321234567', derniereAdresseIp: null, intervalleSommeil: 300 },
  { id: 2, nom: 'Poubelle Cafeteria', emplacement: 'Cour centrale - Cafeteria', hauteurCm: 50, seuilAlerte: 75, numeroAlerteSms: '321234567', derniereAdresseIp: null, intervalleSommeil: 300 },
  { id: 3, nom: 'Poubelle Amphitheatre', emplacement: 'Batiment A - Amphitheatre 1', hauteurCm: 55, seuilAlerte: 80, numeroAlerteSms: '321234567', derniereAdresseIp: null, intervalleSommeil: 300 },
];

async function initialiserSiVide() {
  const r = redis();
  const dejaInitialise = await r.get('poubelles');
  if (dejaInitialise) return;

  const maintenant = Date.now();
  const mesures = [];
  let prochainIdMesure = 1;

  DONNEES_DEMO_POUBELLES.forEach((p) => {
    let niveau = 10 + Math.random() * 20;
    for (let i = 48; i >= 0; i--) {
      niveau = Math.max(0, Math.min(100, niveau + (Math.random() * 8 - 2)));
      mesures.push({
        id: prochainIdMesure++,
        poubelleId: p.id,
        niveauPourcent: Math.round(niveau * 10) / 10,
        distanceCm: Math.round((p.hauteurCm * (1 - niveau / 100)) * 10) / 10,
        dateMesure: new Date(maintenant - i * 30 * 60 * 1000).toISOString(),
      });
    }
  });

  await Promise.all([
    r.set('poubelles', DONNEES_DEMO_POUBELLES),
    r.set('mesures', mesures),
    r.set('alertes', []),
    r.set('sms:logs', []),
    r.set('compteurs', { prochainIdMesure, prochainIdAlerte: 1 }),
  ]);
}

export async function obtenirHashAdmin() {
  const r = redis();
  await initialiserSiVide();

  let hash = await r.get('admin:motDePasseHash');
  if (hash) return hash;

  const motDePasseInitial = process.env.ADMIN_PASSWORD_INITIAL;
  let motDePasseUtilise = motDePasseInitial;

  if (!motDePasseInitial) {
    motDePasseUtilise = crypto.randomBytes(6).toString('hex');
    console.warn(
      `[SECURITE] ADMIN_PASSWORD_INITIAL non defini. Mot de passe admin genere aleatoirement (stocke dans Redis) : ${motDePasseUtilise}\n` +
      `Notez-le maintenant, il ne sera plus jamais affiche. Changez-le ensuite depuis l'espace admin.`
    );
  }

  hash = bcrypt.hashSync(motDePasseUtilise, 10);
  await r.set('admin:motDePasseHash', hash);
  return hash;
}

export async function definirHashAdmin(nouveauHash) {
  const r = redis();
  await r.set('admin:motDePasseHash', nouveauHash);
}

export async function obtenirPoubelles() {
  const r = redis();
  await initialiserSiVide();
  const poubelles = (await r.get('poubelles')) || [];
  // Retro-compatibilite : garantit un intervalleSommeil meme sur des
  // poubelles creees avant l'ajout de ce champ.
  return poubelles.map((p) => ({
    intervalleSommeil: INTERVALLE_SOMMEIL_DEFAUT_SECONDES,
    ...p,
  }));
}

export async function enregistrerPoubelles(poubelles) {
  const r = redis();
  await r.set('poubelles', poubelles);
}

export async function obtenirMesures() {
  const r = redis();
  await initialiserSiVide();
  return (await r.get('mesures')) || [];
}

export async function ajouterMesure(mesure) {
  const r = redis();
  const mesures = await obtenirMesures();
  mesures.push(mesure);
  const tronquees = mesures.slice(-500);
  await r.set('mesures', tronquees);
}

export async function supprimerMesuresDe(poubelleId) {
  const r = redis();
  const mesures = await obtenirMesures();
  await r.set('mesures', mesures.filter((m) => m.poubelleId !== poubelleId));
}

export async function obtenirAlertes() {
  const r = redis();
  await initialiserSiVide();
  return (await r.get('alertes')) || [];
}

export async function enregistrerAlertes(alertes) {
  const r = redis();
  await r.set('alertes', alertes);
}

export async function obtenirLogsSms() {
  const r = redis();
  await initialiserSiVide();
  return (await r.get('sms:logs')) || [];
}

export async function ajouterLogSms(log) {
  const r = redis();
  const logs = await obtenirLogsSms();
  logs.push(log);
  const tronques = logs.slice(-200);
  await r.set('sms:logs', tronques);
}

export async function obtenirCompteurs() {
  const r = redis();
  await initialiserSiVide();
  return (await r.get('compteurs')) || { prochainIdMesure: 1, prochainIdAlerte: 1 };
}

export async function enregistrerCompteurs(compteurs) {
  const r = redis();
  await r.set('compteurs', compteurs);
}

export function calculerNiveau(hauteurCm, distanceCm) {
  const niveau = ((hauteurCm - distanceCm) / hauteurCm) * 100;
  return Math.max(0, Math.min(100, niveau));
}

export function dernierNiveauDe(mesures, poubelleId) {
  const mesuresPoubelle = mesures.filter((m) => m.poubelleId === poubelleId);
  if (mesuresPoubelle.length === 0) return null;
  return mesuresPoubelle[mesuresPoubelle.length - 1];
}
