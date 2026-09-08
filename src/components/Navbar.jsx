import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, LayoutDashboard, ShieldCheck, Menu, X, LogOut } from 'lucide-react';

export default function Navbar({ vueActive, onChangerVue, authentifie, onDeconnexion }) {
  const [menuOuvert, setMenuOuvert] = useState(false);

  const onglets = [
    { id: 'dashboard', label: 'Tableau de bord', icone: LayoutDashboard },
    { id: 'admin', label: 'Administration', icone: ShieldCheck },
  ];

  function choisir(id) {
    onChangerVue(id);
    setMenuOuvert(false);
  }

  return (
    <motion.header className="navbar" initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
      <div className="navbar__ligne">
        <div className="navbar__brand">
          <motion.div className="navbar__icon" animate={{ rotate: [0, -8, 8, -4, 0] }} transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 4 }}>
            <Trash2 size={20} />
          </motion.div>
          <div>
            <span className="navbar__title">Poubelle Connectee</span>
            <span className="navbar__subtitle">Supervision IoT en temps reel</span>
          </div>
        </div>

        <button className="navbar__burger" onClick={() => setMenuOuvert((v) => !v)} aria-label="Ouvrir le menu">
          {menuOuvert ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className="navbar__tabs navbar__tabs--desktop">
          {onglets.map((onglet) => {
            const Icone = onglet.icone;
            const actif = vueActive === onglet.id;
            return (
              <button key={onglet.id} className={`navbar__tab ${actif ? 'navbar__tab--actif' : ''}`} onClick={() => choisir(onglet.id)}>
                <Icone size={16} />
                {onglet.label}
                {actif && <motion.div className="navbar__tab-indicateur" layoutId="indicateur-onglet-desktop" transition={{ type: 'spring', stiffness: 400, damping: 30 }} />}
              </button>
            );
          })}
          {authentifie && vueActive === 'admin' && (
            <button className="navbar__tab navbar__tab--deconnexion" onClick={onDeconnexion}>
              <LogOut size={15} /> Deconnexion
            </button>
          )}
        </nav>
      </div>

      <AnimatePresence>
        {menuOuvert && (
          <motion.nav className="navbar__tabs navbar__tabs--mobile" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}>
            {onglets.map((onglet) => {
              const Icone = onglet.icone;
              const actif = vueActive === onglet.id;
              return (
                <button key={onglet.id} className={`navbar__tab-mobile ${actif ? 'navbar__tab-mobile--actif' : ''}`} onClick={() => choisir(onglet.id)}>
                  <Icone size={17} /> {onglet.label}
                </button>
              );
            })}
            {authentifie && (
              <button className="navbar__tab-mobile navbar__tab-mobile--deconnexion" onClick={() => { onDeconnexion(); setMenuOuvert(false); }}>
                <LogOut size={16} /> Deconnexion
              </button>
            )}
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
