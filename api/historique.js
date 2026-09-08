import { obtenirMesures } from './_store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  const poubelleId = Number(req.query.poubelleId);
  if (!poubelleId) return res.status(400).json({ erreur: 'poubelleId requis' });

  try {
    const mesures = await obtenirMesures();
    const filtrees = mesures
      .filter((m) => m.poubelleId === poubelleId)
      .slice(-50)
      .map((m) => ({ niveau: m.niveauPourcent, date: m.dateMesure }));
    return res.status(200).json({ mesures: filtrees });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
