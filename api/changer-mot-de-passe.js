import { exigerAuthentification, verifierMotDePasse, changerMotDePasseAdmin } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  if (!exigerAuthentification(req, res)) return;

  const { ancienMotDePasse, nouveauMotDePasse } = req.body || {};

  if (!ancienMotDePasse || !nouveauMotDePasse) {
    return res.status(400).json({ erreur: 'Champs requis : ancienMotDePasse, nouveauMotDePasse' });
  }
  if (nouveauMotDePasse.length < 8) {
    return res.status(400).json({ erreur: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.' });
  }

  try {
    const ancienValide = await verifierMotDePasse(ancienMotDePasse);
    if (!ancienValide) return res.status(401).json({ erreur: 'Ancien mot de passe incorrect.' });

    await changerMotDePasseAdmin(nouveauMotDePasse);
    return res.status(200).json({
      succes: true,
      message: 'Mot de passe mis a jour et enregistre de facon persistante (Redis Upstash).',
    });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
