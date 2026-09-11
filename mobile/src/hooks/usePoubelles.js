import { useCallback, useEffect, useState, useRef } from 'react';
import { AppState } from 'react-native';
import { api } from '../config/api';

export function usePoubelles(intervalleMs = 15000) {
  const [poubelles, setPoubelles] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);
  const intervalRef = useRef(null);

  const rafraichir = useCallback(async () => {
    try {
      const donnees = await api.obtenirPoubelles();
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
    intervalRef.current = setInterval(rafraichir, intervalleMs);

    const sub = AppState.addEventListener('change', (etat) => {
      if (etat === 'active') {
        rafraichir();
        if (!intervalRef.current) intervalRef.current = setInterval(rafraichir, intervalleMs);
      } else if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      sub.remove();
    };
  }, [rafraichir, intervalleMs]);

  return { poubelles, chargement, erreur, rafraichir };
}

export function useAlertes(intervalleMs = 15000) {
  const [alertes, setAlertes] = useState([]);

  const rafraichir = useCallback(async () => {
    try {
      const donnees = await api.obtenirAlertes();
      setAlertes(donnees.alertes || []);
    } catch (e) {
      console.warn('Erreur de chargement des alertes', e.message);
    }
  }, []);

  useEffect(() => {
    rafraichir();
    const id = setInterval(rafraichir, intervalleMs);
    return () => clearInterval(id);
  }, [rafraichir, intervalleMs]);

  return { alertes, rafraichir };
}
