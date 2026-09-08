/**
 * api/historique-poubelles.js
 * GET (protege) -> historique combine des mesures et des alertes "poubelle pleine"
 * pour toutes les poubelles, avec tri et filtrage par plage de dates.
 *
 * Query params optionnels :
 *   - tri : "nom" | "date" | "intervalle" (defaut : "date")
 *   - ordre : "asc" | "desc" (defaut : "desc")
 *   - dateDebut, dateFin : format ISO (YYYY-MM-DD), filtre sur la date d'alerte
 *   - poubelleId : filtre sur une poubelle precise
 *
 * "Intervalle" designe ici la duree ecoulee entre deux alertes successives
 * d'une meme poubelle (utile pour suivre la frequence a laquelle une poubelle
 * atteint son seuil critique -- plus l'intervalle est court, plus la poubelle
 * se remplit vite et necessite une collecte frequente).
 */

import { obtenirAlertes, obtenirPoubelles, obtenirMesures } from './_store.js';
import { exigerAuthentification } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  if (!exigerAuthentification(req, res)) return;

  try {
    const [alertes, poubelles, mesures] = await Promise.all([
      obtenirAlertes(),
      obtenirPoubelles(),
      obtenirMesures(),
    ]);

    const { tri = 'date', ordre = 'desc', dateDebut, dateFin, poubelleId } = req.query;

    const poubelleParId = new Map(poubelles.map((p) => [p.id, p]));

    // Regroupe les alertes par poubelle pour calculer l'intervalle entre deux
    // alertes successives d'une meme poubelle (triees chronologiquement).
    const alertesParPoubelle = new Map();
    alertes.forEach((a) => {
      if (!alertesParPoubelle.has(a.poubelleId)) alertesParPoubelle.set(a.poubelleId, []);
      alertesParPoubelle.get(a.poubelleId).push(a);
    });

    let historique = alertes.map((a) => {
      const poubelle = poubelleParId.get(a.poubelleId);
      const alertesDeLaPoubelle = (alertesParPoubelle.get(a.poubelleId) || [])
        .slice()
        .sort((x, y) => new Date(x.dateAlerte) - new Date(y.dateAlerte));
      const index = alertesDeLaPoubelle.findIndex((x) => x.id === a.id);
      const precedente = index > 0 ? alertesDeLaPoubelle[index - 1] : null;
      const intervalleHeures = precedente
        ? Math.round(((new Date(a.dateAlerte) - new Date(precedente.dateAlerte)) / 3600000) * 10) / 10
        : null;

      return {
        id: a.id,
        poubelleId: a.poubelleId,
        poubelleNom: poubelle ? poubelle.nom : 'Poubelle supprimee',
        emplacement: poubelle ? poubelle.emplacement : '—',
        niveauPourcent: a.niveauPourcent,
        dateAlerte: a.dateAlerte,
        traitee: a.traitee,
        smsEnvoye: a.smsEnvoye,
        intervalleHeures, // null si c'est la premiere alerte connue de cette poubelle
      };
    });

    // --- Filtrage ---
    if (poubelleId) {
      historique = historique.filter((h) => h.poubelleId === Number(poubelleId));
    }
    if (dateDebut) {
      const debut = new Date(dateDebut);
      historique = historique.filter((h) => new Date(h.dateAlerte) >= debut);
    }
    if (dateFin) {
      const fin = new Date(dateFin);
      fin.setHours(23, 59, 59, 999);
      historique = historique.filter((h) => new Date(h.dateAlerte) <= fin);
    }

    // --- Tri ---
    const facteur = ordre === 'asc' ? 1 : -1;
    historique.sort((a, b) => {
      if (tri === 'nom') return facteur * a.poubelleNom.localeCompare(b.poubelleNom);
      if (tri === 'intervalle') {
        const ai = a.intervalleHeures ?? -1;
        const bi = b.intervalleHeures ?? -1;
        return facteur * (ai - bi);
      }
      // tri par defaut : date
      return facteur * (new Date(a.dateAlerte) - new Date(b.dateAlerte));
    });

    // --- Statistiques agregees pour le graphique (nombre d'alertes par poubelle) ---
    const statsParPoubelle = {};
    historique.forEach((h) => {
      if (!statsParPoubelle[h.poubelleNom]) statsParPoubelle[h.poubelleNom] = 0;
      statsParPoubelle[h.poubelleNom] += 1;
    });

    return res.status(200).json({
      historique,
      statsParPoubelle,
      total: historique.length,
    });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
