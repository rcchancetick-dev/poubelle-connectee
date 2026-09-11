import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';

export default function LoginScreen({ onConnexion }) {
  const { couleurs } = useTheme();
  const styles = creerStyles(couleurs);
  const [motDePasse, setMotDePasse] = useState('');
  const [afficher, setAfficher] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function soumettre() {
    setErreur(null);
    setEnvoiEnCours(true);
    const resultat = await onConnexion(motDePasse);
    setEnvoiEnCours(false);
    if (!resultat.succes) setErreur(resultat.erreur);
  }

  return (
    <KeyboardAvoidingView style={styles.conteneur} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.carte}>
        <View style={styles.icone}>
          <Ionicons name="shield-checkmark-outline" size={26} color="#ffffff" />
        </View>
        <Text style={styles.titre}>Espace administrateur</Text>
        <Text style={styles.sousTitre}>Accès réservé. Saisissez le mot de passe pour continuer.</Text>

        <View style={styles.champConteneur}>
          <Ionicons name="lock-closed-outline" size={16} color={couleurs.texteAtt} />
          <TextInput
            style={styles.champ}
            placeholder="Votre mot de passe"
            placeholderTextColor={couleurs.texteAtt}
            secureTextEntry={!afficher}
            value={motDePasse}
            onChangeText={setMotDePasse}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={() => setAfficher((v) => !v)}>
            <Ionicons name={afficher ? 'eye-off-outline' : 'eye-outline'} size={18} color={couleurs.texteAtt} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.bouton} onPress={soumettre} disabled={envoiEnCours}>
          {envoiEnCours ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.boutonTexte}>Se connecter</Text>}
        </TouchableOpacity>

        {erreur && <Text style={styles.erreur}>{erreur}</Text>}
      </View>
    </KeyboardAvoidingView>
  );
}

function creerStyles(couleurs) {
  return StyleSheet.create({
    conteneur: { flex: 1, backgroundColor: couleurs.fond, justifyContent: 'center', padding: 24 },
    carte: { backgroundColor: couleurs.carte, borderRadius: 20, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: couleurs.bordure, shadowColor: couleurs.ombre, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
    icone: { width: 52, height: 52, borderRadius: 14, backgroundColor: couleurs.bleu, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
    titre: { fontSize: 18, fontWeight: '800', color: couleurs.texte, marginBottom: 4 },
    sousTitre: { fontSize: 12, color: couleurs.texteAtt, textAlign: 'center', marginBottom: 18 },
    champConteneur: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 10, paddingHorizontal: 12, width: '100%', marginBottom: 14, backgroundColor: couleurs.inputFond },
    champ: { flex: 1, paddingVertical: 12, fontSize: 14, marginLeft: 8, color: couleurs.texte },
    bouton: { backgroundColor: couleurs.bleu, borderRadius: 10, paddingVertical: 13, width: '100%', alignItems: 'center' },
    boutonTexte: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
    erreur: { color: couleurs.rouge, fontSize: 12, fontWeight: '700', marginTop: 10 },
  });
}
