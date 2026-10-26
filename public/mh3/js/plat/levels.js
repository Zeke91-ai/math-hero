// Math Hero 3: level Kejar. Tiap level = { id, nama, tema, map:[...] } (lihat sim.js untuk kode peta).
// Pembangun kecil di bawah menyusun peta dari perintah supaya mudah dibuat dan tidak salah ketik.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.MH3 = root.MH3 || {}).platLevels = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const ROWS = 14, GROUND = 11; // baris tanah pertama

  function build(cols) {
    const g = Array.from({ length: ROWS }, () => Array(cols).fill('.'));
    const api = {
      ground(c0, c1) { for (let c = c0; c <= c1; c++) for (let r = GROUND; r < ROWS; r++) g[r][c] = '#'; return api; },
      // pulau padat dengan permukaan k tile di atas tanah
      isle(c0, c1, k) { for (let c = c0; c <= c1; c++) for (let r = GROUND - k; r < ROWS; r++) g[r][c] = '#'; return api; },
      plat(c0, c1, k) { for (let c = c0; c <= c1; c++) g[GROUND - k][c] = '='; return api; },
      // k = tinggi permukaan di bawah benda (0 = tanah)
      put(c, k, ch) { g[GROUND - k - 1][c] = ch; return api; },
      map() { return g.map((r) => r.join('')); },
    };
    return api;
  }

  function level1() {
    const b = build(108);
    b.ground(0, 24).ground(28, 47).ground(51, 70).ground(74, 107);
    b.put(2, 0, 'S').put(10, 0, '*').put(11, 0, '*').put(12, 0, '*').put(17, 0, 'e').put(21, 0, '*');
    b.plat(24, 26, 2).put(25, 2, '*'); // jembatan di atas jurang pertama
    b.put(30, 0, 'c').put(34, 0, 'e').put(37, 0, '^').put(38, 0, '^').put(42, 0, 'e');
    b.isle(38, 41, 0); b.isle(44, 46, 2).put(45, 2, 'P'); // Peti Kekuatan di atas pulau, boleh dilewati
    b.plat(47, 49, 3).put(48, 3, '*'); // jembatan di atas jurang kedua
    b.put(54, 0, '*').put(55, 0, '*').put(58, 0, 'e').put(62, 0, 'c').put(65, 0, 'e').put(68, 0, '*');
    b.plat(70, 72, 2).put(71, 2, '*');
    b.put(78, 0, 'e').put(84, 0, '^').put(85, 0, '^').put(90, 0, 'e').put(94, 0, '*').put(95, 0, '*').put(96, 0, '*');
    b.isle(98, 101, 1).put(100, 1, 'K'); // Peti Kristal di ujung, boleh dilewati
    b.put(105, 0, 'E');
    return b.map();
  }

  const LEVELS = [
    { id: 1, nama: 'Jejak di Padang', tema: 'padang', map: level1() },
  ];
  return { ROWS, LEVELS, build, level: (id) => LEVELS.find((l) => l.id === id) };
});
