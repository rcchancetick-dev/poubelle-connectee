/**
 * config/api.js
 * Centralise l'URL de base de l'API et les fonctions d'appel HTTP partagees
 * par toute l'application mobile. Consomme EXACTEMENT les memes endpoints
 * que le site web (deploye sur Vercel) : les deux clients (web + mobile)
 * lisent/ecrivent dans la meme base Redis, donc restent synchronises en
 * temps reel sans code de synchronisation supplementaire.
 *
 * IMPORTANT (authentification) : l'espace admin du site utilise un cookie
 * de session httpOnly. React Native gere les cookies via son propre magasin
 * (fetch avec credentials: 'include' fonctionne nativement depuis RN 0.71+).
 */

import Constants from 'expo-constants';

export const API_BASE_URL =
  Constants.expoConfig?.extra?.apiBaseUrl || 'https://poubelle-connectee.vercel.app';

async function requete(chemin, options = {}) {
  const reponse = await fetch(`${API_BASE_URL}${chemin}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const contentType = reponse.headers.get('content-type') || '';
  const donnees = contentType.includes('application/json') ? await reponse.json() : null;

  if (!reponse.ok) {
    const message = donnees?.erreur || `Erreur HTTP ${reponse.status}`;
    throw new Error(message);
  }

  return donnees;
}

export const api = {
  obtenirPoubelles: () => requete('/api/poubelles'),
  obtenirHistorique: (poubelleId) => requete(`/api/historique?poubelleId=${poubelleId}`),
  obtenirAlertes: () => requete('/api/alertes'),

  connecter: (motDePasse) =>
    requete('/api/login', { method: 'POST', body: JSON.stringify({ motDePasse }) }),
  deconnecter: () => requete('/api/logout', { method: 'POST' }),
  verifierSession: () => requete('/api/me'),
  changerMotDePasse: (ancienMotDePasse, nouveauMotDePasse) =>
    requete('/api/changer-mot-de-passe', {
      method: 'POST',
      body: JSON.stringify({ ancienMotDePasse, nouveauMotDePasse }),
    }),

  creerPoubelle: (poubelle) =>
    requete('/api/poubelles', { method: 'POST', body: JSON.stringify(poubelle) }),
  modifierPoubelle: (poubelle) =>
    requete('/api/poubelles', { method: 'PUT', body: JSON.stringify(poubelle) }),
  supprimerPoubelle: (id) => requete(`/api/poubelles?id=${id}`, { method: 'DELETE' }),

  traiterAlerte: (id) =>
    requete('/api/alertes', { method: 'PATCH', body: JSON.stringify({ id }) }),

  obtenirHistoriquePoubelles: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return requete(`/api/historique-poubelles?${query}`);
  },

  envoyerSmsTest: (to, message) =>
    requete('/api/envoyer-sms-test', { method: 'POST', body: JSON.stringify({ to, message }) }),
  obtenirLogsSms: () => requete('/api/sms-logs'),
};
