import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function CarteAlerte({ alerte, onTraiter, authentifie }) {
  const { couleurs } = useTheme();
  const styles = creerStyles(couleurs);

  function demanderConfirmation() {
    Alert.alert(
      'Confirmer le traitement',
      `Poubelle : ${alerte.poubelleNom}\nNiveau : ${alerte.niveauPourcent.toFixed(0)}%\nDate : ${new Date(alerte.dateAlerte).toLocaleString('fr-FR')}\n\nCette action indique que la poubelle a bien été vidée ou prise en charge.`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: () => onTraiter(alerte.id) },
      ]
    );
  }

  return (
    <View style={styles.ligne}>
      <View style={{ flex: 1 }}>
        <Text style={styles.nom}>{alerte.poubelleNom}</Text>
        <Text style={styles.details}>
          {alerte.niveauPourcent.toFixed(0)}% — {new Date(alerte.dateAlerte).toLocaleString('fr-FR')}
        </Text>
        <View style={[styles.etiquette, { backgroundColor: (alerte.smsEnvoye ? couleurs.vert : couleurs.rouge) + '22' }]}>
          <Ionicons name="chatbubble-ellipses-outline" size={11} color={alerte.smsEnvoye ? couleurs.vert : couleurs.rouge} />
          <Text style={[styles.etiquetteTexte, { color: alerte.smsEnvoye ? couleurs.vert : couleurs.rouge }]}>
            {alerte.smsEnvoye ? 'SMS envoyé' : 'SMS non envoyé'}
          </Text>
        </View>
      </View>
      {authentifie && (
        <TouchableOpacity style={styles.bouton} onPress={demanderConfirmation}>
          <Ionicons name="checkmark-circle-outline" size={15} color={couleurs.texte} />
          <Text style={styles.boutonTexte}>Traiter</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function creerStyles(couleurs) {
  return StyleSheet.create({
    ligne: {
      flexDirection: 'row', alignItems: 'center', backgroundColor: couleurs.carte, borderWidth: 1,
      borderColor: couleurs.bordure, borderRadius: 12, padding: 12, marginBottom: 8, gap: 8,
    },
    nom: { fontSize: 13, fontWeight: '700', color: couleurs.texte },
    details: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2, marginBottom: 5 },
    etiquette: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
    etiquetteTexte: { fontSize: 10, fontWeight: '700', marginLeft: 4 },
    bouton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: couleurs.fond, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8 },
    boutonTexte: { fontSize: 12, fontWeight: '700', color: couleurs.texte, marginLeft: 4 },
  });
}
