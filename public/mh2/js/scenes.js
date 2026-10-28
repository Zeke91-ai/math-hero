// Math Hero 2: adegan menu. Judul, slot pemain, isi nama, pilih pahlawan, peta dunia, cerita, hasil level, kredit.
// Paling bawah: memuat aset lalu memulai di layar judul.
(function () {
  const M = window.MH2;
  const S = M.save;

  // Slot, isi nama, pilih pahlawan, cerita, dan kredit ada di shared/js/scenes.js; di sini hanya isi khas MH2.
  const OPENING = [
    { who: 'peri', text: 'Halo, Pahlawan! Aku Peri Angka.' },
    { who: 'prof', text: 'Muahaha! Aku Profesor Kacau! Kristal Bilangan sudah kupecahkan!' },
    { who: 'peri', text: 'Gawat! Tanpa Kristal Bilangan, angka di enam dunia jadi kacau.' },
    { who: 'peri', text: 'Untuk memperbaikinya, kita harus PAHAM cara kerja angka, bukan cuma menebak.' },
    { who: 'peri', text: 'Ayo kumpulkan lagi enam pecahan kristalnya!' },
  ];
  M.OPENING = OPENING;
  const ENDING = [
    { who: 'prof', text: 'Tidak mungkin... semua kristal kembali utuh!' },
    { who: 'peri', text: 'Kristal Bilangan bersinar lagi! Angka-angka kembali rapi.' },
    { who: 'prof', text: 'Hmm... ternyata angka lebih seru kalau dipahami. Boleh aku ikut belajar?' },
    { who: 'peri', text: 'Tentu! Terima kasih, Pahlawan. Kamu benar-benar Math Hero!' },
  ];
  window.MHKit.scenes.install(M, {
    ui: { backH: 38, skipH: 32, closeH: 34, del: (x, y, w) => ({ x: x + w - 40, y: y + 8, w: 32, h: 30 }), counter: { x: M.VW - 36, y: 24 } },
    slotInfo(g, p, x, y, w, h, txt) {
      const st = S.totalStars(p);
      M.art(g, 'bintang', x + 104, y + 56, 2);
      txt(g, `${st} / 90`, x + 132, y + 67, { size: 16 });
      const crys = M.STAGES.filter((s) => (p.stars[`${s.id}-5`] || 0) > 0).length;
      for (let k = 0; k < 6; k++) { g.globalAlpha = k < crys ? 1 : 0.25; M.art(g, 'kristal', x + 104 + k * 26, y + 84, 1.6); }
      g.globalAlpha = 1;
    },
    opening: () => ({ lines: OPENING, next: ['map', { stage: 1 }], seen: 'pembuka' }),
    mapParams: {},
    cast(line) {
      const bg = line.who === 'prof' || line.who === 'bos' ? 'benteng' : 'langit';
      let draw;
      if (line.who === 'peri') draw = (g, cx, cy) => M.art(g, 'peri', cx, cy + Math.sin(M.t * 3) * 6, 9, { anchor: 'feet' });
      else if (line.who === 'prof') draw = (g, cx, cy) => M.drawBoss(g, 'prof', cx, cy, 8, M.t);
      else if (line.who === 'bos') draw = (g, cx, cy) => M.drawBoss(g, line.bos.sprite, cx, cy, line.bos.sprite === 'prof' ? 8 : 5, M.t);
      else draw = (g, cx, cy) => M.hero(g, M.ui.heroKey(), 'idle', M.t, cx, cy, { scale: 5 });
      const who = line.who === 'peri' ? 'Peri Angka' : line.who === 'prof' ? 'Profesor Kacau' : line.who === 'bos' ? line.bos.nama : (S.active ? S.active.nama : '');
      return { bg, who, fill: line.who === 'peri' ? '#7b4bd6' : '#ff5d73', draw };
    },
    credits: [
      { head: 'MATH HERO 2', lines: ['Misi Kristal Bilangan'] },
      { lines: ['Seri Math Hero', 'game belajar matematika', 'untuk anak SD'] },
      { head: 'SPRITE', lines: ['CraftPix.net (lisensi gratis)', 'Tiny Hero Sprites', 'Top-Down Hunt Animals', 'Slime Mobs', 'Roguelike Shoot Em Up Kit', 'Simple Platformer Game Kit'] },
      { head: 'IKON BUAH', lines: ['SVG Repo'] },
      'font',
      { head: 'PIXEL ART TAMBAHAN', lines: ['Peri, Profesor, kristal, pizza,', 'koin, timbangan: dibuat untuk game ini'] },
      'musik',
      'animasi',
    ],
  });
  const { heroKey, backBtn } = M.ui;
  function crystalsDone() { return M.STAGES.map((st) => S.starsOf(`${st.id}-5`) > 0); }

  // ---------- Papan Juara ----------
  window.MHJuara.install(M, { board: 'mh2', back: 'title' });

  // ---------- Judul ----------
  const LOGO_COLORS = ['#ffffff', '#ffd54a'];
  M.register('title', {
    enter() { M.audio.music('title'); this.t = 0; },
    update(dt) {
      this.t += dt;
      if (M.input.bHit || M.input.aHit) M.go('slots');
    },
    draw(g) {
      const t = this.t, VW = M.VW, VH = M.VH;
      M.drawBg(g, 'padang', t * 30, 0);
      // Tanah berumput di bawah.
      const gy = VH - 120;
      for (let x = -((t * 60) % 32); x < VW; x += 32) { M.tile1(g, 1, 0, x, gy); M.tile1(g, 1, 1, x, gy + 32); M.tile1(g, 1, 1, x, gy + 64); M.tile1(g, 1, 1, x, gy + 96); }
      // Logo.
      const bob = Math.sin(t * 2.4) * 5;
      M.text(g, 'MATH', VW / 2, 110 + bob, { size: 64, align: 'center', color: LOGO_COLORS[0], ow: 10, outline: '#2b1d52' });
      M.text(g, 'HERO', VW / 2 - 24, 172 + bob, { size: 64, align: 'center', color: LOGO_COLORS[1], ow: 10, outline: '#2b1d52' });
      // Angka 2 besar berkilau.
      const s2 = 1 + Math.sin(t * 5) * 0.06;
      g.save(); g.translate(VW / 2 + 104, 168 + bob); g.rotate(-0.12); g.scale(s2, s2);
      M.text(g, '2', 0, 0, { size: 84, align: 'center', color: '#64e3ff', ow: 12, outline: '#2b1d52' });
      g.restore();
      M.box(g, VW / 2 - 130, 214 + bob, 260, 32, '#7b4bd6', { line: '#2b1d52' });
      M.text(g, 'Misi Kristal Bilangan', VW / 2, 230 + bob, { size: 18, align: 'center' });
      // Kristal melayang.
      M.art(g, 'kristal', VW / 2 - 11 * 2, 270 + Math.sin(t * 3) * 6, 4);
      for (let i = 0; i < 6; i++) {
        const a = t * 1.2 + i * Math.PI / 3;
        M.art(g, 'kristal', VW / 2 + Math.cos(a) * 70 - 6, 300 + Math.sin(a) * 18, 1.4);
      }
      // Pahlawan berlari.
      const keys = ['pinki', 'owi', 'dudu', 'hero1', 'hero2', 'hero3'];
      keys.forEach((k, i) => {
        const x = ((t * 50 + i * 70) % (VW + 120)) - 60;
        M.hero(g, k, 'run', t + i * 0.3, x, gy, { scale: 2 });
      });
      M.button(g, { id: 'main', x: VW / 2 - 110, y: VH - 260, w: 220, h: 64, label: 'MAIN!', color: 'pink', size: 30, onTap: () => M.go('slots') });
      M.button(g, { id: 'juara', x: VW / 2 - 110, y: VH - 184, w: 220, h: 42, label: 'Papan Juara', color: 'yellow', textColor: '#2b1d52', size: 18, icon: 'trophy', onTap: () => M.go('juara') });
      M.button(g, { id: 'seri', x: 10, y: 10, w: 130, h: 34, label: 'Seri Math Hero', color: 'purple', size: 13, onTap: () => { location.href = '../'; } });
      M.button(g, { id: 'kredit', x: VW - 92, y: 10, w: 82, h: 34, label: 'Kredit', color: 'purple', size: 13, onTap: () => M.go('credits') });
      const on = M.audio.prefs.music;
      M.drawToast(g, 250);
      M.button(g, { id: 'suara', x: VW - 140, y: 10, w: 42, h: 34, color: on ? 'purple' : 'gray', icon: on ? 'sound' : 'mute', onTap: () => { M.audio.setMusicOn(!on); M.audio.setSfxOn(!on); } });
    },
  });

  // ---------- Peta dunia ----------
  const NODES = [[0.26, 0.9], [0.7, 0.74], [0.3, 0.58], [0.7, 0.42], [0.42, 0.22]];
  function nodePos(i) { return { x: NODES[i][0] * M.VW, y: 120 + NODES[i][1] * (M.VH - 190) }; }
  function stageOpen(st) { return S.unlocked(st.levels[0].index); }
  function currentLevel() {
    for (const L of M.ALL_LEVELS) if (S.starsOf(L.id) === 0) return L;
    return M.ALL_LEVELS[M.ALL_LEVELS.length - 1];
  }
  function openLevel(L) {
    const st = M.STAGES[L.stage - 1];
    const seq = [];
    if (L === st.levels[0] && !S.seen('dunia' + st.id)) seq.push({ lines: st.cerita.map((t) => ({ who: 'peri', text: t })), seen: 'dunia' + st.id });
    if (L.boss && !S.seen('bos' + st.id)) seq.push({ lines: [{ who: 'bos', bos: st.bos, text: st.bos.ejek }, { who: 'peri', text: `Hati-hati! Itu ${st.bos.nama}. Kamu pasti bisa!` }], seen: 'bos' + st.id });
    if (!seq.length) { M.go('play', { level: L }); return; }
    // Rangkai cerita lalu masuk level.
    const first = seq[0], second = seq[1];
    const next = second ? ['story', { lines: second.lines, seen: second.seen, next: ['play', { level: L }] }] : ['play', { level: L }];
    M.go('story', { lines: first.lines, seen: first.seen, next });
  }

  M.register('map', {
    enter(p) {
      M.audio.music('peta');
      this.stage = p.stage || currentLevel().stage;
      this.slide = 0;
      this.dragX = null;
    },
    pointerDown(x) { this.dragX = x; },
    pointerUp(x) {
      if (this.dragX === null) return;
      const dx = x - this.dragX; this.dragX = null;
      if (dx < -60) this.change(1); else if (dx > 60) this.change(-1);
    },
    change(d) {
      const n = M.clamp(this.stage + d, 1, M.STAGES.length);
      if (n !== this.stage) { this.stage = n; this.slide = d; M.sfx('kartu'); }
    },
    update(dt) {
      this.slide *= Math.pow(0.001, dt);
      if (M.input.pause) M.go('slots');
      if (Math.abs(M.input.x) > 0.5 && !this.joyLock) { this.change(Math.sign(M.input.x)); this.joyLock = true; }
      if (Math.abs(M.input.x) < 0.2) this.joyLock = false;
    },
    draw(g) {
      const VW = M.VW, VH = M.VH;
      const st = M.STAGES[this.stage - 1];
      const off = this.slide * 120;
      M.drawBg(g, st.tema, M.t * 8 + this.stage * 300, 0);
      g.save(); g.translate(off, 0);
      // Judul dunia.
      M.box(g, 30, 60, VW - 60, 62, st.warna, { line: '#2b1d52' });
      M.text(g, `Dunia ${st.id}`, VW / 2, 78, { size: 14, align: 'center', color: '#fff' });
      M.text(g, st.nama, VW / 2, 102, { size: 22, align: 'center' });
      M.box(g, 50, 126, VW - 100, 24, '#fff6dc', { line: '#2b1d52', shade: false });
      M.text(g, `${st.kelas}: ${st.materi}`, VW / 2, 138, { size: 12, align: 'center', color: '#2b1d52', outline: false });
      const open = stageOpen(st);
      // Jalur antar level: titik-titik berpiksel.
      for (let i = 0; i < 4; i++) {
        const a = nodePos(i), b = nodePos(i + 1);
        const n = 10;
        for (let k = 1; k < n; k++) {
          const u = k / n, x = M.lerp(a.x, b.x, u) + Math.sin(u * Math.PI) * (i % 2 ? -20 : 20), y = M.lerp(a.y, b.y, u);
          const done = S.starsOf(st.levels[i].id) > 0;
          g.fillStyle = '#2b1d52'; g.fillRect(Math.round(x) - 4, Math.round(y) - 4, 8, 8);
          g.fillStyle = done ? '#ffd54a' : '#fff6dc'; g.fillRect(Math.round(x) - 2, Math.round(y) - 2, 4, 4);
        }
      }
      const cur = currentLevel();
      st.levels.forEach((L, i) => {
        const p = nodePos(i), unlocked = S.unlocked(L.index), stars = S.starsOf(L.id);
        const r = L.boss ? 38 : 30;
        const col = !unlocked ? ['#9aa0b4', '#666c80'] : L.boss ? ['#ff6b6b', '#c9414a'] : stars ? ['#ffd54a', '#d1a21b'] : ['#4b9cff', '#2d6fc4'];
        // Simpul level: cakram berpiksel dengan bayangan bawah.
        const pressed = M.pointer.down && Math.hypot(M.pointer.x - p.x, M.pointer.y - p.y) < r;
        const disc = M.lowres('node' + r + col[0], r * 2 + 8, r * 2 + 12, (cx) => {
          cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 4, r + 8, r + 2, 0, 7); cx.fill();
          cx.fillStyle = col[1]; cx.beginPath(); cx.arc(r + 4, r + 8, r - 1, 0, 7); cx.fill();
          cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 4, r + 4, r + 2, 0, 7); cx.fill();
          cx.fillStyle = col[0]; cx.beginPath(); cx.arc(r + 4, r + 4, r - 1, 0, 7); cx.fill();
          cx.fillStyle = 'rgba(255,255,255,0.4)'; cx.fillRect(r - 8, 8, 12, 4);
        });
        const dy = pressed ? 3 : 0;
        g.drawImage(disc, Math.round(p.x - r - 4), Math.round(p.y - r - 4 + dy));
        M.hit('lv' + L.id, p.x - r, p.y - r, r * 2, r * 2, () => {
          if (!unlocked) { M.toast('Selesaikan level sebelumnya dulu, ya!'); M.sfx('salah'); return; }
          openLevel(L);
        });
        if (!unlocked) M.icon(g, 'lock', p.x - 12, p.y - 12 + dy, 24, '#2b1d52');
        else if (L.boss) M.drawBoss(g, st.bos.sprite, p.x, p.y + 24 + dy, st.bos.sprite === 'prof' ? 2 : /^slime/.test(st.bos.sprite) ? 2.2 : 1.6, M.t);
        else M.text(g, String(i + 1), p.x, p.y - 1 + dy, { size: 26, align: 'center' });
        if (unlocked) {
          M.text(g, L.nama, p.x, p.y + r + 14, { size: 13, align: 'center' });
          if (stars || !L.boss) M.stars(g, p.x, p.y + r + 25, stars, 1.2);
        }
        // Pahlawan berdiri di level yang sedang dikerjakan.
        if (L === cur && unlocked) {
          const hop = Math.abs(Math.sin(M.t * 3)) * 8;
          M.hero(g, heroKey(), 'idle', M.t, p.x + r + 16, p.y + 10 - hop, { scale: 1.6 });
        }
      });
      // Kristal dunia.
      const got = S.starsOf(`${st.id}-5`) > 0;
      g.globalAlpha = got ? 1 : 0.3;
      M.art(g, 'kristal', nodePos(4).x + 58, nodePos(4).y - 40 + Math.sin(M.t * 2) * 4, 2.6);
      g.globalAlpha = 1;
      if (!open) {
        M.box(g, 40, VH / 2 - 40, VW - 80, 80, '#2b1d52', { line: '#fff' });
        M.icon(g, 'lock', VW / 2 - 14, VH / 2 - 30, 28, '#fff');
        M.text(g, 'Kalahkan bos dunia sebelumnya!', VW / 2, VH / 2 + 18, { size: 14, align: 'center' });
      }
      g.restore();
      // Panel atas.
      g.fillStyle = 'rgba(29,20,56,0.85)'; g.fillRect(0, 0, VW, 50);
      backBtn(g, () => M.go('slots'));
      M.button(g, { id: 'pahlawan', x: 58, y: 6, w: 46, h: 38, color: 'teal', label: '', onTap: () => M.go('heroes', {}), draw: (gg, x, y) => M.hero(gg, heroKey(), 'idle', M.t, x + 23, y + 34, { scale: 1 }) });
      M.text(g, S.active ? S.active.nama : '', 112, 25, { size: 16 });
      M.button(g, { id: 'buku', x: VW - 160, y: 8, w: 58, h: 34, label: 'Buku', size: 14, color: 'orange', onTap: () => M.go('buku', { back: ['map', { stage: this.stage }] }) });
      M.art(g, 'bintang', VW - 94, 14, 2);
      M.text(g, String(S.totalStars()), VW - 66, 25, { size: 18, color: '#ffd54a' });
      const cs = crystalsDone().filter(Boolean).length;
      M.art(g, 'kristal', VW - 36, 11, 1.6);
      M.text(g, String(cs), VW - 10, 25, { size: 18, align: 'right', color: '#64e3ff' });
      // Panah ganti dunia.
      if (this.stage > 1) M.button(g, { id: 'kiri', x: 4, y: VH / 2 - 26, w: 34, h: 52, color: 'purple', icon: 'left', onTap: () => this.change(-1) });
      if (this.stage < M.STAGES.length) M.button(g, { id: 'kanan', x: VW - 38, y: VH / 2 - 26, w: 34, h: 52, color: 'purple', icon: 'right', onTap: () => this.change(1) });
      // Titik halaman.
      M.STAGES.forEach((s, i) => { g.fillStyle = i + 1 === this.stage ? '#ffd54a' : 'rgba(255,255,255,0.5)'; g.fillRect(VW / 2 - 50 + i * 18, VH - 22, 10, 10); });
      M.drawToast(g, 160);
    },
  });

  // ---------- Buku Konsep ----------
  // Semua kartu konsep (dengan animasinya) bisa dibaca ulang. Kartu dari level yang belum terbuka masih terkunci.
  function conceptPages() {
    const seen = new Set(), pages = [];
    M.ALL_LEVELS.forEach((L) => (L.phases || [L]).forEach((ph) => {
      const c = ph.cfg, kind = c.kind || (c.waves && c.waves[0].kind) || (c.ops || [c.op]).join(',');
      const key = ph.mode + ':' + kind;
      if (seen.has(key)) return;
      seen.add(key);
      pages.push({ mode: ph.mode, cfg: c, level: L });
    }));
    return pages;
  }
  M.register('buku', {
    enter(p) { this.pages = conceptPages(); this.i = 0; this.t = 0; this.back = p.back || ['map', {}]; },
    update(dt) {
      this.t += dt;
      if (Math.abs(M.input.x) > 0.5 && !this.lock) { this.flip(Math.sign(M.input.x)); this.lock = true; }
      if (Math.abs(M.input.x) < 0.2) this.lock = false;
      if (M.input.pause) M.go(this.back[0], this.back[1]);
    },
    flip(d) { this.i = (this.i + d + this.pages.length) % this.pages.length; this.t = 0; M.sfx('kartu'); },
    draw(g) {
      const VW = M.VW, VH = M.VH, pg = this.pages[this.i], mode = M.Modes[pg.mode];
      M.drawBg(g, 'langit', M.t * 10, 0);
      backBtn(g, () => M.go(this.back[0], this.back[1]));
      M.text(g, 'Buku Konsep', VW / 2, 28, { size: 24, align: 'center', color: '#ffd54a', ow: 5 });
      const open = S.unlocked(pg.level.index);
      const x = 14, y = 64, w = VW - 28, h = VH - 140;
      M.panel(g, x, y, w, h, { title: `${this.i + 1} / ${this.pages.length}`, titleFill: '#7b4bd6' });
      if (!open) {
        M.icon(g, 'lock', VW / 2 - 20, y + h / 2 - 60, 40, '#2b1d52');
        M.text(g, `Terbuka di level ${pg.level.id}`, VW / 2, y + h / 2, { size: 18, align: 'center', color: '#2b1d52', outline: false });
      } else {
        const con = mode.concept(pg.cfg, pg.level);
        M.text(g, mode.nama, VW / 2, y + 34, { size: 14, align: 'center', color: '#7b4bd6', outline: false });
        M.text(g, con.judul, VW / 2, y + 58, { size: 19, align: 'center', color: '#d65f82', outline: false, maxW: w - 30 });
        const dx = x + 16, dy = y + 84, dw = w - 32, dh = 180;
        M.box(g, dx, dy, dw, dh, '#e9f6ff', { line: '#2b1d52', shade: false });
        g.save(); g.beginPath(); g.rect(dx + 3, dy + 3, dw - 6, dh - 6); g.clip();
        if (con.demo) con.demo(g, this.t, dx + 3, dy + 3, dw - 6, dh - 6);
        g.restore();
        let ty = dy + dh + 16;
        con.baris.forEach((line) => { ty += M.text(g, line, VW / 2, ty, { size: 15, align: 'center', color: '#2b1d52', outline: false, maxW: w - 36, base: 'top' }) + 6; });
        M.text(g, `Dipakai di level ${pg.level.id}: ${pg.level.nama}`, VW / 2, y + h - 24, { size: 12, align: 'center', color: '#6b4fa8', outline: false });
      }
      M.button(g, { id: 'sebelum', x: 20, y: VH - 66, w: 110, h: 48, label: 'Sebelum', color: 'blue', size: 16, onTap: () => this.flip(-1) });
      M.button(g, { id: 'sesudah', x: VW - 130, y: VH - 66, w: 110, h: 48, label: 'Sesudah', color: 'blue', size: 16, onTap: () => this.flip(1) });
    },
  });

  // ---------- Hasil level ----------
  M.register('result', {
    enter(p) {
      this.p = p; this.t = 0; this.shown = 0; this.scoreShown = 0;
      M.audio.jingle('menang');
      M.fx.confetti();
      const st = M.STAGES[p.level.stage - 1];
      this.crystal = p.level.boss && p.firstClear;
      this.stage = st;
    },
    update(dt) {
      this.t += dt;
      const want = Math.min(this.p.stars, Math.floor((this.t - 0.5) / 0.45) + 1);
      if (this.t > 0.5 && want > this.shown) { this.shown = want; M.sfx('bintang'); M.fx.burst(M.VW / 2 + (this.shown - 2) * 60, 230, { n: 16, kind: 'sq', color: ['#ffd54a', '#fff'] }); }
      this.scoreShown = Math.min(this.p.score, Math.round(this.p.score * M.clamp((this.t - 0.3) / 1.2, 0, 1)));
      if (this.t > 2 && (M.input.bHit || M.input.aHit)) this.next();
    },
    next() {
      const L = this.p.level;
      if (L.final && this.p.firstClear) { M.go('story', { lines: ENDING, next: ['credits', { ending: true }], musik: 'title' }); return; }
      const nx = M.ALL_LEVELS[L.index + 1];
      if (nx) openLevel(nx); else M.go('map', { stage: L.stage });
    },
    draw(g) {
      const VW = M.VW, VH = M.VH, p = this.p, L = p.level;
      M.drawBg(g, L.tema, M.t * 20, 0);
      g.fillStyle = 'rgba(29,20,56,0.45)'; g.fillRect(0, 0, VW, VH);
      const w = VW - 30, h = Math.min(VH - 80, 520), x = 15, y = (VH - h) / 2;
      M.panel(g, x, y, w, h, { title: L.boss ? 'BOS KALAH!' : 'LEVEL SELESAI!', titleFill: '#5fd068' });
      M.text(g, `${L.id} ${L.nama}`, VW / 2, y + 36, { size: 18, align: 'center', color: '#2b1d52', outline: false });
      // Bintang besar.
      for (let i = 0; i < 3; i++) {
        const on = i < this.shown, sx = VW / 2 + (i - 1) * 76, s = on ? 4 + Math.max(0, 1 - (this.t - 0.5 - i * 0.45) * 4) * 2 : 4;
        M.art(g, on ? 'bintang' : 'bintangKosong', sx - 11 * s / 2, y + 66 + (i === 1 ? -10 : 0), s);
      }
      M.text(g, `Skor ${M.fmt(this.scoreShown)}`, VW / 2, y + 140, { size: 26, align: 'center', color: '#d65f82', outline: false, font: M.NUMFONT });
      if (p.newBest && this.t > 1.6) {
        M.box(g, VW / 2 - 80, y + 156, 160, 24, '#ffd54a', { line: '#2b1d52' });
        M.text(g, 'Skor terbaik baru!', VW / 2, y + 168, { size: 13, align: 'center', color: '#2b1d52', outline: false });
      }
      const lines = [`Benar: ${p.correct}`, `Salah: ${p.mistakes}`, `Hati tersisa: ${p.hearts}`, `Bonus waktu: +${p.bonus} (${window.TimeBonus.clock(p.seconds)})`];
      lines.forEach((l, i) => M.text(g, l, VW / 2, y + 196 + i * 20, { size: 15, align: 'center', color: '#2b1d52', outline: false }));
      const tip = p.stars === 3 ? 'Sempurna! Kamu paham konsepnya.' : p.stars === 2 ? 'Hebat! Coba lagi tanpa salah untuk 3 bintang.' : 'Bagus! Baca penjelasannya, lalu coba lagi.';
      M.text(g, tip, VW / 2, y + 282, { size: 14, align: 'center', color: '#6b4fa8', outline: false, maxW: w - 30 });
      let yy = y + 304;
      if (this.crystal) {
        M.art(g, 'kristal', VW / 2 - 22, yy + Math.sin(M.t * 3) * 4, 4);
        M.text(g, `Kristal ke-${this.stage.id} kembali!`, VW / 2, yy + 72, { size: 16, align: 'center', color: '#2a9fd6', outline: false });
        yy += 86;
      }
      if (p.unlocked && p.unlocked.length) {
        M.text(g, `Pahlawan baru: ${p.unlocked.map((h) => h.nama).join(', ')}!`, VW / 2, yy + 8, { size: 14, align: 'center', color: '#d65f82', outline: false });
      }
      const by = y + h - 64;
      M.button(g, { id: 'ulang', x: x + 16, y: by, w: 92, h: 46, label: 'Ulang', color: 'orange', onTap: () => M.go('play', { level: L }) });
      M.button(g, { id: 'peta', x: x + 116, y: by, w: 80, h: 46, label: 'Peta', color: 'blue', onTap: () => M.go('map', { stage: L.stage }) });
      M.button(g, { id: 'lanjut', x: x + w - 128, y: by, w: 112, h: 46, label: 'Lanjut', color: 'green', onTap: () => this.next() });
    },
  });

  // ---------- Mulai ----------
  const bar = document.getElementById('load-bar');
  M.load((k) => { bar.style.width = Math.round(k * 100) + '%'; }).then(() => {
    document.body.classList.add('ready');
    // ?level=3-2 langsung membuka level tertentu (untuk guru dan pengujian).
    const m = /[?&]level=(\d-\d)/.exec(location.search);
    if (m) {
      if (!S.active) { const i = S.slots().findIndex((x) => !x); if (i < 0) S.use(0); else S.create(i, 'TAMU'); }
      const L = M.ALL_LEVELS.find((x) => x.id === m[1]);
      if (L) { M.start('play', { level: L }); return; }
    }
    M.start('title');
  });
})();
