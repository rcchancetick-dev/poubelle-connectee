import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, couleurNiveau } from '../theme/ThemeContext';

/**
 * CarteJauge.js
 * Adapte au theme actif (clair/sombre) via useTheme(). Toutes les couleurs
 * de texte proviennent de la palette du contexte, garantissant un contraste
 * suffisant dans les deux modes (voir ThemeContext.js pour le detail des
 * couleurs choisies).
 */
export default function CarteJauge({ poubelle, onVoirHistorique }) {
  const { couleurs } = useTheme();
  const niveau = poubelle.dernierNiveau ?? 0;
  const couleur = couleurNiveau(poubelle.dernierNiveau, couleurs);
  const enAlerte = poubelle.dernierNiveau !== null && poubelle.dernierNiveau >= poubelle.seuilAlerte;

  const rayon = 46;
  const circonference = 2 * Math.PI * rayon;
  const decalage = circonference - (niveau / 100) * circonference;

  const derniereMesure = poubelle.derniereMesureDate
    ? new Date(poubelle.derniereMesureDate).toLocaleString('fr-FR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
      })
    : 'Aucune mesure';

  const styles = creerStyles(couleurs);

  return (
    <View style={[styles.carte, enAlerte && styles.carteAlerte]}>
      {enAlerte && (
        <View style={styles.badgeAlerte}>
          <Ionicons name="warning" size={12} color={couleurs.rouge} />
          <Text style={styles.badgeTexte}>Seuil dépassé</Text>
        </View>
      )}

      <Text style={styles.nom}>{poubelle.nom}</Text>
      <View style={styles.ligneLieu}>
        <Ionicons name="location-outline" size={12} color={couleurs.texteAtt} />
        <Text style={styles.lieu}>{poubelle.emplacement}</Text>
      </View>

      <View style={styles.jaugeConteneur}>
        <Svg width={110} height={110} viewBox="0 0 110 110">
          <Circle cx={55} cy={55} r={rayon} stroke={couleurs.bordure} strokeWidth={10} fill="none" />
          <Circle
            cx={55} cy={55} r={rayon} stroke={couleur} strokeWidth={10} fill="none"
            strokeDasharray={circonference} strokeDashoffset={decalage} strokeLinecap="round"
            transform="rotate(-90 55 55)"
          />
        </Svg>
        <View style={styles.valeurConteneur}>
          <Text style={styles.valeur}>{poubelle.dernierNiveau !== null ? `${Math.round(niveau)}%` : '—'}</Text>
          <Text style={styles.sousValeur}>remplissage</Text>
        </View>
      </View>

      <View style={styles.pied}>
        <View style={styles.ligneMaj}>
          <Ionicons name="time-outline" size={11} color={couleurs.texteAtt} />
          <Text style={styles.maj}>{derniereMesure}</Text>
        </View>
        <TouchableOpacity onPress={() => onVoirHistorique(poubelle)} style={styles.boutonHistorique}>
          <Ionicons name="trending-up-outline" size={13} color={couleurs.bleu} />
          <Text style={styles.texteHistorique}>Historique</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function creerStyles(couleurs) {
  return StyleSheet.create({
    carte: {
      backgroundColor: couleurs.carte, borderRadius: 16, padding: 14, margin: 6, flex: 1,
      minWidth: 160, borderWidth: 1, borderColor: couleurs.bordure,
      shadowColor: couleurs.ombre, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 2,
    },
    carteAlerte: { borderColor: couleurs.rouge },
    badgeAlerte: {
      position: 'absolute', top: 10, right: 10, flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: couleurs.rouge + '22', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 20,
    },
    badgeTexte: { fontSize: 9, color: couleurs.rouge, fontWeight: '700', marginLeft: 3 },
    nom: { fontSize: 14, fontWeight: '700', color: couleurs.texte, marginBottom: 2 },
    ligneLieu: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
    lieu: { fontSize: 11, color: couleurs.texteAtt, marginLeft: 4 },
    jaugeConteneur: { alignItems: 'center', justifyContent: 'center', marginVertical: 6 },
    valeurConteneur: { position: 'absolute', alignItems: 'center' },
    valeur: { fontSize: 22, fontWeight: '800', color: couleurs.texte },
    sousValeur: { fontSize: 9, color: couleurs.texteAtt },
    pied: { marginTop: 8 },
    ligneMaj: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
    maj: { fontSize: 10, color: couleurs.texteAtt, marginLeft: 4 },
    boutonHistorique: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
    texteHistorique: { fontSize: 12, color: couleurs.bleu, fontWeight: '700', marginLeft: 4 },
  });
}
