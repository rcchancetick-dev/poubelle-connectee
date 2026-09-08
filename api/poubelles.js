import { obtenirPoubelles, enregistrerPoubelles, obtenirMesures, supprimerMesuresDe, dernierNiveauDe } from './_store.js';
import { exigerAuthentification } from './_auth.js';

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
      const { nom, emplacement, hauteurCm, seuilAlerte, numeroAlerteSms } = req.body || {};
      if (!nom || !emplacement || !hauteurCm || !seuilAlerte) {
        return res.status(400).json({ erreur: 'Champs requis : nom, emplacement, hauteurCm, seuilAlerte' });
      }

      const poubelles = await obtenirPoubelles();
      const nouvelId = Math.max(0, ...poubelles.map((p) => p.id)) + 1;
      const nouvellePoubelle = {
        id: nouvelId, nom, emplacement,
        hauteurCm: Number(hauteurCm), seuilAlerte: Number(seuilAlerte),
        numeroAlerteSms: numeroAlerteSms || null, derniereAdresseIp: null,
      };
      poubelles.push(nouvellePoubelle);
      await enregistrerPoubelles(poubelles);
      return res.status(201).json({ succes: true, poubelle: nouvellePoubelle });
    }

    if (req.method === 'PUT') {
      const { id, nom, emplacement, hauteurCm, seuilAlerte, numeroAlerteSms } = req.body || {};
      const poubelles = await obtenirPoubelles();
      const poubelle = poubelles.find((p) => p.id === Number(id));
      if (!poubelle) return res.status(404).json({ erreur: 'Poubelle introuvable' });

      if (nom) poubelle.nom = nom;
      if (emplacement) poubelle.emplacement = emplacement;
      if (hauteurCm) poubelle.hauteurCm = Number(hauteurCm);
      if (seuilAlerte) poubelle.seuilAlerte = Number(seuilAlerte);
      if (numeroAlerteSms !== undefined) poubelle.numeroAlerteSms = numeroAlerteSms;

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
