// Math Hero 2: grafis. Pemuat aset (atlas MH2, sprite MH1, ikon SVG), penggambar sprite, pixel art buatan sendiri
// (peta huruf -> warna), dan latar parallax bergaya pixel untuk tiap dunia.
(function () {
  const M = window.MH2;
  const MH1 = '../assets/game/';
  const img = {};          // gambar yang dimuat, per nama
  let atlas = null, atlasMeta = {}, mh1 = {};

  function loadImage(key, src) {
    return new Promise((res) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = () => { console.warn('gagal memuat', src); res(im); };
      im.src = src;
      img[key] = im;
    });
  }

  // Sprite MH1 yang dipakai ulang (pahlawan lama, permata, peti, musuh, ikon, tileset).
  const MH1_USE = /^(hero\d|gem\d|box\d_idle|icon\d+|enemy[1-7]_(run|idle|hit|fly|walk|charge)|end_|checkpoint_flag_idle1|tileset|cannonball1|appearing|trap[1-6])/;
  const SVG = ['apple', 'banana', 'cherry', 'grape', 'strawberry', 'pineapple', 'watermelon', 'candy', 'lollipop', 'chick', 'bee'];

  M.load = function (progress) {
    const jobs = [];
    jobs.push(fetch('assets/sprites.json').then((r) => r.json()).then((m) => { atlasMeta = m; }));
    jobs.push(loadImage('atlas', 'assets/sprites.png').then((im) => { atlas = im; }));
    jobs.push(fetch(MH1 + 'manifest.json').then((r) => r.json()).then((m) => {
      const names = Object.keys(m).filter((n) => MH1_USE.test(n));
      names.forEach((n) => { mh1[n] = m[n]; });
      return Promise.all(names.map((n) => loadImage('1:' + n, MH1 + n + '.png').then(tick)));
    }));
    SVG.forEach((n) => jobs.push(loadImage('svg:' + n, '../assets/svg/' + n + '.svg').then(tick)));
    // Font harus siap sebelum teks pertama digambar ke canvas.
    if (document.fonts) {
      jobs.push(document.fonts.load(`16px ${M.FONT}`).catch(() => {}));
    }
    let done = 0;
    function tick() { done++; if (progress) progress(Math.min(1, done / 90)); }
    return Promise.all(jobs);
  };

  // ---------- Sprite atlas MH2 ----------
  // anchor 'feet' (default): (x, y) = tengah bawah; 'center': tengah; 'tl': pojok kiri atas.
  M.spr = function (ctx, name, frame, x, y, o) {
    o = o || {};
    const m = atlasMeta[name];
    if (!m || !atlas) return false;
    const s = o.scale || 2, f = ((Math.floor(frame) % m.n) + m.n) % m.n;
    const w = m.w * s, h = m.h * s;
    let dx = x - w / 2, dy = y - h;
    if (o.anchor === 'center') dy = y - h / 2;
    else if (o.anchor === 'tl') { dx = x; dy = y; }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.flip) {
      ctx.save(); ctx.translate(Math.round(dx + w), Math.round(dy)); ctx.scale(-1, 1);
      ctx.drawImage(atlas, m.x + f * m.w, m.y, m.w, m.h, 0, 0, w, h);
      ctx.restore();
    } else ctx.drawImage(atlas, m.x + f * m.w, m.y, m.w, m.h, Math.round(dx), Math.round(dy), w, h);
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return true;
  };
  M.sprInfo = (name) => atlasMeta[name];
  M.frames = (name) => (atlasMeta[name] ? atlasMeta[name].n : (mh1[name] ? mh1[name].frames : 1));
  M.at = (name, t, fps) => Math.floor(t * (fps || 10)) % M.frames(name);

  // ---------- Sprite MH1 ----------
  M.spr1 = function (ctx, name, frame, x, y, o) {
    o = o || {};
    const m = mh1[name], im = img['1:' + name];
    if (!m || !im || !im.naturalWidth) return false;
    const s = o.scale || 2, f = ((Math.floor(frame) % m.frames) + m.frames) % m.frames;
    const w = m.fw * s, h = m.h * s;
    const bb = m.bbox, cx = (bb[0] + bb[2]) / 2;
    let dx = x - (o.flip ? m.fw - cx : cx) * s, dy = y - bb[3] * s;
    if (o.anchor === 'center') { dx = x - w / 2; dy = y - h / 2; }
    else if (o.anchor === 'tl') { dx = x; dy = y; }
    if (o.alpha !== undefined) ctx.globalAlpha = o.alpha;
    if (o.flip) {
      ctx.save(); ctx.translate(Math.round(dx + w), Math.round(dy)); ctx.scale(-1, 1);
      ctx.drawImage(im, f * m.fw, 0, m.fw, m.h, 0, 0, w, h);
      ctx.restore();
    } else ctx.drawImage(im, f * m.fw, 0, m.fw, m.h, Math.round(dx), Math.round(dy), w, h);
    if (o.alpha !== undefined) ctx.globalAlpha = 1;
    return true;
  };
  M.tile1 = function (ctx, sx, sy, dx, dy, size) {
    const im = img['1:tileset'];
    if (im && im.naturalWidth) ctx.drawImage(im, sx * 16, sy * 16, 16, 16, Math.round(dx), Math.round(dy), size || 32, size || 32);
  };
  M.tile1Part = function (ctx, sx, sy, sw, sh, dx, dy, dw, dh) {
    const im = img['1:tileset'];
    if (im && im.naturalWidth) ctx.drawImage(im, sx * 16, sy * 16, sw, sh, Math.round(dx), Math.round(dy), dw, dh);
  };
  M.svg = function (ctx, name, x, y, w, h) {
    const im = img['svg:' + name];
    if (im && im.naturalWidth) ctx.drawImage(im, Math.round(x), Math.round(y), w, h || w);
  };

  // Ikon putih MH1 yang diwarnai ulang (disimpan di cache).
  const ICONS = { skull: 'icon01', flag: 'icon02', chest: 'icon03', star: 'icon05', lock: 'icon06', sword: 'icon07', person: 'icon08',
    ring: 'icon09', cross: 'icon10', ff: 'icon11', play: 'icon12', rew: 'icon13', back2: 'icon14', pause: 'icon15', stop: 'icon16',
    sound: 'icon17', mute: 'icon18', menu: 'icon19', grid: 'icon20', dots: 'icon21', trophy: 'icon22', check: 'icon23',
    right: 'icon24', left: 'icon25', up: 'icon26', down: 'icon27', gear: 'icon28', retry: 'icon29', chat: 'icon30' };
  const tint = {};
  M.icon = function (ctx, name, x, y, size, color) {
    const key = (ICONS[name] || name) + color;
    if (!tint[key]) {
      const im = img['1:' + (ICONS[name] || name)];
      if (!im || !im.naturalWidth) return;
      const c = document.createElement('canvas');
      c.width = im.naturalWidth; c.height = im.naturalHeight;
      const cx = c.getContext('2d');
      cx.drawImage(im, 0, 0);
      cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = color || '#fff'; cx.fillRect(0, 0, c.width, c.height);
      tint[key] = c;
    }
    ctx.drawImage(tint[key], Math.round(x), Math.round(y), size, size);
  };

  // ---------- Pahlawan ----------
  // Tiga pahlawan baru (atlas MH2) dan tiga pahlawan Math Hero 1 yang kembali.
  const HEROES = [
    { key: 'pinki', nama: 'Pinki', desc: 'Si pemberani merah muda', need: 0, set: 'mh2' },
    { key: 'owi', nama: 'Owi', desc: 'Burung hantu pintar', need: 0, set: 'mh2' },
    { key: 'hero1', nama: 'Anak Berani', desc: 'Pahlawan Math Hero 1', need: 0, set: 'mh1' },
    { key: 'dudu', nama: 'Dudu', desc: 'Si biru yang lincah', need: 10, set: 'mh2' },
    { key: 'hero2', nama: 'Robo Kuning', desc: 'Robot dari Math Hero 1', need: 20, set: 'mh1' },
    { key: 'hero3', nama: 'Rubah Lincah', desc: 'Rubah dari Math Hero 1', need: 30, set: 'mh1' },
  ];
  M.HEROES = HEROES;
  M.heroInfo = (key) => HEROES.find((h) => h.key === key) || HEROES[0];
  // Nama animasi umum -> sheet. Pahlawan MH1 tidak punya animasi lempar/mati, jadi memakai yang mirip.
  const MH1_ANIM = { idle: 'idle', run: 'run', walk: 'run', jump: 'jump', fall: 'fall', hurt: 'hit', throw: 'double_jump', death: 'hit', climb: 'jump', push: 'run' };
  const FPS = { idle: 8, run: 14, walk: 10, jump: 14, hurt: 10, throw: 14, death: 10, climb: 8, push: 10, fall: 8 };
  M.hero = function (ctx, key, anim, t, x, y, o) {
    o = o || {};
    const h = M.heroInfo(key);
    if (h.set === 'mh1') {
      const name = `${key}_${MH1_ANIM[anim] || 'idle'}`;
      const f = o.frame !== undefined ? o.frame : M.at(name, t, FPS[anim] || 10);
      return M.spr1(ctx, name, f, x, y, o);
    }
    let a = anim === 'fall' ? 'jump' : anim;
    const name = `${key}_${a}`;
    let f = o.frame !== undefined ? o.frame : M.at(name, t, FPS[anim] || 10);
    if (anim === 'fall' && o.frame === undefined) f = 5;
    // Sprite pahlawan kecil sedikit lebih kecil dari pahlawan MH1; skala dinaikkan agar seimbang.
    return M.spr(ctx, name, f, x, y, Object.assign({}, o, { scale: (o.scale || 2) * 1.12 }));
  };

  // ---------- Pixel art buatan sendiri ----------
  // Tiap gambar: daftar baris huruf. Huruf dipetakan ke warna lewat palet; '.' transparan.
  const PAL = {
    o: '#1d1438', w: '#ffffff', y: '#ffd54a', Y: '#e09a1a', r: '#ff5d73', R: '#b82e4a', p: '#ff8fab', P: '#d65f82',
    b: '#4b9cff', B: '#2d5fb4', c: '#64e3ff', C: '#2a9fd6', l: '#b8f4ff', g: '#5fd068', G: '#2f9a43', s: '#ffd1b0', S: '#e8a77f',
    v: '#8b5cf6', V: '#5b34b8', k: '#7a4a2a', K: '#4a2a14', e: '#2b1d52', n: '#9aa0b4', N: '#5d6278', h: '#f4f1ff', t: '#ffe9a8',
    q: '#c49bff', z: '#3a3a4a', a: '#ff9f43', A: '#c96f2e', m: '#ffc2e6',
  };
  const ART = {
    kristal: [
      '....ooo....',
      '...olllo...',
      '..olwlcco..',
      '.olwlcccCo.',
      'olllcccccCo',
      'occcccccCCo',
      '.occcccCCo.',
      '.occcccCCo.',
      '..occcCCo..',
      '..occcCCo..',
      '...occCo...',
      '...occCo...',
      '....oCo....',
      '.....o.....',
    ],
    hati: [
      '.oo.oo.',
      'orrorro',
      'orwrrro',
      'orrrrro',
      '.orrro.',
      '..oro..',
      '...o...',
    ],
    hatiKosong: [
      '.oo.oo.',
      'onnonno',
      'onnnnno',
      'onnnnno',
      '.onnno.',
      '..ono..',
      '...o...',
    ],
    bintang: [
      '.....o.....',
      '....oyo....',
      '....oyo....',
      'ooooywyoooo',
      'oyyywyyyyYo',
      '.oyyyyyyYo.',
      '..oyyyyYo..',
      '..oyyoyYo..',
      '.oyyo.oYYo.',
      '.oyo...oYo.',
      '.oo.....oo.',
    ],
    bintangKosong: [
      '.....o.....',
      '....ono....',
      '....ono....',
      'oooonnnoooo',
      'onnnnnnnnNo',
      '.onnnnnnNo.',
      '..onnnnNo..',
      '..onnonNo..',
      '.onno.oNNo.',
      '.ono...oNo.',
      '.oo.....oo.',
    ],
    peri: [
      '.ll.......ll.',
      'lccl.ooo.lccl',
      'lcclohhhoolcl',
      '.lcohhhhhhol.',
      '..ohhsssshho.',
      '..ohsossosho.',
      '..ohssssssho.',
      '..ohspsspsho.',
      '...osssssso..',
      '....oppppo...',
      '...oppwpppo..',
      '..opppppppo..',
      '..opppppppo..',
      '...oooooo....',
      '....os.so....',
      '....oo.oo....',
    ],
    prof: [
      '..h.h.hh.h.h....',
      '.hhhhhhhhhhhh...',
      'hhhhhhhhhhhhhh..',
      'hhoooooooooohh..',
      'hhossssssssohh..',
      '.oocccoocccooo..',
      '.oclwcoolwccoo..',
      '.ooccoooocccoo..',
      '..ossssssssso...',
      '..osshhhhhsso...',
      '..ohhhohhohhho..',
      '...osssssssso...',
      '...ovvvvvvvvo...',
      '..ovvvyvvyvvvo..',
      '.ovvvvvyyvvvvvo.',
      '.ovvwvvvvvvwvvo.',
      '.ovvwvvvvvvwvvo.',
      '.osvvvvvvvvvvso.',
      '..ovvvvvvvvvvo..',
      '..ovvvvvvvvvvo..',
      '...okko..okko...',
      '..oKKKo..oKKKo..',
    ],
    awan: [
      '......oooo..............',
      '....oowwwwoo...oooo.....',
      '...owwwwwwwwooowwwwoo...',
      '.oowwwwwwwwwwwwwwwwwwoo.',
      'owwwwwwwwwwwwwwwwwwwwwwo',
      'owwlllwwwwwwwwwwwlllwwwo',
      '.olllllllllllllllllllllo',
      '..oooooooooooooooooooo..',
    ],
    gerobak: [
      '..oooooooooooooooo..',
      '.orrrrrrrrrrrrrrrro.',
      '.orwwrrrrrrrrrrwwro.',
      'oRRRRRRRRRRRRRRRRRRo',
      'oRRyyRRRRRRRRRRyyRRo',
      'oRRRRRRRRRRRRRRRRRRo',
      'oooooooooooooooooooo',
      '.ozzzo........ozzzo.',
      '.ozNzo........ozNzo.',
      '..ooo..........ooo..',
    ],
    peti: [
      '.oooooooooooo.',
      'okkkkkkkkkkkko',
      'okKKKKKKKKKKko',
      'oyyyyyyyyyyyyo',
      'okkkkkoykkkkko',
      'okkkkkoykkkkko',
      'okKKKKKKKKKKko',
      'okkkkkkkkkkkko',
      '.oooooooooooo.',
    ],
    benih: [
      '...g....',
      '..gGg...',
      '.g.G.g..',
      '...G....',
      '.kkkkk..',
      'kKKKKKk.',
    ],
    bunga1: [
      '..ppp...',
      '.pyyyp..',
      '.pyypp..',
      '..ppp...',
      '...G.g..',
      '.g.Gg...',
      '..gG....',
      '.kkkkk..',
    ],
    bunga2: [
      '..yyy...',
      '.ywwwy..',
      '.ywwwy..',
      '..yyy...',
      '...G.g..',
      '.g.Gg...',
      '..gG....',
      '.kkkkk..',
    ],
    bunga3: [
      '..bbb...',
      '.bcccb..',
      '.bcwcb..',
      '..bbb...',
      '...G.g..',
      '.g.Gg...',
      '..gG....',
      '.kkkkk..',
    ],
    tunas: [
      '........',
      '........',
      '..g.g...',
      '..gGg...',
      '...G....',
      '...G....',
      '...G....',
      '.kkkkk..',
    ],
    meteor: [
      '...oooooo...',
      '..oAAaaaaoo.',
      '.oAaaaaKaAo.',
      'oAaaKaaaaaAo',
      'oaaaaaaaaaAo',
      'oaKaaaaaKaAo',
      'oaaaaaaaaAAo',
      'oAaaaaKaaAAo',
      '.oAAaaaaAAo.',
      '..oAAAAAAo..',
      '...oooooo...',
    ],
    bom: [
      '....oo.y.',
      '...okkoy.',
      '..ooooo..',
      '.oeeeeeo.',
      'oeeewweeo',
      'oeeeweeeo',
      'oeeeeeeeo',
      '.oeeeeeo.',
      '..ooooo..',
    ],
    mahkota: [
      'o..o..o..o',
      'oyoyooyoyo',
      'oyyyyyyyyo',
      'oyryycyyro',
      'oYYYYYYYYo',
      'oooooooooo',
    ],
    topiKoki: [
      '..oooooo..',
      '.owwwwwwo.',
      'owwwwwwwwo',
      'owwwlwwwwo',
      '.owwwwwwo.',
      '.onnnnnno.',
      '.oooooooo.',
    ],
    pita: [
      'ooooooo',
      'orrrrro',
      'orrwrro',
      'orrrrro',
      'orrorro',
      'oro.oro',
      'oo...oo',
    ],
  };
  const artCache = {};
  // Gambar pixel art ART[name] dengan skala s. Warna bisa ditukar: swap = { r: '#...' }.
  M.art = function (ctx, name, x, y, s, o) {
    o = o || {};
    const key = name + (o.swap ? JSON.stringify(o.swap) : '');
    if (!artCache[key]) {
      const rows = ART[name];
      const w = Math.max(...rows.map((r) => r.length)), h = rows.length;
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      rows.forEach((row, j) => {
        for (let i = 0; i < row.length; i++) {
          const ch = row[i];
          if (ch === '.' || ch === ' ') continue;
          cx.fillStyle = (o.swap && o.swap[ch]) || PAL[ch] || '#f0f';
          cx.fillRect(i, j, 1, 1);
        }
      });
      artCache[key] = c;
    }
    const c = artCache[key];
    s = s || 2;
    let dx = x, dy = y;
    if (o.anchor === 'center') { dx = x - c.width * s / 2; dy = y - c.height * s / 2; }
    else if (o.anchor === 'feet') { dx = x - c.width * s / 2; dy = y - c.height * s; }
    if (o.flip) {
      ctx.save(); ctx.translate(Math.round(dx + c.width * s), Math.round(dy)); ctx.scale(-1, 1);
      ctx.drawImage(c, 0, 0, c.width * s, c.height * s); ctx.restore();
    } else ctx.drawImage(c, Math.round(dx), Math.round(dy), c.width * s, c.height * s);
    return { w: c.width * s, h: c.height * s };
  };
  M.artSize = (name) => ({ w: Math.max(...ART[name].map((r) => r.length)), h: ART[name].length });

  // Gambar bentuk bebas (lingkaran, pizza, koin) di canvas kecil lalu diperbesar: hasilnya tetap berpiksel.
  const lowCache = {};
  M.lowres = function (key, w, h, paint) {
    if (!lowCache[key]) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      const cx = c.getContext('2d');
      paint(cx, w, h);
      // Buang anti-alias: piksel setengah transparan dibulatkan, agar tepi tetap tajam seperti pixel art.
      const d = cx.getImageData(0, 0, w, h);
      for (let i = 3; i < d.data.length; i += 4) d.data[i] = d.data[i] > 110 ? 255 : 0;
      cx.putImageData(d, 0, 0);
      lowCache[key] = c;
    }
    return lowCache[key];
  };
  M.clearLowres = (prefix) => { for (const k in lowCache) if (k.startsWith(prefix)) delete lowCache[k]; };

  // Kotak angka bergaya pixel (dipakai banyak mode): angka besar di kotak berwarna.
  M.numTile = function (ctx, x, y, w, h, label, o) {
    o = o || {};
    M.box(ctx, x, y, w, h, o.fill || '#fff6dc', { line: o.line || '#2b1d52', shadeColor: 'rgba(0,0,0,0.12)' });
    M.text(ctx, label, x + w / 2, y + h / 2, { size: o.size || 20, align: 'center', color: o.color || '#2b1d52', outline: false, font: o.font });
  };

  // HUD hati (nyawa level) dan bintang.
  M.hearts = function (ctx, x, y, n, max, s) {
    s = s || 3;
    for (let i = 0; i < max; i++) M.art(ctx, i < n ? 'hati' : 'hatiKosong', x + i * (7 * s + 4), y, s);
  };
  M.stars = function (ctx, cx, y, n, s, max) {
    s = s || 3; max = max || 3;
    const w = 11 * s, gap = 6;
    const x0 = cx - (max * w + (max - 1) * gap) / 2;
    for (let i = 0; i < max; i++) {
      const lift = max === 3 && i === 1 ? -s * 3 : 0;
      M.art(ctx, i < n ? 'bintang' : 'bintangKosong', x0 + i * (w + gap), y + lift, s);
    }
  };

  // ---------- Bos ----------
  // Bos memakai sprite yang diperbesar dan diberi aksesori (mahkota, topi koki) agar terasa istimewa.
  // (x, y) = tengah bawah. s = skala dasar.
  M.drawBoss = function (ctx, sprite, x, y, s, t, o) {
    o = o || {};
    s = s || 3;
    const hurt = o.hurt > 0 && Math.floor(t * 20) % 2 === 0;
    if (hurt) ctx.globalAlpha = 0.55;
    if (/^slime\d$/.test(sprite)) {
      const anim = o.anim || 'idle';
      M.spr(ctx, `${sprite}_${anim}`, M.at(`${sprite}_${anim}`, t, 8), x, y, { scale: s });
      const info = M.sprInfo(`${sprite}_idle`);
      const top = y - info.h * s * 0.82;
      if (sprite === 'slime2') M.art(ctx, 'topiKoki', x, top + 6, s * 0.9, { anchor: 'feet' });
      else if (sprite === 'slime1') M.art(ctx, 'mahkota', x, top + 8, s * 0.8, { anchor: 'feet' });
    } else if (sprite === 'babi' || sprite === 'kelinci' || sprite === 'rubah' || sprite === 'rusa') {
      const name = `${sprite}_run_${o.dir || 'l'}`, info = M.sprInfo(name);
      M.spr(ctx, name, M.at(name, t, 10), x, y, { scale: s });
      // Mahkota di atas kepala (kepala ada di sisi arah lari).
      if (sprite === 'babi') M.art(ctx, 'mahkota', x + (o.dir === 'r' ? 0.22 : o.dir === 'u' ? 0 : -0.22) * info.w * s, y - info.h * s + 3 * s, s * 0.5, { anchor: 'feet' });
    } else if (sprite === 'burung') {
      const name = `burung_fly_${o.dir || 'd'}`, info = M.sprInfo(name);
      M.spr(ctx, name, M.at(name, t, 10), x, y, { scale: s });
      M.art(ctx, 'mahkota', x, y - info.h * s + 4 * s, s * 0.5, { anchor: 'feet' });
    } else if (sprite === 'prof') {
      const bob = Math.round(Math.sin(t * 3) * s);
      M.art(ctx, 'prof', x, y + bob, s, { anchor: 'feet', flip: o.flip });
    }
    ctx.globalAlpha = 1;
  };

  // ---------- Latar parallax ----------
  // Tiap tema: warna langit (atas, bawah) dan lapisan bentuk. Lapisan dirender sekali ke canvas setengah
  // resolusi selebar 2 layar (bisa diulang mendatar), lalu digambar dua kali lipat agar tampak berpiksel.
  const THEMES = {
    padang: { sky: ['#7cc8ff', '#d4f1ff'], sun: '#fff3b0', layers: [['hill', '#9fdc8c', 0.55, 60, 0.15], ['hill', '#6cc46a', 0.68, 40, 0.35], ['trees', '#3f9a50', 0.78, 0, 0.6]] },
    pantai: { sky: ['#5fb8ff', '#ffe0b8'], sun: '#fff3b0', layers: [['sea', '#2f8fe0', 0.62, 0, 0.1], ['hill', '#ffe1a0', 0.8, 20, 0.4], ['palms', '#2f9a43', 0.78, 0, 0.6]] },
    kebun: { sky: ['#ffb38a', '#ffe8b8'], sun: '#fff1c4', layers: [['hill', '#d6b46a', 0.55, 50, 0.15], ['hill', '#9cc65a', 0.66, 30, 0.35], ['fence', '#a8683a', 0.8, 0, 0.6]] },
    gua: { sky: ['#1c1236', '#3b2466'], layers: [['stal', '#2a1a4d', 0, 0, 0.2], ['crystals', '#64e3ff', 0.75, 0, 0.35], ['hill', '#3a2a5e', 0.82, 24, 0.6]] },
    kota: { sky: ['#ff9a8b', '#ffd6a5'], sun: '#ffe9c4', layers: [['city', '#c17aa8', 0.52, 0, 0.15], ['city', '#8f5a9e', 0.64, 1, 0.35], ['hill', '#5e3f7a', 0.84, 6, 0.6]] },
    benteng: { sky: ['#140c2e', '#4b2e83'], moon: true, layers: [['stars', '#ffffff', 0, 0, 0.05], ['castle', '#2a1a4d', 0.5, 0, 0.2], ['hill', '#1f1440', 0.8, 30, 0.5]] },
    angkasa: { sky: ['#0d0920', '#2b1d52'], layers: [['stars', '#ffffff', 0, 0, 0.1], ['stars', '#b8f4ff', 0, 1, 0.3]] },
    langit: { sky: ['#64b5ff', '#e8f7ff'], sun: '#fff3b0', layers: [['clouds', '#ffffff', 0.3, 0, 0.1], ['clouds', '#f0f8ff', 0.7, 1, 0.3]] },
  };
  M.THEMES = THEMES;
  const bgCache = {};
  function seeded(seed) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

  function paintLayer(cx, kind, color, yk, amp, W, H, seed) {
    const r = seeded(seed * 97 + 13);
    cx.fillStyle = color;
    if (kind === 'hill') {
      const base = H * yk;
      const f1 = (1 + Math.floor(r() * 3)) * 2 * Math.PI / W, f2 = (3 + Math.floor(r() * 3)) * 2 * Math.PI / W, ph = r() * 6;
      for (let x = 0; x < W; x++) {
        const y = base - amp / 2 * (Math.sin(x * f1 + ph) + 0.5 * Math.sin(x * f2 + ph * 2));
        cx.fillRect(x, Math.round(y), 1, H - Math.round(y));
      }
    } else if (kind === 'trees') {
      const base = H * yk;
      cx.fillRect(0, base, W, H - base);
      for (let i = 0; i < W / 14; i++) {
        const x = Math.floor(r() * W), h = 14 + Math.floor(r() * 20), w = 8 + Math.floor(r() * 8);
        for (let j = 0; j < h; j++) {
          const ww = Math.round(w * (0.4 + 0.6 * Math.sin(Math.PI * (j / h) * 0.9 + 0.2)));
          for (const ox of [0, W]) cx.fillRect(x - ww / 2 + ox - W * (x > W / 2 ? 1 : 0), base - j, ww, 1);
        }
      }
    } else if (kind === 'palms') {
      const base = H * yk;
      for (let i = 0; i < 4; i++) {
        const x = Math.floor((i + r() * 0.5) * W / 4);
        cx.fillStyle = '#8a5a2a'; cx.fillRect(x, base - 34, 3, 34);
        cx.fillStyle = color;
        for (let k = -3; k <= 3; k++) cx.fillRect(x - 12 + k * 2, base - 36 - Math.abs(k) * -1 - (3 - Math.abs(k)), 6, 3);
        cx.fillRect(x - 10, base - 38, 22, 3); cx.fillRect(x - 6, base - 41, 14, 3);
      }
    } else if (kind === 'sea') {
      const base = Math.round(H * yk);
      cx.fillRect(0, base, W, H - base);
      cx.fillStyle = 'rgba(255,255,255,0.5)';
      for (let i = 0; i < 40; i++) cx.fillRect(Math.floor(r() * W), base + 3 + Math.floor(r() * (H - base) * 0.6), 4 + Math.floor(r() * 6), 1);
    } else if (kind === 'fence') {
      const base = H * yk;
      cx.fillRect(0, base, W, H - base);
      cx.fillStyle = '#7fb24a'; cx.fillRect(0, base, W, 3);
      cx.fillStyle = color;
      for (let x = 0; x < W; x += 12) { cx.fillRect(x, base - 12, 3, 12); }
      cx.fillRect(0, base - 9, W, 2); cx.fillRect(0, base - 4, W, 2);
    } else if (kind === 'stal') {
      for (let x = 0; x < W; x += 6) { const h = 6 + Math.floor(r() * 26); cx.fillRect(x, 0, 6, h); cx.fillRect(x + 2, h, 2, 4); }
    } else if (kind === 'crystals') {
      const base = H * yk;
      for (let i = 0; i < 10; i++) {
        const x = Math.floor(r() * W), h = 8 + Math.floor(r() * 18);
        cx.fillStyle = i % 2 ? color : '#b38cff';
        for (let j = 0; j < h; j++) { const w = Math.max(1, Math.round(4 * (1 - j / h))); cx.fillRect(x - w, base - j, w * 2, 1); }
      }
    } else if (kind === 'city') {
      const base = H * yk;
      let x = 0;
      while (x < W) {
        const w = 14 + Math.floor(r() * 20), h = 20 + Math.floor(r() * 50);
        cx.fillStyle = color; cx.fillRect(x, base - h, w, H - base + h);
        cx.fillStyle = 'rgba(255,240,170,0.65)';
        for (let wy = base - h + 4; wy < base - 4; wy += 7) for (let wx = x + 3; wx < x + w - 3; wx += 5) if (r() > 0.45) cx.fillRect(wx, wy, 2, 3);
        x += w + 2;
      }
    } else if (kind === 'castle') {
      const base = H * yk;
      const cxm = W / 4;
      for (const ox of [0, W / 2]) {
        cx.fillRect(ox + cxm - 30, base - 40, 60, H - base + 40);
        for (let k = 0; k < 6; k++) cx.fillRect(ox + cxm - 30 + k * 11, base - 46, 6, 6);
        cx.fillRect(ox + cxm - 46, base - 70, 16, H); cx.fillRect(ox + cxm + 30, base - 70, 16, H);
        for (let k = 0; k < 3; k++) { cx.fillRect(ox + cxm - 46 + k * 6, base - 76, 4, 6); cx.fillRect(ox + cxm + 30 + k * 6, base - 76, 4, 6); }
        cx.fillStyle = '#ffd54a'; cx.fillRect(ox + cxm - 4, base - 28, 8, 10); cx.fillRect(ox + cxm - 40, base - 56, 4, 6); cx.fillRect(ox + cxm + 36, base - 56, 4, 6);
        cx.fillStyle = color;
      }
    } else if (kind === 'stars') {
      for (let i = 0; i < 70; i++) { cx.globalAlpha = 0.4 + r() * 0.6; cx.fillRect(Math.floor(r() * W), Math.floor(r() * H), 1, 1); }
      cx.globalAlpha = 1;
    } else if (kind === 'clouds') {
      for (let i = 0; i < 6; i++) {
        const x = Math.floor(r() * W), y = Math.floor(r() * H * 0.9), w = 20 + Math.floor(r() * 30);
        cx.fillRect(x, y, w, 6); cx.fillRect(x + 4, y - 4, w - 12, 4); cx.fillRect(x + w / 3, y - 7, w / 3, 3);
      }
    }
  }

  function layerCanvas(theme, idx, W, H) {
    const key = theme + idx + ':' + W + 'x' + H;
    if (bgCache[key]) return bgCache[key];
    const L = THEMES[theme].layers[idx];
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const cx = c.getContext('2d');
    paintLayer(cx, L[0], L[1], L[2], L[3], W, H, idx + 1 + (L[3] || 0));
    bgCache[key] = c;
    return c;
  }

  // Gambar latar tema. sx/sy = posisi kamera (piksel logis); lapisan bergeser sesuai faktor parallax.
  M.drawBg = function (ctx, theme, sx, sy, o) {
    o = o || {};
    const th = THEMES[theme] || THEMES.padang;
    const VW = M.VW, VH = M.VH, W = VW, H = Math.ceil(VH / 2);
    const grd = ctx.createLinearGradient(0, 0, 0, VH);
    grd.addColorStop(0, th.sky[0]); grd.addColorStop(1, th.sky[1]);
    ctx.fillStyle = grd; ctx.fillRect(0, 0, VW, VH);
    // Pita warna berundak agar gradasi langit tampak berpiksel.
    for (let i = 0; i < 6; i++) { ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(0, VH * (0.35 + i * 0.1), VW, 6); }
    if (th.sun) { ctx.fillStyle = th.sun; const r = 22; for (let y = -r; y <= r; y += 2) { const w = Math.round(Math.sqrt(r * r - y * y)); ctx.fillRect(VW * 0.78 - w, 70 + y, w * 2, 2); } }
    if (th.moon) { ctx.fillStyle = '#fff6dc'; for (let y = -16; y <= 16; y += 2) { const w = Math.round(Math.sqrt(256 - y * y)); ctx.fillRect(VW * 0.75 - w, 80 + y, w * 2, 2); } ctx.fillStyle = th.sky[0]; for (let y = -16; y <= 16; y += 2) { const w = Math.round(Math.sqrt(196 - y * y)); ctx.fillRect(VW * 0.75 - w + 9, 76 + y, w * 2, 2); } }
    th.layers.forEach((L, i) => {
      const c = layerCanvas(theme, i, W, H);
      const par = L[4];
      let ox = -((sx || 0) * par / 2) % W; if (ox > 0) ox -= W;
      const oy = o.vertical ? (((sy || 0) * par / 2) % H) : -((sy || 0) * par * 0.3);
      for (let k = 0; k < 2; k++) {
        const x = Math.round((ox + k * W) * 2);
        if (o.vertical) { for (let m = -1; m < 2; m++) ctx.drawImage(c, x, Math.round((oy + m * H) * 2), W * 2, H * 2); }
        else ctx.drawImage(c, x, Math.round(oy * 2), W * 2, H * 2);
      }
    });
  };
})();
