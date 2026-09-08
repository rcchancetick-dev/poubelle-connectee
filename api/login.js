import { verifierMotDePasse, creerCookieSession } from './_auth.js';

const MAX_TENTATIVES = 5;
const FENETRE_MS = 10 * 60 * 1000;
const tentativesParIp = new Map();

function ipDeLaRequete(req) {
  return req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'inconnue';
}

function estBloquee(ip) {
  const entree = tentativesParIp.get(ip);
  if (!entree) return false;
  if (Date.now() - entree.premiereTentative > FENETRE_MS) {
    tentativesParIp.delete(ip);
    return false;
  }
  return entree.nombre >= MAX_TENTATIVES;
}

function enregistrerEchec(ip) {
  const entree = tentativesParIp.get(ip);
  if (!entree || Date.now() - entree.premiereTentative > FENETRE_MS) {
    tentativesParIp.set(ip, { nombre: 1, premiereTentative: Date.now() });
  } else {
    entree.nombre += 1;
  }
}

function reinitialiserTentatives(ip) {
  tentativesParIp.delete(ip);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ erreur: 'Methode non autorisee' });
  }

  const ip = ipDeLaRequete(req);
  if (estBloquee(ip)) {
    return res.status(429).json({ erreur: 'Trop de tentatives. Reessayez dans quelques minutes.' });
  }

  const { motDePasse } = req.body || {};
  if (!motDePasse) return res.status(400).json({ erreur: 'Mot de passe requis' });

  try {
    const motDePasseValide = await verifierMotDePasse(motDePasse);
    if (!motDePasseValide) {
      enregistrerEchec(ip);
      return res.status(401).json({ erreur: 'Mot de passe incorrect' });
    }
    reinitialiserTentatives(ip);
    res.setHeader('Set-Cookie', creerCookieSession());
    return res.status(200).json({ succes: true });
  } catch (erreur) {
    return res.status(500).json({ erreur: erreur.message });
  }
}
