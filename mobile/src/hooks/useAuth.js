import { useCallback, useEffect, useState } from 'react';
import { api } from '../config/api';

export function useAuth() {
  const [authentifie, setAuthentifie] = useState(false);
  const [chargement, setChargement] = useState(true);

  const verifier = useCallback(async () => {
    try {
      const donnees = await api.verifierSession();
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
    try {
      const donnees = await api.connecter(motDePasse);
      if (donnees.succes) {
        setAuthentifie(true);
        return { succes: true };
      }
      return { succes: false, erreur: 'Connexion refusee' };
    } catch (e) {
      return { succes: false, erreur: e.message };
    }
  }

  async function deconnexion() {
    await api.deconnecter();
    setAuthentifie(false);
  }

  return { authentifie, chargement, connexion, deconnexion, revalider: verifier };
}
