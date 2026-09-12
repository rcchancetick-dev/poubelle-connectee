import Dexie from 'dexie';

const db = new Dexie('poubelles-db');
db.version(1).stores({
  historique: 'id, nomPoubelle, date, niveau, intervalle'
});

export async function saveHistoriqueLocal(entries) {
  await db.historique.clear();
  await db.historique.bulkAdd(entries);
}

export async function loadHistoriqueLocal() {
  return db.historique.toArray();
}
