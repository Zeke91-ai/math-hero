// Math Hero 3: adegan Kejar (platformer layar tegak). Menggambar sim.js dan membaca panah kiri/kanan + tombol Lompat.
// Mulai: MH3.plat.start(levelDef, onWin, onLose)  atau  M.go('plat', { level: 1, onEnd })
// Peti (PR) tidak menghalangi: menyentuhnya membuka kartu PR (MH3.homework). Peti Kekuatan -> pilih 1 dari 3 kekuatan,
// Peti Kristal -> 1 sampai 3 Kunci Kristal. opts.onChest(kind, id, g) bila ada menggantikan perilaku ini.
(function () {
  const M = window.MH2;
  const MH3 = window.MH3 = window.MH3 || {};
  const Sim = MH3.platSim, Lv = MH3.platLevels, Ph = window.Physics;
  const T = Ph.T, SC = 1.3, HUD = 56, PAD_H = 112;
  let S = null;
  const grade = () => (M.save && M.save.active && M.save.active.grade) || 2;
  const POWERS = [
    { key: 'djump', nama: 'Lompat ganda', info: 'Lompat sekali lagi di udara', color: 'red' },
    { key: 'magnet', nama: 'Magnet bintang', info: 'Bintang di sekitar tertarik ke kamu', color: 'yellow' },
    { key: 'shield', nama: 'Perisai', info: 'Menahan satu pukulan', color: 'teal' },
  ];

  const heroKey = () => (M.save && M.save.active && M.save.active.hero) || 'pinki';
  const say = (t, ms, c) => M.toast(t, ms, c);
  const viewH = () => M.VH - HUD - PAD_H;

  function handle(e) {
    const a = M.audio, fx = M.fx;
    const sx = (x) => (x - S.cam.x) * SC, sy = (y) => HUD + (y - S.cam.y) * SC;
    if (e.type === 'jump' || e.type === 'djump') a.sfx('lompat');
    else if (e.type === 'star') { a.sfx('ambil'); fx.float('+1', sx(e.x), sy(e.y), '#ffd54a', 16); fx.pop(sx(e.x), sy(e.y)); }
    else if (e.type === 'stomp') { a.sfx('pop'); fx.burst(sx(e.x), sy(e.y), { n: 10, speed: 110, color: ['#fff6dc', '#b38cff'], life: 0.4 }); }
    else if (e.type === 'hurt') { a.sfx('hit'); S.shake = 0.3; M.flash('#ff6b6b', 0.3); }
    else if (e.type === 'respawn') say('Ulang dari bendera terakhir, ya!', 1800);
    else if (e.type === 'checkpoint') { a.sfx('kartu'); say('Bendera! Kamu mulai dari sini kalau jatuh.', 1800, '#e3ffe6'); }
    else if (e.type === 'power') say({ djump: 'Lompat ganda!', magnet: 'Magnet bintang!', shield: 'Perisai!' }[e.key] || 'Kekuatan!', 1800);
    else if (e.type === 'spring' || e.type === 'dash') { a.sfx('boost'); fx.burst(sx(e.x), sy(e.y), { n: 8, speed: 90, color: ['#ffd54a', '#fff6dc'], life: 0.3 }); }
    else if (e.type === 'pipeIn' || e.type === 'pipeOut') a.sfx('hop');
    else if (e.type === 'lever' || e.type === 'plate') a.sfx('klik');
    else if (e.type === 'gateOpen') { a.sfx('naik'); if (!S.gateHint) { S.gateHint = true; say('Gerbang terbuka!', 1500, '#e3ffe6'); } }
    else if (e.type === 'gateClose') a.sfx('klik');
    else if (e.type === 'crumble') fx.burst(sx(e.x + 16), sy(e.y + 6), { n: 8, speed: 70, color: ['#c48a4a', '#7a4a2a'], life: 0.4 });
    else if (e.type === 'boxReset') say('Kotak kembali ke tempat awal.', 1600);
    else if (e.type === 'quiz') quiz(e);
    else if (e.type === 'chest') chest(e);
    else if (e.type === 'win') { a.sfx('benar'); fx.confetti(); }
  }
  function chest(e) {
    const f = S.opts.onChest;
    if (f) { f(e.kind, e.id, S.g); return; }
    const ch = S.g.L.chests[e.id], power = e.kind === 'power';
    S.state = 'card';
    MH3.homework.open({ grade: grade(), tier: S.def.tier || 0, title: power ? 'Peti Kekuatan' : 'Peti Kristal' }, (r) => {
      M.setControls({ arrows: true, a: 'Lompat', b: null });
      if (r.status !== 'done') { ch.got = false; ch.skip = true; S.state = 'play'; say('Peti disimpan. Sentuh lagi kalau sudah siap.', 2200); return; }
      M.audio.sfx('benar');
      if (power) S.state = 'power';
      else {
        S.state = 'play'; S.keys = (S.keys || 0) + Math.max(1, Math.min(3, r.stars));
        MH3.defense.addKeys(Math.max(1, Math.min(3, r.stars))); M.fx.confetti();
        say(`Dapat ${Math.max(1, Math.min(3, r.stars))} Kunci Kristal!`, 2000, '#e3ffe6');
      }
    });
  }

  // Tuas atau tombol macet: kartu PR. Benar -> benda bekerja; ditunda -> tetap macet, sentuh lagi nanti.
  function quiz(e) {
    if (S.opts.onQuiz) { S.opts.onQuiz(e, S.g); return; }
    S.state = 'card'; a0().sfx('awas');
    MH3.homework.open({ grade: grade(), tier: S.def.tier || 0, title: e.what === 'lever' ? 'Tuas macet!' : 'Tombol macet!' }, (r) => {
      M.setControls({ arrows: true, a: 'Lompat', b: null });
      S.state = 'play';
      if (r.status !== 'done') { say('Masih macet. Sentuh lagi kalau sudah siap.', 2200); return; }
      Sim.solveQuiz(S.g, e.what, e.id);
      say(e.what === 'lever' ? 'Tuas bisa ditarik!' : 'Tombol bisa ditekan!', 1800, '#e3ffe6');
    });
  }
  const a0 = () => M.audio;

  function updateCam(dt, snap) {
    const g = S.g, p = g.p, L = g.L, vw = M.VW / SC, vh = viewH() / SC;
    const tx = Math.max(0, Math.min(L.cols * T - vw, p.x + p.w / 2 - vw * 0.42 + g.face * 20));
    const ty = Math.max(0, Math.min(L.rows * T - vh, p.y + p.h / 2 - vh * 0.6));
    if (snap) { S.cam.x = tx; S.cam.y = ty; } else { S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 5); }
  }

  // Tile per tema dari tileset CraftPix (16 px sumber, digambar 32 px). 'grass': blok 3x3 berautotile.
  // 'bars': potongan tepi atas + isi. Sama dengan tema MH1 (public/js/render.js) supaya seri terlihat satu keluarga.
  const TILE = {
    padang: { kind: 'grass', ox: 0, oy: 0, plank: [12, 8], wood: ['#8a5a2b', '#c48a4a'] },
    kebun: { kind: 'grass', ox: 6, oy: 0, plank: [12, 8], wood: ['#7a4a2a', '#b8743c'] },
    gua: { kind: 'bars', top: [[7, 4], [8, 4]], capL: [6, 4], capR: [9, 4], fill: [[0, 4], [1, 4], [2, 5], [3, 5], [4, 4], [0, 6]], plank: [12, 9], wood: ['#5d6278', '#9aa0b4'] },
    langit: { kind: 'bars', top: [[13, 0]], capL: [12, 0], capR: [14, 0], fill: [[13, 1], [14, 1], [13, 2], [14, 2]], plank: [12, 9], wood: ['#6b7a99', '#c8d3e6'] },
  };
  const CH_COL = ['#ff5d73', '#4b9cff', '#ffd54a'], CH_DARK = ['#a3283d', '#2d5fb4', '#b8860b'];
  const theme = () => TILE[S.def.tema] || TILE.padang;

  function solidAt(L, c, r) {
    if (c < 0 || c >= L.cols || r >= L.rows) return true;
    if (r < 0) return false;
    return L.tiles[r * L.cols + c] === 1 && !S.gateCell.has(r * L.cols + c);
  }
  function drawTile(g, L, c, r) {
    const th = theme(), x = c * T, y = r * T;
    const up = solidAt(L, c, r - 1), dn = solidAt(L, c, r + 1), lf = solidAt(L, c - 1, r), rt = solidAt(L, c + 1, r);
    let p;
    if (th.kind === 'grass') p = [th.ox + (!lf ? 0 : !rt ? 2 : 1), th.oy + (!up ? 0 : !dn ? 2 : 1)];
    else if (!up) p = !lf ? th.capL : !rt ? th.capR : th.top[c % th.top.length];
    else p = th.fill[((c & 1) + (r & 1) * 2 + (c % 5 === 0 ? 1 : 0)) % th.fill.length];
    M.tile1(g, p[0], p[1], x, y);
  }
  function drawPlank(g, x, y, w) {
    const th = theme(), n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) {
      let p;
      if (th.kind === 'grass') p = [th.ox + (i === 0 ? 0 : i === n - 1 ? 2 : 1), th.oy];
      else p = i === 0 ? th.capL : i === n - 1 ? th.capR : th.top[i % th.top.length];
      M.tile1(g, p[0], p[1], x + i * T, y, T);
    }
  }
  // Papan tipis (platform gerak): potongan papan tileset 16x8 sumber, sama seperti platform gerak MH1.
  function drawBoard(g, x, y, w) {
    const p = theme().plank, n = Math.max(1, Math.round(w / T));
    for (let i = 0; i < n; i++) M.tile1Part(g, p[0], p[1], 16, 8, x + i * T, y - 2, T, 16);
  }
  function drawLadder(g, c, r) {
    const [dk, lt] = theme().wood, x = c * T, y = r * T;
    g.fillStyle = dk; g.fillRect(x + 5, y, 5, T); g.fillRect(x + T - 10, y, 5, T);
    g.fillStyle = lt; g.fillRect(x + 6, y, 2, T); g.fillRect(x + T - 9, y, 2, T);
    for (let k = 0; k < 2; k++) { g.fillStyle = dk; g.fillRect(x + 8, y + 6 + k * 16, T - 16, 5); g.fillStyle = lt; g.fillRect(x + 8, y + 6 + k * 16, T - 16, 2); }
  }
  function drawPipe(g, pp) {
    const a = { x: pp.a.x + T / 2, y: pp.a.y + T / 2 }, b = { x: pp.b.x + T / 2, y: pp.b.y + T / 2 };
    const path = [a, { x: b.x, y: a.y }, b];
    for (const [w, col] of [[26, '#3e4a66'], [20, '#7f8fb0'], [6, '#c8d3e6']]) {
      g.strokeStyle = col; g.lineWidth = w; g.lineJoin = 'round'; g.beginPath(); g.moveTo(path[0].x, path[0].y);
      for (const q of path.slice(1)) g.lineTo(q.x, q.y); g.stroke();
    }
    for (const m of [pp.a, pp.b]) {
      M.box(g, m.x - 2, m.y + 2, T + 4, T - 2, m === pp.a ? '#5fd068' : '#64e3ff', { line: '#1d1438' });
      g.fillStyle = '#1d1438'; g.fillRect(m.x + 6, m.y + 8, T - 12, T - 10);
    }
  }
  function drawGate(g, gt, L) {
    const x = gt.c * T, y = gt.r * T, col = CH_COL[gt.ch];
    if (gt.open) { g.strokeStyle = col; g.globalAlpha = 0.35; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, T - 6, T - 6); g.globalAlpha = 1; return; }
    g.fillStyle = CH_DARK[gt.ch]; g.fillRect(x, y, T, T);
    g.fillStyle = col; for (let k = 0; k < 4; k++) g.fillRect(x + 2 + k * 8, y + 2, 4, T - 4);
    g.fillStyle = '#1d1438'; g.fillRect(x, y, T, 3); g.fillRect(x, y + T - 3, T, 3);
    // kepala dan kaki gerbang di ujung atas/bawah deretan
    if (!L.gates.some((o) => o.c === gt.c && o.r === gt.r - 1)) { g.fillStyle = '#3a3346'; g.fillRect(x - 2, y - 4, T + 4, 6); }
  }
  function drawSwitches(g, L) {
    for (const pl of L.plates) {
      const cx = pl.x + pl.w / 2, by = pl.y + pl.h;
      g.fillStyle = '#3a3346'; g.fillRect(pl.x - 2, by - 4, pl.w + 4, 4);
      g.fillStyle = pl.down ? CH_DARK[pl.ch] : CH_COL[pl.ch]; g.fillRect(cx - 9, by - (pl.down ? 6 : 10), 18, pl.down ? 2 : 6);
    }
    for (const lv of L.levers) {
      const bx = lv.x + lv.w / 2, by = lv.y + lv.h;
      g.strokeStyle = '#3a3346'; g.lineWidth = 4; g.beginPath(); g.moveTo(bx, by - 6); g.lineTo(bx + (lv.on ? 11 : -11), by - 24); g.stroke();
      g.fillStyle = CH_COL[lv.ch]; g.beginPath(); g.arc(bx + (lv.on ? 11 : -11), by - 25, 5, 0, 7); g.fill();
      M.box(g, bx - 10, by - 8, 20, 8, '#6b6478', { line: '#1d1438', shade: false });
      if (lv.stuck) stuckMark(g, bx, by - 40);
    }
    for (const pl of L.plates) if (pl.stuck) stuckMark(g, pl.x + pl.w / 2, pl.y - 26);
  }

  // Tanda benda macet: gembok kecil dengan tanda tanya yang berkedip pelan.
  function stuckMark(g, x, y) {
    const k = 0.75 + Math.sin(M.t * 4) * 0.25;
    g.globalAlpha = k;
    g.strokeStyle = '#1d1438'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - 4, 6, Math.PI, 0); g.stroke();
    M.box(g, x - 10, y - 4, 20, 16, '#ffd54a', { line: '#1d1438', shade: false });
    M.text(g, '?', x, y + 10, { size: 13, align: 'center', color: '#2b1d52', outline: false });
    g.globalAlpha = 1;
  }

  function drawWorld(g) {
    const gm = S.g, L = gm.L, cam = S.cam, vw = M.VW / SC, vh = viewH() / SC;
    g.save(); g.beginPath(); g.rect(0, HUD, M.VW, viewH()); g.clip();
    g.translate(0, HUD); g.scale(SC, SC); g.translate(-Math.round(cam.x), -Math.round(cam.y));
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(L.cols - 1, Math.floor((cam.x + vw) / T) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(L.rows - 1, Math.floor((cam.y + vh) / T) + 1);
    for (const pp of L.pipes) drawPipe(g, pp);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const i = r * L.cols + c;
      if (L.lad[i]) drawLadder(g, c, r);
      const t = L.tiles[i];
      if (!t || S.gateCell.has(i)) continue;
      if (t === 2) { drawPlank(g, c * T, r * T, T); continue; }
      drawTile(g, L, c, r);
    }
    for (const k of L.cracks) {
      if (L.tiles[k.r * L.cols + k.c] !== 1) continue;
      const x = k.c * T, y = k.r * T;
      g.strokeStyle = 'rgba(29,20,56,0.75)'; g.lineWidth = 2; g.beginPath();
      g.moveTo(x + 6, y + 4); g.lineTo(x + 14, y + 14); g.lineTo(x + 10, y + 22); g.lineTo(x + 18, y + 29);
      g.moveTo(x + 14, y + 14); g.lineTo(x + 25, y + 11); g.stroke();
    }
    for (const gt of L.gates) drawGate(g, gt, L);
    for (const m of L.movers) {
      drawBoard(g, m.x, m.y, m.w);
      if (m.axis === 'y') { g.fillStyle = 'rgba(58,51,70,0.5)'; g.fillRect(m.x + m.w / 2 - 1, m.y0, 2, m.y1 - m.y0); }
    }
    for (const c of L.crumbles) {
      if (c.state === 'gone') continue;
      const j = c.state === 'shake' ? Math.round(Math.sin(M.t * 60) * 1.5) : 0;
      g.fillStyle = '#7a4a2a'; g.fillRect(c.x + j, c.y, T, 10); g.fillStyle = '#c48a4a'; g.fillRect(c.x + j, c.y, T, 4);
      g.fillStyle = '#4a2a14'; g.fillRect(c.x + j + 10, c.y + 4, 2, 6); g.fillRect(c.x + j + 22, c.y + 2, 2, 5);
    }
    for (const s of L.springs) M.spr1(g, 'trap1', s.t > 0 ? Math.floor((0.4 - s.t) / 0.4 * 7) : 0, s.x + s.w / 2, s.y + s.h, { scale: 1 });
    for (const d of L.dashes) {
      M.box(g, d.x, d.y + 10, d.w, d.h - 10, d.t > 0 ? '#ffd54a' : '#ff9f43', { line: '#1d1438' });
      M.text(g, d.dir > 0 ? '»' : '«', d.x + d.w / 2, d.y + d.h - 3, { size: 18, align: 'center' });
    }
    drawSwitches(g, L);
    for (const b of gm.boxes) M.spr1(g, 'box1_idle', 0, b.x + b.w / 2, b.y + b.h, { scale: 1.36 });
    for (const s of L.saws) M.spr1(g, 'trap2', Math.floor(M.t * 14) % 7, s.cx, s.cy, { scale: 1, anchor: 'center' });
    for (const s of L.spikes) { g.fillStyle = '#cfd3e6'; for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(s.x + i * 8.6, s.y + s.h); g.lineTo(s.x + i * 8.6 + 4.3, s.y); g.lineTo(s.x + i * 8.6 + 8.6, s.y + s.h); g.fill(); } }
    for (const c of L.checkpoints) { g.fillStyle = '#3a3346'; g.fillRect(c.x - 2, c.y - 46, 4, 46); g.fillStyle = c.got ? '#5fd068' : '#ff6b6b'; g.fillRect(c.x + 2, c.y - 46, 20, 14); }
    for (const ch of L.chests) {
      if (ch.got) continue;
      const bob = Math.sin(M.t * 4 + ch.id) * 2;
      g.fillStyle = 'rgba(255,213,74,0.28)'; g.beginPath(); g.arc(ch.x + ch.w / 2, ch.y + ch.h / 2 + bob, 24, 0, 7); g.fill();
      M.box(g, ch.x + 2, ch.y + 8 + bob, ch.w - 4, ch.h - 12, ch.kind === 'power' ? '#ffb347' : '#64e3ff', { line: '#2b1d52' });
      M.text(g, ch.kind === 'power' ? '?' : '◆', ch.x + ch.w / 2, ch.y + ch.h / 2 + 8 + bob, { size: 18, align: 'center' });
    }
    for (const s of L.stars) if (!s.got) M.art(g, 'bintang', s.x - 11 * 1.3, s.y - 11 * 1.3 + Math.sin(M.t * 5 + s.id) * 2, 2.6);
    // tujuan: kristal
    { const gl = L.goal, bob = Math.sin(M.t * 3) * 3; g.fillStyle = 'rgba(100,227,255,0.25)'; g.beginPath(); g.arc(gl.x + gl.w / 2, gl.y + gl.h / 2, 36, 0, 7); g.fill(); M.art(g, 'kristal', gl.x + gl.w / 2 - 12 * 2.4, gl.y + 4 + bob, 4.5); }
    for (const e of gm.enemies) {
      const b = e.b, f = M.t * 9 + e.id;
      if (e.dead) { if (e.timer > 0) M.spr1(g, 'enemy1_hit', 2, b.x + b.w / 2, b.y + b.h + 2, { scale: 1.2, alpha: Math.max(0, e.timer * 2.5) }); continue; }
      M.spr1(g, 'enemy1_run', f, b.x + b.w / 2, b.y + b.h + 2, { scale: 1.2, flip: e.dir > 0 });
    }
    const p = gm.p;
    const blink = gm.invuln > 0 && Math.floor(M.t * 14) % 2;
    if (!gm.pipe && !blink) M.hero(g, heroKey(), gm.anim, M.t, p.x + p.w / 2, p.y + p.h + 2, { scale: 1.5, flip: gm.face < 0, frame: gm.climb && !p.vy ? 0 : undefined });
    if (gm.power === 'shield' && !gm.pipe) { g.strokeStyle = 'rgba(100,227,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(p.x + p.w / 2, p.y + p.h / 2, 38, 0, 7); g.stroke(); }
    g.restore();
  }
  function drawHud(g) {
    const gm = S.g;
    M.box(g, 0, 0, M.VW, HUD - 6, '#2b1d52', { line: '#1d1438', shade: false });
    M.hearts(g, 8, 8, gm.hearts, Sim.HEARTS, 2.4);
    M.art(g, 'bintang', 10, 33, 2);
    M.text(g, `${gm.stars}/${gm.L.stars.length}`, 38, 43, { size: 18, color: '#ffd54a' });
    M.text(g, S.def.nama, M.VW / 2 + 22, 30, { size: 14, align: 'center', color: '#b8f4ff' });
    if (gm.power) M.text(g, { djump: 'Lompat ganda', magnet: 'Magnet', shield: 'Perisai' }[gm.power], M.VW / 2 + 22, 47, { size: 12, align: 'center', color: '#ffd54a' });
    M.button(g, { id: 'jeda', x: M.VW - 46, y: 4, w: 38, h: 38, color: 'purple', icon: 'pause', onTap: () => { if (S.state === 'play') S.state = 'pause'; } });
    M.text(g, `Bonus ${S.bonus.value()}`, M.VW - 8, 46, { size: 11, align: 'right', color: '#cbbcff' });
  }
  function drawEnd(g) {
    const gm = S.g, k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.7 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.2, w = M.VW - 60;
    // Sampai 4 baris info (bintang, bonus, jatuh, kunci) di atas; posisi tombol tetap.
    const info = [[`Bintang: ${gm.stars} dari ${gm.L.stars.length}`, 16, '#2b1d52'],
      [`Bonus waktu: +${S.bonus.value()} (${window.TimeBonus.clock(S.bonus.seconds())})`, 14, '#2b1d52']];
    if (gm.deaths) info.push([`Kamu jatuh ${gm.deaths}x, tapi tidak menyerah!`, 13, '#6b6478']);
    if (S.keys) info.push([`Kunci Kristal: ${S.keys}`, 14, '#8a5a00']);
    M.panel(g, x, y, w, 354, { title: 'Kristal direbut!' });
    M.stars(g, M.VW / 2, y + 40, Sim.rating(gm), 4);
    info.forEach((r, i) => M.text(g, r[0], M.VW / 2, y + 112 + i * 22, { size: r[1], align: 'center', color: r[2], outline: false }));
    M.button(g, { id: 'ulang', x: x + 30, y: y + 212, w: w - 60, h: 52, label: 'Main lagi', color: 'green', onTap: () => M.go('plat', S.params) });
    M.button(g, { id: 'lanjutend', x: x + 30, y: y + 280, w: w - 60, h: 52, label: S.params.onEnd || S.params.onWin ? 'Lanjut' : 'Ke judul', color: 'blue', onTap: finish });
  }
  function finish() {
    const gm = S.g, P = S.params;
    const res = { win: true, stars: Sim.rating(gm), collected: gm.stars, keys: S.keys, bonus: S.bonus.value(), seconds: S.bonus.seconds(), hearts: gm.hearts, deaths: gm.deaths, level: S.def.id };
    if (P.onEnd) P.onEnd(res); else if (P.onWin) P.onWin(res); else M.go('title');
  }
  function quit() {
    const P = S.params, gm = S.g;
    if (P.onLose) P.onLose({ win: false, level: S.def.id, collected: gm.stars }); else if (P.onEnd) P.onEnd({ win: false, stars: 0, level: S.def.id }); else M.go('title');
  }

  M.register('plat', {
    enter(p) {
      const def = p.def || Lv.level(p.level || 1);
      S = { def, params: p, opts: p, g: Sim.create(def), cam: { x: 0, y: 0 }, state: 'play', endT: 0, shake: 0, keys: 0, bonus: window.TimeBonus.forGame('mh3') };
      S.gateCell = new Set(S.g.L.gates.map((gt) => gt.r * S.g.L.cols + gt.c));
      updateCam(0, true);
      M.setControls({ arrows: true, a: 'Lompat', b: null });
      M.audio.music('padang');
    },
    exit() { M.setControls(null); M.audio.setPaused(false); },
    resize() { if (S) updateCam(0, true); },
    blur() { if (S && S.state === 'play') S.state = 'pause'; },
    update(dt) {
      if (!S) return;
      S.shake = Math.max(0, S.shake - dt);
      if (S.state === 'end') { S.endT += dt; return; }
      if (S.state !== 'play') return;
      const I = M.input;
      if (I.pause) { S.state = 'pause'; return; }
      // Tombol Lompat: A (juga B); layar tidak dipakai supaya jempol tidak meleset ke tombol lain.
      S.bonus.tick(dt); // hanya saat state 'play': kartu PR (overlay), jeda, pilih kekuatan, dan layar hasil tidak menghitung
      Sim.update(S.g, dt, { dir: (I.rHold ? 1 : 0) - (I.lHold ? 1 : 0) || Math.sign(I.x), jump: I.aHit || I.bHit, jumpHeld: I.a || I.b, up: I.y < 0, down: I.y > 0 });
      for (const e of S.g.events) handle(e);
      S.g.events.length = 0;
      updateCam(dt, false);
      if (S.g.phase === 'won') { S.state = 'end'; S.endT = 0; M.setControls(null); }
    },
    draw(g) {
      if (!S) return;
      M.drawBg(g, S.def.tema, S.cam.x, S.cam.y);
      g.save();
      if (S.shake > 0 && !M.reduceMotion) g.translate(Math.round((Math.random() - 0.5) * 6), Math.round((Math.random() - 0.5) * 5));
      drawWorld(g);
      M.fx.draw(g);
      g.restore();
      drawHud(g);
      if (S.state === 'pause') {
        g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
        const x = 40, y = M.VH * 0.3, w = M.VW - 80, on = M.audio.prefs.music;
        M.panel(g, x, y, w, 240, { title: 'Jeda' });
        M.button(g, { id: 'lanjut', x: x + 30, y: y + 36, w: w - 60, h: 52, label: 'Lanjut', color: 'green', onTap: () => { S.state = 'play'; } });
        M.button(g, { id: 'suara', x: x + 30, y: y + 100, w: w - 60, h: 52, label: on ? 'Suara: nyala' : 'Suara: mati', color: on ? 'purple' : 'gray', size: 16, onTap: () => { M.audio.setMusicOn(!on); M.audio.setSfxOn(!on); } });
        M.button(g, { id: 'keluar', x: x + 30, y: y + 164, w: w - 60, h: 52, label: 'Keluar', color: 'blue', onTap: quit });
      }
      if (S.state === 'power') {
        g.fillStyle = 'rgba(29,20,56,0.7)'; g.fillRect(0, 0, M.VW, M.VH);
        const x = 24, y = M.VH * 0.22, w = M.VW - 48;
        M.panel(g, x, y, w, 330, { title: 'Pilih kekuatan!' });
        POWERS.forEach((p, i) => {
          M.button(g, { id: 'p_' + p.key, x: x + 16, y: y + 28 + i * 92, w: w - 32, h: 80, color: p.color, label: '', onTap: () => { Sim.grantPower(S.g, p.key); S.state = 'play'; },
            draw: (c, bx, by, bw) => { M.text(c, p.nama, bx + bw / 2, by + 26, { size: 22, align: 'center' }); M.text(c, p.info, bx + bw / 2, by + 56, { size: 13, align: 'center', maxW: bw - 20 }); } });
        });
      }
      if (S.state === 'end') drawEnd(g);
      M.drawToast(g, HUD + 6);
    },
  });

  MH3.plat = {
    state: () => S,
    start(def, onWin, onLose, extra) { M.go('plat', Object.assign({ def, onWin, onLose }, extra || {})); },
  };
})();
