/**
 * services/export.js
 * Export PDF et Excel adaptes a React Native / Expo (contrairement au web,
 * qui utilise jsPDF + html2canvas + xlsx directement dans le navigateur --
 * ces bibliotheques ne fonctionnent pas nativement sur mobile).
 *
 * PDF  : expo-print convertit du HTML en PDF via le moteur de rendu natif
 *        (WebView systeme), puis expo-sharing ouvre la feuille de partage
 *        (enregistrer, envoyer par email, WhatsApp, Drive, etc.).
 * Excel: xlsx (SheetJS) genere le classeur en base64, expo-file-system
 *        l'ecrit sur le disque, puis expo-sharing le partage de la meme
 *        maniere.
 */

import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as XLSX from 'xlsx';

function formatDateHeure(iso) {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

function construireHtml(historique, statsParPoubelle) {
  const lignesTableau = historique
    .map(
      (h) => `
      <tr>
        <td>${h.poubelleNom}</td>
        <td>${h.emplacement}</td>
        <td>${h.niveauPourcent.toFixed(1)}%</td>
        <td>${formatDateHeure(h.dateAlerte)}</td>
        <td>${h.intervalleHeures !== null ? h.intervalleHeures + ' h' : 'Première alerte'}</td>
        <td>${h.traitee ? 'Oui' : 'Non'}</td>
        <td>${h.smsEnvoye ? 'Oui' : 'Non'}</td>
      </tr>`
    )
    .join('');

  const lignesStats = Object.entries(statsParPoubelle)
    .map(([nom, nombre]) => `<tr><td>${nom}</td><td>${nombre}</td></tr>`)
    .join('');

  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: Helvetica, Arial, sans-serif; padding: 24px; color: #1e293b; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          p.sousTitre { font-size: 11px; color: #64748b; margin-top: 0; margin-bottom: 20px; }
          h2 { font-size: 15px; margin-top: 24px; margin-bottom: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 10px; }
          th { background: #4f7cff; color: white; padding: 6px 8px; text-align: left; }
          td { padding: 6px 8px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
        </style>
      </head>
      <body>
        <h1>Historique des poubelles pleines</h1>
        <p class="sousTitre">Généré le ${new Date().toLocaleString('fr-FR')} — Poubelle Connectée</p>

        <h2>Récapitulatif par poubelle</h2>
        <table>
          <thead><tr><th>Poubelle</th><th>Nombre d'alertes</th></tr></thead>
          <tbody>${lignesStats}</tbody>
        </table>

        <h2>Détail des alertes (${historique.length})</h2>
        <table>
          <thead>
            <tr>
              <th>Poubelle</th><th>Emplacement</th><th>Niveau</th><th>Date alerte</th>
              <th>Intervalle</th><th>Traitée</th><th>SMS</th>
            </tr>
          </thead>
          <tbody>${lignesTableau}</tbody>
        </table>
      </body>
    </html>
  `;
}

export async function exporterHistoriquePdf(historique, statsParPoubelle) {
  const html = construireHtml(historique, statsParPoubelle);
  const { uri } = await Print.printToFileAsync({ html, base64: false });

  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: "Exporter l'historique des poubelles (PDF)",
      UTI: 'com.adobe.pdf',
    });
  }
  return uri;
}

export async function exporterHistoriqueExcel(historique, statsParPoubelle) {
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

  const base64 = XLSX.write(classeur, { type: 'base64', bookType: 'xlsx' });

  const nomFichier = `historique-poubelles-${new Date().toISOString().slice(0, 10)}.xlsx`;
  const cheminFichier = `${FileSystem.cacheDirectory}${nomFichier}`;

  await FileSystem.writeAsStringAsync(cheminFichier, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const disponible = await Sharing.isAvailableAsync();
  if (disponible) {
    await Sharing.shareAsync(cheminFichier, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: "Exporter l'historique des poubelles (Excel)",
      UTI: 'org.openxmlformats.spreadsheetml.sheet',
    });
  }
  return cheminFichier;
}
