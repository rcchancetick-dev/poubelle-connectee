import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from './components/Navbar.jsx';
import Dashboard from './components/Dashboard.jsx';
import Admin from './components/Admin.jsx';
import LoginAdmin from './components/LoginAdmin.jsx';
import { useAuth } from './hooks/useAuth.js';

export default function App() {
  const [vue, setVue] = useState('dashboard');
  const { authentifie, chargement, connexion, deconnexion } = useAuth();

  async function gererDeconnexion() {
    await deconnexion();
    setVue('dashboard');
  }

  return (
    <div className="app-shell">
      <Navbar vueActive={vue} onChangerVue={setVue} authentifie={authentifie} onDeconnexion={gererDeconnexion} />
      <main className="app-contenu">
        <AnimatePresence mode="wait">
          <motion.div key={`${vue}-${authentifie}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -12 }} transition={{ duration: 0.25 }}>
            {vue === 'dashboard' && <Dashboard authentifie={authentifie} />}
            {vue === 'admin' && !chargement && (authentifie ? <Admin /> : <LoginAdmin onConnexion={connexion} />)}
          </motion.div>
        </AnimatePresence>
      </main>
      <footer className="app-pied">
        <p>ESPA — Filiere Informatique L2 — Communication Numerique et Transmission</p>
        <p>ESP32 + HC-SR04 + React + API SMS BEFIANA + Persistance Redis (Upstash)</p>
      </footer>
    </div>
  );
}
