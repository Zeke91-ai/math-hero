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

  // Tujuh level Kejar lagi (ref 2..8). Pola: tanah dengan jurang <= 3 kolom, bukit 1 tile, jembatan di atas jurang,
  // musuh jalan, duri, dan dua peti PR (P = Peti Kekuatan, K = Peti Kristal) yang tidak menghalangi jalan.
  function level2() {
    const b = build(112);
    b.ground(0, 19).ground(23, 40).ground(44, 63).ground(67, 92).ground(96, 111);
    b.put(2, 0, 'S').put(6, 0, '*').put(7, 0, '*').put(8, 0, '*').put(12, 0, 'e');
    b.isle(14, 15, 1).put(18, 0, '*');
    b.plat(20, 22, 2).put(21, 2, '*'); // jembatan di atas jurang pertama
    b.put(25, 0, 'c').put(28, 0, 'e').put(33, 0, '^').put(34, 0, '^').put(36, 0, '*').put(37, 0, '*');
    b.plat(41, 43, 3).put(42, 3, '*'); // jembatan di atas jurang kedua
    b.put(46, 0, 'e').put(50, 0, '*');
    b.put(53, 0, 'P'); // Peti Kekuatan di atas bukit kecil
    b.put(56, 0, 'c').put(59, 0, '^').put(60, 0, '^');
    b.plat(64, 66, 2).put(65, 2, '*'); // jembatan di atas jurang ketiga
    b.put(70, 0, 'e').put(74, 0, '*').put(75, 0, '*');
    b.isle(78, 80, 2);
    b.put(84, 0, '^').put(85, 0, '^');
    b.plat(93, 95, 2).put(94, 2, '*'); // jembatan di atas jurang keempat
    b.put(98, 0, 'c').put(101, 0, 'e').put(104, 0, '*');
    b.put(107, 0, 'K'); // Peti Kristal di atas bukit terakhir
    b.put(111, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level3() {
    const b = build(116);
    b.ground(0, 17).ground(21, 37).ground(41, 60).ground(64, 84).ground(88, 115);
    b.put(2, 0, 'S').put(5, 0, '*').put(6, 0, '*').put(9, 0, 'e').put(13, 0, '^').put(14, 0, '^');
    b.plat(18, 20, 2).put(19, 2, '*');
    b.isle(24, 25, 1).put(26, 0, 'e').put(30, 0, '*').put(31, 0, '*');
    b.put(33, 0, 'c').put(35, 0, 'e').put(36, 0, '^');
    b.plat(38, 40, 3).put(39, 3, '*');
    b.put(44, 0, 'e').put(47, 0, '*').put(50, 0, 'e').put(53, 0, '^').put(54, 0, '^');
    b.put(57, 0, 'P');
    b.put(66, 0, 'c').put(68, 0, '*').put(69, 0, '*').put(70, 0, 'e');
    b.plat(61, 63, 2).put(62, 2, '*');
    b.isle(74, 76, 2).put(75, 2, '*');
    b.put(79, 0, 'e').put(82, 0, '^').put(83, 0, '^');
    b.plat(85, 87, 2).put(86, 2, '*');
    b.put(92, 0, 'e').put(96, 0, 'c').put(99, 0, '*').put(100, 0, '*').put(103, 0, 'e').put(106, 0, '^');
    b.put(109, 0, 'K');
    b.put(115, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level4() {
    const b = build(118);
    b.ground(0, 15).ground(19, 36).ground(40, 58).ground(62, 80).ground(84, 117);
    b.put(2, 0, 'S').put(7, 0, '*').put(8, 0, '*').put(11, 0, 'e');
    b.plat(16, 18, 2).put(17, 2, '*');
    b.put(22, 0, 'c').put(24, 0, 'e').put(27, 0, '^').put(28, 0, '^').put(30, 0, '*');
    b.isle(32, 34, 2).put(33, 2, '*');
    b.plat(37, 39, 3).put(38, 3, '*');
    b.put(43, 0, 'e').put(46, 0, '*').put(49, 0, 'e').put(52, 0, '^').put(53, 0, '^').put(55, 0, 'e');
    b.put(58, 0, 'P');
    b.plat(61, 63, 2).put(62, 2, '*');
    b.put(66, 0, 'c').put(69, 0, 'e').put(72, 0, '*').put(73, 0, '*').put(76, 0, '^').put(77, 0, '^');
    b.isle(79, 81, 1);
    b.put(86, 0, 'e').put(90, 0, '*').put(94, 0, 'c').put(97, 0, 'e').put(100, 0, '^');
    b.plat(102, 104, 3).put(103, 3, '*');
    b.put(107, 0, 'K');
    b.put(117, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level5() {
    const b = build(120);
    b.ground(0, 19).ground(23, 39).ground(43, 62).ground(66, 86).ground(90, 119);
    b.put(2, 0, 'S').put(6, 0, '*').put(10, 0, 'e').put(15, 0, '^').put(16, 0, '^');
    b.plat(20, 22, 2).put(21, 2, '*');
    b.isle(26, 27, 1).put(29, 0, 'e').put(33, 0, '*');
    b.put(35, 0, 'c').put(37, 0, 'e').put(40, 0, '*').put(41, 0, '*');
    b.plat(43, 45, 2).put(44, 2, '*'); // jembatan kabut tingkat satu (kabut tipis, tidak ada rintangan)
    b.isle(47, 49, 2).put(48, 2, '*');
    b.put(52, 0, 'e').put(55, 0, '^').put(56, 0, '^').put(59, 0, 'e');
    b.plat(64, 66, 3).put(65, 3, '*');
    b.put(71, 0, 'P');
    b.put(75, 0, 'c').put(78, 0, 'e').put(81, 0, '*').put(82, 0, '*').put(84, 0, 'e');
    b.isle(92, 94, 1);
    b.put(96, 0, '^').put(97, 0, '^').put(100, 0, 'e').put(104, 0, '*');
    b.plat(108, 110, 2).put(109, 2, '*');
    b.put(113, 0, 'K');
    b.put(119, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level6() {
    const b = build(120);
    b.ground(0, 16).ground(20, 37).ground(41, 61).ground(65, 85).ground(89, 119);
    b.put(2, 0, 'S').put(5, 0, '*').put(9, 0, 'e').put(12, 0, '^').put(13, 0, '^');
    b.plat(17, 19, 2).put(18, 2, '*');
    b.put(23, 0, 'e').put(25, 0, 'c').put(29, 0, '*').put(30, 0, 'e');
    b.isle(32, 33, 1).put(33, 1, '*');
    b.plat(38, 40, 3).put(39, 3, '*');
    b.put(44, 0, 'e').put(46, 0, '^').put(47, 0, '^').put(51, 0, 'e').put(55, 0, '*');
    b.put(58, 0, 'P');
    b.plat(62, 64, 2).put(63, 2, '*');
    b.put(68, 0, 'e').put(71, 0, 'c').put(74, 0, '*').put(77, 0, 'e').put(80, 0, '^').put(81, 0, '^');
    b.plat(82, 84, 3).put(83, 3, '*');
    b.put(88, 0, 'e').put(92, 0, '*').put(95, 0, 'e').put(98, 0, '^');
    b.put(101, 0, 'K');
    b.put(106, 0, 'e').put(109, 0, 'c').put(112, 0, '*');
    b.put(119, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level7() {
    const b = build(122);
    b.ground(0, 14).ground(18, 35).ground(39, 58).ground(62, 83).ground(87, 121);
    b.put(2, 0, 'S').put(6, 0, '*').put(8, 0, 'e');
    // Tangga awan: bukit naik lalu turun.
    b.isle(11, 13, 1).put(12, 1, '*');
    b.plat(18, 20, 2).put(19, 2, '*');
    b.put(23, 0, 'e').put(26, 0, 'c').put(28, 0, '^').put(29, 0, '^').put(31, 0, '*');
    b.put(34, 0, 'P');
    b.plat(39, 41, 3).put(40, 3, '*');
    b.put(45, 0, 'e').put(48, 0, '*').put(50, 0, 'e').put(53, 0, '^');
    b.isle(56, 58, 1);
    b.plat(62, 64, 2).put(63, 2, '*');
    b.put(68, 0, 'e').put(71, 0, 'c').put(74, 0, '*').put(77, 0, 'e').put(80, 0, '^');
    b.plat(84, 86, 3).put(85, 3, '*');
    b.put(90, 0, 'e').put(94, 0, '*').put(97, 0, 'e').put(100, 0, '^').put(101, 0, '^');
    b.put(105, 0, 'K');
    b.put(110, 0, 'e').put(113, 0, 'c').put(116, 0, '*');
    b.put(121, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }

  function level8() {
    const b = build(124);
    b.ground(0, 13).ground(17, 34).ground(38, 57).ground(61, 81).ground(85, 123);
    b.put(2, 0, 'S').put(5, 0, '*').put(7, 0, 'e').put(10, 0, '^').put(11, 0, '^');
    b.plat(15, 17, 2).put(16, 2, '*');
    b.put(21, 0, 'e').put(23, 0, 'c').put(26, 0, '*').put(29, 0, 'e');
    b.isle(31, 33, 1).put(32, 1, '*');
    b.plat(36, 38, 3).put(37, 3, '*');
    b.put(42, 0, 'e').put(44, 0, '^').put(45, 0, '^').put(48, 0, 'e').put(52, 0, '*');
    b.put(56, 0, 'P');
    b.plat(60, 62, 2).put(61, 2, '*');
    b.put(66, 0, 'e').put(69, 0, 'c').put(72, 0, '*').put(75, 0, 'e').put(78, 0, '^');
    b.plat(81, 83, 3).put(82, 3, '*');
    b.put(88, 0, 'e').put(91, 0, '*').put(94, 0, 'e').put(97, 0, '^').put(98, 0, '^');
    b.put(101, 0, 'K');
    b.put(106, 0, 'e').put(110, 0, 'c').put(113, 0, '*').put(116, 0, 'e');
    b.put(123, 0, 'E'); // ujung tanah, tidak bisa dilompati
    return b.map();
  }


  // Level panjang: 4 bagian disambung (asli, dua potongan level lain, asli) supaya anak butuh sekitar 2-3 menit.
  // Awal dan akhir tiap peta adalah tanah datar, jadi sambungan aman. S hanya di bagian pertama, E dan K di bagian
  // terakhir, P di bagian pertama (dua Peti PR tetap). Tiap sambungan diberi checkpoint.
  function compose(own, o1, o2) {
    const strip = (m, chars) => m.map((r) => r.replace(new RegExp('[' + chars + ']', 'g'), '.'));
    const parts = [strip(own, 'EK'), strip(o1, 'SEPK'), strip(o2, 'SEPK'), strip(own, 'SPK')];
    const rows = own.length;
    const out = Array.from({ length: rows }, () => '');
    const joins = [];
    parts.forEach((m, i) => {
      if (i) joins.push(out[0].length + 3);
      for (let r = 0; r < rows; r++) out[r] += m[r];
    });
    const rk = GROUND - 1, kc = out[0].length - 4; // Peti Kristal di tanah datar tepat sebelum tujuan
    out[rk] = out[rk].slice(0, kc) + 'K' + out[rk].slice(kc + 1);
    // Checkpoint di tanah datar dekat sambungan: ambil kolom pertama yang kosong dengan tanah datar 3 kolom di kiri-kanannya.
    for (const j of joins) {
      const r = GROUND - 1, flat = (c) => out[GROUND][c] === '#' && out[r][c] === '.' && out[r - 1][c] === '.';
      for (let c = j; c < j + 40; c++) {
        if (![-3, -2, -1, 0, 1, 2, 3].every((d) => flat(c + d))) continue;
        out[r] = out[r].slice(0, c) + 'c' + out[r].slice(c + 1);
        break;
      }
    }
    return out;
  }

  const BASE = [level1(), level2(), level3(), level4(), level5(), level6(), level7(), level8()];
  const LONG = BASE.map((m, i) => compose(m, BASE[(i + 1) % BASE.length], BASE[(i + 3) % BASE.length]));

  const LEVELS = [
    { id: 1, nama: 'Jejak di Padang', tema: 'padang', map: LONG[0] },
    { id: 2, nama: 'Kejar Lewat Bukit', tema: 'padang', map: LONG[1] },
    { id: 3, nama: 'Jalan Kristal', tema: 'gua', map: LONG[2] },
    { id: 4, nama: 'Jurang Berkilau', tema: 'gua', map: LONG[3] },
    { id: 5, nama: 'Jembatan Kabut', tema: 'kebun', map: LONG[4] },
    { id: 6, nama: 'Rawa Dalam', tema: 'kebun', map: LONG[5] },
    { id: 7, nama: 'Tangga Awan', tema: 'langit', map: LONG[6] },
    { id: 8, nama: 'Menara Petir', tema: 'langit', map: LONG[7] },
  ];
  return { ROWS, LEVELS, build, level: (id) => LEVELS.find((l) => l.id === id) };
});
