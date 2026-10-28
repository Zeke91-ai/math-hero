// Math Hero 3: level Kejar. Tiap level = { id, nama, tema, tier, map:[...], inside:[...] } (lihat sim.js untuk kode peta).
// Peta dibuat oleh level generator kit (public/shared/js/levelgen.js, spesifikasi public/shared/LEVELGEN.md) dengan
// seed tetap, jadi level yang dimainkan anak selalu sama. Seed dipilih supaya lulus pemeriksa level
// (npm run test:levels). Mengganti seed atau isi pustaka ruang = level berubah; jalankan tes lagi.
// Tiap level mengenalkan paling banyak 2 mekanik baru (intro); mekanik level sebelumnya boleh muncul lagi (mech).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('../../../shared/js/levelgen.js'));
  else (root.MH3 = root.MH3 || {}).platLevels = factory(root.MHKit.levelgen);
})(typeof self !== 'undefined' ? self : this, function (Gen) {
  const M1 = ['tangga', 'per'], M2 = M1.concat('kotak', 'tuas'), M3 = M2.concat('pipa', 'lift'), M4 = M3.concat('gerak');
  const M5 = M4.concat('rapuh', 'samping'), M6 = M5.concat('gergaji'), M7 = M6.concat('gergaji_gerak');
  const PLAN = [
    { id: 1, nama: 'Jejak di Padang', tema: 'padang', gen: { tier: 0, intro: ['tangga', 'per'], mech: [], quiz: 1, sec: 190, seed: 101 } },
    { id: 2, nama: 'Kejar Lewat Bukit', tema: 'padang', gen: { tier: 0, intro: ['kotak'], mech: M1.concat('tuas'), quiz: 1, sec: 190, seed: 201 } },
    { id: 3, nama: 'Jalan Kristal', tema: 'gua', gen: { tier: 1, intro: ['pipa', 'lift'], mech: M2, quiz: 2, sec: 180, seed: 301 } },
    { id: 4, nama: 'Jurang Berkilau', tema: 'gua', gen: { tier: 1, intro: ['tuas', 'gerak'], mech: M3, quiz: 2, sec: 180, seed: 401 } },
    { id: 5, nama: 'Jembatan Kabut', tema: 'kebun', gen: { tier: 2, intro: ['rapuh', 'samping'], mech: M4, quiz: 2, sec: 185, seed: 501 } },
    { id: 6, nama: 'Rawa Dalam', tema: 'kebun', gen: { tier: 2, intro: ['gergaji'], mech: M5, quiz: 2, sec: 185, seed: 601 } },
    { id: 7, nama: 'Tangga Awan', tema: 'langit', gen: { tier: 3, intro: ['gergaji_gerak'], mech: M6, quiz: 2, sec: 170, seed: 701 } },
    { id: 8, nama: 'Menara Petir', tema: 'langit', gen: { tier: 3, intro: [], mech: M7, quiz: 2, sec: 170, seed: 801 } },
  ];
  const LEVELS = PLAN.map((p) => {
    const d = Gen.generate(Object.assign({ tema: p.tema }, p.gen));
    return { id: p.id, nama: p.nama, tema: p.tema, tier: p.gen.tier, seed: d.seed, map: d.map, inside: d.inside, rooms: d.rooms };
  });
  return { PLAN, LEVELS, level: (id) => LEVELS.find((l) => l.id === id) };
});
