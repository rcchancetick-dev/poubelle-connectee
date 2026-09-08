import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, ShieldCheck, Eye, EyeOff } from 'lucide-react';

export default function LoginAdmin({ onConnexion }) {
  const [motDePasse, setMotDePasse] = useState('');
  const [afficherMotDePasse, setAfficherMotDePasse] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  async function soumettre(e) {
    e.preventDefault();
    setErreur(null);
    setEnvoiEnCours(true);
    const resultat = await onConnexion(motDePasse);
    setEnvoiEnCours(false);
    if (!resultat.succes) setErreur(resultat.erreur);
  }

  return (
    <div className="page page--centree">
      <motion.div className="carte-login" initial={{ opacity: 0, y: 24, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}>
        <div className="carte-login__icone">
          <ShieldCheck size={26} />
        </div>
        <h1>Espace administrateur</h1>
        <p className="texte-vide">Acces reserve. Saisissez le mot de passe pour continuer.</p>

        <form onSubmit={soumettre} className="formulaire">
          <label>Mot de passe
            <div className="champ-mot-de-passe">
              <Lock size={15} />
              <input
                type={afficherMotDePasse ? 'text' : 'password'}
                required
                autoFocus
                value={motDePasse}
                onChange={(e) => setMotDePasse(e.target.value)}
                placeholder="Votre mot de passe"
              />
              <button type="button" className="champ-mot-de-passe__bouton" onClick={() => setAfficherMotDePasse((v) => !v)} aria-label="Afficher/masquer le mot de passe">
                {afficherMotDePasse ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <motion.button whileTap={{ scale: 0.96 }} className="bouton-principal" disabled={envoiEnCours} type="submit">
            {envoiEnCours ? 'Verification...' : 'Se connecter'}
          </motion.button>

          {erreur && <p className="texte-erreur">{erreur}</p>}
        </form>
      </motion.div>
    </div>
  );
}
