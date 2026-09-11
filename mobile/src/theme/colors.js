export const couleurs = {
  bleu: '#4f7cff',
  bleuFonce: '#2d4fd6',
  vert: '#22c55e',
  orange: '#f59e0b',
  rouge: '#ef4444',
  texte: '#1e293b',
  texteAtt: '#64748b',
  fond: '#f6f8fc',
  carte: '#ffffff',
  bordure: '#e6eaf2',
};

export function couleurNiveau(niveau) {
  if (niveau === null || niveau === undefined) return '#8b98a9';
  if (niveau >= 80) return couleurs.rouge;
  if (niveau >= 50) return couleurs.orange;
  return couleurs.vert;
}
