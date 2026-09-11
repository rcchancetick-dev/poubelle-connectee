import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { api } from '../config/api';
import LoginScreen from './LoginScreen';
import { useTheme } from '../theme/ThemeContext';
import { exporterHistoriquePdf, exporterHistoriqueExcel } from '../services/export';

/**
 * HistoriqueScreen.js
 * NOUVEAU : boutons d'export PDF et Excel, adaptes a React Native via
 * expo-print (PDF) et xlsx + expo-file-system (Excel), voir
 * src/services/export.js pour le detail de l'implementation.
 */
export default function HistoriqueScreen() {
  const { couleurs } = useTheme();
  const styles = creerStyles(couleurs);
  const { authentifie, chargement: chargementAuth, connexion } = useAuth();
  const [historique, setHistorique] = useState([]);
  const [statsParPoubelle, setStatsParPoubelle] = useState({});
  const [chargement, setChargement] = useState(true);
  const [tri, setTri] = useState('date');
  const [ordre, setOrdre] = useState('desc');
  const [exportEnCours, setExportEnCours] = useState(null); // 'pdf' | 'excel' | null

  const charger = useCallback(async () => {
    setChargement(true);
    try {
      const donnees = await api.obtenirHistoriquePoubelles({ tri, ordre });
      setHistorique(donnees.historique || []);
      setStatsParPoubelle(donnees.statsParPoubelle || {});
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

  async function lancerExportPdf() {
    if (historique.length === 0) return;
    setExportEnCours('pdf');
    try {
      await exporterHistoriquePdf(historique, statsParPoubelle);
    } catch (e) {
      Alert.alert('Erreur export PDF', e.message);
    } finally {
      setExportEnCours(null);
    }
  }

  async function lancerExportExcel() {
    if (historique.length === 0) return;
    setExportEnCours('excel');
    try {
      await exporterHistoriqueExcel(historique, statsParPoubelle);
    } catch (e) {
      Alert.alert('Erreur export Excel', e.message);
    } finally {
      setExportEnCours(null);
    }
  }

  return (
    <View style={styles.conteneur}>
      <View style={styles.entete}>
        <Text style={styles.titre}>Historique des alertes</Text>

        <View style={styles.filtres}>
          {[{ cle: 'nom', label: 'Nom' }, { cle: 'date', label: 'Date' }, { cle: 'intervalle', label: 'Intervalle' }].map((opt) => (
            <TouchableOpacity key={opt.cle} style={[styles.filtreBouton, tri === opt.cle && styles.filtreBoutonActif]} onPress={() => basculer(opt.cle)}>
              <Text style={[styles.filtreTexte, tri === opt.cle && styles.filtreTexteActif]}>{opt.label}</Text>
              <Ionicons name="swap-vertical" size={12} color={tri === opt.cle ? '#ffffff' : couleurs.texteAtt} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.exports}>
          <TouchableOpacity
            style={[styles.exportBouton, historique.length === 0 && styles.exportBoutonDesactive]}
            onPress={lancerExportPdf}
            disabled={exportEnCours !== null || historique.length === 0}
          >
            <Ionicons name="document-text-outline" size={15} color={couleurs.texte} />
            <Text style={styles.exportTexte}>{exportEnCours === 'pdf' ? 'Génération...' : 'Exporter PDF'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.exportBouton, historique.length === 0 && styles.exportBoutonDesactive]}
            onPress={lancerExportExcel}
            disabled={exportEnCours !== null || historique.length === 0}
          >
            <Ionicons name="grid-outline" size={15} color={couleurs.texte} />
            <Text style={styles.exportTexte}>{exportEnCours === 'excel' ? 'Génération...' : 'Exporter Excel'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={historique}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 12 }}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={charger} colors={[couleurs.bleu]} tintColor={couleurs.bleu} />}
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

function creerStyles(couleurs) {
  return StyleSheet.create({
    conteneur: { flex: 1, backgroundColor: couleurs.fond },
    centre: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: couleurs.fond },
    entete: { padding: 12, backgroundColor: couleurs.carte, borderBottomWidth: 1, borderBottomColor: couleurs.bordure },
    titre: { fontSize: 18, fontWeight: '800', color: couleurs.texte, marginBottom: 10 },
    filtres: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    filtreBouton: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6 },
    filtreBoutonActif: { backgroundColor: couleurs.bleu, borderColor: couleurs.bleu },
    filtreTexte: { fontSize: 11, fontWeight: '700', color: couleurs.texteAtt, marginRight: 4 },
    filtreTexteActif: { color: '#ffffff' },
    exports: { flexDirection: 'row', gap: 8 },
    exportBouton: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: couleurs.bordure, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, flex: 1, justifyContent: 'center', backgroundColor: couleurs.fond },
    exportBoutonDesactive: { opacity: 0.5 },
    exportTexte: { fontSize: 12, fontWeight: '700', color: couleurs.texte, marginLeft: 4 },
    videTexte: { textAlign: 'center', color: couleurs.texteAtt, marginTop: 30 },
    ligne: { flexDirection: 'row', backgroundColor: couleurs.carte, borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: couleurs.bordure },
    nom: { fontSize: 13, fontWeight: '700', color: couleurs.texte },
    details: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2 },
    date: { fontSize: 11, color: couleurs.texteAtt, marginTop: 2 },
    droite: { alignItems: 'flex-end', justifyContent: 'center', gap: 4 },
    niveau: { fontSize: 15, fontWeight: '800', color: couleurs.texte },
    intervalle: { fontSize: 10, color: couleurs.texteAtt },
  });
}
