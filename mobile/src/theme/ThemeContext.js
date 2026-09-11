import React, { createContext, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * ThemeContext.js
 * Gere le mode clair/sombre de toute l'application :
 *   - "systeme" (par defaut) : suit le reglage du telephone (useColorScheme)
 *   - "clair" / "sombre" : force manuellement un mode, memorise via AsyncStorage
 *
 * Toutes les couleurs de texte ont ete choisies avec un contraste eleve dans
 * les deux modes (ratio WCAG AA minimum) pour garantir une bonne lisibilite :
 *   - Mode clair : texte quasi-noir (#0f172a) sur fond blanc/gris tres clair.
 *   - Mode sombre : texte quasi-blanc (#f1f5f9) sur fond bleu-nuit tres fonce,
 *     jamais de gris moyen sur gris moyen (piege frequent des dark modes).
 */

const CLE_STOCKAGE = 'poubelle_connectee_theme_preference';

const palettes = {
  clair: {
    mode: 'clair',
    bleu: '#4f7cff',
    bleuFonce: '#2d4fd6',
    vert: '#16a34a',
    orange: '#d97706',
    rouge: '#dc2626',
    texte: '#0f172a',        // quasi noir, tres lisible sur fond clair
    texteAtt: '#475569',     // gris fonce (plus contraste que #64748b d'origine)
    fond: '#f6f8fc',
    carte: '#ffffff',
    bordure: '#e2e8f0',
    inputFond: '#ffffff',
    ombre: '#1e293b',
  },
  sombre: {
    mode: 'sombre',
    bleu: '#7c9dff',         // bleu eclairci pour rester visible sur fond fonce
    bleuFonce: '#5b7cf5',
    vert: '#4ade80',
    orange: '#fbbf24',
    rouge: '#f87171',
    texte: '#f8fafc',         // quasi blanc, tres lisible sur fond sombre
    texteAtt: '#cbd5e1',      // gris clair (au lieu d'un gris moyen peu lisible)
    fond: '#0f172a',
    carte: '#1e293b',
    bordure: '#334155',
    inputFond: '#0f172a',
    ombre: '#000000',
  },
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const schemeSysteme = useColorScheme(); // 'light' | 'dark' | null
  const [preference, setPreference] = useState('systeme'); // 'systeme' | 'clair' | 'sombre'
  const [pret, setPret] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CLE_STOCKAGE).then((valeur) => {
      if (valeur === 'clair' || valeur === 'sombre' || valeur === 'systeme') {
        setPreference(valeur);
      }
      setPret(true);
    });
  }, []);

  async function definirPreference(nouvellePreference) {
    setPreference(nouvellePreference);
    await AsyncStorage.setItem(CLE_STOCKAGE, nouvellePreference);
  }

  const modeActif =
    preference === 'systeme' ? (schemeSysteme === 'dark' ? 'sombre' : 'clair') : preference;

  const couleurs = palettes[modeActif];

  if (!pret) return null; // evite un flash de la mauvaise palette au demarrage

  return (
    <ThemeContext.Provider value={{ couleurs, modeActif, preference, definirPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const contexte = useContext(ThemeContext);
  if (!contexte) throw new Error('useTheme doit etre utilise a l\'interieur de ThemeProvider');
  return contexte;
}

export function couleurNiveau(niveau, couleurs) {
  if (niveau === null || niveau === undefined) return couleurs.texteAtt;
  if (niveau >= 80) return couleurs.rouge;
  if (niveau >= 50) return couleurs.orange;
  return couleurs.vert;
}
