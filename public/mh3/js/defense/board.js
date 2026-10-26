// Math Hero 3: papan Bertahan (pertahanan jalur) di layar tegak. Menggambar sim.js, menerima ketukan,
// dan membuka kartu PR (MH3.homework) di jeda antar gelombang. Dimulai lewat M.go('defense', { level: 1 }).
(function () {
  const M = window.MH2;
  const MH3 = window.MH3 = window.MH3 || {};
  const D = MH3.defenseData, Sim = MH3.defenseSim;
  const { COLS, ROWS } = D;
  const CW = 64, TOP = 62, TRAY = 84, CASTLE = 30, KEYS = 'mathHero3.keys.v1';

  let S = null, L = null; // S = keadaan adegan, L = ukuran layar

  function layout() {
    const cellH = Math.max(40, Math.min(58, Math.floor((M.VH - TOP - TRAY - CASTLE - 14) / ROWS)));
    const gh = cellH * ROWS;
    const gy = TOP + Math.max(0, Math.floor((M.VH - TOP - TRAY - CASTLE - 14 - gh) / 2));
    L = { gx: (M.VW - COLS * CW) / 2, gy, ch: cellH, gh, castleY: gy + gh, trayY: M.VH - TRAY };
  }
  const cx = (c) => L.gx + c * CW + CW / 2;
  const py = (y) => L.gy + y * L.ch;

  function grade() { return (M.save && M.save.active && M.save.active.grade) || 2; }
  // Kunci Kristal masuk ke profil aktif; tanpa profil (mode debug dari judul) disimpan terpisah.
  function addKeys(n) {
    if (M.save && M.save.active) { M.save.addKeys(n); return; }
    try { localStorage.setItem(KEYS, String((+localStorage.getItem(KEYS) || 0) + n)); } catch (e) { /* tetap jalan */ }
  }

  function say(t, ms, color) { M.toast(t, ms, color); }

  // ---------- Kejadian dari sim -> efek dan suara ----------
  function handle(e) {
    const fx = M.fx, a = M.audio;
    if (e.type === 'place') { a.sfx('kartu'); fx.burst(cx(e.col), py(e.row + 0.8), { n: 8, speed: 80, color: ['#fff6dc', '#ffd54a'], life: 0.4 }); }
    else if (e.type === 'star') { a.sfx('ambil'); fx.float('+' + e.value, cx(Math.floor(e.x)) , py(e.y) - 10, '#ffd54a', 18); }
    else if (e.type === 'shoot') a.sfx('tembak');
    else if (e.type === 'kill') { a.sfx('pop'); fx.burst(cx(e.col), py(e.y - 0.4), { n: 12, speed: 120, color: ['#fff6dc', '#b38cff', '#64e3ff'], life: 0.5 }); }
    else if (e.type === 'unitDown') { a.sfx('hit'); fx.burst(cx(e.col), py(e.row + 0.5), { n: 12, speed: 90, color: '#9aa0b4', life: 0.5 }); }
    else if (e.type === 'castle') { a.sfx('salah'); S.shake = 0.35; say('Monster lolos! Hati Benteng berkurang.', 1600, '#ffe1e6'); }
    else if (e.type === 'wave') { S.banner = { text: e.index + 1 >= e.total ? 'Gelombang terakhir!' : `Gelombang ${e.index + 1}`, t: 0 }; }
    else if (e.type === 'waveClear') say('Gelombang selesai!', 1400, '#e3ffe6');
    else if (e.type === 'laser') { a.sfx('tembak'); S.beams.push({ col: e.col, row: e.row, t: 0.25 }); }
    else if (e.type === 'boom') { a.sfx('ledak'); fx.burst(cx(e.col), py(e.y - 0.3), { n: 14, speed: 140, color: ['#ffd54a', '#ff8a3d'], life: 0.45 }); }
    else if (e.type === 'jump') fx.burst(cx(e.col), py(e.y), { n: 6, speed: 60, color: '#fff6dc', life: 0.3 });
    else if (e.type === 'heal') fx.float('+', cx(e.col), py(e.y - 0.6), '#5fd068', 16);
    else if (e.type === 'perisai') { a.sfx('boost'); fx.burst(cx(e.col), py(e.row + 0.5), { n: 10, speed: 70, color: ['#64e3ff', '#fff6dc'], life: 0.5 }); }
    else if (e.type === 'boss') { S.banner = { text: D.MONSTERS[e.kind].nama + '!', t: 0 }; say('Perisai Rumus! Pecahkan dengan satu soal PR.', 2600, '#ffe9a8'); }
    else if (e.type === 'tangkis') { if (M.t - S.lastTangkis > 1.2) { S.lastTangkis = M.t; a.sfx('hit'); say('Perisai Rumus menahan! Pecahkan dulu.', 1400, '#ffe9a8'); } }
    else if (e.type === 'shieldBreak') { a.sfx('benar'); fx.confetti(); say('Perisai pecah! Serang sekarang!', 2000, '#e3ffe6'); }
    else if (e.type === 'shieldUp') say('Perisai Rumus muncul lagi!', 1800, '#ffe9a8');
    else if (e.type === 'meteor') { a.sfx('ledak'); fx.confetti(); }
  }

  function pickDefaults() { S.sel = S.level.loadout[0]; }

  // ---------- Kartu PR ----------
  function openChest() {
    if (!S.g.chest || S.state !== 'play') return;
    MH3.homework.open({ grade: grade(), tier: S.level.tier || 0, title: 'Peti Kekuatan' }, (r) => {
      if (r.status === 'done') { S.g.chest = null; S.state = 'power'; M.audio.sfx('benar'); }
      else say('Peti disimpan. Buka lagi kalau sudah siap.', 2200);
    });
  }
  // Perisai Rumus bos: satu soal PR benar memecahkannya. Papan berhenti selama kartu terbuka.
  function openShield() {
    const b = Sim.shieldedBoss(S.g);
    if (!b || S.state !== 'play') return;
    S.state = 'pr';
    MH3.homework.open({ grade: grade(), tier: S.level.tier || 0, title: 'Perisai Rumus' }, (r) => {
      S.state = 'play';
      if (r.status === 'done') Sim.breakShield(S.g, b.id);
      else say('Perisai belum pecah. Coba lagi kapan saja.', 2000);
      for (const e of S.g.events) handle(e);
      S.g.events.length = 0;
    });
  }
  function openTreasure() {
    if (S.keys != null) return;
    MH3.homework.open({ grade: grade(), tier: S.level.tier || 0, title: 'Peti Harta' }, (r) => {
      S.keys = r.status === 'done' ? Math.max(1, Math.min(3, r.stars)) : 0;
      if (S.keys) { addKeys(S.keys); M.audio.sfx('benar'); M.fx.confetti(); }
    });
  }

  // ---------- Gambar ----------
  function drawGrid(g) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      g.fillStyle = (r + c) % 2 ? 'rgba(255,255,255,0.16)' : 'rgba(30,60,20,0.18)';
      g.fillRect(L.gx + c * CW, L.gy + r * L.ch, CW, L.ch);
    }
    g.strokeStyle = 'rgba(29,20,56,0.45)'; g.lineWidth = 2;
    g.strokeRect(L.gx, L.gy, COLS * CW, L.gh);
    if (S.sel) {
      const gm = S.g;
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        if (gm.grid[r][c]) continue;
        g.fillStyle = 'rgba(255,213,74,0.10)'; g.fillRect(L.gx + c * CW + 3, L.gy + r * L.ch + 3, CW - 6, L.ch - 6);
      }
    }
  }
  function drawUnit(g, u) {
    const x = cx(u.col), yb = py(u.row + 1) - 4, t = M.t + u.id;
    const shake = u.hurt > 0 ? Math.sin(M.t * 60) * 2 : 0;
    const ud = D.UNITS[u.kind];
    if (S.g.rowShield[u.row] > 0) { g.fillStyle = 'rgba(100,227,255,0.28)'; g.fillRect(L.gx, py(u.row) + 2, COLS * CW, L.ch - 4); }
    if (ud.hero) {
      if (u.kind === 'meriam') {
        M.box(g, x - 18 + shake, yb - 22, 36, 18, '#5a4a7a', { line: '#2b1d52' }); M.box(g, x - 6 + shake, yb - 34, 12, 16, '#3a3346', { line: '#1d1438' });
      } else M.hero(g, ud.hero, u.fire > 0.1 && u.fire < 0.5 ? 'throw' : 'idle', t, x + shake, yb, { scale: 1.5 });
    } else if (u.kind === 'pemanah') M.hero(g, 'pinki', u.fire > 0.1 && u.fire < 0.5 ? 'throw' : 'idle', t, x + shake, yb, { scale: 1.5 });
    else if (u.kind === 'tembok') {
      M.box(g, x - 22 + shake, yb - L.ch + 8, 44, L.ch - 10, '#a89f94', { line: '#3a3346' });
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x - 16 + shake, yb - L.ch * 0.5, 32, 3); g.fillRect(x - 4 + shake, yb - L.ch + 16, 3, L.ch * 0.4);
    } else if (u.kind === 'menara') {
      M.box(g, x - 15 + shake, yb - 16, 30, 16, '#7b4bd6', { line: '#2b1d52' });
      M.art(g, 'bintang', x - 11 * 1.5 + shake, yb - 16 - 11 * 1.5 - 2 + Math.sin(t * 3) * 2, 3 / 2);
    }
    if (u.hp < u.max) { const w = 36; g.fillStyle = '#1d1438'; g.fillRect(x - w / 2, yb + 1, w, 5); g.fillStyle = '#5fd068'; g.fillRect(x - w / 2 + 1, yb + 2, Math.max(0, (w - 2) * u.hp / u.max), 3); }
  }
  function drawMonster(g, m) {
    const d = D.MONSTERS[m.kind], x = cx(m.col), y = py(m.y);
    const name = m.hurt > 0 ? d.hit : d.sprite;
    if (y < L.gy - 40) return;
    g.save(); g.beginPath(); g.rect(0, 0, M.VW, L.castleY + CASTLE); g.clip();
    if (d.boss) {
      M.drawBoss(g, d.boss, x, y + 2, d.scale, M.t, { hurt: m.hurt });
      if (m.shield) { // Perisai Rumus: gelembung dengan tanda tanya
        const r = L.ch * 0.62; g.fillStyle = 'rgba(100,227,255,0.28)'; g.strokeStyle = '#64e3ff'; g.lineWidth = 3;
        g.beginPath(); g.arc(x, y - L.ch * 0.45, r, 0, 7); g.fill(); g.stroke();
        M.text(g, '?', x, y - L.ch * 0.3, { size: 26, align: 'center', color: '#fff6dc' });
      }
    } else M.spr1(g, name, m.hurt > 0 ? 2 : M.t * 9 + m.id, x, y + 2, { scale: d.scale });
    if (m.slow > 0) { g.fillStyle = 'rgba(100,227,255,0.35)'; g.fillRect(x - 18, y - L.ch * 0.7, 36, L.ch * 0.7); }
    g.restore();
    if (m.hp < m.max) { const w = d.boss ? 50 : 30; g.fillStyle = '#1d1438'; g.fillRect(x - w / 2, y - L.ch * 0.85, w, 4); g.fillStyle = '#ff6b6b'; g.fillRect(x - w / 2 + 1, y - L.ch * 0.85 + 1, (w - 2) * m.hp / m.max, 2); }
    else if (d.boss) { g.fillStyle = '#1d1438'; g.fillRect(x - 25, y - L.ch * 0.85, 50, 4); g.fillStyle = '#ff6b6b'; g.fillRect(x - 24, y - L.ch * 0.85 + 1, 48, 2); }
  }
  function drawStarPickup(g, p) {
    const bob = Math.sin(M.t * 5 + p.id) * 3, x = L.gx + p.x * CW, y = py(p.y) + bob;
    g.fillStyle = 'rgba(255,213,74,0.25)'; g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill();
    M.art(g, 'bintang', x - 11 * 1.5, y - 11 * 1.5, 3);
  }
  function drawHud(g) {
    const gm = S.g;
    M.box(g, 0, 0, M.VW, TOP - 6, '#2b1d52', { line: '#1d1438', shade: false });
    M.hearts(g, 8, 8, gm.hearts, Sim.HEARTS, 2.4);
    M.art(g, 'bintang', 10, 33, 2);
    M.text(g, String(Math.floor(gm.stars)) + (gm.mult > 1 ? '  x2' : ''), 38, 43, { size: 20, color: '#ffd54a' });
    const w = Math.min(gm.wave + (gm.phase === 'rest' && gm.wave === 0 ? 1 : (gm.phase === 'wave' ? 1 : 0)), gm.level.waves.length);
    M.text(g, `Gelombang ${Math.max(1, w)}/${gm.level.waves.length}`, M.VW / 2 + 22, 22, { size: 15, align: 'center' });
    M.text(g, S.level.nama, M.VW / 2 + 22, 43, { size: 13, align: 'center', color: '#b8f4ff' });
    M.button(g, { id: 'jeda', x: M.VW - 46, y: 6, w: 38, h: 38, color: 'purple', icon: 'pause', onTap: () => { if (S.state === 'play') S.state = 'pause'; } });
  }
  function drawTray(g) {
    const gm = S.g, ids = S.level.loadout, n = ids.length + (gm.power ? 1 : 0);
    const cw = 72, gap = 8, x0 = (M.VW - (n * cw + (n - 1) * gap)) / 2, y = L.trayY + 8;
    M.box(g, 0, L.trayY - 2, M.VW, TRAY + 2, '#2b1d52', { line: '#1d1438', shade: false });
    ids.forEach((k, i) => {
      const u = D.UNITS[k], x = x0 + i * (cw + gap), cd = gm.cards[k] || 0, can = gm.stars >= u.cost && cd <= 0;
      M.button(g, { id: 'kartu_' + k, x, y, w: cw, h: 64, color: can ? 'white' : 'gray', selected: S.sel === k, textColor: '#2b1d52', label: '', onTap: () => { S.sel = S.sel === k ? null : k; }, sfx: 'kartu',
        draw: (c, bx, by) => {
          if (k === 'pemanah') M.hero(c, 'pinki', 'idle', M.t, bx + cw / 2, by + 42, { scale: 1.2 });
          else if (u.hero && k !== 'meriam') M.hero(c, u.hero, 'idle', M.t, bx + cw / 2, by + 42, { scale: 1.2 });
          else if (k === 'meriam') { M.box(c, bx + cw / 2 - 14, by + 22, 28, 14, '#5a4a7a', { line: '#2b1d52' }); M.box(c, bx + cw / 2 - 5, by + 12, 10, 14, '#3a3346', { line: '#1d1438' }); }
          else if (k === 'tembok') M.box(c, bx + cw / 2 - 15, by + 12, 30, 28, '#a89f94', { line: '#3a3346' });
          else M.art(c, 'bintang', bx + cw / 2 - 16, by + 8, 3);
          M.text(c, String(u.cost), bx + cw / 2, by + 54, { size: 16, align: 'center', color: can ? '#8a5a00' : '#555', outline: false });
          if (cd > 0) { c.fillStyle = 'rgba(29,20,56,0.55)'; c.fillRect(bx + 4, by + 4, cw - 8, (60 * cd) / u.cd); }
        } });
    });
    if (gm.power) {
      const p = gm.power, def = Sim.POWERS[p.key], x = x0 + ids.length * (cw + gap);
      M.button(g, { id: 'kuasa', x, y, w: cw, h: 64, color: p.cd > 0 ? 'gray' : 'orange', label: p.cd > 0 ? Math.ceil(p.cd) + 'd' : def.nama.split(' ')[0], size: 14, onTap: () => { if (Sim.usePower(gm)) { M.audio.sfx('boost'); say(def.nama + '!', 1500); } } });
    }
  }
  function drawCastle(g) {
    const gm = S.g, y = L.castleY;
    g.fillStyle = '#6b6478'; g.fillRect(L.gx, y, COLS * CW, CASTLE);
    for (let i = 0; i < COLS * 2; i++) { g.fillStyle = i % 2 ? '#8b8498' : '#6b6478'; g.fillRect(L.gx + i * CW / 2, y - 6, CW / 2, 6); }
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(L.gx, y + CASTLE - 6, COLS * CW, 6);
    M.text(g, 'BENTENG BINTANG', M.VW / 2, y + CASTLE / 2 + 1, { size: 13, align: 'center', color: '#ffd54a' });
  }
  function drawOverlays(g) {
    const gm = S.g;
    if (S.banner) {
      const k = S.banner.t; if (k < 2) { g.globalAlpha = Math.min(1, 2 - k); M.text(g, S.banner.text, M.VW / 2, L.gy + L.gh * 0.35, { size: 30, align: 'center', color: '#ffd54a', ow: 7 }); g.globalAlpha = 1; }
    }
    if (gm.phase === 'rest' && S.state === 'play') {
      // Tombol di baris paling atas grid (jauh dari Benteng) supaya petak bawah tetap bebas diketuk.
      const by = L.gy + Math.round((L.ch - 38) / 2);
      if (gm.chest) M.button(g, { id: 'peti', x: L.gx + 6, y: by, w: 170, h: 38, color: 'yellow', label: 'Peti PR!', size: 18, onTap: openChest, icon: 'chest' });
      M.button(g, { id: 'siap', x: L.gx + COLS * CW - 106, y: by, w: 100, h: 38, color: 'green', label: 'Siap! ' + Math.ceil(gm.restT), size: 16, onTap: () => Sim.skip(gm) });
    }
    const sb = S.state === 'play' && Sim.shieldedBoss(gm);
    if (sb) M.button(g, { id: 'perisai', x: (M.VW - 230) / 2, y: L.castleY - 2, w: 230, h: 34, color: 'orange', label: 'Pecahkan Perisai!', size: 16, onTap: openShield, icon: 'chest' });
    if (S.state === 'power') {
      g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
      const x = 24, y = M.VH * 0.22, w = M.VW - 48, h = 330;
      M.panel(g, x, y, w, h, { title: 'Pilih kekuatan super!' });
      Object.keys(Sim.POWERS).forEach((k, i) => {
        const p = Sim.POWERS[k];
        M.button(g, { id: 'p_' + k, x: x + 16, y: y + 28 + i * 92, w: w - 32, h: 80, color: ['red', 'yellow', 'teal'][i], label: '', onTap: () => { Sim.choosePower(S.g, k); S.state = 'play'; say(p.nama + ' siap dipakai!', 2000); },
          draw: (c, bx, by, bw) => { M.text(c, p.nama, bx + bw / 2, by + 26, { size: 22, align: 'center' }); M.text(c, p.info, bx + bw / 2, by + 56, { size: 13, align: 'center', maxW: bw - 20 }); } });
      });
    }
    if (S.state === 'pause') {
      g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
      const x = 40, y = M.VH * 0.3, w = M.VW - 80;
      M.panel(g, x, y, w, 200, { title: 'Jeda' });
      M.button(g, { id: 'lanjut', x: x + 30, y: y + 36, w: w - 60, h: 52, label: 'Lanjut', color: 'green', onTap: () => { S.state = 'play'; } });
      M.button(g, { id: 'keluar', x: x + 30, y: y + 108, w: w - 60, h: 52, label: 'Keluar', color: 'blue', onTap: () => M.go('title') });
    }
    if (S.state === 'end') drawEnd(g);
  }
  function drawEnd(g) {
    const gm = S.g, won = gm.phase === 'won', k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.7 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.2, w = M.VW - 60, h = won ? 380 : 270;
    M.panel(g, x, y, w, h, { title: won ? 'Benteng selamat!' : 'Benteng jatuh...' });
    if (won) {
      M.stars(g, M.VW / 2, y + 40, D.stars(gm.hearts), 4);
      M.text(g, `Sisa hati: ${gm.hearts} dari ${Sim.HEARTS}`, M.VW / 2, y + 112, { size: 16, align: 'center', color: '#2b1d52', outline: false });
      if (S.keys == null) M.button(g, { id: 'harta', x: x + 30, y: y + 140, w: w - 60, h: 56, label: 'Buka Peti Harta', color: 'yellow', size: 20, icon: 'chest', onTap: openTreasure });
      else M.text(g, S.keys ? `Dapat ${S.keys} Kunci Kristal!` : 'Peti Harta ditunda.', M.VW / 2, y + 168, { size: 18, align: 'center', color: '#8a5a00', outline: false });
      M.button(g, { id: 'ulang', x: x + 30, y: y + 216, w: w - 60, h: 48, label: 'Main lagi', color: 'green', onTap: () => M.go('defense', S.params) });
      M.button(g, { id: 'lanjutend', x: x + 30, y: y + 278, w: w - 60, h: 48, label: S.onEnd ? 'Lanjut' : 'Ke judul', color: 'blue', onTap: finish });
    } else {
      M.text(g, 'Jangan menyerah! Coba taruh lebih banyak pasukan.', M.VW / 2, y + 62, { size: 15, align: 'center', color: '#2b1d52', outline: false, maxW: w - 40 });
      M.button(g, { id: 'ulang', x: x + 30, y: y + 112, w: w - 60, h: 52, label: 'Coba lagi', color: 'green', onTap: () => M.go('defense', S.params) });
      M.button(g, { id: 'lanjutend', x: x + 30, y: y + 178, w: w - 60, h: 48, label: S.onEnd ? 'Keluar' : 'Ke judul', color: 'blue', onTap: finish });
    }
  }
  function finish() {
    const gm = S.g, cb = S.onEnd;
    if (cb) cb({ win: gm.phase === 'won', stars: gm.phase === 'won' ? D.stars(gm.hearts) : 0, hearts: gm.hearts, keys: S.keys || 0, level: S.level.id });
    else M.go('title');
  }

  // ---------- Adegan ----------
  M.register('defense', {
    enter(p) {
      layout();
      // p.def = definisi level lengkap dari peta (nama, tema, tier, loadout, startStars, upg); tanpanya level data apa adanya.
      const level = p.def || D.level(p.level || 1);
      S = { level, params: p, g: Sim.create(level), state: 'play', sel: null, beams: [], lastTangkis: -9, shake: 0, banner: null, endT: 0, keys: null, onEnd: p.onEnd };
      pickDefaults();
      M.audio.music('padang');
    },
    exit() { M.audio.setPaused(false); },
    resize() { layout(); },
    blur() { if (S && S.state === 'play') S.state = 'pause'; },
    update(dt) {
      if (!S) return;
      if (S.banner) S.banner.t += dt;
      S.shake = Math.max(0, S.shake - dt);
      for (const b of S.beams) b.t -= dt;
      S.beams = S.beams.filter((b) => b.t > 0);
      const gm = S.g;
      if (S.state === 'end') { S.endT += dt; return; }
      if (S.state !== 'play') return;
      if (M.input.pause) { S.state = 'pause'; return; }
      Sim.update(gm, dt); Sim.tickPower(gm, dt);
      for (const e of gm.events) handle(e);
      gm.events.length = 0;
      if ((gm.phase === 'won' || gm.phase === 'lost') && S.state === 'play') { S.state = 'end'; S.endT = 0; M.audio.sfx(gm.phase === 'won' ? 'benar' : 'salah'); if (gm.phase === 'won') M.fx.confetti(); }
    },
    draw(g) {
      if (!S) return;
      M.drawBg(g, S.level.tema, 0, 0);
      g.save();
      if (S.shake > 0) g.translate(Math.round((Math.random() - 0.5) * 8), Math.round((Math.random() - 0.5) * 6));
      drawGrid(g);
      const items = [];
      for (const row of S.g.grid) for (const u of row) if (u) items.push([u.row + 1, () => drawUnit(g, u)]);
      for (const m of S.g.monsters) items.push([m.y, () => drawMonster(g, m)]);
      items.sort((a, b) => a[0] - b[0]).forEach((it) => it[1]());
      for (const b of S.beams) { g.fillStyle = `rgba(255,236,120,${Math.min(1, b.t * 4)})`; g.fillRect(Math.round(cx(b.col)) - 7, L.gy, 14, py(b.row) - L.gy); }
      for (const a of S.g.arrows) { g.fillStyle = a.shot === 'es' ? '#9fe8ff' : a.shot === 'bom' ? '#ff8a3d' : '#fff6dc'; g.fillRect(Math.round(cx(a.col)) - 2, Math.round(py(a.y)) - 8, 4, 12); g.fillStyle = '#ffd54a'; g.fillRect(Math.round(cx(a.col)) - 2, Math.round(py(a.y)) - 8, 4, 4); }
      for (const p of S.g.pickups) drawStarPickup(g, p);
      drawCastle(g);
      M.fx.draw(g);
      g.restore();
      drawHud(g); drawTray(g);
      drawOverlays(g);
      M.drawToast(g, TOP + 6);
    },
    tap(x, y) {
      if (!S || S.state !== 'play') return;
      const gm = S.g;
      // Bintang lebih dulu: area sentuhnya lebih besar dari petak.
      let best = null, bd = 30;
      for (const p of gm.pickups) { const d = Math.hypot(x - (L.gx + p.x * CW), y - py(p.y)); if (d < bd) { bd = d; best = p; } }
      if (best) { Sim.collect(gm, best); return; }
      const c = Math.floor((x - L.gx) / CW), r = Math.floor((y - L.gy) / L.ch);
      if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return;
      if (!S.sel) { if (!gm.grid[r][c]) say('Pilih kartu pasukan dulu, ya.', 1400); return; }
      const why = Sim.place(gm, S.sel, c, r);
      if (why === 'bintang') say('Bintang belum cukup. Ketuk bintang yang jatuh!', 1800);
      else if (why === 'isi_ulang') say('Kartunya sedang diisi ulang.', 1200);
      else if (why === 'penuh') say('Petak ini sudah terisi.', 1200);
      for (const e of gm.events) handle(e);
      gm.events.length = 0;
    },
  });

  MH3.defense = { state: () => S, layout: () => L, addKeys, keys: () => { if (M.save && M.save.active) return M.save.keys(); try { return +localStorage.getItem(KEYS) || 0; } catch (e) { return 0; } } };
})();
