// Mode "Meteor Angka": penembak vertikal. Pahlawan menaiki awan; joystick geser kiri-kanan, B melempar bintang ke atas.
// Meteor dan alien turun membawa angka. Hanya sasaran yang sesuai aturan yang boleh ditembak:
// pasangan sepuluh, kelipatan, genap/ganjil, hasil bagi, pecahan senilai, lebih besar dari.
// Menembak yang salah: bintang memantul dan Peri menjelaskan. Tertabrak meteor: hati berkurang.
// Versi bos: bos di atas membawa soal di perisainya; tembak meteor jawabannya untuk melukai bos, hindari bom bos.
(function () {
  const M = window.MH2, C = window.MH2Concepts;

  const CONCEPTS = {
    bond: { judul: 'Pasangan sepuluh', baris: ['7 + 3 = 10, 6 + 4 = 10, 5 + 5 = 10.', 'Lihat soal di perisai bos, cari pasangannya.', 'Geser dengan joystick, lempar bintang dengan B.'] },
    multiple: { judul: 'Kelipatan = hasil perkalian', baris: ['Kelipatan 5: 5, 10, 15, 20, ... (tambah 5 terus).', 'Tembak hanya kelipatan yang diminta.', 'Hindari meteor yang jatuh ke arahmu!'] },
    even: { judul: 'Genap dan ganjil', baris: ['Genap bisa dibagi 2 berpasangan tanpa sisa.', 'Lihat angka satuannya: 0, 2, 4, 6, 8.'] },
    odd: { judul: 'Genap dan ganjil', baris: ['Ganjil selalu sisa 1 kalau dibagi berpasangan.', 'Satuannya 1, 3, 5, 7, atau 9.'] },
    divide: { judul: 'Pembagian dan perkalian berpasangan', baris: ['12 : 3 = 4 karena 3 × 4 = 12.', 'Hitung tiap meteor, tembak yang hasilnya cocok.', 'Hindari bulu-bulu bos!'] },
    half: { judul: 'Setengah punya banyak nama', baris: ['1/2 = 2/4 = 3/6 = 4/8.', 'Pembilang = setengah dari penyebut.', 'Tembak yang senilai setengah!'] },
    greater: { judul: 'Membandingkan bilangan', baris: ['Bandingkan puluhannya dulu.', 'Kalau puluhan sama, bandingkan satuannya.'] },
  };

  M.Modes.shooter = {
    nama: 'Meteor Angka',
    concept(cfg) {
      const w0 = cfg.waves[0], c = CONCEPTS[w0.kind] || CONCEPTS.multiple;
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const k = t % 3;
          const vals = w0.kind === 'bond' ? ['3', '5', '8'] : w0.kind === 'half' ? ['2/4', '1/3', '3/6'] : w0.kind === 'divide' ? ['12:3', '10:2', '8:2'] : ['10', '7', '15'];
          const good = w0.kind === 'bond' ? 0 : w0.kind === 'half' ? 0 : w0.kind === 'divide' ? 2 : 0;
          M.box(g, x + w / 2 - 70, y + 4, 140, 24, '#fff6dc', { line: '#2b1d52', shade: false });
          M.text(g, w0.kind === 'bond' ? '7 + ? = 10' : w0.kind === 'divide' ? 'hasilnya 4' : w0.kind === 'half' ? 'senilai 1/2' : 'kelipatan 5', x + w / 2, y + 16, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          vals.forEach((v, i) => {
            const mx = x + 50 + i * ((w - 100) / 2), my = y + 40 + ((k * 30 + i * 20) % 50);
            const hit = i === good && k > 1.6;
            if (!hit) { M.art(g, 'meteor', mx - 18, my - 16, 3); M.text(g, v, mx, my, { size: 14, align: 'center' }); }
            else M.spr(g, 'boom1', Math.min(5, (k - 1.6) * 12), mx, my, { scale: 1, anchor: 'center' });
          });
          const hx = x + 50 + good * ((w - 100) / 2);
          if (k > 0.8 && k < 1.6) M.art(g, 'bintang', hx - 8, y + h - 50 - (k - 0.8) * 90, 1.5);
          M.art(g, 'awan', hx - 24, y + h - 22, 2);
          M.hero(g, M.save.active ? M.save.active.hero : 'pinki', k > 0.7 && k < 1.2 ? 'throw' : 'idle', t, hx, y + h - 18, { scale: 1.2 });
        },
      };
    },
    controls() { return { joy: true, a: null, b: 'Lempar' }; },
    create(P) {
      const cfg = P.cfg, bossCfg = cfg.boss;
      const R = {
        hx: M.VW / 2, cool: 0, throwT: 0, inv: 0, shots: [], rocks: [], spawnT: 0.6, wave: null, wi: 0, count: 0,
        boss: bossCfg ? { x: M.VW / 2, y: 0, hp: P.tasks, max: P.tasks, t: 0, dir: 1, hurt: 0, atkT: 3, warn: 0 } : null,
        bombs: [], lock: false, flash: 0, stream: [],
      };
      const heroY = () => M.VH - 150;
      const top = () => M.HUD_H + (R.boss ? 150 : 80);

      function newWave() {
        const base = cfg.waves[R.wi % cfg.waves.length];
        R.wave = C.shooterWave(base);
        if (R.boss) R.wave.need = 1;
        R.count = 0;
        R.flash = 1;
        // Meteor lama yang tidak sesuai aturan baru dibersihkan agar tidak membingungkan.
        R.rocks.forEach((r) => { r.dead = true; M.fx.burst(r.x, r.y, { n: 6, color: '#fff', speed: 60 }); });
      }
      newWave();

      function spawn() {
        const onScreenGood = R.rocks.some((r) => r.good && !r.dead);
        let t = C.shooterTarget(R.wave, onScreenGood ? 0.4 : 1);
        // Cari posisi yang tidak menumpuk dengan meteor lain yang masih di atas.
        let x = M.between(40, M.VW - 40);
        for (let k = 0; k < 8 && R.rocks.some((q) => !q.dead && q.y < top() + 90 && Math.abs(q.x - x) < 56); k++) x = M.between(40, M.VW - 40);
        R.rocks.push(Object.assign(t, { x, y: top() - 30, vy: M.between(32, 48) + P.level.stage * 3, sway: Math.random() * 6, kind: Math.random() < 0.6 ? 'meteor' : 'alien' + M.between(1, 6), dead: false, hitT: 0 }));
      }

      function hitGood(r) {
        r.dead = true;
        M.sfx('ledak');
        M.fx.burst(r.x, r.y, { n: 18, color: ['#ffb347', '#ffd54a', '#fff'], speed: 180 });
        const why = R.wave.explainGood(r.item || r.value);
        if (R.boss) {
          // Bintang kuat terbang ke bos. Meteor lain dibersihkan agar satu soal = satu serangan.
          R.stream.push({ x: r.x, y: r.y, t: 0, why });
          R.rocks.forEach((q) => { if (!q.dead) { q.dead = true; M.fx.burst(q.x, q.y, { n: 5, color: '#fff', speed: 50 }); } });
          R.spawnT = 1.5;
          return;
        }
        R.count++;
        P.correct({ x: r.x, y: r.y, pts: 60, text: why, sfx: 'ambil' });
        if (R.count >= R.wave.need) {
          M.sfx('naik');
          P.taskDone();
          R.wi++;
          if (P.done < P.tasks) setTimeout(newWave, 700); else R.lock = true;
        }
      }
      function hitBad(r) {
        r.hitT = 0.3;
        P.mistake(R.wave.explainBad(r.item || r.value), { soft: true, top: !R.boss, x: r.x, y: r.y, text: 'Bukan!' });
      }

      return {
        R,
        solve() {
          if (R.lock) return;
          const r = { x: M.VW / 2, y: 200, value: R.wave.goodValues ? R.wave.goodValues[0] : null, item: R.wave.goodItems ? R.wave.goodItems[0] : null, good: true };
          if (R.boss) { hitGood(r); return; }
          R.count = R.wave.need - 1; hitGood(r);
        },
        update(dt) {
          const I = M.input;
          if (R.inv > 0) R.inv -= dt;
          if (R.throwT > 0) R.throwT -= dt;
          if (R.flash > 0) R.flash -= dt;
          R.hx = M.clamp(R.hx + I.x * 220 * dt, 24, M.VW - 24);
          R.cool -= dt;
          if (I.bHit && R.cool <= 0 && !R.lock) {
            R.shots.push({ x: R.hx, y: heroY() - 50 }); R.cool = 0.28; R.throwT = 0.25; M.sfx('tembak');
          }
          for (const s of R.shots) {
            s.y -= 520 * dt;
            for (const r of R.rocks) {
              if (r.dead || s.dead) continue;
              if (Math.abs(s.x - r.x) < 24 && Math.abs(s.y - r.y) < 24) {
                s.dead = true;
                if (r.good) hitGood(r); else { hitBad(r); s.bounce = true; }
              }
            }
          }
          R.shots = R.shots.filter((s) => !s.dead && s.y > M.HUD_H);
          if (!R.lock) {
            R.spawnT -= dt;
            if (R.spawnT <= 0 && R.rocks.filter((r) => !r.dead).length < 6) { spawn(); R.spawnT = M.between(10, 15) / 10; }
          }
          for (const r of R.rocks) {
            if (r.dead) continue;
            r.y += r.vy * dt; r.x += Math.sin(M.t * 1.5 + r.sway) * 12 * dt;
            if (r.hitT > 0) r.hitT -= dt;
            if (Math.abs(r.x - R.hx) < 26 && Math.abs(r.y - (heroY() - 30)) < 30 && R.inv <= 0) {
              r.dead = true; R.inv = 1.4; P.hurt(1, r.x, r.y);
              M.fx.burst(r.x, r.y, { n: 12, color: ['#ffb347', '#fff'], speed: 150 });
            }
            if (r.y > M.VH + 30) r.dead = true;
          }
          R.rocks = R.rocks.filter((r) => !r.dead);
          // Bos: bergerak kiri-kanan, sesekali menjatuhkan bom dengan tanda "!".
          const B = R.boss;
          if (B) {
            B.t += dt; if (B.hurt > 0) B.hurt -= dt;
            B.y = M.HUD_H + 120;
            B.x += B.dir * 50 * dt; if (B.x < 80 || B.x > M.VW - 80) B.dir *= -1;
            B.atkT -= dt;
            if (B.atkT < 0.8 && !B.warn) { B.warn = 1; M.sfx('awas'); }
            if (B.atkT <= 0 && !R.lock) {
              B.atkT = M.between(30, 45) / 10; B.warn = 0;
              const n = P.level.stage >= 4 ? 3 : 2;
              for (let i = 0; i < n; i++) R.bombs.push({ x: B.x, y: B.y, vx: (R.hx - B.x) / 2.4 + (i - (n - 1) / 2) * 50, vy: 150 });
            }
            for (const b of R.bombs) {
              b.x += b.vx * dt; b.y += b.vy * dt;
              if (!b.dead && Math.abs(b.x - R.hx) < 18 && Math.abs(b.y - (heroY() - 26)) < 22 && R.inv <= 0) { b.dead = true; R.inv = 1.4; P.hurt(1, b.x, b.y); }
            }
            R.bombs = R.bombs.filter((b) => !b.dead && b.y < M.VH);
            for (const st of R.stream) {
              st.t += dt * 2;
              if (st.t >= 1 && !st.done) {
                st.done = true;
                B.hurt = 0.6; M.sfx('bos'); P.shake(0.3);
                M.fx.burst(B.x, B.y - 40, { n: 26, color: ['#ffd54a', '#ff5d73', '#fff'], speed: 220 });
                P.correct({ x: B.x, y: B.y - 60, pts: 150, text: st.why });
                B.hp--;
                P.taskDone();
                if (P.done < P.tasks) setTimeout(newWave, 400); else R.lock = true;
              }
            }
            R.stream = R.stream.filter((st) => !st.done);
          }
        },
        draw(g) {
          M.drawBg(g, P.theme, M.t * 12, 0);
          // Garis kecepatan agar terasa terbang naik.
          g.fillStyle = 'rgba(255,255,255,0.35)';
          for (let i = 0; i < 24; i++) { const y = ((i * 97 + M.t * 160) % M.VH); g.fillRect((i * 53) % M.VW, Math.round(y), 2, 8); }
          const B = R.boss;
          if (B) {
            const spr = bossCfg.sprite;
            M.drawBoss(g, spr, B.x, B.y + Math.sin(B.t * 2) * 6, spr === 'prof' ? 4 : spr === 'burung' ? 3.4 : 3.2, M.t, { hurt: B.hurt, dir: 'd', anim: B.warn ? 'attack' : 'idle' });
            if (B.warn) M.text(g, '!', B.x + 50, B.y - 70, { size: 40, align: 'center', color: '#ff5d73' });
            // Perisai soal.
            M.box(g, B.x - 64, B.y + 4, 128, 32, '#fff6dc', { line: '#2b1d52' });
            M.text(g, R.wave.label.replace('Tembak ', ''), B.x, B.y + 20, { size: R.wave.label.length > 16 ? 12 : 17, align: 'center', color: '#2b1d52', outline: false, maxW: 120 });
            P.bossBar(g, M.STAGES[P.level.stage - 1].bos.nama, B.hp, B.max, bossCfg.warna);
            for (const b of R.bombs) M.art(g, 'bom', b.x - 9, b.y - 9, 2);
            for (const st of R.stream) {
              const x = M.lerp(st.x, B.x, st.t), y = M.lerp(st.y, B.y - 40, st.t) - Math.sin(Math.PI * st.t) * 60;
              M.art(g, 'bintang', x - 16, y - 16, 3);
            }
          }
          for (const r of R.rocks) {
            const shake = r.hitT > 0 ? Math.round(Math.sin(M.t * 60) * 3) : 0;
            if (r.kind === 'meteor') M.art(g, 'meteor', r.x - 18 + shake, r.y - 16, 3);
            else M.spr(g, r.kind, M.at(r.kind, M.t, 8), r.x + shake, r.y + 22, { scale: 1.5 });
            M.box(g, r.x - 22, r.y + 14, 44, 22, r.hitT > 0 ? '#ffd1d8' : '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
            M.text(g, r.label, r.x, r.y + 25, { size: r.label.length > 3 ? 12 : 16, align: 'center', color: '#2b1d52', outline: false });
          }
          for (const s of R.shots) M.art(g, 'bintang', s.x - 8, s.y - 8, 1.5);
          // Pahlawan di atas awan.
          const hy = heroY();
          if (!(R.inv > 0 && Math.floor(M.t * 14) % 2)) {
            M.art(g, 'awan', R.hx - 36, hy - 4 + Math.sin(M.t * 3) * 2, 3);
            M.hero(g, M.save.active ? M.save.active.hero : 'pinki', R.throwT > 0 ? 'throw' : 'idle', M.t, R.hx, hy + Math.sin(M.t * 3) * 2, { scale: 2 });
          }
          if (!B) {
            const k = R.flash > 0 ? 1 + R.flash * 0.15 : 1;
            P.questionBox(g, R.wave.label, `${R.wave.short}   ${R.count}/${R.wave.need}`, { size: 20 * k });
          }
        },
      };
    },
  };
})();
