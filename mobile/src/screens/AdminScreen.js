import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePoubelles } from '../hooks/usePoubelles';
import { useAuth } from '../hooks/useAuth';
import { api } from '../config/api';
import LoginScreen from './LoginScreen';
import { useTheme } from '../theme/ThemeContext';
import SelecteurTheme from '../components/SelecteurTheme';

const formVide = { nom: '', emplacement: '', hauteurCm: '60', seuilAlerte: '80', numeroAlerteSms: '', intervalleSommeil: '300' };

export default function AdminScreen() {
  const { couleurs } = useTheme();
  const styles = creerStyles(couleurs);
  const { authentifie, chargement: chargementAuth, connexion, deconnexion } = useAuth();
  const { poubelles, rafraichir } = usePoubelles();

  const [formulaire, setFormulaire] = useState(formVide);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const [smsTo, setSmsTo] = useState('321234567');
  const [smsMessage, setSmsMessage] = useState("Test d'alerte depuis l'app mobile Poubelle Connectée.");
  const [smsStatut, setSmsStatut] = useState(null);

  const [ancienMdp, setAncienMdp] = useState('');
  const [nouveauMdp, setNouveauMdp] = useState('');
  const [confirmationMdp, setConfirmationMdp] = useState('');
  const [mdpStatut, setMdpStatut] = useState(null);

  const [intervalles, setIntervalles] = useState({});

  if (chargementAuth) {
    return (
      <View style={styles.centre}>
        <ActivityIndicator color={couleurs.bleu} size="large" />
      </View>
    );
  }

  if (!authentifie) {
    return <LoginScreen onConnexion={connexion} />;
  }

  async function ajouterPoubelle() {
    setEnvoiEnCours(true);
    try {
      await api.creerPoubelle({
        ...formulaire,
        hauteurCm: Number(formulaire.hauteurCm),
        seuilAlerte: Number(formulaire.seuilAlerte),
        intervalleSommeil: Number(formulaire.intervalleSommeil),
      });
      setFormulaire(formVide);
      Alert.alert('Succès', 'Poubelle ajoutée avec succès.');
      rafraichir();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setEnvoiEnCours(false);
    }
  }

  function confirmerSuppression(poubelle) {
    Alert.alert('Supprimer cette poubelle ?', `${poubelle.nom} — ${poubelle.emplacement}`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer', style: 'destructive',
        onPress: async () => { await api.supprimerPoubelle(poubelle.id); rafraichir(); },
      },
    ]);
  }

  async function appliquerIntervalle(poubelle) {
    const valeur = Number(intervalles[poubelle.id] ?? poubelle.intervalleSommeil);
    try {
      await api.modifierPoubelle({ id: poubelle.id, intervalleSommeil: valeur });
      Alert.alert('Succès', "Intervalle mis à jour. L'ESP32 l'appliquera au prochain cycle.");
      rafraichir();
    } catch (e) {
      Alert.alert('Erreur', e.message);
    }
  }

  async function envoyerSmsTest() {
    setSmsStatut('envoi');
    try {
      const resultat = await api.envoyerSmsTest(smsTo, smsMessage);
      setSmsStatut(resultat.succes ? 'succes' : 'erreur');
    } catch {
      setSmsStatut('erreur');
    }
  }

  async function changerMotDePasse() {
    setMdpStatut(null);
    if (nouveauMdp !== confirmationMdp) {
      setMdpStatut({ type: 'erreur', texte: 'La confirmation ne correspond pas.' });
      return;
    }
    if (nouveauMdp.length < 8) {
      setMdpStatut({ type: 'erreur', texte: '8 caractères minimum.' });
      return;
    }
    try {
      const resultat = await api.changerMotDePasse(ancienMdp, nouveauMdp);
      if (resultat.succes) {
        setMdpStatut({ type: 'succes', texte: resultat.message || 'Mot de passe changé.' });
        setAncienMdp(''); setNouveauMdp(''); setConfirmationMdp('');
      }
    } catch (e) {
      setMdpStatut({ type: 'erreur', texte: e.message });
    }
  }

  function Section({ titre, icone, children }) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionEntete}>
          <Ionicons name={icone} size={16} color={couleurs.bleu} />
          <Text style={styles.sectionTitre}>{titre}</Text>
        </View>
        {children}
      </View>
    );
  }

  function Champ({ label, flex, ...props }) {
    return (
      <View style={[{ marginBottom: 10 }, flex && { flex: 1 }]}>
        <Text style={styles.label}>{label}</Text>
        <TextInput style={styles.input} placeholderTextColor={couleurs.texteAtt} {...props} />
      </View>
    );
  }

  function BoutonPrincipal({ texte, onPress, disabled }) {
    return (
      <TouchableOpacity style={[styles.boutonPrincipal, disabled && { opacity: 0.6 }]} onPress={onPress} disabled={disabled}>
        <Text style={styles.boutonPrincipalTexte}>{texte}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <ScrollView style={styles.conteneur} contentContainerStyle={{ padding: 12 }}>
      <View style={styles.enteteRow}>
        <Text style={styles.titre}>Espace administrateur</Text>
        <TouchableOpacity onPress={deconnexion} style={styles.boutonDeconnexion}>
          <Ionicons name="log-out-outline" size={16} color={couleurs.rouge} />
          <Text style={styles.texteDeconnexion}>Déconnexion</Text>
        </TouchableOpacity>
      </View>

      <Section titre="Apparence" icone="color-palette-outline">
        <SelecteurTheme />
      </Section>

      <Section titre="Ajouter une poubelle" icone="add-circle-outline">
        <Champ label="Nom" value={formulaire.nom} onChangeText={(v) => setFormulaire({ ...formulaire, nom: v })} />
        <Champ label="Emplacement" value={formulaire.emplacement} onChangeText={(v) => setFormulaire({ ...formulaire, emplacement: v })} />
        <View style={styles.ligne2col}>
          <Champ label="Hauteur (cm)" value={formulaire.hauteurCm} onChangeText={(v) => setFormulaire({ ...formulaire, hauteurCm: v })} keyboardType="numeric" flex />
          <Champ label="Seuil (%)" value={formulaire.seuilAlerte} onChangeText={(v) => setFormulaire({ ...formulaire, seuilAlerte: v })} keyboardType="numeric" flex />
        </View>
        <Champ label="Numéro SMS (ex: 321234567)" value={formulaire.numeroAlerteSms} onChangeText={(v) => setFormulaire({ ...formulaire, numeroAlerteSms: v })} keyboardType="phone-pad" />
        <Champ label="Intervalle de mesure (s, 30 min.)" value={formulaire.intervalleSommeil} onChangeText={(v) => setFormulaire({ ...formulaire, intervalleSommeil: v })} keyboardType="numeric" />
        <BoutonPrincipal texte={envoiEnCours ? 'Ajout...' : 'Ajouter la poubelle'} onPress={ajouterPoubelle} disabled={envoiEnCours} />
      </Section>

      <Section titre="Poubelles enregistrées" icone="list-outline">
        {poubelles.map((p) => (
          <View key={p.id} style={styles.lignePoubelle}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nomPoubelle}>{p.nom}</Text>
              <Text style={styles.detailPoubelle}>{p.emplacement} — seuil {p.seuilAlerte}%</Text>
              <View style={styles.ligneIntervalle}>
                <TextInput
                  style={styles.champIntervalle}
                  keyboardType="numeric"
                  placeholderTextColor={couleurs.texteAtt}
                  defaultValue={String(p.intervalleSommeil ?? 300)}
                  onChangeText={(v) => setIntervalles((s) => ({ ...s, [p.id]: v }))}
                />
                <TouchableOpacity style={styles.boutonMini} onPress={() => appliquerIntervalle(p)}>
                  <Text style={styles.boutonMiniTexte}>Appliquer</Text>
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity onPress={() => confirmerSuppression(p)} style={styles.boutonSupprimer}>
              <Ionicons name="trash-outline" size={16} color={couleurs.rouge} />
            </TouchableOpacity>
          </View>
        ))}
      </Section>

      <Section titre="Test d'envoi SMS (BEFIANA)" icone="chatbox-outline">
        <Champ label="Numéro destinataire" value={smsTo} onChangeText={setSmsTo} keyboardType="phone-pad" />
        <Champ label="Message" value={smsMessage} onChangeText={setSmsMessage} multiline />
        <BoutonPrincipal texte={smsStatut === 'envoi' ? 'Envoi...' : 'Envoyer le SMS de test'} onPress={envoyerSmsTest} disabled={smsStatut === 'envoi'} />
        {smsStatut === 'succes' && <Text style={styles.texteSucces}>SMS envoyé avec succès.</Text>}
        {smsStatut === 'erreur' && <Text style={styles.texteErreur}>Échec de l'envoi.</Text>}
      </Section>

      <Section titre="Changer le mot de passe" icone="key-outline">
        <Champ label="Mot de passe actuel" value={ancienMdp} onChangeText={setAncienMdp} secureTextEntry />
        <Champ label="Nouveau mot de passe" value={nouveauMdp} onChangeText={setNouveauMdp} secureTextEntry />
        <Champ label="Confirmer" value={confirmationMdp} onChangeText={setConfirmationMdp} secureTextEntry />
        <BoutonPrincipal texte="Changer le mot de passe" onPress={changerMotDePasse} />
        {mdpStatut && <Text style={mdpStatut.type === 'succes' ? styles.texteSucces : styles.texteErreur}>{mdpStatut.texte}</Text>}
      </Section>
    </ScrollView>
  );
}

