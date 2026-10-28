// Uji kewarasan bot pemeriksa: jurang yang makin lebar harus akhirnya dianggap mustahil.
const { Builder } = require('../public/js/levels.js');
const { check } = require('../scripts/cek_level.js');
const { fromKejar } = require('../public/shared/js/levelcheck.js');
const Sim = require('../public/mh3/js/plat/sim.js');
function mk(gap, rise) {
  const b = new Builder({ id: 99, cols: 60, nama: 'uji', lv: 1 });
  b.ground(0, 10);
  b.isle(11 + gap, 59, rise || 0);
  b.put(3, 0, 'S');
  b.put(55, rise || 0, 'E');
  return b.build();
}
const hasil = {};
for (const g of [3, 4, 5, 6, 8, 10]) hasil['jurang ' + g] = check(mk(g)).ok;
for (const r of [2, 3, 4, 5]) hasil['naik ' + r] = check(mk(2, r)).ok;
// Format Kejar: tanah dengan jurang sempit lolos, jurang lebar tidak.
function kejar(gap) {
  const map = Array.from({ length: 6 }, () => '.'.repeat(40).split(''));
  for (let c = 0; c < 40; c++) if (c < 10 || c >= 10 + gap) map[5][c] = '#';
  map[4][2] = 'S'; map[4][38] = 'E';
  const def = { id: 99, nama: 'uji kejar', map: map.map((r) => r.join('')) };
  return check(fromKejar(def, Sim.parse(def))).ok;
}
hasil['kejar jurang 3'] = kejar(3);
hasil['kejar jurang 12'] = kejar(12);
console.log(hasil);
const must = hasil['jurang 3'] && !hasil['jurang 10'] && hasil['naik 3'] && !hasil['naik 5'] && hasil['kejar jurang 3'] && !hasil['kejar jurang 12'];
console.log(must ? 'bot masuk akal' : 'bot MENCURIGAKAN');
process.exit(must ? 0 : 1);
