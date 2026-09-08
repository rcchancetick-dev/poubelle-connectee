import { obtenirAlertes, enregistrerAlertes, obtenirPoubelles } from './_store.js';
import { exigerAuthentification } from './_auth.js';

export default async function handler(req, res) {
  try {
    if (req.method === 'GET') {
      const [alertes, poubelles] = await Promise.all([obtenirAlertes(), obtenirPoubelles()]);
      const nonTraitees = alertes
        .filter((a) => !a.traitee)
        .map((a) => {
          const poubelle = poubelles.find((p) => p.id === a.poubelleId);
          return { ...a, poubelleNom: poubelle ? poubelle.nom : 'Inconnue' };
        })
        .sort((a, b) => new Date(b.dateAlerte) - new Date(a.dateAlerte));
      return res.status(200).json({ alertes: nonTraitees });
    }

    if (req.method === 'PATCH') {
      if (!exigerAuthentification(req, res)) return;
      const { id } = req.body || {};
      const alertes = await obtenirAlertes();
      const alerte = alertes.find((a) => a.id === Number(id));
      if (!alerte) return res.status(404).json({ erreur: 'Alerte introuvable' });
      alerte.traitee = true;
      await enregistrerAlertes(alertes);
      return res.status(200).json({ succes: true });
    }

    res.setHeader('Allow', 'GET, PATCH');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
