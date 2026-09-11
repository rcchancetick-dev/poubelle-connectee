import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function SelecteurTheme() {
  const { couleurs, preference, definirPreference } = useTheme();

  const options = [
    { cle: 'systeme', label: 'Système', icone: 'phone-portrait-outline' },
    { cle: 'clair', label: 'Clair', icone: 'sunny-outline' },
    { cle: 'sombre', label: 'Sombre', icone: 'moon-outline' },
  ];

  return (
    <View style={styles.conteneur}>
      {options.map((option) => {
        const actif = preference === option.cle;
        return (
          <TouchableOpacity
            key={option.cle}
            onPress={() => definirPreference(option.cle)}
            style={[
              styles.bouton,
              { borderColor: couleurs.bordure, backgroundColor: actif ? couleurs.bleu : 'transparent' },
            ]}
          >
            <Ionicons name={option.icone} size={16} color={actif ? '#ffffff' : couleurs.texteAtt} />
            <Text style={[styles.texte, { color: actif ? '#ffffff' : couleurs.texte }]}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flexDirection: 'row', gap: 8 },
  bouton: {
    flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flex: 1, justifyContent: 'center',
  },
  texte: { fontSize: 12, fontWeight: '700', marginLeft: 4 },
});
