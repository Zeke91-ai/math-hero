// Mode "Lari Angka": pelari otomatis (endless runner). Pahlawan berlari sendiri; tombol A melompat (bisa 2x di udara).
// Konsep:
//   sum      kumpulkan bola angka sampai jumlahnya TEPAT target (menyusun bilangan, "butuh berapa lagi?").
//   multiple ambil hanya kelipatan k (pola perkalian).
//   equal    ambil ekspresi yang hasilnya sama dengan nilai tertentu (kesamaan nilai, 3x4 = 2x6 = 12).
// Bola yang salah ditolak (memantul) dan Peri menjelaskan alasannya. Jatuh ke jurang atau menabrak peti mengurangi hati.
// Versi bos: makhluk raksasa mengejar dari kiri dan menyemburkan api; tiap tugas selesai melukai bos.
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const GRAV = 1650, JUMP = -600, DJUMP = -520, SPEED = 150;

  function orb(g, x, y, label, good, o) {
    o = o || {};
    const r = label.length > 3 ? 22 : 19;
    const c = M.lowres('orb' + r + (o.color || ''), r * 2 + 2, r * 2 + 2, (cx) => {
      cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 1, r + 1, r, 0, 7); cx.fill();
      cx.fillStyle = o.color || '#fff6dc'; cx.beginPath(); cx.arc(r + 1, r + 1, r - 3, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,0.8)'; cx.fillRect(r - 6, 6, 6, 3);
    });
    g.drawImage(c, Math.round(x - r - 1), Math.round(y - r - 1));
    M.text(g, label, x, y + 1, { size: label.length > 4 ? 13 : label.length > 2 ? 16 : 20, align: 'center', color: '#2b1d52', outline: false });
  }

  const CONCEPTS = {
    sum: { judul: 'Kumpulkan sampai TEPAT', baris: ['Lompat (A) untuk mengambil bola angka.', 'Jumlahkan sampai pas dengan target.', 'Kalau kelebihan, bola akan ditolak!'] },
    multiple: { judul: 'Pola kelipatan', baris: ['Kelipatan 3: 3, 6, 9, 12, ... (tambah 3 terus).', 'Ambil hanya bola kelipatan.', 'Lompati yang bukan!'] },
    equal: { judul: 'Hasilnya sama, bentuknya beda', baris: ['3×4, 2×6, dan 6+6 semuanya 12.', 'Hitung dulu, lalu ambil yang hasilnya sama.', 'Lompati yang salah, dan hindari api si raksasa!'] },
  };

  M.Modes.runner = {
    nama: 'Lari Angka',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          // Pahlawan berlari, bola masuk satu per satu sampai target tercapai.
          g.fillStyle = '#7fd36d'; g.fillRect(x, y + h - 30, w, 30);
          const k = (t % 4) / 4, vals = cfg.kind === 'sum' ? [3, 2, 5] : cfg.kind === 'multiple' ? [3, 6, 9] : ['3×4', '2×6', '6+6'];
          const hx = x + 40;
          M.hero(g, M.save.active ? M.save.active.hero : 'pinki', 'run', t, hx, y + h - 30, { scale: 1.6 });
          let got = 0;
          vals.forEach((v, i) => {
            const ox = x + 90 + i * 70 - k * 260;
            if (ox < hx + 10) { got++; return; }
            orb(g, ox, y + h - 60 - (i % 2) * 30, String(v), true);
          });
          const tot = cfg.kind === 'sum' ? [0, 3, 5, 10][got] : got;
          M.box(g, x + w - 124, y + 8, 116, 36, '#fff6dc', { line: '#2b1d52', shade: false });
          M.text(g, cfg.kind === 'sum' ? `Target 10: ${tot}` : `Dapat: ${tot}/3`, x + w - 66, y + 26, { size: 15, align: 'center', color: '#2b1d52', outline: false });
        },
      };
    },
    controls() { return { joy: false, a: 'Lompat', b: null }; },
    create(P) {
      const cfg = P.cfg;
      const gy = () => Math.round(M.VH * 0.7);
      const R = {
        x: 0, y: 0, vy: 0, onGround: true, dj: true, inv: 0, speed: SPEED,
        ground: [], crates: [], orbs: [], nextOrb: 260, genX: 0,
        goal: null, have: 0, count: 0, celebrate: 0, lock: false,
        boss: cfg.boss ? { hp: P.tasks, max: P.tasks, t: 0, shotT: 4, hurt: 0 } : null, fire: [], warn: 0,
      };
      R.y = gy();
      // Tanah: potongan [x0, x1]. Jurang muncul di antaranya (lebar 2-3 tile), lebih jarang di dunia awal.
      const pitRate = P.level.stage <= 1 ? 0.25 : 0.4, crateRate = P.level.stage <= 1 ? 0 : 0.25;
      function genTo(x) {
        while (R.genX < x) {
          const len = 32 * M.between(8, 16);
          R.ground.push([R.genX, R.genX + len]);
          if (Math.random() < crateRate && len > 320 && R.genX > 400) R.crates.push({ x: R.genX + Math.round(len / 64) * 32 + 16, hit: false });
          R.genX += len;
          if (R.genX > 600 && Math.random() < pitRate) R.genX += 32 * M.between(2, 3);
        }
        R.ground = R.ground.filter((s) => s[1] > R.x - 200);
        R.crates = R.crates.filter((c) => c.x > R.x - 200);
      }
      function groundAt(x) { return R.ground.some((s) => x >= s[0] && x <= s[1]); }
      function newGoal() { R.goal = C.runnerGoal(cfg); R.have = 0; R.count = 0; }
      function spawnOrb() {
        const o = C.runnerOrb(cfg, R.goal, R.have);
        const hi = M.pick([0, 0, 1, 2]);
        R.orbs.push(Object.assign(o, { x: R.x + M.VW + 40, y: gy() - 34 - hi * 58, alive: true, bounce: 0 }));
      }
      newGoal();
      genTo(M.VW * 3);

      function taskComplete() {
        R.celebrate = 1.2;
        P.correct({ x: 90, y: R.y - 70, pts: 150, say: R.goal.kind === 'sum' ? `Pas ${R.goal.target}! Hebat!` : 'Lengkap! Hebat!' });
        if (R.boss) { R.boss.hp--; R.boss.hurt = 0.6; M.sfx('ledak'); M.fx.burst(40, gy() - 60, { n: 24, color: ['#ffb347', '#ff5d73', '#fff'], speed: 200 }); }
        R.orbs = [];
        P.taskDone();
        if (P.done < P.tasks) setTimeout(newGoal, 600);
        else R.lock = true;
      }
      function collect(o) {
        const sx = o.x - R.x + 90;
        if (R.goal.kind === 'sum') {
          if (o.value <= R.goal.target - R.have) {
            R.have += o.value; o.alive = false;
            M.sfx('ambil'); M.fx.float(`+${o.value}`, sx, o.y - 20, '#ffd54a');
            if (R.have === R.goal.target) taskComplete();
          } else reject(o, sx);
        } else if (o.good) {
          R.count++; o.alive = false;
          M.sfx('ambil'); M.fx.float(o.label === String(o.value) ? 'Ya!' : `= ${o.value}`, sx, o.y - 20, '#5fd068');
          if (R.count >= R.goal.need) taskComplete();
        } else reject(o, sx);
      }
      function reject(o, sx) {
        o.bounce = 0.5; o.alive = false; o.rejected = true;
        P.mistake(C.runnerExplain(R.goal, o, R.have), { soft: true, x: sx, y: o.y, text: R.goal.kind === 'sum' ? 'Kelebihan!' : 'Bukan!' });
      }

      return {
        R,
        solve() {
          if (R.lock) return;
          if (R.goal.kind === 'sum') R.have = R.goal.target; else R.count = R.goal.need;
          taskComplete();
        },
        update(dt) {
          const I = M.input;
          if (R.celebrate > 0) R.celebrate -= dt;
          if (R.inv > 0) R.inv -= dt;
          if (R.lock) return;
          R.x += R.speed * dt;
          if (I.aHit) {
            if (R.onGround) { R.vy = JUMP; R.onGround = false; M.sfx('lompat'); }
            else if (R.dj) { R.vy = DJUMP; R.dj = false; M.sfx('lompat'); M.fx.burst(90, R.y, { n: 6, color: '#fff', speed: 60 }); }
          }
          const prevY = R.y;
          R.vy += GRAV * dt;
          R.y += R.vy * dt;
          const feetOn = groundAt(R.x - 8) || groundAt(R.x + 8);
          if (R.vy >= 0 && feetOn && prevY <= gy() + 2 && R.y >= gy()) { R.y = gy(); R.vy = 0; R.onGround = true; R.dj = true; }
          else if (R.y < gy() - 1 || !feetOn) R.onGround = false;
          if (R.y > M.VH + 60) {
            // Jatuh ke jurang: kehilangan hati, muncul lagi di tanah berikutnya.
            P.hurt(1, 90, M.VH - 40);
            const s = R.ground.find((q) => q[0] > R.x) || R.ground[R.ground.length - 1];
            R.x = s[0] + 20; R.y = gy() - 120; R.vy = 0; R.inv = 1.5;
          }
          for (const c of R.crates) {
            if (!c.hit && Math.abs(c.x - R.x) < 22 && R.y > gy() - 34 && R.inv <= 0) {
              c.hit = true; P.hurt(1, c.x - R.x + 90, gy() - 20); R.inv = 1.2; R.vy = -380; R.onGround = false;
              M.fx.burst(c.x - R.x + 90, gy() - 16, { n: 12, color: ['#c98a4b', '#7a4a2a'], speed: 160 });
            }
          }
          genTo(R.x + M.VW * 2);
          if (R.x + M.VW > R.nextOrb) { spawnOrb(); R.nextOrb = R.x + M.VW + M.between(150, 230); }
          for (const o of R.orbs) {
            if (o.rejected) { o.bounce -= dt; o.y -= 200 * dt; o.x += 180 * dt; continue; }
            if (!o.alive) continue;
            if (Math.abs(o.x - R.x) < 26 && Math.abs(o.y - (R.y - 26)) < 34) collect(o);
          }
          R.orbs = R.orbs.filter((o) => (o.alive || (o.rejected && o.bounce > 0)) && o.x > R.x - 150);
          const B = R.boss;
          if (B) {
            B.t += dt; if (B.hurt > 0) B.hurt -= dt;
            B.shotT -= dt;
            if (B.shotT < 0.9 && !R.warn) { R.warn = 1; M.sfx('awas'); }
            if (B.shotT <= 0) { B.shotT = M.between(4, 6); R.warn = 0; R.fire.push({ x: R.x - 70, y: gy() }); }
            for (const f of R.fire) {
              f.x += (R.speed + 110) * dt;
              if (!f.hit && Math.abs(f.x - R.x) < 18 && R.y > gy() - 30 && R.inv <= 0) { f.hit = true; P.hurt(1, 90, gy() - 20); R.inv = 1.2; }
            }
            R.fire = R.fire.filter((f) => f.x < R.x + M.VW && !f.hit);
          }
        },
        draw(g) {
          const cam = R.x - 90, y0 = gy();
          M.drawBg(g, P.theme, cam, 0);
          // Tanah dari tileset Math Hero 1.
          const tx = P.theme === 'kebun' ? 6 : 0;
          for (const s of R.ground) {
            for (let x = s[0]; x < s[1]; x += 32) {
              const sx = Math.round(x - cam);
              if (sx < -32 || sx > M.VW) continue;
              const col = !groundAt(x - 1) ? 0 : !groundAt(x + 33) ? 2 : 1;
              M.tile1(g, tx + col, 0, sx, y0);
              for (let k = 1; k * 32 + y0 < M.VH; k++) M.tile1(g, tx + col, 1, sx, y0 + k * 32);
            }
          }
          for (const c of R.crates) if (!c.hit) M.spr1(g, 'box2_idle', 0, c.x - cam, y0, { scale: 1.6 });
          for (const f of R.fire) M.spr(g, 'slime3_attack', M.at('slime3_attack', M.t, 12), f.x - cam, f.y + 6, { scale: 1.2 });
          for (const o of R.orbs) {
            if (!o.alive && !o.rejected) continue;
            g.globalAlpha = o.rejected ? Math.max(0, o.bounce * 2) : 1;
            orb(g, o.x - cam, o.y + Math.sin(M.t * 4 + o.x) * 3, o.label, o.good);
            g.globalAlpha = 1;
          }
          if (!(R.inv > 0 && Math.floor(M.t * 14) % 2)) {
            const anim = R.celebrate > 0 ? 'throw' : !R.onGround ? (R.vy < 0 ? 'jump' : 'fall') : 'run';
            M.hero(g, M.save.active ? M.save.active.hero : 'pinki', anim, M.t, 90, R.y, { scale: 2 });
          }
          const B = R.boss;
          if (B) {
            const bob = Math.sin(B.t * 3) * 6;
            M.drawBoss(g, 'slime3', 26, y0 + 30 + bob, 4, M.t, { hurt: B.hurt, anim: B.shotT < 0.9 ? 'attack' : 'walk' });
            if (R.warn) M.text(g, '!', 64, y0 - 100, { size: 36, align: 'center', color: '#ff5d73' });
            P.bossBar(g, M.STAGES[P.level.stage - 1].bos.nama, B.hp, B.max, '#ffb347');
          }
          // Panel tujuan.
          const G = R.goal, py = M.HUD_H + (B ? 40 : 8);
          M.box(g, 10, py, M.VW - 20, 72, '#fff6dc', { line: '#2b1d52' });
          M.text(g, G.label, M.VW / 2, py + 18, { size: 19, align: 'center', color: '#2b1d52', outline: false });
          if (G.kind === 'sum') {
            // Meter jumlah: kotak satuan agar terlihat berapa lagi yang dibutuhkan.
            const n = G.target, cw = Math.min(14, (M.VW - 60) / n);
            const x0 = M.VW / 2 - (n * cw) / 2;
            for (let i = 0; i < n; i++) {
              g.fillStyle = i < R.have ? '#5fd068' : '#e2d9f5';
              g.fillRect(Math.round(x0 + i * cw), py + 32, Math.max(2, Math.round(cw) - 2), 12);
            }
            M.text(g, `Punya ${R.have}  |  Butuh ${G.target - R.have} lagi`, M.VW / 2, py + 56, { size: 13, align: 'center', color: '#6b4fa8', outline: false });
          } else M.text(g, `${G.short}     Dapat ${R.count}/${G.need}`, M.VW / 2, py + 44, { size: 15, align: 'center', color: '#6b4fa8', outline: false });
        },
      };
    },
  };
  M.orb = orb;
})();
