import { useState } from 'react';
import { motion } from 'framer-motion';
import { usePoubelles, useAlertes } from '../hooks/usePoubelles.js';
import GaugeCard from './GaugeCard.jsx';
import HistoriqueModal from './HistoriqueModal.jsx';
import AlertesPanel from './AlertesPanel.jsx';
import { RefreshCw } from 'lucide-react';

export default function Dashboard({ authentifie }) {
  const { poubelles, chargement, rafraichir } = usePoubelles();
  const { alertes, rafraichir: rafraichirAlertes } = useAlertes();
  const [poubelleSelectionnee, setPoubelleSelectionnee] = useState(null);

  async function traiterAlerte(id) {
    await fetch('/api/alertes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    rafraichirAlertes();
  }

  return (
    <div className="page">
      <motion.div className="page__intro" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div>
          <h1>Etat des poubelles en temps reel</h1>
          <p>Mesures transmises par les modules ESP32 via capteur ultrason HC-SR04, rafraichies automatiquement.</p>
        </div>
        <button className="bouton-secondaire" onClick={rafraichir}>
          <RefreshCw size={14} /> Actualiser
        </button>
      </motion.div>

      {chargement ? (
        <div className="grille-chargement">
          {[0, 1, 2].map((i) => <div key={i} className="carte-squelette" />)}
        </div>
      ) : (
        <div className="grille-poubelles">
          {poubelles.map((poubelle, index) => (
            <GaugeCard key={poubelle.id} poubelle={poubelle} index={index} onVoirHistorique={setPoubelleSelectionnee} />
          ))}
        </div>
      )}

      <AlertesPanel alertes={alertes} onTraiter={traiterAlerte} authentifie={authentifie} />

      <HistoriqueModal poubelle={poubelleSelectionnee} onFermer={() => setPoubelleSelectionnee(null)} />
    </div>
  );
}
