import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../config/api';
import LoginScreen from './LoginScreen';
import { couleurs } from '../theme/colors';

export default function HistoriqueScreen() {
  const { authentifie, chargement: chargementAuth, connexion } = useAuth();
  const [historique, setHistorique] = useState([]);
  const [chargement, setChargement] = useState(true);
  const [tri, setTri] = useState('date');
  const [ordre, setOrdre] = useState('desc');

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const donnees = await api.obtenirHistoriquePoubelles({ tri, ordre });
      setHistorique(donnees.historique || []);
    } catch (e) {
      console.warn(e.message);
    } finally {
      setChargement(false);
    }
  }, [tri, ordre]);

  useEffect(() => {
    if (authentifie) charger();
  }, [authentifie, charger]);

  if (chargementAuth) {
    return <View style={styles.centre}><ActivityIndicator color={couleurs.bleu} size="large" /></View>;
  }
  if (!authentifie) {
    return <LoginScreen onConnexion={connexion} />;
  }

  function basculer(nouveauTri) {
    if (tri === nouveauTri) setOrdre((o) => (o === 'asc' ? 'desc' : 'asc'));
    else { setTri(nouveauTri); setOrdre('desc'); }
  }

  return (
    <View style={styles.conteneur}>
      <View style={styles.entete}>
        <Text style={styles.titre}>Historique des alertes</Text>
        <View style={styles.filtres}>
          {[{ cle: 'nom', label: 'Nom' }, { cle: 'date', label: 'Date' }, { cle: 'intervalle', label: 'Intervalle' }].map((opt) => (
            <TouchableOpacity key={opt.cle} style={[styles.filtreBouton, tri === opt.cle && styles.filtreBoutonActif]} onPress={() => basculer(opt.cle)}>
              <Text style={[styles.filtreTexte, tri === opt.cle && styles.filtreTexteActif]}>{opt.label}</Text>
              <Ionicons name="swap-vertical" size={12} color={tri === opt.cle ? 'white' : couleurs.texteAtt} />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <FlatList
        data={historique}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={charger} colors={[couleurs.bleu]} />}
        ListEmptyComponent={!chargement && <Text style={styles.videTexte}>Aucune alerte enregistrée.</Text>}
        renderItem={({ item }) => (
          <View style={styles.ligne}>
            <View style={{ flex: 1 }}>
              <Text style={styles.nom}>{item.poubelleNom}</Text>
              <Text style={styles.details}>{item.emplacement}</Text>
              <Text style={styles.date}>{new Date(item.dateAlerte).toLocaleString('fr-FR')}</Text>
            </View>
            <View style={styles.droite}>
              <Text style={styles.niveau}>{item.niveauPourcent.toFixed(0)}%</Text>
              <Text style={styles.intervalle}>
                {item.intervalleHeures !== null ? `+${item.intervalleHeures} h` : 'Première'}
              </Text>
              <Ionicons name={item.traitee ? 'checkmark-circle' : 'time-outline'} size={16} color={item.traitee ? couleurs.vert : couleurs.orange} />
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: couleurs.fond },
  centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: couleurs.fond },
  entete: { padding: 12, backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: couleurs.bordure },
  titre: { fontSize: 18, fontWeight: '800', color: couleurs.texte, marginBottom: 10 },
  filtres: { flexDirection: 'row', gap: 8 },
  filtreBouton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
  filtreBoutonActif: { backgroundColor: couleurs.bleu, borderColor: couleurs.bleu },
  filtreTexte: { fontSize: 11, fontWeight: '600', color: couleurs.texteAtt, marginRight: 4 },
  filtreTexteActif: { color: 'white' },
  videTexte: { textAlign: 'center', color: couleurs.texteAtt, marginTop: 30 },
  ligne: { flexDirection: 'row', backgroundColor: 'white', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: couleurs.bordure },
  nom: { fontSize: 13, fontWeight: '700', color: couleurs.texte },
  details: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2 },
  date: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2 },
  droite: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
  niveau: { fontSize: 15, fontWeight: '800', color: couleurs.texte },
  intervalle: { fontSize: 10, color: couleurs.texteAtt },
});
