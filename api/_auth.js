/**
 * _auth.js
 * Service d'authentification de l'espace administrateur.
 * Le hash du mot de passe est lu/ecrit dans Redis (voir _store.js), ce qui
 * garantit sa persistance entre les redemarrages a froid des fonctions Vercel.
 */

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cookie from 'cookie';
import { obtenirHashAdmin, definirHashAdmin } from './_store.js';

const NOM_COOKIE = 'session_admin';
const DUREE_SESSION_SECONDES = 60 * 60 * 2;

function cleSecrete() {
  const cle = process.env.JWT_SECRET;
  if (!cle) throw new Error("JWT_SECRET manquant dans les variables d'environnement.");
  return cle;
}

export async function verifierMotDePasse(motDePasseFourni) {
  const hash = await obtenirHashAdmin();
  return bcrypt.compare(motDePasseFourni, hash);
}

export async function changerMotDePasseAdmin(nouveauMotDePasseEnClair) {
  const sel = await bcrypt.genSalt(10);
  const nouveauHash = await bcrypt.hash(nouveauMotDePasseEnClair, sel);
  await definirHashAdmin(nouveauHash);
}

export function creerCookieSession() {
  const token = jwt.sign({ role: 'admin' }, cleSecrete(), { expiresIn: DUREE_SESSION_SECONDES });
  return cookie.serialize(NOM_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: DUREE_SESSION_SECONDES,
  });
}

export function creerCookieDeconnexion() {
  return cookie.serialize(NOM_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

export function estAuthentifie(req) {
  try {
    const cookies = cookie.parse(req.headers.cookie || '');
    const token = cookies[NOM_COOKIE];
    if (!token) return false;
    jwt.verify(token, cleSecrete());
    return true;
  } catch {
    return false;
  }
}

export function exigerAuthentification(req, res) {
  if (!estAuthentifie(req)) {
    res.status(401).json({ erreur: "Non authentifie. Veuillez vous connecter a l'espace administrateur." });
    return false;
  }
  return true;
}
