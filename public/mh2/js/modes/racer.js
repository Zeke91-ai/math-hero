// Mode "Balap Hitung": balapan jalan 3 lajur bergaya pseudo-3D melawan hewan-hewan pembalap.
// Soal muncul di papan atas; gerbang jawaban datang dari kejauhan. Pindah lajur (joystick) ke gerbang yang benar
// untuk TURBO; gerbang salah membuat kart melambat dan Peri menjelaskan caranya. A = lompat (menghindari batu).
// Konsep: kelancaran berhitung (tambah, kurang, puluhan, kali, bagi) dan membandingkan bilangan (<, =, >).
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const Z0 = 160;          // jarak terdekat yang tampak di layar
  const FAR = 3200;        // jarak terjauh
  const GAP = 1900;        // jarak antar gerbang
  const BASE = 330;        // kecepatan dasar

  const GROUND = {
    padang: ['#6cc46a', '#5db35c'], pantai: ['#f2d58a', '#e8c877'], kebun: ['#9cc65a', '#8db84c'], gua: ['#3a2a5e', '#33244f'],
    kota: ['#8f5a9e', '#7f4f8d'], benteng: ['#2c2050', '#251a45'], langit: ['#6cc46a', '#5db35c'], angkasa: ['#2c2050', '#251a45'],
  };
  const NAMA = { kelinci: 'Kelinci', rubah: 'Rubah', rusa: 'Rusa', babi: 'Babi Hutan', prof: 'Profesor' };

  M.Modes.racer = {
    nama: 'Balap Hitung',
    concept(cfg) {
      const cmp = (cfg.ops || []).includes('compare');
      return {
        judul: cmp ? 'Turbo dengan jawaban benar' : 'Hitung cepat, ngebut tepat!',
        baris: cmp ? ['Pindah lajur ke gerbang yang benar.', 'Untuk < dan >: mulut buaya menghadap yang lebih besar.', 'Jawaban benar = TURBO!'] : ['Soal muncul di papan atas.', 'Pindah lajur (joystick) ke gerbang yang benar.', 'Jawaban benar = TURBO! A = lompati batu.'],
        demo(g, t, x, y, w, h) {
          g.fillStyle = '#6cc46a'; g.fillRect(x, y, w, h);
          g.fillStyle = '#5d6278';
          g.beginPath(); g.moveTo(x + w / 2 - 14, y + 10); g.lineTo(x + w / 2 + 14, y + 10); g.lineTo(x + w - 20, y + h); g.lineTo(x + 20, y + h); g.fill();
          const k = (t % 2.5) / 2.5, gy = y + 20 + k * (h - 60), s = 0.4 + k * 0.9;
          ['12', '15', '13'].forEach((v, i) => {
            const gx = x + w / 2 + (i - 1) * 70 * s;
            M.box(g, gx - 20 * s, gy - 18 * s, 40 * s, 26 * s, i === 1 ? '#5fd068' : '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
            M.text(g, v, gx, gy - 5 * s, { size: Math.max(8, 16 * s), align: 'center', color: '#2b1d52', outline: false });
          });
          M.box(g, x + w / 2 - 50, y + 4, 100, 22, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
          M.text(g, '8 + 7 = ?', x + w / 2, y + 15, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          const lane = k > 0.4 ? 0 : -1;
          M.art(g, 'gerobak', x + w / 2 + lane * 60 - 20, y + h - 26, 2);
        },
      };
    },
    controls() { return { joy: true, a: 'Lompat', b: null }; },
    create(P) {
      const cfg = P.cfg;
      const rivalKeys = [cfg.rival || 'kelinci', ...['kelinci', 'rubah', 'rusa'].filter((k) => k !== cfg.rival)].slice(0, 3);
      const total = P.tasks * GAP + 1400;
      const R = {
        pos: 0, speed: BASE, lane: 0, laneX: 0, boost: 0, slow: 0, jump: 0, inv: 0, curve: 0, curveT: 0,
        gates: [], rocks: [], coins: [], rivals: [], q: null, finished: false, finishT: 0, total,
      };
      // Lawan: yang utama sedikit lebih cepat dari kecepatan dasar, sehingga hanya bisa dikalahkan dengan turbo.
      rivalKeys.forEach((k, i) => R.rivals.push({ key: k, pos: 120 + i * 90, lane: [-1, 1, 0][i], base: BASE * (i === 0 ? (cfg.mustWin ? 1.12 : 1.06) : 0.92 + i * 0.03), main: i === 0 }));
      for (let i = 0; i < P.tasks; i++) {
        const q = C.race(cfg);
        R.gates.push({ z: (i + 1) * GAP, q, done: false });
        // Batu di antara gerbang (tidak di dunia pertama).
        if (P.level.stage > 1 && Math.random() < 0.7) R.rocks.push({ z: (i + 1) * GAP - GAP / 2, lane: M.between(-1, 1), hit: false });
        for (let c = 0; c < 5; c++) R.coins.push({ z: i * GAP + 500 + c * 90, lane: (i % 3) - 1, got: false });
      }
      const horizon = () => Math.round(M.VH * 0.36);
      const bottom = () => M.VH - 150;
      // Kedalaman -> skala layar (0..1).
      const pOf = (d) => Z0 / Math.max(Z0, d);
      const yOf = (p) => horizon() + p * (bottom() - horizon());
      const cxOf = (p) => M.VW / 2 + R.curve * Math.pow(1 - p, 2) * 120 - R.laneX * 110 * p;

      function nextGate() { return R.gates.find((gt) => !gt.done); }
      function passGate(gt) {
        gt.done = true;
        const pick = gt.q.choices[R.lane + 1];
        if (pick === gt.q.answer) {
          R.boost = 2.2; R.slow = 0;
          P.correct({ x: M.VW / 2, y: bottom() - 80, pts: 100, text: 'TURBO!', sfx: 'boost' });
          M.toast(`${gt.q.label.replace('?', gt.q.answer)}`, 1500, '#d8ffd4');
        } else {
          R.slow = 1.6; R.boost = 0;
          P.mistake([`${gt.q.label.replace(' = ?', '')}: jawabannya ${gt.q.answer}, bukan ${pick}.`].concat(gt.q.explain), { soft: true, x: M.VW / 2, y: bottom() - 80, text: 'Pelan...' });
        }
      }
      function rank() { return 1 + R.rivals.filter((r) => r.pos > R.pos).length; }

      return {
        R,
        solve(wrong) {
          const gt = nextGate();
          if (!gt) { R.pos = Math.max(R.pos, R.total - 5); return; }
          const i = gt.q.choices.indexOf(gt.q.answer);
          R.lane = (wrong ? (i + 1) % 3 : i) - 1; R.pos = gt.z - 10;
        },
        update(dt) {
          const I = M.input;
          if (R.finished) {
            R.finishT += dt; R.speed *= Math.pow(0.3, dt); R.pos += R.speed * dt;
            if (R.finishT > 1.4 && !R.reported) {
              R.reported = true;
              const rk = rank();
              if (cfg.mustWin && rk > 1) {
                P.mistake([`${NAMA[cfg.rival] || 'Lawan'} sampai duluan!`, 'Jawaban benar memberi TURBO.', 'Hitung dengan tenang, lalu coba lagi.'], { title: 'Hampir menang!', btn: 'Balapan lagi', after: () => M.go('play', { level: P.level }) });
              } else {
                M.toast(rk === 1 ? 'Juara 1!' : `Posisi ${rk}. Hebat sudah finis!`, 1800, '#fff3c4');
                P.taskDone();
              }
            }
            return;
          }
          if (R.boost > 0) R.boost -= dt;
          if (R.slow > 0) R.slow -= dt;
          if (R.jump > 0) R.jump -= dt;
          if (R.inv > 0) R.inv -= dt;
          // Pindah lajur sekali per dorongan joystick.
          if (Math.abs(I.x) > 0.5 && !R.laneLock) { R.lane = M.clamp(R.lane + Math.sign(I.x), -1, 1); R.laneLock = true; M.sfx('klik'); }
          if (Math.abs(I.x) < 0.3) R.laneLock = false;
          R.laneX += (R.lane - R.laneX) * Math.min(1, dt * 10);
          if (I.aHit && R.jump <= 0) { R.jump = 0.6; M.sfx('lompat'); }
          const target = BASE * (R.boost > 0 ? 1.6 : R.slow > 0 ? 0.55 : 1);
          R.speed += (target - R.speed) * Math.min(1, dt * 2);
          R.pos += R.speed * dt;
          // Tikungan pelan agar jalan terasa hidup.
          R.curveT += dt * 0.25; R.curve = Math.sin(R.curveT) * 0.9;
          for (const rv of R.rivals) {
            const rubber = rv.pos < R.pos - 600 ? 1.15 : rv.pos > R.pos + 900 ? 0.85 : 1;
            rv.pos += rv.base * rubber * (1 + Math.sin(M.t * 0.7 + rv.base) * 0.05) * dt;
          }
          const gt = nextGate();
          if (gt && R.pos >= gt.z) {
            passGate(gt);
            // Tugas terakhir dihitung saat garis finis dilewati, agar balapan selesai dulu.
            if (R.gates.some((x) => !x.done)) P.taskDone();
          }
          for (const rk of R.rocks) {
            if (!rk.hit && Math.abs(R.pos - rk.z) < 30 && rk.lane === R.lane && R.jump <= 0 && R.inv <= 0) {
              rk.hit = true; R.inv = 1; R.slow = 1.2; P.hurt(1, M.VW / 2, bottom() - 30);
            }
          }
          for (const c of R.coins) if (!c.got && Math.abs(R.pos - c.z) < 30 && c.lane === R.lane) { c.got = true; P.addScore(10, M.VW / 2, bottom() - 60); M.sfx('koin'); }
          if (R.pos >= R.total) { R.finished = true; M.sfx(rank() === 1 ? 'naik' : 'benar'); M.fx.confetti(); }
        },
        draw(g) {
          const H = horizon(), B = bottom(), VW = M.VW;
          M.drawBg(g, P.theme, R.curve * 60 + R.pos * 0.02, 0);
          // Jalan: digambar per baris dari cakrawala ke bawah, warna bergantian sesuai jarak agar terasa melaju.
          const gc = GROUND[P.theme] || GROUND.padang;
          for (let y = H; y < M.VH; y += 2) {
            const p = M.clamp((y - H) / (B - H), 0.001, 1.6);
            const z = Z0 / p + R.pos;
            const band = Math.floor(z / 120) % 2;
            g.fillStyle = gc[band]; g.fillRect(0, y, VW, 2);
            const cx = cxOf(Math.min(p, 1.6)), rw = 150 * p;
            g.fillStyle = band ? '#e8e8f0' : '#ff5d73'; g.fillRect(Math.round(cx - rw - 10 * p), y, Math.round(10 * p) + 1, 2); g.fillRect(Math.round(cx + rw), y, Math.round(10 * p) + 1, 2);
            g.fillStyle = band ? '#62677d' : '#5a5f74'; g.fillRect(Math.round(cx - rw), y, Math.round(rw * 2), 2);
            if (band) { g.fillStyle = '#d6d9e8'; g.fillRect(Math.round(cx - rw / 3 - 2 * p), y, Math.max(1, Math.round(4 * p)), 2); g.fillRect(Math.round(cx + rw / 3 - 2 * p), y, Math.max(1, Math.round(4 * p)), 2); }
          }
          const laneScreen = (lane, p) => cxOf(p) + lane * 100 * p;
          // Benda di jalan, dari yang terjauh.
          const items = [];
          for (const gt of R.gates) if (!gt.done) items.push({ z: gt.z, kind: 'gate', o: gt });
          for (const rk of R.rocks) if (!rk.hit) items.push({ z: rk.z, kind: 'rock', o: rk });
          for (const c of R.coins) if (!c.got) items.push({ z: c.z, kind: 'coin', o: c });
          for (const rv of R.rivals) items.push({ z: rv.pos, kind: 'rival', o: rv });
          items.push({ z: R.total, kind: 'finish' });
          items.sort((a, b) => b.z - a.z);
          for (const it of items) {
            const d = it.z - R.pos;
            if (d < Z0 * 0.7 || d > FAR) continue;
            const p = pOf(d), y = yOf(p);
            if (it.kind === 'gate') {
              it.o.q.choices.forEach((v, i) => {
                const x = laneScreen(i - 1, p), w = 84 * p, h = 54 * p;
                g.fillStyle = '#2b1d52'; g.fillRect(Math.round(x - w / 2), Math.round(y - h - 40 * p), Math.max(1, Math.round(5 * p)), Math.round(h + 40 * p)); g.fillRect(Math.round(x + w / 2 - 5 * p), Math.round(y - h - 40 * p), Math.max(1, Math.round(5 * p)), Math.round(h + 40 * p));
                M.box(g, x - w / 2, y - h - 46 * p, w, h, '#fff6dc', { line: '#2b1d52', border: Math.max(1, Math.round(3 * p)), shade: false });
                if (p > 0.12) M.text(g, v, x, y - h / 2 - 46 * p, { size: Math.max(8, Math.round(30 * p)), align: 'center', color: '#2b1d52', outline: false });
              });
            } else if (it.kind === 'rock') {
              M.art(g, 'meteor', laneScreen(it.o.lane, p) - 18 * p * 2, y - 24 * p * 2, Math.max(0.5, 3.5 * p));
            } else if (it.kind === 'coin') {
              M.spr1(g, 'gem4', M.t * 10, laneScreen(it.o.lane, p), y - 20 * p, { scale: Math.max(0.4, 2.4 * p), anchor: 'center' });
            } else if (it.kind === 'rival') {
              const x = laneScreen(it.o.lane, p);
              if (it.o.key === 'prof') { M.art(g, 'gerobak', x - 30 * p * 1.5, y - 30 * p, Math.max(0.4, 3 * p), { swap: { r: '#b38cff', R: '#5b34b8' } }); M.art(g, 'prof', x - 24 * p, y - 70 * p, Math.max(0.3, 3 * p * 0.9)); }
              else M.spr(g, `${it.o.key}_run_u`, M.at(`${it.o.key}_run_u`, M.t, 12), x, y, { scale: Math.max(0.5, 3.4 * p) });
              if (it.o.main && p > 0.15) M.art(g, 'mahkota', x - 12 * p, y - 112 * p, Math.max(0.5, 2.4 * p));
            } else if (it.kind === 'finish') {
              const cx = cxOf(p), rw = 160 * p;
              for (let k = 0; k < 12; k++) { g.fillStyle = k % 2 ? '#fff' : '#1d1438'; g.fillRect(Math.round(cx - rw + k * rw / 6), Math.round(y - 6 * p), Math.ceil(rw / 6), Math.max(2, Math.round(10 * p))); }
              M.text(g, 'FINIS', cx, y - 120 * p, { size: Math.max(10, 40 * p), align: 'center', color: '#ffd54a' });
            }
          }
          // Kart pemain.
          const kx = VW / 2, ky = B + 26 - (R.jump > 0 ? Math.sin(Math.PI * (1 - R.jump / 0.6)) * 40 : 0);
          if (!(R.inv > 0 && Math.floor(M.t * 14) % 2)) {
            M.hero(g, M.save.active ? M.save.active.hero : 'pinki', 'idle', M.t, kx, ky - 22, { scale: 2 });
            M.art(g, 'gerobak', kx - 40, ky - 26, 4);
            if (R.boost > 0) M.fx.burst(kx + M.between(-20, 20), ky + 12, { n: 1, color: ['#ffd54a', '#ff8fab'], speed: 60, up: -60, life: 0.3 });
          }
          // Papan soal dan posisi.
          const gt = nextGate();
          if (gt) P.questionBox(g, gt.q.label, `Gerbang ${R.gates.indexOf(gt) + 1}/${R.gates.length}   Jarak ${Math.max(0, Math.round((gt.z - R.pos) / 10))} m`, { size: 26 });
          else P.questionBox(g, R.finished ? (rank() === 1 ? 'JUARA 1!' : `Posisi ${rank()}`) : 'Menuju garis finis!', null, { size: 22 });
          const by = M.HUD_H + 72;
          M.box(g, 10, by, 108, 28, '#2b1d52', { line: '#fff', border: 2, shade: false });
          M.text(g, `Posisi ${rank()}/${R.rivals.length + 1}`, 64, by + 14, { size: 14, align: 'center', color: '#ffd54a' });
          // Peta mini lintasan.
          const mw = M.VW - 140, mx = 128;
          g.fillStyle = '#2b1d52'; g.fillRect(mx, by + 10, mw, 8);
          for (const rv of R.rivals) { g.fillStyle = rv.main ? '#ff5d73' : '#cbbcff'; g.fillRect(Math.round(mx + mw * M.clamp(rv.pos / R.total, 0, 1)) - 2, by + 6, 4, 16); }
          g.fillStyle = '#ffd54a'; g.fillRect(Math.round(mx + mw * M.clamp(R.pos / R.total, 0, 1)) - 3, by + 4, 6, 20);
          if (R.boost > 0) M.text(g, 'TURBO!', VW / 2, B - 70, { size: 26, align: 'center', color: '#ffd54a' });
        },
      };
    },
  };
})();
