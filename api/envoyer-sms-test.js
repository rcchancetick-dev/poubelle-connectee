import { envoyerSmsBefiana } from './_befiana.js';
import { exigerAuthentification } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  if (!exigerAuthentification(req, res)) return;

  const { to, message } = req.body || {};
  if (!to || !message) return res.status(400).json({ erreur: 'Champs requis : to, message' });

  try {
    const resultat = await envoyerSmsBefiana({ to, poubelleNom: message, emplacement: '', niveau: 0, forcerMessageBrut: message });
    return res.status(resultat.succes ? 200 : 500).json(resultat);
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
