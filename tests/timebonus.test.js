// Uji bonus waktu dan skor Papan Juara (tanpa browser):  node tests/timebonus.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs'), path = require('path');
const TB = require('../public/shared/js/timebonus.js');
const Scores = require('../public/shared/js/scores.js');
const { ALL_LEVELS } = require('../public/mh2/js/stages.js');
const { LEVELS: MH3_LEVELS } = require('../public/mh3/js/progress.js');

// Simulasikan `sec` detik main dengan langkah 0,05 dtk (sedikit lebih dari sec agar tidak kurang karena pembulatan).
const play = (clk, sec) => { for (let i = 0; i < Math.round(sec / 0.05) + 1; i++) clk.tick(0.05); };

test('bonus turun 1 poin tiap 5 detik, mulai dari dasar, tidak pernah negatif', () => {
  assert.equal(TB.value(200, 5, 0), 200);
  assert.equal(TB.value(200, 5, 4.99), 200);
  assert.equal(TB.value(200, 5, 5), 199);
  assert.equal(TB.value(200, 5, 60), 188);
  assert.equal(TB.value(200, 5, 999), 1);
  assert.equal(TB.value(200, 5, 1000), 0);
  assert.equal(TB.value(200, 5, 1e9), 0, 'lantai 0');
  assert.equal(TB.value(200, 5, -10), 200, 'waktu negatif diabaikan');
  assert.equal(TB.value(200, 5, NaN), 200);
  let prev = Infinity;
  for (let s = 0; s < 1300; s += 0.5) { const v = TB.value(200, 5, s); assert.ok(v >= 0 && v <= prev); prev = v; }
});

test('tiap game punya tabel pengaturan sendiri (dasar dan detik per poin)', () => {
  for (const id of ['mh1', 'mh2', 'mh3']) {
    const c = TB.GAMES[id];
    assert.ok(c && c.base > 0 && c.secPerPoint > 0, id);
    const clk = TB.forGame(id);
    assert.equal(clk.value(), c.base);
    play(clk, c.secPerPoint * 10);
    assert.equal(clk.value(), c.base - 10, id);
  }
});

test('jam hanya maju lewat tick(); jeda berarti tidak memanggil tick', () => {
  const clk = TB.create({ base: 200, secPerPoint: 5 });
  play(clk, 5);                                            // 5 detik main
  assert.equal(clk.value(), 199);
  const frozen = clk.seconds();
  // Jeda / kartu PR / cerita / layar hasil: adegan tidak memanggil tick, jadi tidak ada yang berubah.
  assert.equal(clk.seconds(), frozen);
  clk.tick(NaN); clk.tick(-1); clk.tick(Infinity); clk.tick(30); // nilai tak masuk akal (tab dibuka kembali) diabaikan
  assert.equal(clk.seconds(), frozen);
  clk.reset(); assert.equal(clk.value(), 200);
});

test('tab tersembunyi tidak menambah waktu', () => {
  const clk = TB.create({ base: 200, secPerPoint: 5 });
  global.document = { hidden: true };
  for (let i = 0; i < 600; i++) clk.tick(1 / 60);
  assert.equal(clk.seconds(), 0);
  global.document = { hidden: false };
  clk.tick(0.5);
  assert.equal(clk.seconds(), 0.5);
  delete global.document;
});

test('adil: bonus hanya menambah, skor dasar tidak pernah turun karena lambat', () => {
  for (const base of [0, 137, 1280, 99999]) for (const sec of [0, 30, 600, 5000, 1e7]) {
    const total = base + TB.value(200, 5, sec);
    assert.ok(total >= base);
  }
});

test('format jam m:dd', () => {
  assert.equal(TB.clock(0), '0:00'); assert.equal(TB.clock(83.9), '1:23'); assert.equal(TB.clock(600), '10:00'); assert.equal(TB.clock(-5), '0:00');
});

// ---- Rentang skor vs aturan Firestore ----
const rules = fs.readFileSync(path.join(__dirname, '..', 'docs', 'firestore.rules'), 'utf8');
const RULE_MAX = Number((/score <= (\d+)/.exec(rules) || [])[1]);
const RULE_KEYS = [...(/hasOnly\(\[([^\]]*)\]\)/.exec(rules) || [, ''])[1].matchAll(/'(\w+)'/g)].map((m) => m[1]);

