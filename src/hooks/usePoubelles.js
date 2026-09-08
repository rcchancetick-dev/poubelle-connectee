import { useCallback, useEffect, useState } from 'react';

export function usePoubelles(intervalleMs = 15000) {
  const [poubelles, setPoubelles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const rafraichir = useCallback(async () => {
    try {
      const reponse = await fetch('/api/poubelles');
      if (!reponse.ok) throw new Error('Reponse serveur invalide');
      const donnees = await reponse.json();
      setPoubelles(donnees.poubelles || []);
      setErreur(null);
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    rafraichir();
    const id = setInterval(rafraichir, intervalleMs);
    return () => clearInterval(id);
  }, [rafraichir, intervalleMs]);

  return { poubelles, chargement, erreur, rafraichir };
}

export function useAlertes(intervalleMs = 15000) {
  const [alertes, setAlertes] = useState([]);

  const rafraichir = useCallback(async () => {
    try {
      const reponse = await fetch('/api/alertes');
      const donnees = await reponse.json();
      setAlertes(donnees.alertes || []);
    } catch (e) {
      console.error('Erreur de chargement des alertes', e);
    }
  }, []);

  useEffect(() => {
    rafraichir();
    const id = setInterval(rafraichir, intervalleMs);
    return () => clearInterval(id);
  }, [rafraichir, intervalleMs]);

  return { alertes, rafraichir };
}
