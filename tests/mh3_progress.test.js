// Uji progres MH3 (peta, penyelamatan, upgrade, Buku PR, simpan):  node tests/mh3_progress.test.js
const assert = require('assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const P = require('../public/mh3/js/progress.js');
const Story = require('../public/mh3/js/story.js');
const D = require('../public/mh3/js/defense/data.js');
const PL = require('../public/mh3/js/plat/levels.js');
let n = 0;
const ok = (c, m) => { n++; assert.ok(c, 'GAGAL: ' + m); console.log('ok: ' + m); };

// ---------- Struktur peta ----------
ok(P.LEVELS.length === 20, '20 level');
ok(P.LEVELS.filter((l) => l.genre === 'defense').length === 12 && P.LEVELS.filter((l) => l.kind === 'boss').length === 4 && P.LEVELS.filter((l) => l.genre === 'plat').length === 8, '12 Bertahan (4 bos) dan 8 Kejar');
ok(P.WORLDS.every((w) => P.LEVELS.filter((l) => l.world === w.id).map((l) => l.kind).join() === P.PATTERN.join()), 'tiap dunia berpola Bertahan, Kejar, Bertahan, Kejar, Bos');
ok(P.LEVELS.every((l, i) => l.index === i && l.id === `${l.world}-${l.node + 1}`), 'id dan urutan level konsisten');
const refs = (g) => P.LEVELS.filter((l) => l.genre === g).map((l) => l.ref);
ok(refs('defense').join() === '1,2,3,4,5,6,7,8,9,10,11,12' && refs('plat').join() === '1,2,3,4,5,6,7,8', 'ref level berurutan per genre');
ok(P.LEVELS.every((l) => l.tier === l.world - 1), 'tingkat PR naik per dunia');
ok(D.level(1) && PL.level(1), 'data level 1 kedua genre tersedia (sisanya diisi tugas 3.3 / 3.4)');

// ---------- Cerita ----------
ok(P.LEVELS.every((l) => Story.before(l).length >= 1 && Story.after(l).length >= 1), 'tiap level punya adegan sebelum dan sesudah (naskah atau teks umum)');
ok(P.ROSTER.filter((u) => u.rescue).every((u) => Story.rescue(u.id).length >= 2), 'tiap penduduk punya dialog penyelamatan');

// ---------- Level, bintang, kunci ----------
let p = P.blank('abc');
ok(p.nama === 'ABC' && p.grade === 2 && P.owned(p).join() === 'pemanah,menara,tembok', 'profil baru: 3 pasukan awal, kelas 2');
ok(P.unlocked(p, 0) && !P.unlocked(p, 1), 'hanya level pertama terbuka');
ok(P.current(p).id === '1-1', 'level berjalan = 1-1');
let r = P.record(p, '1-1', 2, 100);
ok(r.first && r.more === 2 && P.starsOf(p, '1-1') === 2 && P.unlocked(p, 1) && !P.unlocked(p, 2), 'menang membuka level berikutnya saja');
r = P.record(p, '1-1', 1, 50);
ok(!r.first && P.starsOf(p, '1-1') === 2 && p.best['1-1'] === 100, 'bintang dan skor terbaik tidak turun');
ok(P.unlocked(p, 5, true), 'buka=1 membuka semua');
ok(P.bonusStars(p, 2) === 0, 'belum ada bonus sebelum kristal direbut');
P.record(p, '1-2', 3, 0);
ok(P.bonusStars(p, 2) === P.STAR_BONUS && P.bonusStars(p, 3) === 0, 'kristal Kejar memberi +50 Bintang di level Bertahan sesudahnya');
ok(P.crystals(p) === 1 && P.totalStars(p) === 5, 'hitung kristal dan bintang');

// ---------- Penyelamatan dan pasukan ----------
ok(P.rescueFor(1).id === 'penyihir' && P.rescueFor(5).id === 'anak' && !P.rescueFor(6), '5 level Kejar pertama menyelamatkan 5 penduduk');
ok(P.rescue(p, 'penyihir') && !P.rescue(p, 'penyihir') && !P.rescue(p, 'pemanah'), 'penyelamatan sekali saja; pasukan awal tidak bisa "diselamatkan"');
ok(P.owned(p).includes('penyihir') && P.owned(p).length === 4, 'penduduk yang diselamatkan jadi pasukan');

// ---------- Loadout ----------
ok(P.loadout(p).join() === 'pemanah,menara,tembok,penyihir', 'loadout bawaan = 4 pertama yang dimiliki');
P.rescue(p, 'meriam');
ok(P.toggleLoadout(p, 'meriam') === 'penuh', 'loadout paling banyak 4');
ok(P.toggleLoadout(p, 'tembok') === null && P.toggleLoadout(p, 'meriam') === null && P.loadout(p).join() === 'pemanah,menara,penyihir,meriam', 'lepas satu lalu pasang yang lain');
ok(P.toggleLoadout(p, 'robo') === 'belum', 'pasukan yang belum diselamatkan tidak bisa dipasang');
const q = P.blank('Q'); ['pemanah', 'menara'].forEach((u) => null); q.loadout = ['pemanah'];
ok(P.toggleLoadout(q, 'pemanah') === 'terakhir' && P.loadout(q).length === 1, 'loadout tidak boleh kosong');
ok(P.loadout(Object.assign(P.blank('Z'), { loadout: ['robo', 'robo', 'menara'] })).join() === 'menara', 'loadout rusak dibersihkan (tidak dimiliki / ganda)');

// ---------- Upgrade ----------
p.keys = 0;
ok(P.unitLevel(p, 'pemanah') === 1 && P.upgradeCost(p, 'pemanah') === 2 && P.upgradeCost(p, 'robo') === null, 'biaya upgrade level 2 = 2 Kunci');
let u = P.upgrade(p, 'pemanah');
ok(!u.ok && u.why === 'kunci' && P.unitLevel(p, 'pemanah') === 1, 'Kunci kurang: upgrade ditolak');
P.addKeys(p, 7);
u = P.upgrade(p, 'pemanah');
ok(u.ok && u.level === 2 && p.keys === 5, 'upgrade ke Lv 2 memakai 2 Kunci');
ok(P.upgradeCost(p, 'pemanah') === 4, 'biaya Lv 3 = 4 Kunci');
u = P.upgrade(p, 'pemanah');
ok(u.ok && u.level === 3 && p.keys === 1 && P.upgradeCost(p, 'pemanah') === null, 'upgrade ke Lv 3 lalu maksimal');
ok(P.upgrade(p, 'pemanah').why === 'maks' && P.upgrade(p, 'robo').why === 'belum', 'tidak bisa melebihi Lv 3 atau upgrade pasukan yang belum dimiliki');

// ---------- Upgrade berpengaruh di papan Bertahan ----------
{
  const Sim = require('../public/mh3/js/defense/sim.js');
  const mk = (upg) => { const g = Sim.create(Object.assign({}, D.level(1), { startStars: 999, upg }), () => 0.5); Sim.place(g, 'pemanah', 2, 4); Sim.place(g, 'menara', 1, 4); return g; };
  const a = mk({}), b = mk({ pemanah: 3, menara: 3 });
  ok(b.grid[4][2].max > a.grid[4][2].max && b.grid[4][2].lv === 2 && a.grid[4][2].lv === 0, 'upgrade menambah HP pasukan');
  for (const g of [a, b]) { g.monsters.push({ id: 99, kind: 'tebal', col: 2, y: 2, hp: 99, max: 99, hurt: 0, atk: null, slow: 0 }); for (let i = 0; i < 20; i++) Sim.update(g, 0.1); }
  const dmg = (g) => 99 - g.monsters[0].hp;
  ok(dmg(b) > dmg(a), 'upgrade menambah kerusakan tembakan');
}

// ---------- Buku PR ----------
const t0 = Date.UTC(2026, 9, 26);
const hw = (id, seed, status, stars) => ({ id, seed, tier: 1, grade: 3, status, stars: stars || 0 });
P.logPR(p, hw('a', 1, 'later'), 'Peti Kristal', t0);
P.logPR(p, hw('a', 1, 'later'), 'Peti Kristal', t0);
ok(p.book.later.length === 1 && p.book.later[0].kind === 'kunci', 'PR ditunda masuk Buku PR sekali (tanpa ganda)');
P.logPR(p, hw('b', 2, 'done', 3), 'Peti Kekuatan', t0);
ok(p.book.done.length === 1 && p.book.done[0].kind === 'kuasa' && p.book.done[0].stars === 3, 'PR selesai tercatat dengan bintangnya');
const keysBefore = p.keys;
const fin = P.finishLater(p, p.book.later[0], hw('a', 1, 'done', 2), t0 + 1000);
ok(fin.keys === 2 && p.keys === keysBefore + 2 && p.book.later.length === 0 && p.book.done.length === 2, 'PR Peti Kristal yang ditunda memberi Kunci sebanyak bintangnya saat dikerjakan');
ok(P.finishLater(p, { id: 'a', seed: 1 }, hw('a', 1, 'done', 3)).keys === 0, 'PR yang sudah tidak tertunda tidak memberi Kunci dua kali');
ok(P.weekCount(p, t0 + 2000) === 2 && P.weekCount(p, t0 + 8 * 86400000) === 0, 'hitungan "PR selesai minggu ini"');

// ---------- Simpan antar sesi (save.js di Node dengan localStorage tiruan) ----------
function boot(store, search) {
  const win = { MH2: {}, MH3: { progress: P } };
  const ctx = { window: win, localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, location: { search: search || '' }, Date, JSON, Math, Object, Array, Set, Number, String };
  win.MHKit = {};
  for (const f of ['shared/js/save.js', 'mh3/js/save.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../public', f), 'utf8'), ctx);
  return win.MH2.save;
}
const store = {};
let S = boot(store);
ok(S.slots().every((x) => !x) && !S.active, 'awal: tidak ada pemain');
S.create(1, 'Dina');
ok(S.active.nama === 'DINA', 'slot dibuat dan aktif');
S.setHero('owi'); S.setGrade(4);
S.record('1-1', 3, 10); S.record('1-2', 2, 0);
S.rescue('penyihir'); S.addKeys(5); S.upgrade('pemanah'); S.toggleLoadout('tembok');
S.logPR(hw('x', 9, 'done', 3), 'Peti Harta'); S.logPR(hw('y', 8, 'later'), 'Peti Kekuatan');
S.markSeen('pembuka');
const snap = JSON.stringify(S.active);
S = boot(store); // buka-tutup aplikasi
ok(S.slots()[1] && S.slots()[1].nama === 'DINA' && S.active && S.active.nama === 'DINA', 'setelah buka ulang, slot dan pemain aktif masih ada');
S.use(1);
ok(JSON.stringify(S.active) === snap, 'seluruh progres sama persis setelah buka ulang');
ok(S.starsOf('1-1') === 3 && S.totalStars() === 5 && S.crystals() === 1, 'bintang dan kristal tersimpan');
ok(S.owned().includes('penyihir') && S.unitLevel('pemanah') === 2 && S.keys() === 3 && S.loadout().includes('penyihir') && !S.loadout().includes('tembok'), 'pasukan, upgrade, Kunci, dan loadout tersimpan');
ok(S.book().done.length === 1 && S.book().later.length === 1 && S.seen('pembuka') && S.active.grade === 4 && S.active.hero === 'owi', 'Buku PR, tanda cerita, kelas, dan pahlawan tersimpan');
ok(S.unlocked(2) && !S.unlocked(3), 'level terbuka mengikuti progres tersimpan');
ok(boot(store, '?buka=1').unlocked(19), '?buka=1 membuka semua level');
S.remove(1);
ok(boot(store).slots()[1] === null, 'hapus slot tersimpan');
store['mathHero3.save.v1'] = '{rusak';
ok(boot(store).slots().every((x) => !x), 'data rusak tidak membuat game macet');
ok(S.checkName('abc') === null && S.checkName('anjing') && S.checkName('1') && S.checkName(''), 'nama: filter kasar dan format');

console.log(`\n${n} pemeriksaan lulus.`);