test('aturan Firestore: batas skor sama dengan klien dan cukup untuk total semua level', () => {
  assert.equal(RULE_MAX, 1000000);
  assert.ok(Scores._build('math-hero', 'mh2', 'ANA', RULE_MAX));
  assert.equal(Scores._build('math-hero', 'mh2', 'ANA', RULE_MAX + 1), null);
  // Skor dikirim = total skor terbaik semua level. Perkiraan longgar: tidak ada level yang bernilai di atas 10.000 poin
  // (skor dasar ratusan, bonus waktu paling banyak 200). Total jauh di bawah batas, jadi aturan tidak perlu dipublikasikan ulang.
  const PER_LEVEL_CEILING = 10000;
  assert.equal(ALL_LEVELS.length, 30);
  assert.equal(MH3_LEVELS.length, 20);
  assert.ok(ALL_LEVELS.length * PER_LEVEL_CEILING <= RULE_MAX / 3);
  assert.ok(MH3_LEVELS.length * PER_LEVEL_CEILING <= RULE_MAX / 3);
  for (const id of ['mh1', 'mh2', 'mh3']) assert.ok(TB.GAMES[id].base < PER_LEVEL_CEILING);
});

test('dokumen skor MH2/MH3 (nama, bidang meta baru) lolos klien dan memakai bidang yang diizinkan aturan', async () => {
  assert.deepEqual([...RULE_KEYS].sort(), ['appId', 'board', 'createdAt', 'meta', 'name', 'score']);
  const store = [];
  Scores._setBackend({ add: async (d) => { store.push(d); }, query: async () => [] });
  for (const board of ['mh2', 'mh3']) {
    assert.equal(await Scores.submit('math-hero', board, 'ANA', 12345.7, { level: '1-1', hero: 'hero2', stars: 31 }), true);
  }
  assert.equal(store.length, 2);
  for (const d of store) {
    assert.ok(Object.keys(d).every((k) => RULE_KEYS.includes(k)), 'bidang di luar aturan: ' + Object.keys(d));
    assert.ok(Number.isInteger(d.score) && d.score >= 0 && d.score <= RULE_MAX);
    assert.ok(Object.keys(d.meta).length <= 8);
    assert.equal(d.meta.hero, 'hero2'); assert.equal(d.meta.stars, 31);
  }
  assert.match(rules, /meta\.size\(\) <= 8/);
});

test('pembuat baris Papan Juara: pahlawan dari meta, atau tetap berdasarkan nama bila tidak ada', () => {
  const J = require('../public/shared/js/juara.js');
  const M = { HEROES: [{ key: 'pinki' }, { key: 'owi' }, { key: 'dudu' }] };
  assert.equal(J.heroFor(M, { name: 'ANA', hero: 'owi' }), 'owi');
  assert.equal(J.heroFor(M, { name: 'ANA', hero: 'tidak-ada' }), J.heroFor(M, { name: 'ANA' }));
  assert.equal(J.heroFor(M, { name: 'BUDI' }), J.heroFor(M, { name: 'BUDI' }));
  const rows = J.fromShared([{ name: 'X', score: 5, meta: { hero: 'dudu', stars: 3 } }, { name: 'Y', score: 4, meta: {} }]);
  assert.deepEqual(rows[0], { name: 'X', score: 5, hero: 'dudu', stars: 3 });
  assert.equal(rows[1].stars, undefined);
  const save = { slots: () => [{ nama: 'ANA', hero: 'owi' }, null, { nama: 'BOB', hero: 'pinki' }, { nama: 'NOL', hero: 'pinki' }], totalScore: (p) => ({ ANA: 50, BOB: 90, NOL: 0 }[p.nama]), totalStars: () => 1 };
  const local = J.fromLocal({ save });
  assert.deepEqual(local.map((r) => r.name), ['BOB', 'ANA'], 'urut skor, tanpa skor 0');
});
