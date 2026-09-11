import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, Modal, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { usePoubelles, useAlertes } from '../hooks/usePoubelles';
import { useAuth } from '../hooks/useAuth';
import { api } from '../config/api';
import CarteJauge from '../components/CarteJauge';
import CarteAlerte from '../components/CarteAlerte';
import { couleurs } from '../theme/colors';

const largeurEcran = Dimensions.get('window').width;

export default function DashboardScreen() {
  const { poubelles, chargement, rafraichir } = usePoubelles();
  const { alertes, rafraichir: rafraichirAlertes } = useAlertes();
  const { authentifie } = useAuth();
  const [poubelleSelectionnee, setPoubelleSelectionnee] = useState(null);
  const [historique, setHistorique] = useState([]);
  const [chargementHistorique, setChargementHistorique] = useState(false);

  async function ouvrirHistorique(poubelle) {
    setPoubelleSelectionnee(poubelle);
    setChargementHistorique(true);
    try {
      const donnees = await api.obtenirHistorique(poubelle.id);
      setHistorique(donnees.mesures || []);
    } catch (e) {
      console.warn(e.message);
    } finally {
      setChargementHistorique(false);
    }
  }

  async function traiterAlerte(id) {
    try {
      await api.traiterAlerte(id);
      rafraichirAlertes();
    } catch (e) {
      console.warn(e.message);
    }
  }

  const donneesGraphique = {
    labels: historique.length
      ? historique.filter((_, i) => i % Math.ceil(historique.length / 6 || 1) === 0).map((m) =>
          new Date(m.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        )
      : ['—'],
    datasets: [{ data: historique.length ? historique.map((m) => m.niveau) : [0] }],
  };

  return (
    <View style={styles.conteneur}>
      <FlatList
        data={poubelles}
        keyExtractor={(item) => String(item.id)}
        numColumns={2}
        contentContainerStyle={{ padding: 8 }}
        refreshControl={<RefreshControl refreshing={chargement} onRefresh={rafraichir} colors={[couleurs.bleu]} />}
        renderItem={({ item }) => <CarteJauge poubelle={item} onVoirHistorique={ouvrirHistorique} />}
        ListHeaderComponent={
          <View style={styles.entete}>
            <Text style={styles.titre}>État des poubelles</Text>
            <Text style={styles.sousTitre}>Mesures transmises par les modules ESP32, synchronisées en temps réel.</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.panneauAlertes}>
            <View style={styles.enteteAlertes}>
              <Ionicons name="notifications-outline" size={18} color={couleurs.rouge} />
              <Text style={styles.titreAlertes}>Alertes en attente</Text>
              <View style={styles.badge}><Text style={styles.badgeTexte}>{alertes.length}</Text></View>
            </View>
            {alertes.length === 0 ? (
              <Text style={styles.videTexte}>Aucune alerte active.</Text>
            ) : (
              alertes.map((a) => <CarteAlerte key={a.id} alerte={a} onTraiter={traiterAlerte} authentifie={authentifie} />)
            )}
          </View>
        }
      />

      <Modal visible={!!poubelleSelectionnee} animationType="slide" transparent onRequestClose={() => setPoubelleSelectionnee(null)}>
        <View style={styles.modaleFond}>
          <View style={styles.modaleContenu}>
            <View style={styles.modaleEntete}>
              <Text style={styles.modaleTitre}>Historique — {poubelleSelectionnee?.nom}</Text>
              <TouchableOpacity onPress={() => setPoubelleSelectionnee(null)}>
                <Ionicons name="close" size={22} color={couleurs.texte} />
              </TouchableOpacity>
            </View>
            {chargementHistorique ? (
              <Text style={styles.videTexte}>Chargement...</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <LineChart
                  data={donneesGraphique}
                  width={Math.max(largeurEcran - 60, donneesGraphique.labels.length * 60)}
                  height={220}
                  yAxisSuffix="%"
                  chartConfig={{
                    backgroundColor: '#ffffff',
                    backgroundGradientFrom: '#ffffff',
                    backgroundGradientTo: '#ffffff',
                    decimalPlaces: 0,
                    color: (opacity = 1) => `rgba(79, 124, 255, ${opacity})`,
                    labelColor: () => couleurs.texteAtt,
                    propsForDots: { r: '3' },
                  }}
                  bezier
                  style={{ borderRadius: 12 }}
                />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  conteneur: { flex: 1, backgroundColor: couleurs.fond },
  entete: { paddingHorizontal: 8, paddingTop: 8, paddingBottom: 4 },
  titre: { fontSize: 20, fontWeight: '800', color: couleurs.texte },
  sousTitre: { fontSize: 12, color: couleurs.texteAtt, marginTop: 4, marginBottom: 8 },
  panneauAlertes: { backgroundColor: couleurs.carte, borderRadius: 16, margin: 8, padding: 14, borderWidth: 1, borderColor: couleurs.bordure },
  enteteAlertes: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  titreAlertes: { fontSize: 15, fontWeight: '700', color: couleurs.texte, marginLeft: 6 },
  badge: { marginLeft: 'auto', backgroundColor: 'rgba(239,68,68,0.12)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20 },
  badgeTexte: { color: couleurs.rouge, fontWeight: '700', fontSize: 11 },
  videTexte: { color: couleurs.texteAtt, fontSize: 13, paddingVertical: 10 },
  modaleFond: { flex: 1, backgroundColor: 'rgba(15,23,42,0.5)', justifyContent: 'center', padding: 16 },
  modaleContenu: { backgroundColor: 'white', borderRadius: 18, padding: 16, maxHeight: '80%' },
  modaleEntete: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modaleTitre: { fontSize: 15, fontWeight: '700', color: couleurs.texte, flex: 1 },
});