function creerStyles(couleurs) {
  return StyleSheet.create({
    conteneur: { flex: 1, backgroundColor: couleurs.fond },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: couleurs.fond },
    enteteRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    titre: { fontSize: 20, fontWeight: '800', color: couleurs.texte },
    boutonDeconnexion: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    texteDeconnexion: { color: couleurs.rouge, fontWeight: '700', fontSize: 12, marginLeft: 4 },
    section: { backgroundColor: couleurs.carte, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: couleurs.bordure },
    sectionEntete: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionTitre: { fontSize: 14, fontWeight: '700', color: couleurs.texte, marginLeft: 6 },
    label: { fontSize: 11, fontWeight: '700', color: couleurs.texteAtt, marginBottom: 4 },
    input: { borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, fontSize: 13, color: couleurs.texte, backgroundColor: couleurs.inputFond },
    ligne2col: { flexDirection: 'row', gap: 10 },
    boutonPrincipal: { backgroundColor: couleurs.bleu, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
    boutonPrincipalTexte: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
    lignePoubelle: { flexDirection: 'row', backgroundColor: couleurs.fond, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: couleurs.bordure },
    nomPoubelle: { fontSize: 13, fontWeight: '700', color: couleurs.texte },
    detailPoubelle: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2, marginBottom: 6 },
    ligneIntervalle: { flexDirection: 'row', gap: 6 },
    champIntervalle: { borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, width: 70, fontSize: 12, color: couleurs.texte, backgroundColor: couleurs.inputFond },
    boutonMini: { backgroundColor: couleurs.carte, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 8, paddingHorizontal: 10, justifyContent: 'center' },
    boutonMiniTexte: { fontSize: 11, fontWeight: '700', color: couleurs.texte },
    boutonSupprimer: { justifyContent: 'center', paddingLeft: 8 },
    texteSucces: { color: couleurs.vert, fontSize: 12, fontWeight: '700', marginTop: 8 },
    texteErreur: { color: couleurs.rouge, fontSize: 12, fontWeight: '700', marginTop: 8 },
  });
}
