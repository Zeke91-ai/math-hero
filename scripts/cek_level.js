// Pemeriksa level: menjalankan bot jangkauan kit (public/shared/js/levelcheck.js) pada level MH1 dan Kejar MH3.
// Pakai: node scripts/cek_level.js [mh1|kejar] [nomor level ...]   (tanpa argumen: semua level kedua seri)
const { check, reach, fromKejar } = require('../public/shared/js/levelcheck.js');
const { LEVELS } = require('../public/js/levels.js');
const Sim = require('../public/mh3/js/plat/sim.js');
const Kejar = require('../public/mh3/js/plat/levels.js');

module.exports = { check, reach };
if (require.main !== module) return;
const args = process.argv.slice(2);
const series = ['mh1', 'kejar'].filter((s) => !args.some((a) => /^[a-z]/.test(a)) || args.includes(s));
const want = args.filter((a) => /^\d+$/.test(a)).map(Number);
let failed = 0;
const report = (tag, r) => {
  console.log(`${r.ok ? 'LULUS ' : 'GAGAL '} ${tag} level ${r.id} ${r.nama}`);
  r.msg.forEach((m) => console.log('   ' + m));
  if (!r.ok) failed++;
};
if (series.includes('mh1')) for (const L of LEVELS) if (!want.length || want.includes(L.id)) report('MH1', check(L));
if (series.includes('kejar')) for (const d of Kejar.LEVELS) if (!want.length || want.includes(d.id)) report('Kejar', check(fromKejar(d, Sim.parse(d))));
process.exit(failed ? 1 : 0);
