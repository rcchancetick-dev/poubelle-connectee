import { creerCookieDeconnexion } from './_auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }
  res.setHeader('Set-Cookie', creerCookieDeconnexion());
  return res.status(200).json({ succes: true });
}
