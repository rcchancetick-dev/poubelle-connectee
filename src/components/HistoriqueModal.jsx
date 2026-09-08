import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';

function formatHeure(iso) {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

export default function HistoriqueModal({ poubelle, onFermer }) {
  const [mesures, setMesures] = useState([]);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!poubelle) return;
    setChargement(true);
    fetch(`/api/historique?poubelleId=${poubelle.id}`)
      .then((r) => r.json())
      .then((donnees) => setMesures((donnees.mesures || []).map((m) => ({ ...m, heure: formatHeure(m.date) }))))
      .finally(() => setChargement(false));
  }, [poubelle]);

  return (
    <AnimatePresence>
      {poubelle && (
        <motion.div className="modale-fond" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFermer}>
          <motion.div
            className="modale-contenu"
            initial={{ opacity: 0, scale: 0.94, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 24 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modale-entete">
              <h2>Historique — {poubelle.nom}</h2>
              <button className="bouton-icone" onClick={onFermer} aria-label="Fermer">
                <X size={18} />
              </button>
            </div>

            {chargement ? (
              <div className="chargement-spinner" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={mesures} margin={{ left: -18, right: 8 }}>
                  <defs>
                    <linearGradient id="degradeNiveau" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4f7cff" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#4f7cff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
                  <XAxis dataKey="heure" tick={{ fontSize: 10, fill: '#8b98a9' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#8b98a9' }} width={34} />
                  <Tooltip formatter={(value) => [`${value}%`, 'Niveau']} contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
                  <Area type="monotone" dataKey="niveau" stroke="#4f7cff" strokeWidth={2.5} fill="url(#degradeNiveau)" animationDuration={900} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
