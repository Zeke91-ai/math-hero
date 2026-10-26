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

  function updateCam(dt, snap) {
    const g = S.g, p = g.p, L = g.L, vw = M.VW / SC, vh = viewH() / SC;
    const tx = Math.max(0, Math.min(L.cols * T - vw, p.x + p.w / 2 - vw * 0.42 + g.face * 20));
    const ty = Math.max(0, Math.min(L.rows * T - vh, p.y + p.h / 2 - vh * 0.6));
    if (snap) { S.cam.x = tx; S.cam.y = ty; } else { S.cam.x += (tx - S.cam.x) * Math.min(1, dt * 8); S.cam.y += (ty - S.cam.y) * Math.min(1, dt * 5); }
  }

  function drawWorld(g) {
    const gm = S.g, L = gm.L, cam = S.cam, vw = M.VW / SC, vh = viewH() / SC;
    g.save(); g.beginPath(); g.rect(0, HUD, M.VW, viewH()); g.clip();
    g.translate(0, HUD); g.scale(SC, SC); g.translate(-Math.round(cam.x), -Math.round(cam.y));
    const c0 = Math.max(0, Math.floor(cam.x / T)), c1 = Math.min(L.cols - 1, Math.floor((cam.x + vw) / T) + 1);
    const r0 = Math.max(0, Math.floor(cam.y / T)), r1 = Math.min(L.rows - 1, Math.floor((cam.y + vh) / T) + 1);
    for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) {
      const t = L.tiles[r * L.cols + c];
      if (!t) continue;
      const x = c * T, y = r * T;
      if (t === 2) { g.fillStyle = '#c28a4a'; g.fillRect(x, y, T, 10); g.fillStyle = '#e8b36b'; g.fillRect(x, y, T, 4); continue; }
      const top = L.tiles[(r - 1) * L.cols + c] !== 1;
      g.fillStyle = S.def.tema === 'gua' ? '#4a3a6e' : '#7a5230'; g.fillRect(x, y, T, T);
      g.fillStyle = 'rgba(0,0,0,0.14)'; g.fillRect(x, y + T - 4, T, 4); g.fillRect(x + T - 3, y, 3, T);
      if (top) { g.fillStyle = '#5fd068'; g.fillRect(x, y, T, 9); g.fillStyle = '#8be98f'; g.fillRect(x, y, T, 3); }
    }
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
    if (!(gm.invuln > 0 && Math.floor(M.t * 14) % 2)) M.hero(g, heroKey(), gm.anim, M.t, p.x + p.w / 2, p.y + p.h + 2, { scale: 1.5, flip: gm.face < 0 });
    if (gm.power === 'shield') { g.strokeStyle = 'rgba(100,227,255,0.8)'; g.lineWidth = 3; g.beginPath(); g.arc(p.x + p.w / 2, p.y + p.h / 2, 38, 0, 7); g.stroke(); }
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
  }
  function drawEnd(g) {
    const gm = S.g, k = M.ease(S.endT * 2);
    g.fillStyle = `rgba(29,20,56,${0.7 * k})`; g.fillRect(0, 0, M.VW, M.VH);
    const x = 30, y = M.VH * 0.2, w = M.VW - 60;
    M.panel(g, x, y, w, 330, { title: 'Kristal direbut!' });
    M.stars(g, M.VW / 2, y + 40, Sim.rating(gm), 4);
    M.text(g, `Bintang: ${gm.stars} dari ${gm.L.stars.length}`, M.VW / 2, y + 114, { size: 16, align: 'center', color: '#2b1d52', outline: false });
    if (S.keys) M.text(g, `Kunci Kristal: ${S.keys}`, M.VW / 2, y + 140 + (gm.deaths ? 18 : 0), { size: 14, align: 'center', color: '#8a5a00', outline: false });
    if (gm.deaths) M.text(g, `Kamu jatuh ${gm.deaths}x, tapi tidak menyerah!`, M.VW / 2, y + 140, { size: 13, align: 'center', color: '#6b6478', outline: false });
    M.button(g, { id: 'ulang', x: x + 30, y: y + 168, w: w - 60, h: 52, label: 'Main lagi', color: 'green', onTap: () => M.go('plat', S.params) });
    M.button(g, { id: 'lanjutend', x: x + 30, y: y + 236, w: w - 60, h: 52, label: S.params.onEnd || S.params.onWin ? 'Lanjut' : 'Ke judul', color: 'blue', onTap: finish });
  }
  function finish() {
    const gm = S.g, P = S.params;
    const res = { win: true, stars: Sim.rating(gm), collected: gm.stars, keys: S.keys, hearts: gm.hearts, deaths: gm.deaths, level: S.def.id };
    if (P.onEnd) P.onEnd(res); else if (P.onWin) P.onWin(res); else M.go('title');
  }
  function quit() {
    const P = S.params, gm = S.g;
    if (P.onLose) P.onLose({ win: false, level: S.def.id, collected: gm.stars }); else if (P.onEnd) P.onEnd({ win: false, stars: 0, level: S.def.id }); else M.go('title');
  }

  M.register('plat', {
    enter(p) {
      const def = p.def || Lv.level(p.level || 1);
      S = { def, params: p, opts: p, g: Sim.create(def), cam: { x: 0, y: 0 }, state: 'play', endT: 0, shake: 0, keys: 0 };
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
      Sim.update(S.g, dt, { dir: (I.rHold ? 1 : 0) - (I.lHold ? 1 : 0) || Math.sign(I.x), jump: I.aHit || I.bHit, jumpHeld: I.a || I.b });
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
