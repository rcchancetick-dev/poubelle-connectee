import { obtenirPoubelles, enregistrerPoubelles, ajouterMesure, obtenirAlertes, enregistrerAlertes, obtenirCompteurs, enregistrerCompteurs, calculerNiveau } from './_store.js';
import { envoyerSmsBefiana } from './_befiana.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Methode non autorisee, utilisez POST' });
  }

  const cleAttendue = process.env.ESP32_API_KEY;
  if (cleAttendue) {
    const cleRecue = req.headers['x-api-key'];
    if (cleRecue !== cleAttendue) {
      return res.status(401).json({ erreur: 'Cle API invalide ou manquante (en-tete x-api-key)' });
    }
  }

  const { poubelle_id, distance_cm } = req.body || {};
  if (poubelle_id === undefined || distance_cm === undefined) {
    return res.status(400).json({ erreur: 'Champs requis : poubelle_id, distance_cm' });
  }

  try {
    const poubelles = await obtenirPoubelles();
    const poubelle = poubelles.find((p) => p.id === Number(poubelle_id));
    if (!poubelle) return res.status(404).json({ erreur: 'Poubelle introuvable' });

    const niveau = calculerNiveau(poubelle.hauteurCm, Number(distance_cm));
    const compteurs = await obtenirCompteurs();

    const mesure = {
      id: compteurs.prochainIdMesure++,
      poubelleId: poubelle.id,
      niveauPourcent: Math.round(niveau * 10) / 10,
      distanceCm: Number(distance_cm),
      dateMesure: new Date().toISOString(),
    };
    await ajouterMesure(mesure);

    poubelle.derniereAdresseIp = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || null;
    await enregistrerPoubelles(poubelles);

    const reponse = { succes: true, niveau: mesure.niveauPourcent, seuil: poubelle.seuilAlerte, alerte: false, smsEnvoye: false };

    if (niveau >= poubelle.seuilAlerte) {
      const alertes = await obtenirAlertes();
      const alerte = {
        id: compteurs.prochainIdAlerte++, poubelleId: poubelle.id, niveauPourcent: mesure.niveauPourcent,
        dateAlerte: new Date().toISOString(), traitee: false, smsEnvoye: false,
      };
      alertes.push(alerte);
      reponse.alerte = true;

      const resultatSms = await envoyerSmsBefiana({
        to: poubelle.numeroAlerteSms, poubelleNom: poubelle.nom, emplacement: poubelle.emplacement, niveau: mesure.niveauPourcent,
      });

      if (resultatSms.succes) {
        alerte.smsEnvoye = true;
        reponse.smsEnvoye = true;
      } else {
        reponse.smsErreur = resultatSms.erreur;
      }

      await enregistrerAlertes(alertes);
    }

    await enregistrerCompteurs(compteurs);
    return res.status(201).json(reponse);
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
