import bcrypt from 'bcryptjs';

const motDePasse = process.argv[2];

if (!motDePasse) {
  console.error('Usage : node scripts/generer-hash.js "MonMotDePasse"');
  process.exit(1);
}

const hash = bcrypt.hashSync(motDePasse, 10);
console.log('Hash bcrypt genere :');
console.log(hash);
