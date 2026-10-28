// Math Hero 3: Kejar tanpa batas. Putaran demi putaran dibuat level generator kit (seed per putaran), hati tidak
// pernah pulih, dan tingkat level serta tingkat pelajaran naik terus sampai hati habis. Murni logika (diuji di Node).
//   Endless.plan(round, runSeed) -> opsi untuk Gen.generate;  Endless.level(round, runSeed) -> definisi level Kejar
//   Endless.lesson(round, grade0) -> { grade, tier } untuk kartu PR;  Endless.roundScore(...) -> skor satu putaran
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../shared/js/levelgen.js'));
  else (root.MH3 = root.MH3 || {}).endless = factory(root.MHKit.levelgen);
})(typeof self !== 'undefined' ? self : this, function (Gen) {
  const HEARTS = 5;           // hati awal; tidak bisa bertambah
  const WRONG_MAX = 2;        // jawaban salah di satu kartu paling banyak memotong sekian hati
  const BOARD = 'mh3-kejar';
  const MECH = ['tangga', 'gerak', 'per', 'rapuh', 'kotak', 'tuas', 'pipa', 'lift', 'samping', 'saklar', 'gergaji', 'gergaji_gerak'];
  const FOES = ['e', 'a', 'f', 'r', 'n'];
  const THEMES = ['padang', 'gua', 'kebun', 'langit'];
  const nMech = (r) => Math.min(MECH.length, r + 1);

  const tier = (r) => Math.min(3, Math.floor((r - 1) / 2));
  // Seed putaran: dari seed permainan, jadi satu permainan bisa diulang persis dengan {seed}.
  const seedFor = (runSeed, r) => ((Math.imul(runSeed >>> 0, 2654435761) + r * 7919) >>> 0) % 900000 + 1;

  function plan(r, runSeed) {
    const m = nMech(r);
    return {
      seed: seedFor(runSeed, r), tier: tier(r), tema: THEMES[Math.floor((r - 1) / 2) % THEMES.length],
      mech: MECH.slice(0, m), intro: MECH.slice(r === 1 ? 0 : nMech(r - 1), m),
      foes: FOES.slice(0, Math.min(FOES.length, 2 + Math.floor((r - 1) / 2))),
      quiz: Math.min(3, 1 + Math.floor((r - 1) / 4)), sec: Math.min(160, 70 + 8 * (r - 1)),
    };
  }
  function level(r, runSeed) {
    const o = plan(r, runSeed), d = Gen.generate(o);
    return { id: r, nama: 'Putaran ' + r, tema: o.tema, tier: o.tier, seed: d.seed, map: d.map, inside: d.inside, rooms: d.rooms };
  }
  // Pelajaran naik satu langkah tiap putaran: tingkat 0-3 di tiap kelas, lalu kelas berikutnya (sampai kelas 5 tingkat 3).
  function lesson(r, grade0) {
    const k = Math.min(15, (Math.max(2, Math.min(5, grade0 | 0)) - 2) * 4 + (r - 1));
    return { grade: 2 + Math.floor(k / 4), tier: k % 4 };
  }
  const roundScore = (r, stars, bonus) => 100 + 20 * r + 10 * Math.max(0, stars | 0) + Math.max(0, bonus | 0);
  const newRunSeed = () => (Math.floor(Math.random() * 900000) + 1);

  return { HEARTS, WRONG_MAX, BOARD, MECH, plan, level, lesson, seedFor, tier, roundScore, newRunSeed };
});
