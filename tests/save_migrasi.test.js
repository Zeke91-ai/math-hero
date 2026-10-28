// Tes migrasi simpanan: progres anak yang sudah ada di HP (bentuk lama, tanpa bidang `v`) harus tetap utuh
// setelah kode kit baru dimuat. Mencakup MH2 dan MH3, cadangan, data rusak, data dari versi lebih baru.
const fs = require('fs'), path = require('path'), vm = require('vm');
let n = 0;
const ok = (c, m) => { if (!c) { console.error('GAGAL: ' + m); process.exit(1); } n++; console.log('ok: ' + m); };
const PUB = path.join(__dirname, '../public');
const read = (f) => fs.readFileSync(path.join(PUB, f), 'utf8');
const P3 = require('../public/mh3/js/progress.js');

function boot(series, store, search) {
  const win = { MH2: { ALL_LEVELS: [{ id: '1-1' }, { id: '1-2' }, { id: '1-3' }, { id: '1-4' }] }, MH3: { progress: P3 }, MHKit: {} };
  const ctx = { window: win, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, location: { search: search || '' }, Date, JSON, Math, Object, Array, Set, Number, String };
  for (const f of ['shared/js/save.js', series + '/js/save.js']) vm.runInNewContext(read(f), ctx);
  return win.MH2.save;
}

// ---------- MH2: bentuk lama (tanpa v), persis seperti yang ditulis kode sebelum kit ----------
const old2 = { slots: [null, { nama: 'RARA', hero: 'owi', stars: { '1-1': 3, '1-2': 1 }, best: { '1-1': 120, '1-2': 40 }, seen: { pembuka: true }, dibuat: 1700000000000, main: 7 }, null], active: 1 };
const raw2 = JSON.stringify(old2);
let st = { 'mathHero2.save.v1': raw2 };
let S = boot('mh2', st);
ok(S.active && S.active.nama === 'RARA' && S.active.hero === 'owi' && S.active.main === 7, 'MH2: pemain lama terbaca (nama, pahlawan, jumlah main)');
ok(S.totalStars() === 4 && S.totalScore() === 160 && S.starsOf('1-1') === 3 && S.seen('pembuka'), 'MH2: bintang, skor, dan tanda cerita lama utuh');
ok(S.unlocked(2) === true && S.unlocked(3) === false, 'MH2: level terbuka mengikuti bintang lama');
ok(st['mathHero2.save.v1'] === raw2, 'MH2: membaca saja tidak menulis ulang simpanan');
ok(st['mathHero2.save.v1.cadangan'] === raw2, 'MH2: salinan mentah data lama disimpan sebagai cadangan');
S.record('1-3', 2, 55);
let now = JSON.parse(st['mathHero2.save.v1']);
ok(now.v === 2 && now.active === 1 && now.slots[1].stars['1-3'] === 2 && now.slots[1].stars['1-1'] === 3 && now.slots[1].best['1-1'] === 120, 'MH2: setelah simpan, v=2 dan semua data lama masih ada');
ok(st['mathHero2.save.v1.cadangan'] === raw2, 'MH2: cadangan tidak ditimpa');
S = boot('mh2', st);
ok(S.active.nama === 'RARA' && S.totalStars() === 6, 'MH2: buka ulang (v2) konsisten');
// Kode lama (sebelum kit) masih bisa membaca data v2: hanya butuh slots berupa array.
ok(Array.isArray(now.slots) && now.slots.length === 3, 'MH2: bentuk data v2 tetap terbaca kode lama (kembali ke versi lama aman)');

// ---------- MH3: bentuk lama ----------
const p3 = P3.blank('Dina'); p3.hero = 'owi'; p3.grade = 4;
P3.record(p3, '1-1', 3, 10); P3.record(p3, '1-2', 2, 0); P3.rescue(p3, 'penyihir'); P3.addKeys(p3, 5); p3.seen.pembuka = true;
const old3 = { slots: [null, JSON.parse(JSON.stringify(p3)), null], active: 1 };
const raw3 = JSON.stringify(old3);
st = { 'mathHero3.save.v1': raw3 };
S = boot('mh3', st);
ok(S.active.nama === 'DINA' && S.active.hero === 'owi' && S.active.grade === 4, 'MH3: pemain lama terbaca (nama, pahlawan, kelas)');
ok(S.starsOf('1-1') === 3 && S.totalStars() === 5 && S.owned().includes('penyihir') && S.keys() === p3.keys && S.seen('pembuka'), 'MH3: bintang, pasukan, Kunci, tanda cerita utuh');
ok(st['mathHero3.save.v1.cadangan'] === raw3, 'MH3: cadangan data lama dibuat');
S.addKeys(1);
now = JSON.parse(st['mathHero3.save.v1']);
ok(now.v === 2 && now.slots[1].keys === p3.keys + 1 && now.slots[1].stars['1-1'] === 3, 'MH3: simpan memberi v=2 dan data lama utuh');
// Bidang yang belum ada pada pemain lama dilengkapi (norm), bidang lain tidak hilang.
const thin = { slots: [{ nama: 'ABC', hero: 'pinki' }, null, null], active: 0 };
st = { 'mathHero3.save.v1': JSON.stringify(thin) };
S = boot('mh3', st);
ok(S.active.nama === 'ABC' && S.active.grade >= 2 && S.active.stars && S.active.book, 'MH3: pemain sangat lama dilengkapi bidang yang kurang');

// ---------- Kasus tepi ----------
st = { 'mathHero3.save.v1': '{rusak' };
S = boot('mh3', st);
ok(S.slots().every((x) => !x) && st['mathHero3.save.v1.rusak'] === '{rusak', 'data rusak: game jalan, salinan rusak disimpan');
st = { 'mathHero2.save.v1': JSON.stringify({ v: 9, slots: [{ nama: 'MASA', hero: 'pinki', stars: {}, best: {}, seen: {}, masaDepan: 1 }, null, null], active: 0 }) };
S = boot('mh2', st);
S.setHero('dudu');
now = JSON.parse(st['mathHero2.save.v1']);
ok(now.v === 9 && now.slots[0].masaDepan === 1 && now.slots[0].hero === 'dudu', 'data dari versi lebih baru: v tidak diturunkan, bidang asing dipertahankan');
st = {};
S = boot('mh2', st);
ok(S.slots().length === 3 && !S.active && !('mathHero2.save.v1.cadangan' in st), 'awal bersih: 3 slot kosong, tanpa cadangan');
S.create(0, 'Budi');
ok(JSON.parse(st['mathHero2.save.v1']).v === 2 && S.active.nama === 'BUDI', 'pemain baru: tersimpan dengan v=2');
ok(S.checkName('anjing') && S.checkName('abc') === null, 'filter nama tetap berlaku');

console.log(`\n${n} pemeriksaan lulus.`);
