import { useCallback, useEffect, useState } from 'react';

export function useAuth() {
  const [authentifie, setAuthentifie] = useState(false);
  const [chargement, setChargement] = useState(true);

  const verifier = useCallback(async () => {
    try {
      const reponse = await fetch('/api/me');
      const donnees = await reponse.json();
      setAuthentifie(!!donnees.authentifie);
    } catch {
      setAuthentifie(false);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    verifier();
  }, [verifier]);

  async function connexion(motDePasse) {
    const reponse = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ motDePasse }),
    });
    const donnees = await reponse.json();
    if (reponse.ok && donnees.succes) {
      setAuthentifie(true);
      return { succes: true };
    }
    return { succes: false, erreur: donnees.erreur || 'Erreur de connexion' };
  }

  async function deconnexion() {
    await fetch('/api/logout', { method: 'POST' });
    setAuthentifie(false);
  }

  return { authentifie, chargement, connexion, deconnexion, revalider: verifier };
}
