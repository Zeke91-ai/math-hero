// Mode "Lari Angka": pelari otomatis dengan TITIK PILIHAN. Di tiap titik ada dua bola angka: satu di bawah,
// satu di atas. Menjelang titik, lari melambat; bola bawah terpilih otomatis, tekan A untuk memilih bola atas
// (tekan lagi untuk batal). Pahlawan lalu melompat SENDIRI tepat waktunya, jadi pilihan ditentukan oleh niat,
// bukan kecepatan jari.
// Selalu ada minimal satu bola yang benar, dan tidak ada jurang atau rintangan di dekat titik pilihan, jadi
// anak tidak pernah terpaksa mengambil jawaban salah karena rute. Menjelang titik pilihan, lari melambat
// agar ada waktu berpikir. Hitungannya sengaja kecil karena tangan juga sibuk.
// Konsep:
//   sum      kumpulkan sampai jumlahnya TEPAT target ("butuh berapa lagi?").
//   multiple ambil hanya kelipatan k (pola perkalian).
//   equal    ambil ekspresi yang hasilnya sama dengan nilai tertentu (3x4 = 2x6 = 12).
// Versi bos: bos mengejar dari belakang. Ia TIDAK menembak; ia hanya mendekat setiap kali bola salah diambil
// atau titik pilihan dilewatkan. Kalau sampai menyusul, hati berkurang. Setiap tugas selesai mendorong bos mundur.
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const GRAV = 1650, JUMP = -600, DJUMP = -520, SPEED = 140;
  const GAP = 440;         // jarak antar titik pilihan
  const THINK = 180;       // mulai melambat (dan bisa memilih) sejauh ini sebelum titik pilihan
  const LOW = 30, HIGH = 128;

  function orb(g, x, y, label, o) {
    o = o || {};
    const r = label.length > 3 ? 23 : 20;
    const c = M.lowres('orb' + r + (o.color || ''), r * 2 + 2, r * 2 + 2, (cx) => {
      cx.fillStyle = '#2b1d52'; cx.beginPath(); cx.arc(r + 1, r + 1, r, 0, 7); cx.fill();
      cx.fillStyle = o.color || '#fff6dc'; cx.beginPath(); cx.arc(r + 1, r + 1, r - 3, 0, 7); cx.fill();
      cx.fillStyle = 'rgba(255,255,255,0.8)'; cx.fillRect(r - 6, 6, 6, 3);
    });
    g.drawImage(c, Math.round(x - r - 1), Math.round(y - r - 1));
    M.text(g, label, x, y + 1, { size: label.length > 4 ? 13 : label.length > 2 ? 16 : 21, align: 'center', color: '#2b1d52', outline: false });
  }

  const CONCEPTS = {
    sum: { judul: 'Kumpulkan sampai TEPAT', baris: ['Tiap titik ada dua bola. Bola bawah dipilih otomatis.', 'Mau yang atas? Tekan A saat lari melambat.', 'Jumlahkan sampai pas target. Kelebihan = ditolak!'] },
    multiple: { judul: 'Pola kelipatan', baris: ['Kelipatan 3: 3, 6, 9, 12, ... (tambah 3 terus).', 'Bola bawah dipilih otomatis. Tekan A = pilih atas.', 'Pilih bola kelipatan!'] },
    equal: { judul: 'Hasilnya sama, bentuknya beda', baris: ['2×3, 3×2, dan 4+2 semuanya 6.', 'Bola bawah dipilih otomatis. Tekan A = pilih atas.', 'Salah pilih membuat si raksasa mendekat!'] },
  };

  M.Modes.runner = {
    nama: 'Lari Angka',
    concept(cfg) {
      const c = CONCEPTS[cfg.kind];
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          // Dua titik pilihan: yang pertama diambil bawah, yang kedua dilompati untuk mengambil yang atas.
          const gy = y + h - 26;
          g.fillStyle = '#7fd36d'; g.fillRect(x, gy, w, 26);
          const k = (t % 5) / 5, hx = x + 50, dx = k * 420;
          const pairs = cfg.kind === 'sum' ? [['3', '9'], ['2', '6']] : cfg.kind === 'multiple' ? [['6', '7'], ['5', '9']] : [['2×3', '7'], ['3+4', '3×2']];
          const pick = [0, 1];
          let jumpY = 0;
          pairs.forEach((pr, i) => {
            const px = x + 150 + i * 200 - dx;
            const taken = px < hx;
            if (!taken || pick[i] !== 0) orb(g, px, gy - 18, pr[0]);
            if (!taken || pick[i] !== 1) orb(g, px, gy - 78, pr[1]);
            if (pick[i] === 1 && px - hx < 70 && px - hx > -40) jumpY = Math.sin(Math.PI * M.clamp((70 - (px - hx)) / 110, 0, 1)) * 64;
          });
          M.hero(g, M.save.active ? M.save.active.hero : 'pinki', jumpY > 2 ? 'jump' : 'run', t, hx, gy - jumpY, { scale: 1.5 });
          M.text(g, 'bawah = otomatis', x + w - 10, y + 14, { size: 12, align: 'right', color: '#2b1d52', outline: false });
          M.text(g, 'atas = tekan A', x + w - 10, y + 30, { size: 12, align: 'right', color: '#2b1d52', outline: false });
        },
      };
    },
    controls() { return { joy: false, a: 'Atas / Lompat', b: null }; },
    create(P) {
      const cfg = P.cfg;
      const gy = () => Math.round(M.VH * 0.68);
      const R = {
        x: 0, y: 0, vy: 0, onGround: true, dj: true, inv: 0, speed: SPEED, slowK: 1,
        dps: [], pits: [], nextDp: 380, goal: null, have: 0, count: 0, celebrate: 0, lock: false, cur: null,
        boss: cfg.boss ? { hp: P.tasks, max: P.tasks, t: 0, near: 0.15, hurt: 0, bite: 0 } : null,
      };
      R.y = gy();
      // Jurang hanya di dunia 2 ke atas, bukan di level bos, dan selalu di tengah antara dua titik pilihan.
      const pits = P.level.stage >= 2 && !cfg.boss;

      function newGoal() { R.goal = C.runnerGoal(cfg); R.have = 0; R.count = 0; }
      function addDp() {
        const [low, high] = C.runnerPair(cfg, R.goal, R.have);
        R.dps.push({ x: R.nextDp, low: Object.assign(low, { alive: true }), high: Object.assign(high, { alive: true }), done: false });
        if (pits && R.dps.length > 1 && Math.random() < 0.6) R.pits.push({ x0: R.nextDp + GAP / 2 - 32, x1: R.nextDp + GAP / 2 + 32 });
        R.nextDp += GAP;
      }
      function refreshAhead() {
        // Soal berubah (target baru atau jumlah bertambah): bola di depan dibuat ulang agar tetap masuk akal.
        R.dps.forEach((d) => {
          if (d.done || d.x < R.x + 60) return;
          const [low, high] = C.runnerPair(cfg, R.goal, R.have);
          d.low = Object.assign(low, { alive: true }); d.high = Object.assign(high, { alive: true });
        });
      }
      newGoal();
      for (let i = 0; i < 4; i++) addDp();
      const inPit = (x) => R.pits.some((p) => x > p.x0 && x < p.x1);
      const hintTop = () => M.HUD_H + (R.boss ? 40 : 8) + 96;

      function taskComplete() {
        R.celebrate = 1.2;
        P.correct({ x: 90, y: R.y - 70, pts: 150, say: R.goal.kind === 'sum' ? `Pas ${R.goal.target}! Hebat!` : 'Lengkap! Hebat!' });
        const B = R.boss;
        if (B) { B.hp--; B.hurt = 0.6; B.near = 0; M.sfx('ledak'); M.fx.burst(30, gy() - 50, { n: 24, color: ['#ffb347', '#ff5d73', '#fff'], speed: 200 }); }
        P.taskDone();
        if (P.done < P.tasks) { newGoal(); refreshAhead(); } else R.lock = true;
      }
      function bossCloser(k) {
        const B = R.boss;
        if (!B) return;
        B.near += k;
        M.sfx('bos');
        if (B.near >= 1) {
          // Tersusul: hati berkurang, bos terdorong mundur lagi.
          B.near = 0.25; B.bite = 0.6;
          P.hurt(1, 90, R.y - 30);
          R.inv = 1;
        }
      }
      function collect(o, high) {
        o.alive = false;
        const y = high ? gy() - HIGH : gy() - LOW;
        if (R.goal.kind === 'sum') {
          if (o.value <= R.goal.target - R.have) {
            R.have += o.value;
            M.sfx('ambil'); M.fx.float(`+${o.value}`, 90, y - 24, '#ffd54a', 20);
            if (R.have === R.goal.target) taskComplete(); else refreshAhead();
            return;
          }
        } else if (o.good) {
          R.count++;
          M.sfx('ambil'); M.fx.float(o.label === String(o.value) ? 'Ya!' : `= ${o.value}`, 90, y - 24, '#5fd068', 20);
          if (R.count >= R.goal.need) taskComplete();
          return;
        }
        // Salah: bola ditolak, Peri menjelaskan di bagian atas (tidak menutupi pahlawan).
        o.rejected = 0.5; o.alive = true;
        P.mistake(C.runnerExplain(R.goal, o, R.have), { soft: true, top: hintTop(), x: 90, y, text: R.goal.kind === 'sum' ? 'Kelebihan!' : 'Bukan!' });
        bossCloser(0.4);
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
          const B = R.boss;
          if (B) { B.t += dt; if (B.hurt > 0) B.hurt -= dt; if (B.bite > 0) B.bite -= dt; }
          if (R.lock) return;
          // Melambat menjelang titik pilihan berikutnya (waktu berpikir), lalu normal lagi saat melewatinya.
          const next = R.dps.find((d) => !d.done);
          const dist = next ? next.x - R.x : 999;
          const want = dist > 40 && dist < THINK ? 0.5 : 1;
          R.slowK += (want - R.slowK) * Math.min(1, dt * 6);
          R.x += R.speed * R.slowK * dt;
          const choosing = next && !next.jumped && dist < THINK && dist > 0;
          if (I.aHit) {
            if (choosing) {
              // Di zona pilihan, A memilih bola atas (tekan lagi = kembali ke bawah).
              next.choice = next.choice === 'high' ? 'low' : 'high';
              M.sfx('pop');
            } else if (R.onGround) { R.vy = JUMP; R.onGround = false; M.sfx('lompat'); }
            else if (R.dj) { R.vy = DJUMP; R.dj = false; M.sfx('lompat'); M.fx.burst(90, R.y, { n: 6, color: '#fff', speed: 60 }); }
          }
          // Lompat otomatis agar puncak lompatan tepat di bola atas.
          if (next && next.choice === 'high' && !next.jumped && R.onGround && dist <= R.speed * R.slowK * 0.36 + 6) {
            next.jumped = true; R.vy = JUMP; R.onGround = false; M.sfx('lompat');
          }
          const prevY = R.y;
          R.vy += GRAV * dt;
          R.y += R.vy * dt;
          const ground = !inPit(R.x - 8) || !inPit(R.x + 8);
          if (R.vy >= 0 && ground && prevY <= gy() + 2 && R.y >= gy()) { R.y = gy(); R.vy = 0; R.onGround = true; R.dj = true; }
          else if (R.y < gy() - 1 || !ground) R.onGround = false;
          if (R.y > M.VH + 60) {
            // Jatuh ke jurang: hati berkurang, muncul lagi di seberang.
            P.hurt(1, 90, M.VH - 40);
            const p = R.pits.find((q) => q.x1 > R.x - 40);
            R.x = p ? p.x1 + 16 : R.x + 60; R.y = gy() - 100; R.vy = 0; R.inv = 1.4;
          }
          // Titik pilihan terdekat: bawah diambil jika melintas sambil berpijak; atas jika melintas cukup tinggi.
          const d = next;
          if (d) {
            R.cur = d;
            if (Math.abs(d.x - R.x) < 24) {
              if (d.low.alive && !d.low.rejected && R.y > gy() - 22) collect(d.low, false);
              else if (d.high.alive && !d.high.rejected && R.y < gy() - 62) collect(d.high, true);
            }
            if (R.x > d.x + 30) {
              d.done = true;
              // Melewatkan titik tanpa mengambil apa pun tidak dihitung salah, tetapi bos ikut mendekat sedikit.
              if (d.low.alive && d.high.alive && !d.low.rejected && !d.high.rejected) bossCloser(0.2);
            }
          }
          for (const q of R.dps) for (const o of [q.low, q.high]) if (o.rejected > 0) { o.rejected -= dt; if (o.rejected <= 0) { o.rejected = 0; o.alive = false; } }
          if (R.dps[R.dps.length - 1].x < R.x + M.VW * 1.5) addDp();
          R.dps = R.dps.filter((q) => q.x > R.x - 200);
          R.pits = R.pits.filter((p) => p.x1 > R.x - 200);
        },
        draw(g) {
          const cam = R.x - 90, y0 = gy();
          M.drawBg(g, P.theme, cam, 0);
          // Tanah dari tileset Math Hero 1, dengan jurang yang jelas terlihat.
          const tx = P.theme === 'kebun' ? 6 : 0;
          const startX = Math.floor(cam / 32) * 32;
          for (let x = startX; x < cam + M.VW + 32; x += 32) {
            if (inPit(x + 16)) continue;
            const sx = Math.round(x - cam);
            const col = inPit(x - 16) ? 0 : inPit(x + 48) ? 2 : 1;
            M.tile1(g, tx + col, 0, sx, y0);
            for (let k = 1; k * 32 + y0 < M.VH; k++) M.tile1(g, tx + col, 1, sx, y0 + k * 32);
          }
          // Titik pilihan: garis pemandu putus-putus dan dua bola.
          for (const d of R.dps) {
            const sx = d.x - cam;
            if (sx < -40 || sx > M.VW + 40) continue;
            if (!d.done) {
              g.fillStyle = 'rgba(255,255,255,0.35)';
              for (let yy = y0 - HIGH - 20; yy < y0; yy += 10) g.fillRect(Math.round(sx) - 1, yy, 2, 5);
            }
            for (const [o, oy] of [[d.low, y0 - LOW], [d.high, y0 - HIGH]]) {
              if (!o.alive) continue;
              const rej = o.rejected > 0;
              g.globalAlpha = rej ? Math.max(0, o.rejected * 2) : 1;
              orb(g, sx + (rej ? (0.5 - o.rejected) * 120 : 0), oy - (rej ? (0.5 - o.rejected) * 80 : 0) + Math.sin(M.t * 3 + d.x) * 2, o.label, rej ? { color: '#ffd1d8' } : null);
              g.globalAlpha = 1;
            }
          }
          // Penanda pilihan untuk titik berikutnya: cincin kuning di bola yang akan diambil.
          const nx = R.dps.find((q) => !q.done);
          if (nx && !R.lock && nx.x - R.x < THINK + 120) {
            const sx = nx.x - cam, hi = nx.choice === 'high', oy = hi ? y0 - HIGH : y0 - LOW;
            g.strokeStyle = '#ffd54a'; g.lineWidth = 3;
            g.beginPath(); g.arc(Math.round(sx), Math.round(oy), 27 + Math.sin(M.t * 8) * 2, 0, Math.PI * 2); g.stroke();
            if (nx.x - R.x < THINK) M.text(g, hi ? 'Atas dipilih (A = batal)' : 'Bawah dipilih (A = atas)', M.VW / 2 + 30, y0 - HIGH - 54, { size: 14, align: 'center', color: '#fff3c4' });
          }
          if (!(R.inv > 0 && Math.floor(M.t * 14) % 2)) {
            const anim = R.celebrate > 0 ? 'throw' : !R.onGround ? (R.vy < 0 ? 'jump' : 'fall') : 'run';
            M.hero(g, M.save.active ? M.save.active.hero : 'pinki', anim, M.t, 90, R.y, { scale: 2 });
          }
          // Bos pengejar: makin dekat makin terlihat.
          const B = R.boss;
          if (B) {
            const bx = -30 + B.near * 70 + (B.bite > 0 ? 20 : 0);
            M.drawBoss(g, 'slime3', bx, y0 + 26 + Math.sin(B.t * 3) * 5, 4, M.t, { hurt: B.hurt, anim: B.near > 0.6 ? 'attack' : 'walk' });
            P.bossBar(g, M.STAGES[P.level.stage - 1].bos.nama, B.hp, B.max, '#ffb347');
          }
          // Papan tujuan.
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
          if (B) {
            // Meter "si raksasa mendekat".
            const my = py + 78;
            M.text(g, 'Jarak raksasa', 14, my + 7, { size: 11, color: '#fff' });
            g.fillStyle = '#1d1438'; g.fillRect(96, my + 2, M.VW - 110, 10);
            g.fillStyle = B.near > 0.6 ? '#ff5d73' : '#ffb347'; g.fillRect(98, my + 4, Math.round((M.VW - 114) * M.clamp(B.near, 0, 1)), 6);
          }
        },
      };
    },
  };
  M.orb = orb;
})();
