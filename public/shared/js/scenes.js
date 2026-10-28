// Kit: adegan menu bersama. Slot pemain, isi nama, pilih pahlawan, pemutar dialog cerita, dan kredit.
// Alur dan isi yang beda tiap seri dikirim lewat konfigurasi:
//   MHKit.scenes.install(M, {
//     slotInfo(g, p, x, y, w, h, txt)   // isi kartu slot: bintang, kelas, kristal, dst.
//     opening()                          // parameter adegan 'story' untuk cerita pembuka: { lines, next, seen }
//     mapParams                          // parameter M.go('map', ...) setelah pilih/lanjut (bawaan {})
//     heroesExtra(g)                     // tambahan di layar pilih pahlawan (this = adegan), mis. pilih kelas
//     cast(line, scene)                  // { bg, who, fill, draw(g, cx, cy) } untuk satu baris dialog
//     credits                            // daftar baris kredit (MathHeroCredits.lines)
//     creditHeroes                       // kunci pahlawan yang berlari di kredit
//     ui: { backH, skipH, closeH, del(x, y, w), counter: {x, y} }   // ukuran tombol dan posisi per seri
//   });
// Skema state adegan 'story': p.lines, p.next, p.seen, p.world, p.musik; this.end() menandai dilihat lalu lanjut.
(function () {
  const api = (window.MHKit = window.MHKit || {}).scenes = {};
  api.install = function (M, cfg) {
    const S = M.save;
    const ui = Object.assign({ backH: 44, skipH: 44, closeH: 44, del: (x, y, w) => ({ x: x + w - 48, y: y + 6, w: 44, h: 44 }), counter: { x: M.VW - 12, y: 28 } }, cfg.ui);
    cfg.creditHeroes = cfg.creditHeroes || ['pinki', 'owi', 'dudu', 'hero1', 'hero2', 'hero3'];

    function heroKey() { return S.active ? S.active.hero : 'pinki'; }
    function backBtn(g, onTap) { M.button(g, { id: 'kembali', x: 8, y: 8, w: 44, h: ui.backH, color: 'purple', icon: 'left', onTap }); }
    const txt = (g, t, x, y, o) => M.text(g, t, x, y, Object.assign({ color: '#2b1d52', outline: false }, o));
    M.ui = { heroKey, backBtn, txt };

    // ---------- Slot pemain ----------
    M.register('slots', {
      enter() { M.audio.music('title'); this.confirm = -1; },
      update() { if (M.input.pause) M.go('title'); },
      draw(g) {
        const VW = M.VW;
        M.drawBg(g, 'langit', M.t * 15, 0);
        backBtn(g, () => M.go('title'));
        M.text(g, 'Pilih Petualang', VW / 2, 70, { size: 28, align: 'center', color: '#ffd54a', ow: 6 });
        S.slots().forEach((p, i) => {
          const y = 110 + i * 150, x = 20, w = VW - 40, h = 134;
          if (p) {
            M.button(g, { id: 'slot' + i, x, y, w, h, color: 'white', label: '', onTap: () => {
              S.use(i);
              if (!S.seen('pembuka')) M.go('story', cfg.opening()); else M.go('map', cfg.mapParams || {});
            } });
            M.hero(g, p.hero, 'idle', M.t, x + 52, y + 104, { scale: 2.6 });
            txt(g, p.nama, x + 104, y + 34, { size: 28 });
            cfg.slotInfo(g, p, x, y, w, h, txt);
            if (this.confirm === i) {
              M.box(g, x + 4, y + 4, w - 8, h - 8, '#ffe1e6', { line: '#c9414a' });
              txt(g, `Hapus ${p.nama}?`, x + w / 2, y + 36, { size: 20, align: 'center', color: '#c9414a' });
              M.button(g, { id: 'ya' + i, x: x + 30, y: y + 66, w: 110, h: 44, label: 'Hapus', color: 'red', onTap: () => { S.remove(i); this.confirm = -1; } });
              M.button(g, { id: 'tidak' + i, x: x + w - 140, y: y + 66, w: 110, h: 44, label: 'Batal', color: 'gray', onTap: () => { this.confirm = -1; } });
            } else M.button(g, Object.assign({ id: 'hapus' + i, color: 'red', icon: 'cross', onTap: () => { this.confirm = i; } }, ui.del(x, y, w)));
          } else {
            M.button(g, { id: 'baru' + i, x, y, w, h, color: 'purple', label: '+ Petualang Baru', size: 22, onTap: () => M.go('name', { slot: i }) });
          }
        });
        M.text(g, 'Progres tersimpan di HP ini.', VW / 2, M.VH - 24, { size: 13, align: 'center', color: '#fff' });
      },
    });

    // ---------- Isi nama ----------
    M.register('name', {
      enter(p) { this.slot = p.slot; this.typed = ''; this.err = ''; this.keyH = (e) => this.key(e); window.addEventListener('keydown', this.keyH); },
      exit() { window.removeEventListener('keydown', this.keyH); },
      key(e) {
        if (/^[a-zA-Z]$/.test(e.key)) this.add(e.key.toUpperCase());
        else if (e.key === 'Backspace') this.typed = this.typed.slice(0, -1);
        else if (e.key === 'Enter') this.ok();
      },
      add(ch) { if (this.typed.length < 6) { this.typed += ch; this.err = ''; M.sfx('klik'); } },
      ok() {
        const err = S.checkName(this.typed);
        if (err) { this.err = err; M.sfx('salah'); return; }
        S.create(this.slot, this.typed);
        M.go('heroes', { first: true });
      },
      draw(g) {
        const VW = M.VW;
        M.drawBg(g, 'langit', M.t * 15, 0);
        backBtn(g, () => M.go('slots'));
        M.text(g, 'Siapa namamu?', VW / 2, 74, { size: 28, align: 'center', color: '#ffd54a', ow: 6 });
        for (let i = 0; i < 6; i++) {
          const x = VW / 2 - 3 * 46 + i * 46;
          M.box(g, x, 104, 40, 50, i === this.typed.length && Math.floor(M.t * 2) % 2 ? '#ffe1e6' : '#fff6dc', { line: '#2b1d52' });
          txt(g, this.typed[i] || '', x + 20, 130, { size: 30, align: 'center' });
        }
        const cols = 7, kw = (VW - 30) / cols;
        for (let c = 0; c < 26; c++) {
          const ch = String.fromCharCode(65 + c);
          M.button(g, { id: 'k' + ch, x: 15 + (c % cols) * kw + 2, y: 178 + Math.floor(c / cols) * 56, w: kw - 4, h: 48, label: ch, color: 'blue', size: 22, sfx: 'pop', onTap: () => this.add(ch) });
        }
        const by = 178 + 4 * 56 + 10;
        M.button(g, { id: 'hapus', x: 15, y: by, w: (VW - 40) / 2, h: 52, label: 'Hapus', color: 'orange', onTap: () => { this.typed = this.typed.slice(0, -1); } });
        M.button(g, { id: 'lanjut', x: VW / 2 + 5, y: by, w: (VW - 40) / 2, h: 52, label: 'Lanjut', color: 'green', disabled: !this.typed, onTap: () => this.ok() });
        if (this.err) M.text(g, this.err, VW / 2, by + 84, { size: 15, align: 'center', color: '#fff3c4', maxW: VW - 40 });
      },
    });

    // ---------- Pilih pahlawan ----------
    M.register('heroes', {
      enter(p) { this.first = p.first; this.msg = ''; },
      draw(g) {
        const VW = M.VW;
        M.drawBg(g, 'langit', M.t * 15, 0);
        if (!this.first) backBtn(g, () => M.go('map', {}));
        M.text(g, 'Pilih Pahlawanmu!', VW / 2, 74, { size: 28, align: 'center', color: '#ffd54a', ow: 6 });
        const total = S.totalStars();
        M.HEROES.forEach((h, i) => {
          const cw = (VW - 40) / 2, ch = 150, x = 15 + (i % 2) * (cw + 10), y = 104 + Math.floor(i / 2) * (ch + 10);
          const open = S.heroUnlocked(h), chosen = S.active && S.active.hero === h.key;
          M.button(g, { id: 'h' + h.key, x, y, w: cw, h: ch, color: chosen ? 'yellow' : 'white', label: '', onTap: () => {
            if (!open) { this.msg = `${h.nama} terbuka setelah ${h.need} bintang. Kamu punya ${total}.`; M.sfx('salah'); return; }
            S.setHero(h.key); M.sfx('benar');
            if (this.first) M.go('story', cfg.opening()); else M.go('map', cfg.mapParams || {});
          } });
          if (open) M.hero(g, h.key, chosen ? 'run' : 'idle', M.t + i, x + cw / 2, y + 92, { scale: 2.6 });
          else {
            g.globalAlpha = 0.35; M.hero(g, h.key, 'idle', 0, x + cw / 2, y + 92, { scale: 2.6 }); g.globalAlpha = 1;
            M.icon(g, 'lock', x + cw / 2 - 14, y + 40, 28, '#2b1d52');
          }
          txt(g, h.nama, x + cw / 2, y + 112, { size: 17, align: 'center' });
          txt(g, open ? h.desc : `Butuh ${h.need} bintang`, x + cw / 2, y + 132, { size: 12, align: 'center', color: '#6b4fa8' });
        });
        if (this.msg) M.text(g, this.msg, VW / 2, 104 + 3 * 160 + 16, { size: 14, align: 'center', color: '#fff3c4', maxW: VW - 30 });
        if (cfg.heroesExtra) cfg.heroesExtra.call(this, g);
      },
    });

    // ---------- Cerita (dialog) ----------
    M.register('story', {
      enter(p) { this.lines = p.lines; this.i = 0; this.t = 0; this.next = p.next; this.seenKey = p.seen; this.world = p.world || 1; M.audio.music(p.musik || 'peta'); },
      advance() {
        const line = this.lines[this.i];
        const full = this.t * 40 >= line.text.length;
        if (!full) { this.t = 999; return; }
        M.sfx('kartu');
        this.i++; this.t = 0;
        if (this.i >= this.lines.length) this.end();
      },
      end() { if (this.seenKey) S.markSeen(this.seenKey); M.go(this.next[0], this.next[1]); },
      update(dt) { this.t += dt; if (M.input.bHit || M.input.aHit) this.advance(); },
      tap() { this.advance(); },
      draw(g) {
        const VW = M.VW, VH = M.VH;
        const line = this.lines[Math.min(this.i, this.lines.length - 1)];
        // cfg.cast: latar, nama pembicara, warna judul, dan cara menggambar tokohnya (beda tiap seri).
        const cast = cfg.cast(line, this);
        M.drawBg(g, cast.bg, M.t * 10, 0);
        const cx = VW / 2, cy = VH * 0.55;
        cast.draw(g, cx, cy);
        const h = 150, y = VH - h - 20;
        M.panel(g, 12, y, VW - 24, h, { title: cast.who, titleFill: cast.fill });
        const shown = line.text.slice(0, Math.floor(this.t * 40));
        M.text(g, shown, 30, y + 30, { size: 18, color: '#2b1d52', outline: false, maxW: VW - 60, base: 'top', lh: 24 });
        if (this.t * 40 >= line.text.length && Math.floor(M.t * 3) % 2) M.icon(g, 'down', VW - 52, y + h - 34, 20, '#7b4bd6');
        M.text(g, `${this.i + 1}/${this.lines.length}`, ui.counter.x, ui.counter.y, { size: 12, align: 'right' });
        M.button(g, { id: 'lewati', x: 10, y: 10, w: 84, h: ui.skipH, label: 'Lewati', size: 13, color: 'purple', onTap: () => this.end() });
      },
    });

    // ---------- Kredit ----------
    const CREDITS = MathHeroCredits.lines(cfg.credits);
    M.register('credits', {
      enter(p) { this.t = 0; this.ending = p.ending; M.audio.music('title'); },
      update(dt) { this.t += dt; if (M.input.bHit) M.go(this.ending ? 'map' : 'title', {}); },
      tap() { if (this.t > 1) M.go(this.ending ? 'map' : 'title', {}); },
      draw(g) {
        const VW = M.VW, VH = M.VH;
        M.drawBg(g, 'angkasa', 0, this.t * 30, { vertical: true });
        const y0 = VH - this.t * 40;
        CREDITS.forEach((l, i) => {
          const y = y0 + i * 30;
          if (y < -20 || y > VH + 20) return;
          const head = l === l.toUpperCase() && l.length > 0;
          M.text(g, l, VW / 2, y, { size: head ? 22 : 16, align: 'center', color: head ? '#ffd54a' : '#fff' });
        });
        if (y0 + CREDITS.length * 30 < 0) this.t = 0;
        g.fillStyle = '#1d1438'; g.fillRect(0, VH - 70, VW, 70);
        cfg.creditHeroes.forEach((k, i) => M.hero(g, k, 'run', M.t + i, 40 + i * 56, VH - 16, { scale: 1.6 }));
        M.button(g, { id: 'tutup', x: VW - 92, y: 10, w: 82, h: ui.closeH, label: 'Tutup', size: 14, color: 'purple', onTap: () => M.go(this.ending ? 'map' : 'title', {}) });
      },
    });
  };
})();
