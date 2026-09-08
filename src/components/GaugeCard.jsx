import { motion } from 'framer-motion';
import { MapPin, Clock, AlertTriangle, TrendingUp } from 'lucide-react';

function couleurNiveau(niveau) {
  if (niveau === null || niveau === undefined) return '#8b98a9';
  if (niveau >= 80) return '#ef4444';
  if (niveau >= 50) return '#f59e0b';
  return '#22c55e';
}

function formatDate(iso) {
  if (!iso) return 'Aucune mesure';
  const date = new Date(iso);
  return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function GaugeCard({ poubelle, onVoirHistorique, index }) {
  const niveau = poubelle.dernierNiveau ?? 0;
  const couleur = couleurNiveau(poubelle.dernierNiveau);
  const enAlerte = poubelle.dernierNiveau !== null && poubelle.dernierNiveau >= poubelle.seuilAlerte;

  const rayon = 54;
  const circonference = 2 * Math.PI * rayon;
  const decalage = circonference - (niveau / 100) * circonference;

  return (
    <motion.article
      className={`carte-poubelle ${enAlerte ? 'carte-poubelle--alerte' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: 'easeOut' }}
      whileHover={{ y: -6, boxShadow: '0 20px 40px rgba(15, 23, 42, 0.12)' }}
      whileTap={{ scale: 0.98 }}
    >
      {enAlerte && (
        <motion.div className="carte-poubelle__badge-alerte" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}>
          <AlertTriangle size={13} />
          Seuil depasse
        </motion.div>
      )}

      <div className="carte-poubelle__entete">
        <h3>{poubelle.nom}</h3>
        <p className="carte-poubelle__lieu">
          <MapPin size={13} /> {poubelle.emplacement}
        </p>
      </div>

      <div className="carte-poubelle__jauge-conteneur">
        <svg viewBox="0 0 140 140" className="carte-poubelle__svg">
          <circle cx="70" cy="70" r={rayon} fill="none" stroke="#eef1f6" strokeWidth="12" />
          <motion.circle
            cx="70" cy="70" r={rayon} fill="none" stroke={couleur} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={circonference}
            initial={{ strokeDashoffset: circonference }}
            animate={{ strokeDashoffset: decalage }}
            transition={{ duration: 1, ease: 'easeOut' }}
            transform="rotate(-90 70 70)"
          />
        </svg>
        <div className="carte-poubelle__valeur">
          <motion.span key={niveau} initial={{ opacity: 0.3, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
            {poubelle.dernierNiveau !== null ? `${niveau.toFixed(0)}%` : '—'}
          </motion.span>
          <small>remplissage</small>
        </div>
      </div>

      <div className="carte-poubelle__pied">
        <span className="carte-poubelle__maj">
          <Clock size={12} /> {formatDate(poubelle.derniereMesureDate)}
        </span>
        <button className="bouton-lien" onClick={() => onVoirHistorique(poubelle)}>
          <TrendingUp size={13} /> Historique
        </button>
      </div>
    </motion.article>
  );
}
