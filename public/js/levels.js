// Data level Math Hero: pembangun level (DSL) dan 8 level. Dipakai game (browser) dan bot pemeriksa (Node).
// Koordinat: c = kolom tile, k = tinggi permukaan di atas tanah (k=0 tanah). Tile 32 px.
// put(c,k,'*') menaruh benda di sel tepat di atas permukaan setinggi k.
// Kode benda: S awal, E trofi tujuan, c bendera checkpoint, * bintang, $ bintang rahasia, h buah penyembuh,
// ? peti soal, ^ duri, o gergaji, a kaktus, b robot, f terbang, r tong penyeruduk, n/N meriam (kiri/kanan).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Levels = factory();
})(this, function () {
  const T = 32;

  function Builder(o) {
    this.cols = o.cols;
    this.rows = o.rows || 24;
    this.R = o.R !== undefined ? o.R : this.rows - 6;
    this.tiles = new Uint8Array(this.cols * this.rows);
    this.meta = o;
    this.e = {
      stars: [], secrets: [], hearts: [], crates: [], gates: [], enemies: [], spikes: [], saws: [], cannons: [],
      checkpoints: [], movers: [], crumbles: [], pilih: [], bridges: [], deko: [], hints: [], start: null, goal: null, boss: null,
    };
  }
  const P = Builder.prototype;

  P.set = function (c, r, v) {
    if (c >= 0 && c < this.cols && r >= 0 && r < this.rows) this.tiles[r * this.cols + c] = v;
  };
  // Tanah padat dari permukaan (baris R) sampai dasar level.
  P.ground = function (c0, c1) {
    for (let c = c0; c <= c1; c++) for (let r = this.R; r < this.rows; r++) this.set(c, r, 1);
  };
  // Pulau padat dengan permukaan setinggi k (boleh negatif), turun sampai dasar level.
  P.isle = function (c0, c1, k) {
    for (let c = c0; c <= c1; c++) for (let r = this.R - k; r < this.rows; r++) this.set(c, r, 1);
  };
  // Langit-langit gua: n baris padat dari atas.
  P.ceil = function (c0, c1, n) {
    for (let c = c0; c <= c1; c++) for (let r = 0; r < n; r++) this.set(c, r, 1);
  };
  // Hapus tanah (jurang) dari kolom c0 sampai c1.
  P.pit = function (c0, c1) {
    for (let c = c0; c <= c1; c++) for (let r = 0; r < this.rows; r++) this.set(c, r, 0);
  };
  // Balok padat: permukaan setinggi k, tebal h tile ke bawah.
  P.block = function (c, k, w, h) {
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.set(c + i, this.R - k + j, 1);
  };
  // Platform tembus dari bawah, lebar w tile.
  P.plat = function (c, k, w) {
    for (let i = 0; i < w; i++) this.set(c + i, this.R - k, 2);
  };
  P.cell = function (c, k) { return { c, r: this.R - k - 1, x: c * T + T / 2, y: (this.R - k - 1) * T + T / 2, fy: (this.R - k) * T }; };

  P.put = function (c, k, ch, o) {
    o = o || {};
    const p = this.cell(c, k);
    const e = this.e;
    switch (ch) {
      case 'S': e.start = { x: p.x, y: p.fy }; break;
      case 'E': e.goal = { x: p.x, y: p.fy }; break;
      case 'c': e.checkpoints.push({ x: p.x, y: p.fy }); break;
      case '*': e.stars.push({ x: p.x, y: p.y, got: false }); break;
      case '$': e.secrets.push({ x: p.x, y: p.y, got: false }); break;
      case 'h': e.hearts.push({ x: p.x, y: p.y, got: false }); break;
      case '?': e.crates.push({ x: p.x, y: p.fy, op: o.op || 'add', lv: o.lv || this.meta.lv, done: false }); break;
      case '^': e.spikes.push({ x: p.c * T, y: p.fy - 14, w: T, h: 14 }); break;
      case 'o': e.saws.push({ x: p.x, y: p.fy - 16, range: (o.range || 0) * T, speed: o.speed || 0.4, x0: p.x }); break;
      case 'n': case 'N': e.cannons.push({ x: p.x, y: p.fy, dir: ch === 'N' ? 1 : -1, t: o.phase || 0 }); break;
      case 'a': case 'b': case 'r':
        e.enemies.push({ type: ch, x: p.x, y: p.fy, dir: o.dir || -1 }); break;
      case 'f': e.enemies.push({ type: 'f', x: p.x, y: p.y, range: (o.range || 3) * T, speed: o.speed || 0.35 }); break;
      default: throw new Error('kode benda tidak dikenal: ' + ch);
    }
  };
  P.row = function (c0, c1, k, ch) { for (let c = c0; c <= c1; c++) this.put(c, k, ch); };

  // Tumpukan peti penghalang jalan. h = tinggi (jumlah peti), w = lebar tile.
  P.gate = function (c, k, h, o) {
    this.e.gates.push({ x: c * T, y: (this.R - k - h) * T, w: (o.w || 1) * T, h: h * T, op: o.op, lv: o.lv || this.meta.lv, open: false });
  };
  // Jembatan di atas jurang: tiap jawaban benar memasang satu bagian (len tile dibagi rata ke parts bagian).
  P.bridge = function (c, k, len, o) {
    const parts = o.parts || 3;
    this.e.bridges.push({ x: c * T, y: (this.R - k) * T, len, parts, op: o.op, lv: o.lv || this.meta.lv, built: 0, nama: o.nama || 'Jembatan' });
  };
  // Platform bergerak. axis 'x' atau 'y'; range dalam tile; speed putaran per detik.
  P.mover = function (c, k, w, o) {
    this.e.movers.push({ x: c * T, y: (this.R - k) * T, w: w * T, axis: o.axis || 'x', range: (o.range || 3) * T, speed: o.speed || 0.25, phase: o.phase || 0 });
  };
  // Papan rapuh: jatuh sebentar setelah diinjak lalu muncul lagi.
  P.crumble = function (c, k, w) {
    for (let i = 0; i < w; i++) this.e.crumbles.push({ x: (c + i) * T, y: (this.R - k) * T });
  };
  // Platform pilih jawaban: tiap tile memuat satu angka, hanya satu yang benar.
  P.pilih = function (cols, k, o) {
    this.e.pilih.push({ cols, w: o.w || 3, y: (this.R - k) * T, op: o.op, lv: o.lv || this.meta.lv });
  };
  P.deko = function (c, k, img, h, o) {
    o = o || {};
    this.e.deko.push({ img, x: c * T + T / 2, y: (this.R - k) * T, h, bob: !!o.bob, flip: !!o.flip });
  };
  P.hint = function (c, k, text) {
    const p = this.cell(c, k);
    this.e.hints.push({ x: p.x, y: p.fy, text });
  };
  // Bos: kind 'dino' | 'robot' | 'meriam' | 'raja'. a0 = kolom awal arena (dinding menutup di sana).
  P.boss = function (c, k, o) {
    const p = this.cell(c, k);
    this.e.boss = Object.assign({ x: p.x, y: p.fy }, o);
  };

  P.build = function () {
    const m = this.meta;
    return Object.assign({
      id: m.id, nama: m.nama, tema: m.tema, bg: m.bg, waktu: m.waktu, lv: m.lv, musik: m.musik || 'normal',
      cerita: m.cerita || [], tip: m.tip || null, cols: this.cols, rows: this.rows, R: this.R, tiles: this.tiles,
      width: this.cols * T, height: this.rows * T,
    }, this.e);
  };

  // ---------- LEVEL 1: Lembah Awan (tutorial, penjumlahan kecil) ----------
  function level1() {
    const b = new Builder({
      id: 1, cols: 104, nama: 'Lembah Awan', tema: 'grassA', bg: 'meadow', waktu: 'siang', lv: 1, musik: 'siang',
      cerita: ['Peri Awan kehilangan Bintang Hitung.', 'Bantu dia mengumpulkan pecahannya!'],
      tip: 'Tips: LOMPAT bisa 2x! Tekan lagi saat di udara.',
    });
    b.ground(0, 27);
    b.put(3, 0, 'S');
    b.hint(5, 0, 'Geser joystick untuk berjalan');
    b.row(8, 10, 0, '*');
    b.hint(12, 0, 'Tekan LOMPAT untuk melompat\nDi udara, tekan LOMPAT lagi: 2x!');
    b.block(14, 1, 2, 1); b.put(14, 1, '*'); b.put(15, 1, '*');
    b.block(18, 2, 2, 2); b.put(18, 2, '*'); b.put(19, 2, '*');
    b.hint(21, 0, 'Tekan B di dekat peti soal');
    b.put(23, 0, '?', { op: 'add', lv: 1 });
    b.hint(26, 0, 'Lompati jurang!');
    b.row(28, 30, 2, '*');
    b.ground(31, 103);
    b.put(33, 0, 'c');
    b.hint(35, 0, 'Injak musuh dari atas!');
    b.put(38, 0, 'a');
    b.plat(43, 3, 4); b.put(44, 3, '*'); b.put(45, 3, '*');
    b.put(49, 0, '^'); b.put(50, 0, '^'); b.put(53, 0, 'h');
    // Latihan lompat ganda: tiga bintang tinggi (6 tile) yang hanya terjangkau dengan lompat 2x. Opsional.
    b.hint(56, 0, 'Bintang tinggi! Lompat, lalu tekan\nLOMPAT lagi di udara (2x)');
    b.row(55, 57, 6, '*');
    // Jurang kedua dengan satu pijakan di tengah.
    b.pit(59, 62);
    b.plat(60, 1, 2);
    b.hint(65, 0, 'Tumpukan peti: jawab soal untuk membukanya');
    b.gate(68, 0, 3, { op: 'add', lv: 1 });
    b.put(72, 0, '?', { op: 'add', lv: 1 });
    b.plat(74, 2, 3); b.plat(78, 4, 3); b.put(79, 4, '$');
    b.put(84, 0, '?', { op: 'add', lv: 1 });
    b.hint(86, 0, 'Pilih platform dengan jawaban yang benar');
    b.pilih([88, 92, 96], 3, { op: 'add', lv: 1 });
    b.put(101, 0, 'E');
    b.deko(10, 0, 'apple', 40); b.deko(34, 0, 'chick', 36, { bob: true }); b.deko(47, 4, 'bee', 30, { bob: true });
    b.deko(70, 0, 'banana', 40); b.deko(81, 0, 'chick', 34, { bob: true }); b.deko(98, 0, 'cherry', 40);
    return b.build();
  }

  // ---------- LEVEL 2: Hutan Pelangi (bukit, lebah kotak, papan rapuh, jembatan, platform gerak, bos naga) ----------
  function level2() {
    const b = new Builder({
      id: 2, cols: 134, rows: 28, nama: 'Hutan Pelangi', tema: 'grassB', bg: 'forest', waktu: 'maghrib', lv: 2, musik: 'maghrib',
      cerita: ['Jembatan pelangi di hutan itu rusak.', 'Naga Kabut menjaga ujung hutan!'],
    });
    b.ground(0, 46);
    b.put(3, 0, 'S');
    b.row(7, 9, 0, '*');
    b.block(11, 1, 3, 1); b.block(14, 2, 3, 2); b.block(17, 3, 3, 3); b.block(20, 2, 3, 2);
    b.put(12, 1, '*'); b.put(15, 2, '*'); b.put(18, 3, '*');
    b.put(24, 0, '?', { op: 'add', lv: 2 });
    b.put(27, 0, 'c');
    b.hint(29, 0, 'Lebah kotak terbang bolak-balik!');
    b.put(32, 2, 'f', { range: 3 });
    b.put(35, 0, 'b');
    b.plat(37, 3, 3); b.plat(41, 5, 3); b.plat(45, 7, 3);
    b.put(38, 3, '*'); b.put(42, 5, '*'); b.put(46, 7, '$');
    b.put(40, 0, '^'); b.put(41, 0, '^');
    b.put(44, 0, '?', { op: 'mul', lv: 2 });
    b.hint(45, 0, 'Papan rapuh jatuh. Lari terus!');
    b.crumble(47, 0, 4);
    b.ground(51, 78);
    b.put(55, 0, 'a'); b.put(58, 0, 'h'); b.put(60, 0, 'b', { dir: 1 }); b.put(64, 2, 'f', { range: 2.5 });
    b.hint(66, 0, 'Pecahkan tumpukan peti dengan soal');
    b.gate(69, 0, 3, { op: 'mul', lv: 2 });
    b.put(73, 0, 'c');
    b.put(76, 0, '?', { op: 'add', lv: 2 });
    b.hint(77, 0, 'Jawab soal untuk memasang jembatan');
    b.bridge(79, 0, 10, { parts: 3, op: 'susun', lv: 2, nama: 'Jembatan Pelangi' });
    b.ground(89, 106);
    b.put(92, 0, 'a'); b.put(97, 2, 'f', { range: 3 }); b.put(101, 0, 'b');
    b.hint(104, 0, 'Naiki platform yang bergerak');
    b.mover(109, 0, 3, { axis: 'x', range: 1.5, speed: 0.2 });
    b.ground(114, 133);
    b.put(116, 0, 'c');
    b.put(119, 0, '?', { op: 'mul', lv: 2 });
    b.hint(121, 0, 'Naga Kabut ada di depan!');
    b.boss(128, 0, { kind: 'dino', nama: 'Naga Kabut', hp: 3, a0: 122, op: 'mul', lv: 2 });
    b.put(132, 0, 'E');
    b.deko(14, 4, 'bee', 30, { bob: true }); b.deko(30, 0, 'strawberry', 34); b.deko(52, 0, 'pineapple', 52);
    b.deko(67, 0, 'chick', 34, { bob: true }); b.deko(98, 0, 'banana', 40); b.deko(113, 5, 'bee', 30, { bob: true });
    return b.build();
  }

  // ---------- LEVEL 3: Pulau Permen (pulau melayang, laut platform gerak, tong penyeruduk, pilih jawaban) ----------
  function level3() {
    const b = new Builder({
      id: 3, cols: 150, rows: 28, nama: 'Pulau Permen', tema: 'candy', bg: 'candy', waktu: 'siang', lv: 3, musik: 'permen',
      cerita: ['Raja Permen ingin pulaunya manis lagi.', 'Lompati pulau-pulau permen!'],
    });
    b.isle(0, 13, 0); b.put(3, 0, 'S'); b.row(7, 9, 0, '*');
    b.isle(17, 29, 0);
    b.put(19, 1, '*'); b.put(20, 0, '?', { op: 'add', lv: 3 }); b.put(24, 0, 'b');
    b.isle(33, 44, 2);
    b.put(34, 2, 'c'); b.put(38, 2, 'a');
    b.plat(40, 5, 3); b.put(41, 5, '*'); b.plat(36, 5, 3); b.put(37, 5, '*');
    b.isle(48, 56, 0);
    b.put(52, 3, 'f', { range: 2 });
    b.put(54, 0, '?', { op: 'mul', lv: 3 });
    b.hint(55, 0, 'Naiki platform gerak. Jangan jatuh!');
    b.mover(59, 0, 3, { axis: 'x', range: 1.5, speed: 0.18 });
    b.mover(65, 0, 3, { axis: 'x', range: 2, speed: 0.18, phase: 0.5 });
    b.mover(72, 0, 3, { axis: 'x', range: 1.5, speed: 0.18 });
    b.put(61, 3, '*'); b.put(67, 3, '*'); b.put(74, 3, '*');
    b.isle(77, 100, 0);
    b.put(78, 0, 'c');
    b.hint(81, 0, 'Pecahkan peti: pembagian!');
    b.gate(84, 0, 3, { op: 'div', lv: 3 });
    b.put(88, 0, 'r'); b.put(93, 3, 'f', { range: 2.5 });
    b.put(96, 0, '?', { op: 'div', lv: 3 });
    b.isle(104, 149, 0);
    b.put(105, 0, 'c');
    b.block(108, 1, 2, 1); b.block(110, 2, 2, 2); b.block(112, 3, 2, 3); b.block(114, 4, 2, 4);
    b.put(108, 1, '*'); b.put(110, 2, '*'); b.put(112, 3, '*'); b.put(114, 4, '*');
    b.plat(118, 6, 3); b.put(119, 6, '$');
    b.put(121, 0, '?', { op: 'mul', lv: 3 });
    b.hint(123, 0, 'Pilih platform dengan jawaban yang benar');
    b.pilih([125, 129, 133], 3, { op: 'add', lv: 3 });
    b.put(120, 0, 'a'); b.put(137, 0, 'r'); b.put(139, 0, 'c'); b.put(142, 0, 'h');
    b.put(146, 0, 'E');
    b.deko(10, 0, 'lollipop', 80); b.deko(30, 0, 'candy', 34); b.deko(46, 2, 'cherry', 40); b.deko(50, 0, 'watermelon', 50);
    b.deko(90, 0, 'lollipop', 90); b.deko(116, 0, 'candy', 34); b.deko(144, 0, 'lollipop', 80);
    return b.build();
  }

  // ---------- LEVEL 4: Menara Awan (menara tegak, platform tembus, bos robot di puncak) ----------
  function level4() {
    const b = new Builder({
      id: 4, cols: 13, rows: 62, nama: 'Menara Awan', tema: 'stone', bg: 'sky', waktu: 'malam', lv: 4, musik: 'awan',
      cerita: ['Menara Awan menjulang sampai ke langit.', 'Naiklah terus. Hati-hati dengan robot di puncak!'],
    });
    b.isle(0, 12, 0);
    b.put(6, 0, 'S');
    b.hint(3, 0, 'Naik! Platform bisa ditembus dari bawah');
    b.hint(9, 0, 'Turun: geser bawah + lompat');
    for (let i = 1; i <= 15; i++) {
      const k = 3 * i, left = i % 2 === 1;
      if (i === 7) { b.mover(2, k, 3, { axis: 'x', range: 1.5, speed: 0.2 }); continue; }
      if (i === 10) { b.crumble(7, k, 6); b.put(9, k, '*'); continue; }
      if (left) { b.plat(0, k, 5); b.put(1, k, '*'); } else { b.plat(7, k, 6); b.put(11, k, '*'); }
    }
    b.put(9, 6, '?', { op: 'add', lv: 4 });
    b.put(2, 9, 'c');
    b.put(2, 15, '?', { op: 'mul', lv: 4 });
    b.put(3, 24, 'f', { range: 1.5 });
    b.put(11, 18, 'a', { dir: -1 });
    b.put(10, 24, 'c');
    b.put(2, 27, '?', { op: 'div', lv: 4 });
    b.put(0, 33, 'N', { phase: 1.5 });
    b.put(9, 36, '?', { op: 'mul', lv: 4 });
    b.put(1, 39, '^'); b.put(3, 39, '^');
    b.put(2, 42, 'h'); b.put(8, 45, '$');
    b.plat(0, 48, 13);
    b.put(11, 48, 'c');
    b.boss(10, 48, { kind: 'robot', nama: 'Raksasa Menara', hp: 3, a0: 0, ty: (b.R - 48) * T + 6, noWall: true, op: 'div', lv: 4 });
    b.put(1, 48, 'E');
    b.deko(8, 0, 'bee', 28, { bob: true });
    return b.build();
  }

  // ---------- LEVEL 5: Gua Kristal (gua bertiang, gergaji, tong penyeruduk, turun lalu naik, papan rapuh) ----------
  function level5() {
    const b = new Builder({
      id: 5, cols: 162, rows: 30, nama: 'Gua Kristal', tema: 'crystal', bg: 'cave', waktu: 'malam', lv: 5, musik: 'gua',
      cerita: ['Kristal di dalam gua mulai redup.', 'Nyalakan lagi dengan jawaban yang benar!'],
    });
    for (let c = 0; c < 162; c += 3) b.ceil(c, c + 2, 8 + ((c * 13) % 4));
    b.ground(0, 56);
    b.put(3, 0, 'S'); b.row(6, 8, 0, '*');
    b.put(12, 0, '?', { op: 'add', lv: 5 });
    b.hint(16, 0, 'Gergaji berputar! Lompati dengan hati-hati');
    b.put(20, 0, 'o'); b.row(19, 21, 3, '*'); b.put(27, 0, 'o'); b.row(26, 28, 3, '*');
    b.put(32, 0, 'c');
    b.hint(38, 0, 'Tong menyeruduk saat kamu lewat di depannya');
    b.put(42, 0, 'r'); b.put(50, 0, 'r', { dir: 1 });
    b.plat(45, 3, 4); b.put(46, 3, '*'); b.put(47, 3, '*'); b.put(48, 0, 'h');
    b.put(54, 0, '?', { op: 'mul', lv: 5 });
    b.isle(57, 66, -3);
    b.put(60, -3, 'a'); b.put(62, -3, '?', { op: 'div', lv: 5 }); b.row(59, 61, -1, '*');
    b.isle(67, 70, -1); b.isle(71, 74, 1); b.isle(75, 78, 3);
    b.put(76, 3, 'c');
    b.isle(79, 86, 3);
    b.hint(84, 3, 'Papan rapuh! Jangan berhenti');
    b.crumble(87, 3, 8);
    b.isle(95, 161, 3);
    b.put(100, 3, 'o', { range: 3, speed: 0.25 }); b.plat(101, 6, 4); b.row(102, 103, 6, '*');
    b.put(105, 3, '?', { op: 'add', lv: 5 });
    b.put(108, 3, 'o', { range: 2, speed: 0.25, phase: 0.5 });
    b.hint(110, 3, 'Pecahkan peti besar');
    b.gate(113, 3, 4, { op: 'mul', lv: 5 });
    b.put(116, 5, 'f', { range: 3 }); b.put(120, 3, 'b');
    b.put(123, 3, 'c');
    b.put(130, 3, '?', { op: 'div', lv: 5 });
    b.plat(131, 5, 3); b.plat(135, 10, 3); b.put(136, 10, '$');
    b.put(138, 3, 'r'); b.put(145, 3, 'a'); b.put(140, 3, 'h');
    b.put(150, 3, 'c'); b.put(157, 3, 'E');
    return b.build();
  }

  // ---------- LEVEL 6: Kota Mesin (meriam, lift, jembatan mesin, bos meriam) ----------
  function level6() {
    const b = new Builder({
      id: 6, cols: 156, rows: 28, nama: 'Kota Mesin', tema: 'metal', bg: 'city', waktu: 'maghrib', lv: 6, musik: 'mesin',
      cerita: ['Mesin-mesin di kota berhenti bekerja.', 'Kalahkan Meriam Raksasa di ujung kota!'],
    });
    b.ground(0, 30);
    b.put(3, 0, 'S'); b.row(7, 9, 0, '*');
    b.put(14, 0, '?', { op: 'add', lv: 6 });
    b.hint(19, 0, 'Meriam menembak. Lompati pelurunya!');
    b.put(28, 0, 'n');
    b.row(22, 24, 2, '*');
    b.plat(32, 1, 2);
    b.ground(35, 70);
    b.put(36, 0, 'c'); b.put(40, 0, 'b'); b.put(46, 0, 'a');
    b.put(52, 0, 'o'); b.row(51, 53, 3, '*');
    b.put(58, 0, '?', { op: 'mul', lv: 6 });
    b.block(62, 2, 3, 2); b.put(63, 2, 'n'); b.put(66, 0, 'h');
    b.hint(70, 0, 'Naiki lift yang naik turun');
    b.mover(73, 3, 3, { axis: 'y', range: 2, speed: 0.2 });
    b.mover(78, 3, 3, { axis: 'y', range: 2, speed: 0.2 });
    b.isle(83, 110, 4);
    b.put(84, 4, 'c'); b.put(88, 4, '?', { op: 'div', lv: 6 });
    b.hint(90, 4, 'Pecahkan tumpukan peti');
    b.gate(94, 4, 3, { op: 'add', lv: 6 });
    b.put(98, 4, 'o', { range: 2.5, speed: 0.25 }); b.put(104, 6, 'f', { range: 2.5 });
    b.put(108, 4, '?', { op: 'add', lv: 6 });
    b.hint(110, 4, 'Pasang jembatan dengan soal');
    b.bridge(111, 4, 12, { parts: 4, op: 'susun', lv: 6, nama: 'Jembatan Mesin' });
    b.isle(123, 155, 4);
    b.put(124, 4, 'c');
    b.boss(142, 4, { kind: 'meriam', nama: 'Meriam Raksasa', hp: 4, a0: 130, op: 'mul', lv: 6 });
    b.put(152, 4, 'E');
    return b.build();
  }

  // ---------- LEVEL 7: Reruntuhan Kuno (lorong, sumur panjat, dataran tinggi, kuil dan jembatan kuno) ----------
  function level7() {
    const b = new Builder({
      id: 7, cols: 174, rows: 36, nama: 'Reruntuhan Kuno', tema: 'stone', bg: 'ruins', waktu: 'siang', lv: 7, musik: 'reruntuhan',
      cerita: ['Kuil tua menyimpan pecahan Bintang Hitung.', 'Panjat sumur, lalu turun ke kuil!'],
    });
    b.ground(0, 56);
    b.put(3, 0, 'S'); b.row(7, 9, 0, '*');
    b.put(10, 0, '?', { op: 'add', lv: 7 });
    b.put(15, 0, 'a'); b.put(21, 0, 'b'); b.put(26, 0, 'r');
    b.hint(29, 0, 'Peti besar menghalangi jalan');
    b.gate(32, 0, 4, { op: 'mul', lv: 7, w: 2 });
    b.put(36, 0, 'c');
    b.hint(38, 0, 'Panjat sumur! Lompat dari platform ke platform');
    b.block(41, 18, 2, 15); b.block(55, 16, 2, 16);
    for (let i = 1; i <= 5; i++) {
      const k = 3 * i;
      if (i === 4) { b.crumble(50, k, 5); b.put(52, k, '*'); continue; }
      if (i % 2) { b.plat(43, k, 5); b.put(45, k, '*'); } else { b.plat(50, k, 5); b.put(52, k, '*'); }
    }
    b.plat(50, 18, 8);
    b.put(48, 10, 'f', { range: 2 }); b.put(46, 3, 'h');
    b.isle(58, 76, 18);
    b.put(59, 18, 'c'); b.hint(60, 18, 'Dataran tinggi. Hati-hati musuh!');
    b.put(62, 18, '?', { op: 'mul', lv: 7 }); b.put(70, 18, 'r'); b.put(73, 20, 'f', { range: 2 });
    b.plat(63, 22, 3); b.put(64, 22, '$');
    b.plat(60, 21, 3); b.plat(66, 21, 3);
    b.isle(80, 115, 6);
    b.put(81, 6, 'c'); b.put(86, 6, 'n'); b.put(92, 6, 'o');
    b.put(98, 6, '?', { op: 'div', lv: 7 }); b.plat(100, 9, 3); b.row(101, 102, 9, '*');
    b.put(104, 6, '?', { op: 'mul', lv: 7 }); b.put(108, 6, 'b'); b.put(112, 6, 'N');
    b.isle(116, 130, 0);
    b.put(117, 0, 'c'); b.hint(119, 0, 'Kuil kuno. Jembatan rusak di depan');
    b.put(122, 0, 'a'); b.put(126, 0, 'r', { dir: 1 });
    b.bridge(131, 0, 12, { parts: 4, op: 'add', lv: 7, nama: 'Jembatan Kuno' });
    b.isle(143, 173, 0);
    b.gate(150, 0, 4, { op: 'div', lv: 7 });
    b.put(154, 0, '?', { op: 'add', lv: 7 }); b.put(158, 2, 'f', { range: 2.5 });
    b.put(161, 0, 'o', { range: 2, speed: 0.3 });
    b.plat(163, 5, 3); b.put(164, 5, '$');
    b.put(166, 0, 'c'); b.put(171, 0, 'E');
    return b.build();
  }

  // ---------- LEVEL 8: Istana Bintang (tantangan akhir, gabungan semua rintangan, bos Raja Kabut) ----------
  function level8() {
    const b = new Builder({
      id: 8, cols: 168, rows: 30, nama: 'Istana Bintang', tema: 'crates', bg: 'palace', waktu: 'malam', lv: 8, musik: 'istana',
      cerita: ['Istana Bintang adalah tujuan terakhir.', 'Kalahkan Raja Kabut dan satukan Bintang Hitung!'],
    });
    b.ground(0, 40);
    b.put(3, 0, 'S'); b.row(7, 9, 0, '*');
    b.put(14, 0, '?', { op: 'add', lv: 8 });
    b.put(18, 0, 'a'); b.put(24, 0, 'b');
    b.put(30, 0, 'o'); b.row(29, 31, 3, '*');
    b.put(34, 0, 'h'); b.put(36, 0, 'c');
    b.hint(38, 0, 'Seberangi laut platform gerak');
    b.mover(43, 0, 3, { axis: 'x', range: 1.5, speed: 0.2 });
    b.mover(49, 0, 3, { axis: 'x', range: 2, speed: 0.2, phase: 0.5 });
    b.mover(56, 0, 3, { axis: 'x', range: 1.5, speed: 0.2 });
    b.put(46, 3, 'f', { range: 3 }); b.put(54, 4, 'f', { range: 3 });
    b.ground(61, 100);
    b.put(62, 0, 'c'); b.put(66, 0, '?', { op: 'mul', lv: 8 });
    b.put(70, 0, 'r'); b.put(76, 0, 'a');
    b.block(80, 1, 2, 1); b.block(82, 2, 2, 2); b.block(84, 3, 2, 3); b.block(86, 4, 2, 4); b.block(88, 5, 2, 5);
    b.put(88, 5, '*'); b.put(89, 5, '*'); b.put(84, 3, 'n');
    b.put(92, 0, '?', { op: 'div', lv: 8 });
    b.put(94, 0, 'N');
    b.hint(95, 0, 'Pecahkan peti besar!');
    b.gate(97, 0, 4, { op: 'mul', lv: 8 });
    b.put(99, 0, '?', { op: 'add', lv: 8 });
    b.bridge(101, 0, 12, { parts: 4, op: 'susun', lv: 8, nama: 'Jembatan Bintang' });
    b.ground(113, 167);
    b.put(114, 0, 'c');
    b.hint(117, 0, 'Pilih platform dengan jawaban yang benar');
    b.pilih([118, 122, 126], 3, { op: 'add', lv: 8 });
    b.put(131, 0, 'h');
    b.put(135, 0, 'c');
    b.hint(138, 0, 'Raja Kabut menunggu di depan!');
    b.boss(152, 0, { kind: 'raja', nama: 'Raja Kabut', hp: 5, a0: 142, op: 'mul', lv: 8 });
    b.put(162, 0, 'E');
    return b.build();
  }

  const LEVELS = [level1(), level2(), level3(), level4(), level5(), level6(), level7(), level8()];
  return { T, Builder, LEVELS };
});
