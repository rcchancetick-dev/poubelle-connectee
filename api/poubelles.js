/**
 * api/poubelles.js
 * GET (public) -> liste des poubelles avec leur dernier niveau connu
 * POST/PUT/DELETE (proteges) -> gestion des poubelles, reservee a l'admin authentifie
 *
 * NOUVEAU : accepte desormais un champ "intervalleSommeil" (en secondes) a
 * la creation et a la modification d'une poubelle. Ce champ est renvoye a
 * l'ESP32 par /api/enregistrer-niveau pour piloter son deep sleep a distance.
 */

import { obtenirPoubelles, enregistrerPoubelles, obtenirMesures, supprimerMesuresDe, dernierNiveauDe } from './_store.js';
import { exigerAuthentification } from './_auth.js';

const INTERVALLE_SOMMEIL_DEFAUT_SECONDES = 300;
const INTERVALLE_SOMMEIL_MIN_SECONDES = 30; // garde-fou : empeche une valeur trop agressive (spam reseau/batterie)

function normaliserIntervalle(valeur) {
  const n = Number(valeur);
  if (!Number.isFinite(n) || n < INTERVALLE_SOMMEIL_MIN_SECONDES) {
    return INTERVALLE_SOMMEIL_DEFAUT_SECONDES;
  }
  return Math.round(n);
}

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const [poubelles, mesures] = await Promise.all([obtenirPoubelles(), obtenirMesures()]);
      const donnees = poubelles.map((p) => {
        const derniere = dernierNiveauDe(mesures, p.id);
        return { ...p, dernierNiveau: derniere ? derniere.niveauPourcent : null, derniereMesureDate: derniere ? derniere.dateMesure : null };
      });
      return res.status(200).json({ poubelles: donnees });
    }

    if (!exigerAuthentification(req, res)) return;

    if (req.method === 'POST') {
      const { nom, emplacement, hauteurCm, seuilAlerte, numeroAlerteSms, intervalleSommeil } = req.body || {};
      if (!nom || !emplacement || !hauteurCm || !seuilAlerte) {
        return res.status(400).json({ erreur: 'Champs requis : nom, emplacement, hauteurCm, seuilAlerte' });
      }

      const poubelles = await obtenirPoubelles();
      const nouvelId = Math.max(0, ...poubelles.map((p) => p.id)) + 1;
      const nouvellePoubelle = {
        id: nouvelId, nom, emplacement,
        hauteurCm: Number(hauteurCm), seuilAlerte: Number(seuilAlerte),
        numeroAlerteSms: numeroAlerteSms || null, derniereAdresseIp: null,
        intervalleSommeil: normaliserIntervalle(intervalleSommeil),
      };
      poubelles.push(nouvellePoubelle);
      await enregistrerPoubelles(poubelles);
      return res.status(201).json({ succes: true, poubelle: nouvellePoubelle });
    }

    if (req.method === 'PUT') {
      const { id, nom, emplacement, hauteurCm, seuilAlerte, numeroAlerteSms, intervalleSommeil } = req.body || {};
      const poubelles = await obtenirPoubelles();
      const poubelle = poubelles.find((p) => p.id === Number(id));
      if (!poubelle) return res.status(404).json({ erreur: 'Poubelle introuvable' });

      if (nom) poubelle.nom = nom;
      if (emplacement) poubelle.emplacement = emplacement;
      if (hauteurCm) poubelle.hauteurCm = Number(hauteurCm);
      if (seuilAlerte) poubelle.seuilAlerte = Number(seuilAlerte);
      if (numeroAlerteSms !== undefined) poubelle.numeroAlerteSms = numeroAlerteSms;
      if (intervalleSommeil !== undefined) poubelle.intervalleSommeil = normaliserIntervalle(intervalleSommeil);

      await enregistrerPoubelles(poubelles);
      return res.status(200).json({ succes: true, poubelle });
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      const poubelles = await obtenirPoubelles();
      await enregistrerPoubelles(poubelles.filter((p) => p.id !== id));
      await supprimerMesuresDe(id);
      return res.status(200).json({ succes: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
