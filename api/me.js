import { estAuthentifie } from './_auth.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }
  return res.status(200).json({ authentifie: estAuthentifie(req) });
}
