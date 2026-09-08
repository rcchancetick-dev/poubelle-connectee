/**
 * _befiana.js
 * Service d'envoi de SMS via l'API "SMS by BEFIANA" (Madagascar).
 * Documentation officielle :
 * https://help.befiana.cloud/docs/introduction-a-lutilisation-de-lapi-sms-par-befiana/
 * https://help.befiana.cloud/docs/envoyez-un-sms-en-utilisant-notre-cle-api/
 *
 * Authentification : cle API brute passee dans l'en-tete "Authorization"
 * (PAS de prefixe "Bearer", contrairement a beaucoup d'autres API).
 *
 * Endpoint d'envoi : POST https://api.befiana.cloud/api/smsko/v1/send/
 * Corps attendu    : { "phone_number": "321234567", "message": "..." }
 *
 * IMPORTANT (format du numero) : Befiana exige un numero SANS le "0" initial
 * et SANS l'indicatif "+261" -- juste les 9 chiffres locaux, ex: "321234567".
 */

import { ajouterLogSms } from './_store.js';

const URL_ENVOI = 'https://api.befiana.cloud/api/smsko/v1/send/';

function normaliserNumeroMalgache(numero) {
  let n = String(numero).trim().replace(/\s+/g, '');
  if (n.startsWith('+261')) n = n.slice(4);
  else if (n.startsWith('261')) n = n.slice(3);
  if (n.startsWith('0')) n = n.slice(1);
  return n;
}

export async function envoyerSmsBefiana({ to, poubelleNom, emplacement, niveau, forcerMessageBrut }) {
  const apiKey = process.env.BEFIANA_API_KEY;
  const destinataireBrut = to || process.env.DEFAULT_ALERT_NUMBER;

  const message = forcerMessageBrut
    ? forcerMessageBrut
    : `Alerte Poubelle Connectee : "${poubelleNom}" (${emplacement}) est remplie a ${Math.round(niveau * 10) / 10}%. Intervention requise.`;

  if (!apiKey) {
    return { succes: false, erreur: 'Cle API Befiana manquante (BEFIANA_API_KEY)' };
  }
  if (!destinataireBrut) {
    return { succes: false, erreur: 'Aucun numero destinataire fourni (ni numeroAlerteSms, ni DEFAULT_ALERT_NUMBER)' };
  }

  const numeroDestinataire = normaliserNumeroMalgache(destinataireBrut);

  try {
    const reponse = await fetch(URL_ENVOI, {
      method: 'POST',
      headers: {
        Authorization: apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        phone_number: numeroDestinataire,
        message,
      }),
    });

    const donneesReponse = await reponse.json().catch(() => ({}));

    if (reponse.ok) {
      await ajouterLogSms({
        id: Date.now(),
        numero: numeroDestinataire,
        message,
        statut: 'envoye',
        detail: donneesReponse.clientCorrelator || donneesReponse.message || 'SMS envoye',
        dateEnvoi: new Date().toISOString(),
      });
      return { succes: true, clientCorrelator: donneesReponse.clientCorrelator };
    }

    const detailErreur = donneesReponse.message || donneesReponse.detail || `Erreur HTTP ${reponse.status}`;
    await ajouterLogSms({
      id: Date.now(),
      numero: numeroDestinataire,
      message,
      statut: 'echec',
      detail: detailErreur,
      dateEnvoi: new Date().toISOString(),
    });
    return { succes: false, erreur: detailErreur };
  } catch (erreur) {
    await ajouterLogSms({
      id: Date.now(),
      numero: numeroDestinataire,
      message,
      statut: 'echec',
      detail: erreur.message,
      dateEnvoi: new Date().toISOString(),
    });
    return { succes: false, erreur: erreur.message };
  }
}
