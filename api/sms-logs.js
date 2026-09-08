import { obtenirLogsSms } from './_store.js';
import { exigerAuthentification } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  if (!exigerAuthentification(req, res)) return;

  try {
    const logs = await obtenirLogsSms();
    const tries = [...logs].sort((a, b) => new Date(b.dateEnvoi) - new Date(a.dateEnvoi));
    return res.status(200).json({ logs: tries });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
