// Mode "Bagi Rata": jelajah ruangan dari atas (top-down). Pahlawan mengambil permata dari tumpukan lalu
// membagikannya SATU-SATU ke para slime. Konsep: pembagian = bagi rata bergiliran; sisa = yang tidak cukup
// untuk semua (disimpan di peti).
// Joystick: jalan. B: ambil segenggam (di tumpukan) / beri 1 (di slime) / simpan 1 (di peti). A: tarik kembali 1 dari slime.
// Label tombol berubah sesuai benda terdekat, dan di tumpukan A maupun B sama-sama mengambil.
(function () {
  const M = window.MH2, C = window.MH2Concepts;
  const BAGI = C.BAGI, X = C.X;
  const GEMS = ['gem2', 'gem3', 'gem4', 'gem5', 'gem6'];

  const CONCEPTS = {
    base: { judul: 'Bagi rata = satu-satu bergiliran', baris: ['Ambil permata di tumpukan (B).', 'Beri tiap slime SATU, bergiliran, sampai habis.', 'Semua slime harus dapat SAMA banyak.'] },
    rem: { judul: 'Kalau tidak cukup: itu sisa', baris: ['Bagi bergiliran seperti biasa.', 'Kalau permata tidak cukup untuk SEMUA slime,', 'simpan sisanya di peti (B di peti).'] },
  };

  M.Modes.share = {
    nama: 'Bagi Rata',
    concept(cfg) {
      const c = cfg.rem ? CONCEPTS.rem : CONCEPTS.base;
      return {
        judul: c.judul, baris: c.baris,
        demo(g, t, x, y, w, h) {
          const n = 3, total = cfg.rem ? 7 : 6, k = Math.floor((t % 5) / 0.5);
          const given = Math.min(k, total);
          for (let i = 0; i < n; i++) {
            const sx = x + 50 + i * ((w - 100) / (n - 1)), sy = y + h - 20;
            M.spr(g, `slime${i + 1}_idle`, M.at(`slime${i + 1}_idle`, t, 8), sx, sy, { scale: 1 });
            const cnt = Math.floor(given / n) + (given % n > i ? 1 : 0);
            const c2 = cfg.rem ? Math.min(cnt, 2) : cnt;
            for (let j = 0; j < c2; j++) M.spr1(g, 'gem3', 0, sx - 10 + (j % 3) * 10, sy - 50 - Math.floor(j / 3) * 10, { scale: 0.8, anchor: 'center' });
          }
          if (cfg.rem && given >= 7) { M.art(g, 'peti', x + w / 2 - 14, y + 10, 2); M.text(g, 'sisa 1', x + w / 2, y + 40, { size: 12, align: 'center', color: '#2b1d52', outline: false }); }
          M.text(g, cfg.rem ? `7 ${BAGI} 3 = 2 sisa 1` : `6 ${BAGI} 3 = 2`, x + 10, y + 14, { size: 14, color: '#2b1d52', outline: false });
        },
      };
    },
    controls() { return { joy: true, a: null, b: 'Ambil' }; },
    create(P) {
      const cfg = P.cfg;
      const R = { task: null, hx: 0, hy: 0, face: 1, moving: false, bag: 0, pile: 0, slimes: [], chest: null, lock: false, gem: 'gem3', checkT: 0 };
      const room = () => ({ x: 14, y: M.HUD_H + 74, w: M.VW - 28, h: M.VH - M.HUD_H - 74 - 160 });
      function newTask() {
        const T = R.task = C.share(cfg);
        const rm = room();
        R.pile = T.total; R.bag = 0; R.lock = false; R.gem = M.pick(GEMS);
        R.hx = rm.x + rm.w / 2; R.hy = Math.max(rm.y + rm.h * 0.45, rm.y + 52 + 80);
        R.slimes = [];
        for (let i = 0; i < T.groups; i++) {
          const col = T.groups <= 3 ? i : i % 2, row = T.groups <= 3 ? 0 : Math.floor(i / 2);
          const nx = T.groups <= 3 ? rm.x + rm.w * (i + 0.5) / T.groups : rm.x + rm.w * (col === 0 ? 0.22 : 0.78);
          const ny = T.groups <= 3 ? rm.y + rm.h - 40 : rm.y + rm.h * (0.62 + row * 0.3) - 10;
          R.slimes.push({ x: nx, y: Math.min(ny, rm.y + rm.h - 30), n: 0, sp: 'slime' + ((i % 3) + 1), joy: 0 });
        }
        R.chest = T.rem ? { x: rm.x + rm.w - 34, y: rm.y + 122, n: 0 } : null;
      }
      newTask();
      const pileXY = () => { const rm = room(); return { x: rm.x + rm.w / 2, y: rm.y + 52 }; };

      // Titik "tangan" pahlawan dibandingkan dengan tiap benda; yang terdekat dalam jangkauan bisa dipakai.
      function nearest() {
        const pl = pileXY(), hx = R.hx, hy = R.hy - 20;
        const opts = [];
        if (R.pile > 0) opts.push({ kind: 'pile', x: pl.x, y: pl.y, d: Math.hypot(hx - pl.x, hy - (pl.y + 16)) });
        R.slimes.forEach((s) => opts.push({ kind: 'slime', o: s, x: s.x, y: s.y, d: Math.hypot(hx - s.x, hy - (s.y - 14)) }));
        if (R.chest) opts.push({ kind: 'chest', o: R.chest, x: R.chest.x, y: R.chest.y, d: Math.hypot(hx - R.chest.x, hy - R.chest.y) });
        opts.sort((a, b) => a.d - b.d);
        return opts[0] && opts[0].d < 64 ? opts[0] : null;
      }

      function check() {
        const T = R.task;
        if (R.pile > 0 || R.bag > 0) return;
        const counts = R.slimes.map((s) => s.n);
        const equal = counts.every((c) => c === counts[0]);
        const chestN = R.chest ? R.chest.n : 0;
        R.lock = true;
        if (equal && counts[0] === T.each && chestN === T.rem) {
          R.slimes.forEach((s) => { s.joy = 1.5; });
          P.correct({ x: M.VW / 2, y: room().y + 60, pts: 150, say: `${T.expr}. Adil!` });
          setTimeout(() => { P.taskDone(); if (P.done < P.tasks) newTask(); }, 1700);
        } else {
          const lines = !equal
            ? [`Slime dapat ${counts.join(', ')}. Belum sama banyak!`, 'Ambil kembali (A) dari yang kebanyakan, beri yang kurang.']
            : [`Tiap slime dapat ${counts[0]}, peti ${chestN}.`, `Masih ada ${chestN} permata di peti, cukup untuk memberi semua slime 1 lagi!`];
          P.mistake(lines.concat(T.explain), { x: M.VW / 2, y: room().y + 60, btn: 'Perbaiki', after: () => { R.lock = false; } });
        }
      }

      function act() {
        if (R.lock) return;
        const t = nearest();
        if (!t) { M.toast(R.bag ? 'Dekati slime lalu tekan B untuk memberi.' : 'Dekati tumpukan permata lalu tekan B.', 1600); return; }
        if (t.kind === 'pile') {
          // Ambil segenggam: sebanyak jumlah slime (atau sisa tumpukan).
          const take = Math.min(R.pile, R.task.groups - R.bag > 0 ? R.task.groups - R.bag : 0);
          if (!take) { M.toast('Tasmu penuh. Bagikan dulu!', 1400); return; }
          R.pile -= take; R.bag += take; M.sfx('ambil');
          M.fx.float(`+${take}`, t.x, t.y - 20, '#64e3ff');
        } else if (t.kind === 'slime') {
          if (!R.bag) { M.toast('Tasmu kosong. Ambil permata dulu!', 1400); return; }
          R.bag--; t.o.n++; t.o.joy = 0.4; M.sfx('pop');
          M.fx.burst(t.o.x, t.o.y - 30, { n: 6, color: ['#64e3ff', '#fff'], speed: 70 });
          check();
        } else if (t.kind === 'chest') {
          if (!R.bag) { M.toast('Tasmu kosong.', 1200); return; }
          R.bag--; t.o.n++; M.sfx('koin');
          check();
        }
      }
      function takeBack() {
        if (R.lock) return;
        const t = nearest();
        if (t && (t.kind === 'slime' || t.kind === 'chest') && t.o.n > 0) { t.o.n--; R.bag++; M.sfx('klik'); M.fx.float('-1', t.x, t.y - 40, '#ff8fab'); }
      }

      return {
        R,
        solve(wrong) {
          const T = R.task;
          R.pile = 0; R.bag = 0;
          R.slimes.forEach((s, i) => { s.n = T.each + (wrong && i === 0 ? 1 : 0); });
          if (R.chest) R.chest.n = T.rem;
          check();
        },
        update(dt) {
          const I = M.input, rm = room();
          const sp = 150;
          R.moving = Math.abs(I.x) + Math.abs(I.y) > 0.1;
          if (!R.lock) {
            R.hx = M.clamp(R.hx + I.x * sp * dt, rm.x + 16, rm.x + rm.w - 16);
            // Pahlawan tidak bisa berdiri menutupi tumpukan permata.
            R.hy = M.clamp(R.hy + I.y * sp * dt, pileXY().y + 76, rm.y + rm.h - 4);
            if (I.x > 0.2) R.face = 1; else if (I.x < -0.2) R.face = -1;
            const t = nearest();
            if (I.bHit) act();
            if (I.aHit) { if (t && t.kind === 'pile') act(); else takeBack(); }
            // Label tombol sesuai benda terdekat.
            if (!t) M.padLabels(null, R.bag ? 'Beri' : 'Ambil');
            else if (t.kind === 'pile') M.padLabels('Ambil', 'Ambil');
            else if (t.kind === 'slime') M.padLabels(t.o.n ? 'Tarik 1' : null, R.bag ? 'Beri 1' : 'Beri');
            else M.padLabels(t.o.n ? 'Tarik 1' : null, 'Simpan');
          }
          for (const s of R.slimes) if (s.joy > 0) s.joy -= dt;
        },
        tap(x, y) {
          // Ketuk benda di dekat pahlawan = tombol B (memudahkan di layar sentuh).
          const t = nearest();
          if (t && Math.hypot(x - t.x, y - t.y) < 50) act();
        },
        draw(g) {
          const T = R.task, rm = room();
          M.drawBg(g, P.theme, 0, 0);
          // Lantai gua kotak-kotak.
          M.box(g, rm.x - 6, rm.y - 6, rm.w + 12, rm.h + 12, '#2b1d52', { line: '#1d1438', shade: false });
          for (let yy = rm.y; yy < rm.y + rm.h; yy += 24) for (let xx = rm.x; xx < rm.x + rm.w; xx += 24) {
            g.fillStyle = ((xx - rm.x) / 24 + (yy - rm.y) / 24) % 2 ? '#4a3a7a' : '#54448a';
            g.fillRect(xx, yy, Math.min(24, rm.x + rm.w - xx), Math.min(24, rm.y + rm.h - yy));
          }
          g.fillStyle = '#3a2a5e'; g.fillRect(rm.x, rm.y, rm.w, 20);
          // Tumpukan permata.
          const pl = pileXY();
          for (let i = 0; i < Math.min(R.pile, 18); i++) {
            const a = i * 2.4, rr = 4 + Math.sqrt(i) * 6;
            M.spr1(g, R.gem, Math.floor(M.t * 8 + i) % 7, pl.x + Math.cos(a) * rr * 1.3, pl.y + Math.sin(a) * rr * 0.6, { scale: 1.6, anchor: 'center' });
          }
          if (R.pile > 0 && !R.bag && !R.lock) {
            const bob = Math.sin(M.t * 5) * 3;
            M.box(g, pl.x - 58, pl.y - 52 + bob, 116, 24, '#ffd54a', { line: '#2b1d52', border: 2, shade: false });
            M.text(g, 'Ambil di sini!', pl.x, pl.y - 40 + bob, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          }
          M.box(g, pl.x - 34, pl.y + 18, 68, 22, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
          M.text(g, `${R.pile} sisa`, pl.x, pl.y + 29, { size: 13, align: 'center', color: '#2b1d52', outline: false });
          if (R.chest) {
            M.art(g, 'peti', R.chest.x - 21, R.chest.y - 14, 3);
            M.text(g, `peti: ${R.chest.n}`, R.chest.x, R.chest.y + 22, { size: 13, align: 'center' });
          }
          // Slime dan permata yang sudah diterima.
          const near = nearest();
          for (const s of R.slimes) {
            const hop = s.joy > 0 ? Math.abs(Math.sin(s.joy * 12)) * 10 : 0;
            M.spr(g, `${s.sp}_idle`, M.at(`${s.sp}_idle`, M.t, 8), s.x, s.y - hop, { scale: 2.4 });
            for (let j = 0; j < s.n; j++) M.spr1(g, R.gem, 0, s.x - 18 + (j % 4) * 12, s.y - 62 - Math.floor(j / 4) * 12, { scale: 0.9, anchor: 'center' });
            M.box(g, s.x - 16, s.y + 4, 32, 22, '#fff6dc', { line: '#2b1d52', border: 2, shade: false });
            M.text(g, String(s.n), s.x, s.y + 15, { size: 15, align: 'center', color: '#2b1d52', outline: false });
          }
          if (near && !R.lock) { g.strokeStyle = '#ffd54a'; g.lineWidth = 2; g.strokeRect(Math.round(near.x - 26), Math.round(near.y - 46), 52, 56); }
          // Pahlawan dengan tas permata.
          M.hero(g, M.save.active ? M.save.active.hero : 'pinki', R.moving ? 'walk' : 'idle', M.t, R.hx, R.hy, { scale: 1.6, flip: R.face < 0 });
          if (R.bag) {
            for (let j = 0; j < R.bag; j++) M.spr1(g, R.gem, 0, R.hx - 10 + (j % 4) * 8, R.hy - 66 - Math.floor(j / 4) * 8, { scale: 0.8, anchor: 'center' });
            M.text(g, `tas: ${R.bag}`, R.hx, R.hy - 84, { size: 12, align: 'center', color: '#fff3c4' });
          }
          P.questionBox(g, T.label, `Bagikan satu-satu bergiliran. Tas: ${R.bag}`, { size: 16 });
        },
      };
    },
  };
})();
