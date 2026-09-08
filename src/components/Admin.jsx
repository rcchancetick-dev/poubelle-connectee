import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Send, Settings, ListChecks, KeyRound } from 'lucide-react';
import { usePoubelles } from '../hooks/usePoubelles.js';

const formVide = { nom: '', emplacement: '', hauteurCm: 60, seuilAlerte: 80, numeroAlerteSms: '' };
const mdpFormVide = { ancienMotDePasse: '', nouveauMotDePasse: '', confirmationMotDePasse: '' };

export default function Admin() {
  const { poubelles, rafraichir } = usePoubelles();
  const [formulaire, setFormulaire] = useState(formVide);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [messageStatut, setMessageStatut] = useState(null);

  const [smsTest, setSmsTest] = useState({ to: '321234567', message: "Test d'alerte depuis le tableau de bord Poubelle Connectee (API BEFIANA)." });
  const [smsStatut, setSmsStatut] = useState(null);
  const [logs, setLogs] = useState([]);

  const [mdpFormulaire, setMdpFormulaire] = useState(mdpFormVide);
  const [mdpStatut, setMdpStatut] = useState(null);
  const [mdpEnvoiEnCours, setMdpEnvoiEnCours] = useState(false);

  function chargerLogs() {
    fetch('/api/sms-logs').then((r) => r.json()).then((d) => setLogs(d.logs || []));
  }

  useEffect(() => {
    chargerLogs();
  }, []);

  async function ajouterPoubelle(e) {
    e.preventDefault();
    setEnvoiEnCours(true);
    setMessageStatut(null);
    try {
      const reponse = await fetch('/api/poubelles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formulaire),
      });
      if (!reponse.ok) throw new Error('Echec de la creation');
      setFormulaire(formVide);
      setMessageStatut({ type: 'succes', texte: 'Poubelle ajoutee avec succes.' });
      rafraichir();
    } catch (err) {
      setMessageStatut({ type: 'erreur', texte: err.message });
    } finally {
      setEnvoiEnCours(false);
    }
  }

  async function supprimerPoubelle(id) {
    await fetch(`/api/poubelles?id=${id}`, { method: 'DELETE' });
    rafraichir();
  }

  async function envoyerSmsTest(e) {
    e.preventDefault();
    setSmsStatut('envoi');
    try {
      const reponse = await fetch('/api/envoyer-sms-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(smsTest),
      });
      const donnees = await reponse.json();
      setSmsStatut(donnees.succes ? 'succes' : 'erreur');
      chargerLogs();
    } catch {
      setSmsStatut('erreur');
    }
  }

  async function changerMotDePasse(e) {
    e.preventDefault();
    setMdpStatut(null);

    if (mdpFormulaire.nouveauMotDePasse !== mdpFormulaire.confirmationMotDePasse) {
      setMdpStatut({ type: 'erreur', texte: 'La confirmation ne correspond pas au nouveau mot de passe.' });
      return;
    }
    if (mdpFormulaire.nouveauMotDePasse.length < 8) {
      setMdpStatut({ type: 'erreur', texte: 'Le nouveau mot de passe doit contenir au moins 8 caracteres.' });
      return;
    }

    setMdpEnvoiEnCours(true);
    try {
      const reponse = await fetch('/api/changer-mot-de-passe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ancienMotDePasse: mdpFormulaire.ancienMotDePasse,
          nouveauMotDePasse: mdpFormulaire.nouveauMotDePasse,
        }),
      });
      const donnees = await reponse.json();
      if (reponse.ok && donnees.succes) {
        setMdpStatut({ type: 'succes', texte: donnees.message || 'Mot de passe change avec succes.' });
        setMdpFormulaire(mdpFormVide);
      } else {
        setMdpStatut({ type: 'erreur', texte: donnees.erreur || 'Echec du changement de mot de passe.' });
      }
    } catch {
      setMdpStatut({ type: 'erreur', texte: 'Erreur reseau, veuillez reessayer.' });
    } finally {
      setMdpEnvoiEnCours(false);
    }
  }

  return (
    <div className="page">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1>Espace administrateur</h1>
        <p>Gerer les poubelles, configurer les seuils, et tester l'envoi de SMS via l'API BEFIANA (Madagascar).</p>
      </motion.div>

      <div className="grille-admin">
        <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
          <h2><Plus size={16} /> Ajouter une poubelle</h2>
          <form onSubmit={ajouterPoubelle} className="formulaire">
            <label>Nom
              <input required value={formulaire.nom} onChange={(e) => setFormulaire({ ...formulaire, nom: e.target.value })} />
            </label>
            <label>Emplacement
              <input required value={formulaire.emplacement} onChange={(e) => setFormulaire({ ...formulaire, emplacement: e.target.value })} />
            </label>
            <div className="formulaire__ligne">
              <label>Hauteur (cm)
                <input type="number" required value={formulaire.hauteurCm} onChange={(e) => setFormulaire({ ...formulaire, hauteurCm: e.target.value })} />
              </label>
              <label>Seuil d'alerte (%)
                <input type="number" required value={formulaire.seuilAlerte} onChange={(e) => setFormulaire({ ...formulaire, seuilAlerte: e.target.value })} />
              </label>
            </div>
            <label>Numero SMS d'alerte (sans le 0 initial, ex: 321234567)
              <input placeholder="321234567" value={formulaire.numeroAlerteSms} onChange={(e) => setFormulaire({ ...formulaire, numeroAlerteSms: e.target.value })} />
            </label>
            <motion.button whileTap={{ scale: 0.96 }} className="bouton-principal" disabled={envoiEnCours} type="submit">
              {envoiEnCours ? 'Ajout en cours...' : 'Ajouter la poubelle'}
            </motion.button>
            {messageStatut && <p className={messageStatut.type === 'succes' ? 'texte-succes' : 'texte-erreur'}>{messageStatut.texte}</p>}
          </form>
        </motion.section>

        <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
          <h2><ListChecks size={16} /> Poubelles enregistrees</h2>
          <ul className="liste-poubelles-admin">
            {poubelles.map((p) => (
              <li key={p.id}>
                <div>
                  <strong>{p.nom}</strong>
                  <p>{p.emplacement} — seuil {p.seuilAlerte}% — {p.numeroAlerteSms || 'aucun numero'}</p>
                </div>
                <button className="bouton-icone bouton-icone--danger" onClick={() => supprimerPoubelle(p.id)}>
                  <Trash2 size={15} />
                </button>
              </li>
            ))}
          </ul>
        </motion.section>

        <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
          <h2><Settings size={16} /> Test d'envoi SMS (BEFIANA)</h2>
          <form onSubmit={envoyerSmsTest} className="formulaire">
            <label>Numero destinataire (sans le 0 initial, ex: 321234567)
              <input required placeholder="321234567" value={smsTest.to} onChange={(e) => setSmsTest({ ...smsTest, to: e.target.value })} />
            </label>
            <label>Message
              <textarea required rows={3} value={smsTest.message} onChange={(e) => setSmsTest({ ...smsTest, message: e.target.value })} />
            </label>
            <motion.button whileTap={{ scale: 0.96 }} className="bouton-principal" type="submit">
              <Send size={14} /> Envoyer le SMS de test
            </motion.button>
            {smsStatut === 'succes' && <p className="texte-succes">SMS envoye avec succes.</p>}
            {smsStatut === 'erreur' && <p className="texte-erreur">Echec de l'envoi. Verifiez la cle API BEFIANA et votre solde de SMS.</p>}
          </form>
        </motion.section>

        <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.4 }}>
          <h2><KeyRound size={16} /> Changer le mot de passe admin</h2>
          <form onSubmit={changerMotDePasse} className="formulaire">
            <label>Mot de passe actuel
              <input type="password" required value={mdpFormulaire.ancienMotDePasse} onChange={(e) => setMdpFormulaire({ ...mdpFormulaire, ancienMotDePasse: e.target.value })} />
            </label>
            <label>Nouveau mot de passe (8 caracteres minimum)
              <input type="password" required minLength={8} value={mdpFormulaire.nouveauMotDePasse} onChange={(e) => setMdpFormulaire({ ...mdpFormulaire, nouveauMotDePasse: e.target.value })} />
            </label>
            <label>Confirmer le nouveau mot de passe
              <input type="password" required minLength={8} value={mdpFormulaire.confirmationMotDePasse} onChange={(e) => setMdpFormulaire({ ...mdpFormulaire, confirmationMotDePasse: e.target.value })} />
            </label>
            <motion.button whileTap={{ scale: 0.96 }} className="bouton-principal" disabled={mdpEnvoiEnCours} type="submit">
              {mdpEnvoiEnCours ? 'Mise a jour...' : 'Changer le mot de passe'}
            </motion.button>
            {mdpStatut && <p className={mdpStatut.type === 'succes' ? 'texte-succes' : 'texte-erreur'}>{mdpStatut.texte}</p>}
          </form>
        </motion.section>

        <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.45 }}>
          <h2>Journal des envois SMS</h2>
          <ul className="liste-logs">
            {logs.length === 0 && <p className="texte-vide">Aucun SMS envoye pour le moment.</p>}
            {logs.map((log) => (
              <li key={log.id} className={log.statut === 'envoye' ? 'log-ligne--ok' : 'log-ligne--ko'}>
                <span>{log.numero}</span>
                <span>{log.statut}</span>
                <span>{new Date(log.dateEnvoi).toLocaleString('fr-FR')}</span>
              </li>
            ))}
          </ul>
        </motion.section>
      </div>
    </div>
  );
}
