import { useEffect, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { History, ArrowUpDown, FileDown, FileSpreadsheet, Filter } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

/**
 * HistoriqueAdmin.jsx
 * Panneau d'historique des poubelles pleines, avec tri (nom, date, intervalle
 * entre deux alertes), filtrage par plage de dates et par poubelle, un
 * graphique recapitulatif (nombre d'alertes par poubelle), et deux exports :
 *   - PDF : tableau + graphique inclus (jsPDF + jspdf-autotable + html2canvas)
 *   - Excel : feuille de calcul complete (SheetJS / xlsx)
 *
 * Les bibliotheques d'export sont chargees dynamiquement (import() a la
 * demande) pour ne pas alourdir le chargement initial du reste du site.
 */

function formatDateHeure(iso) {
  return new Date(iso).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function HistoriqueAdmin() {
  const [historique, setHistorique] = useState([]);
  const [statsParPoubelle, setStatsParPoubelle] = useState({});
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState(null);

  const [tri, setTri] = useState('date');
  const [ordre, setOrdre] = useState('desc');
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');

  const [exportEnCours, setExportEnCours] = useState(null); // 'pdf' | 'excel' | null
  const graphiqueRef = useRef(null);

  const chargerHistorique = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const params = new URLSearchParams({ tri, ordre });
      if (dateDebut) params.set('dateDebut', dateDebut);
      if (dateFin) params.set('dateFin', dateFin);

      const reponse = await fetch(`/api/historique-poubelles?${params.toString()}`);
      if (!reponse.ok) throw new Error('Impossible de charger l\'historique');
      const donnees = await reponse.json();
      setHistorique(donnees.historique || []);
      setStatsParPoubelle(donnees.statsParPoubelle || {});
    } catch (e) {
      setErreur(e.message);
    } finally {
      setChargement(false);
    }
  }, [tri, ordre, dateDebut, dateFin]);

  useEffect(() => {
    chargerHistorique();
  }, [chargerHistorique]);

  function basculerOrdre(nouveauTri) {
    if (tri === nouveauTri) {
      setOrdre((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setTri(nouveauTri);
      setOrdre('desc');
    }
  }

  const donneesGraphique = Object.entries(statsParPoubelle).map(([nom, nombre]) => ({ nom, alertes: nombre }));

  async function exporterExcel() {
    setExportEnCours('excel');
    try {
      const XLSX = await import('xlsx');

      const lignes = historique.map((h) => ({
        Poubelle: h.poubelleNom,
        Emplacement: h.emplacement,
        'Niveau (%)': h.niveauPourcent,
        'Date alerte': formatDateHeure(h.dateAlerte),
        'Intervalle depuis alerte precedente (h)': h.intervalleHeures ?? 'Premiere alerte',
        Traitee: h.traitee ? 'Oui' : 'Non',
        'SMS envoye': h.smsEnvoye ? 'Oui' : 'Non',
      }));

      const feuilleHistorique = XLSX.utils.json_to_sheet(lignes);
      const feuilleStats = XLSX.utils.json_to_sheet(
        Object.entries(statsParPoubelle).map(([nom, nombre]) => ({ Poubelle: nom, "Nombre d'alertes": nombre }))
      );

      const classeur = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(classeur, feuilleHistorique, 'Historique');
      XLSX.utils.book_append_sheet(classeur, feuilleStats, 'Statistiques');

      const nomFichier = `historique-poubelles-${new Date().toISOString().slice(0, 10)}.xlsx`;
      XLSX.writeFile(classeur, nomFichier);
    } catch (e) {
      alert("Erreur lors de l'export Excel : " + e.message);
    } finally {
      setExportEnCours(null);
    }
  }

  async function exporterPdf() {
    setExportEnCours('pdf');
    try {
      const { default: jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const html2canvas = (await import('html2canvas')).default;

      const document_ = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });

      document_.setFontSize(16);
      document_.text('Historique des poubelles pleines', 40, 40);
      document_.setFontSize(10);
      document_.setTextColor(100);
      document_.text(`Genere le ${new Date().toLocaleString('fr-FR')}`, 40, 58);

      // Capture le graphique affiche a l'ecran (bar chart Recharts) sous forme d'image
      if (graphiqueRef.current) {
        const canvas = await html2canvas(graphiqueRef.current, { scale: 2, backgroundColor: '#ffffff' });
        const image = canvas.toDataURL('image/png');
        const largeurImg = 500;
        const hauteurImg = (canvas.height / canvas.width) * largeurImg;
        document_.addImage(image, 'PNG', 40, 75, largeurImg, hauteurImg);
      }

      const positionTableau = graphiqueRef.current ? 75 + 230 : 80;

      autoTable(document_, {
        startY: positionTableau,
        head: [['Poubelle', 'Emplacement', 'Niveau (%)', 'Date alerte', 'Intervalle (h)', 'Traitee', 'SMS envoye']],
        body: historique.map((h) => [
          h.poubelleNom,
          h.emplacement,
          h.niveauPourcent.toFixed(1),
          formatDateHeure(h.dateAlerte),
          h.intervalleHeures ?? '—',
          h.traitee ? 'Oui' : 'Non',
          h.smsEnvoye ? 'Oui' : 'Non',
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [79, 124, 255] },
        margin: { left: 40, right: 40 },
      });

      document_.save(`historique-poubelles-${new Date().toISOString().slice(0, 10)}.pdf`);
    } catch (e) {
      alert("Erreur lors de l'export PDF : " + e.message);
    } finally {
      setExportEnCours(null);
    }
  }

  return (
    <motion.section className="carte-panneau" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <h2><History size={16} /> Historique des poubelles pleines</h2>
      <p className="texte-vide" style={{ marginBottom: '0.8rem' }}>
        Consultez, triez et exportez l'historique complet des alertes de remplissage, toutes poubelles confondues.
      </p>

      {/* --- Filtres --- */}
      <div className="formulaire" style={{ marginBottom: '1rem' }}>
        <div className="formulaire__ligne">
          <label>Date de début
            <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} />
          </label>
          <label>Date de fin
            <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} />
          </label>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem', color: 'var(--texte-att)', fontWeight: 600 }}>
            <Filter size={13} /> Trier par :
          </span>
          {[
            { cle: 'nom', label: 'Nom' },
            { cle: 'date', label: 'Date' },
            { cle: 'intervalle', label: 'Intervalle' },
          ].map((opt) => (
            <button
              key={opt.cle}
              className="bouton-secondaire"
              style={{ padding: '0.4rem 0.8rem', minHeight: 'auto', fontWeight: tri === opt.cle ? 700 : 600 }}
              onClick={() => basculerOrdre(opt.cle)}
            >
              {opt.label} <ArrowUpDown size={12} style={{ opacity: tri === opt.cle ? 1 : 0.4 }} />
            </button>
          ))}
        </div>
      </div>

      {/* --- Boutons d'export --- */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="bouton-secondaire" onClick={exporterPdf} disabled={exportEnCours !== null || historique.length === 0}>
          <FileDown size={14} /> {exportEnCours === 'pdf' ? 'Génération...' : 'Exporter en PDF'}
        </button>
        <button className="bouton-secondaire" onClick={exporterExcel} disabled={exportEnCours !== null || historique.length === 0}>
          <FileSpreadsheet size={14} /> {exportEnCours === 'excel' ? 'Génération...' : 'Exporter en Excel'}
        </button>
      </div>

      {erreur && <p className="texte-erreur">{erreur}</p>}

      {/* --- Graphique (nombre d'alertes par poubelle) --- */}
      {donneesGraphique.length > 0 && (
        <div ref={graphiqueRef} style={{ background: 'white', padding: '0.5rem', borderRadius: '10px', marginBottom: '1rem' }}>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={donneesGraphique}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef1f6" />
              <XAxis dataKey="nom" tick={{ fontSize: 10, fill: '#8b98a9' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#8b98a9' }} width={30} />
              <Tooltip contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', fontSize: '0.8rem' }} />
              <Legend wrapperStyle={{ fontSize: '0.75rem' }} />
              <Bar dataKey="alertes" name="Nombre d'alertes" fill="#4f7cff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* --- Tableau de l'historique --- */}
      {chargement ? (
        <p className="texte-vide">Chargement de l'historique...</p>
      ) : historique.length === 0 ? (
        <p className="texte-vide">Aucune alerte enregistrée sur la période sélectionnée.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--bordure)' }}>
                <th style={{ padding: '0.5rem' }}>Poubelle</th>
                <th style={{ padding: '0.5rem' }}>Niveau</th>
                <th style={{ padding: '0.5rem' }}>Date alerte</th>
                <th style={{ padding: '0.5rem' }}>Intervalle</th>
                <th style={{ padding: '0.5rem' }}>Traitée</th>
                <th style={{ padding: '0.5rem' }}>SMS</th>
              </tr>
            </thead>
            <tbody>
              {historique.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--bordure)' }}>
                  <td style={{ padding: '0.5rem' }}>
                    <strong>{h.poubelleNom}</strong>
                    <div style={{ fontSize: '0.72rem', color: 'var(--texte-att)' }}>{h.emplacement}</div>
                  </td>
                  <td style={{ padding: '0.5rem' }}>{h.niveauPourcent.toFixed(0)}%</td>
                  <td style={{ padding: '0.5rem' }}>{formatDateHeure(h.dateAlerte)}</td>
                  <td style={{ padding: '0.5rem' }}>{h.intervalleHeures !== null ? `${h.intervalleHeures} h` : 'Première alerte'}</td>
                  <td style={{ padding: '0.5rem' }}>{h.traitee ? '✅' : '❌'}</td>
                  <td style={{ padding: '0.5rem' }}>{h.smsEnvoye ? '✅' : '❌'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}
