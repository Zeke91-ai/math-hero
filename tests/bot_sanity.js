// Uji kewarasan bot pemeriksa: jurang yang makin lebar harus akhirnya dianggap mustahil.
const { Builder } = require('../public/js/levels.js');
const { check } = require('../scripts/cek_level.js');
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
console.log(hasil);
const must = hasil['jurang 3'] && !hasil['jurang 10'] && hasil['naik 3'] && !hasil['naik 5'];
console.log(must ? 'bot masuk akal' : 'bot MENCURIGAKAN');
process.exit(must ? 0 : 1);
