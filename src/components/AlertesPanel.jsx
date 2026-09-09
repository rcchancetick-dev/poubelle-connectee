import { motion, AnimatePresence } from 'framer-motion';
import { BellRing, CheckCircle2, MessageSquareText } from 'lucide-react';

/**
 * AlertesPanel.jsx
 * NOUVEAU : le bouton "Traiter" demande desormais une confirmation explicite
 * (window.confirm) avant de clore l'alerte, pour eviter un clic accidentel
 * qui ferait disparaitre une alerte encore pertinente sans intervention reelle
 * de l'agent de collecte.
 */

export default function AlertesPanel({ alertes, onTraiter, authentifie }) {
  function demanderConfirmationEtTraiter(alerte) {
    const message =
      `Confirmer le traitement de cette alerte ?\n\n` +
      `Poubelle : ${alerte.poubelleNom}\n` +
      `Niveau : ${alerte.niveauPourcent.toFixed(0)}%\n` +
      `Date : ${new Date(alerte.dateAlerte).toLocaleString('fr-FR')}\n\n` +
      `Cette action indique que la poubelle a bien ete videe ou prise en charge.`;

    if (window.confirm(message)) {
      onTraiter(alerte.id);
    }
  }

  return (
    <motion.section className="panneau-alertes" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
      <div className="panneau-alertes__entete">
        <BellRing size={18} />
        <h2>Alertes en attente</h2>
        <span className="badge-compteur">{alertes.length}</span>
      </div>

      {alertes.length === 0 ? (
        <p className="texte-vide">Aucune alerte active. Toutes les poubelles sont sous le seuil critique.</p>
      ) : (
        <ul className="liste-alertes">
          <AnimatePresence>
            {alertes.map((alerte) => (
              <motion.li key={alerte.id} className="ligne-alerte" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16, height: 0 }} transition={{ duration: 0.3 }}>
                <div>
                  <strong>{alerte.poubelleNom}</strong>
                  <p>{alerte.niveauPourcent.toFixed(0)}% — {new Date(alerte.dateAlerte).toLocaleString('fr-FR')}</p>
                  <span className={`etiquette-sms ${alerte.smsEnvoye ? 'etiquette-sms--ok' : 'etiquette-sms--ko'}`}>
                    <MessageSquareText size={12} /> {alerte.smsEnvoye ? 'SMS envoye' : 'SMS non envoye'}
                  </span>
                </div>
                {authentifie && (
                  <button className="bouton-secondaire" onClick={() => demanderConfirmationEtTraiter(alerte)}>
                    <CheckCircle2 size={14} /> Traiter
                  </button>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </motion.section>
  );
}
