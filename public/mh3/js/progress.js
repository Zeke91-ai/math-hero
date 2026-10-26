// Math Hero 3: aturan progres, murni logika (tanpa DOM) supaya bisa diuji di Node.
// Peta: 4 dunia x 5 level dengan pola Bertahan, Kejar, Bertahan, Kejar, Bos. Semua fungsi bekerja pada objek profil `p`
// (satu slot pemain); save.js yang menyimpannya ke localStorage.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else (root.MH3 = root.MH3 || {}).progress = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const PATTERN = ['defense', 'plat', 'defense', 'plat', 'boss'];
  const KIND_LABEL = { defense: 'Bertahan', plat: 'Kejar', boss: 'Bos' };

  const WORLDS = [
    { id: 1, nama: 'Padang Rumput', tema: 'padang', warna: '#5fd068', kapten: { nama: 'Kapten Slime', sprite: 'slime1' },
      levels: ['Gerbang Padang', 'Jejak di Padang', 'Ladang Gandum', 'Kejar Lewat Bukit', 'Kapten Slime'] },
    { id: 2, nama: 'Gua Kristal', tema: 'gua', warna: '#8b5cf6', kapten: { nama: 'Kapten Elang', sprite: 'burung' },
      levels: ['Mulut Gua', 'Jalan Kristal', 'Terowongan Gema', 'Jurang Berkilau', 'Kapten Elang'] },
    { id: 3, nama: 'Rawa Kabut', tema: 'kebun', warna: '#4fb08a', kapten: { nama: 'Kapten Ulat', sprite: 'slime3' },
      levels: ['Tepi Rawa', 'Jembatan Kabut', 'Hutan Lumut', 'Rawa Dalam', 'Kapten Ulat'] },
    { id: 4, nama: 'Kastil Awan', tema: 'langit', warna: '#b38cff', kapten: { nama: 'Raja Kabut', sprite: 'prof' },
      levels: ['Kaki Kastil', 'Tangga Awan', 'Gerbang Langit', 'Menara Petir', 'Raja Kabut'] },
  ];

  // Daftar 20 level urut global. ref = nomor level di data genre-nya (defense 1..12, plat 1..8).
  const LEVELS = [];
  { let dn = 0, pn = 0;
    WORLDS.forEach((w) => PATTERN.forEach((kind, i) => {
      const genre = kind === 'plat' ? 'plat' : 'defense';
      LEVELS.push({ id: `${w.id}-${i + 1}`, world: w.id, node: i, index: LEVELS.length, kind, genre, boss: kind === 'boss', final: w.id === 4 && kind === 'boss',
        nama: w.levels[i], tema: w.tema, tier: w.id - 1, ref: genre === 'plat' ? ++pn : ++dn });
    }));
  }
  const level = (id) => LEVELS.find((l) => l.id === id);

  // Pasukan. start = sudah dimiliki sejak awal. Selain itu diselamatkan di level Kejar ke-`rescue`.
  const ROSTER = [
    { id: 'pemanah', nama: 'Pemanah Kecil', info: 'Menembak lurus ke atas jalurnya', cost: 100, start: true },
    { id: 'menara', nama: 'Menara Bintang', info: 'Menghasilkan Bintang', cost: 50, start: true },
    { id: 'tembok', nama: 'Tembok Batu', info: 'Memblok monster, HP tinggi', cost: 50, start: true },
    { id: 'penyihir', nama: 'Penyihir Es', info: 'Memperlambat monster', cost: 150, rescue: 1, warga: 'Bu Salju', hero: 'owi' },
    { id: 'meriam', nama: 'Meriam', info: 'Ledakan di area sekitar', cost: 200, rescue: 2, warga: 'Pak Bom', hero: 'dudu' },
    { id: 'robo', nama: 'Robo Kuning', info: 'Laser satu jalur penuh', cost: 175, rescue: 3, warga: 'Robo Kuning', hero: 'hero2' },
    { id: 'rubah', nama: 'Rubah Lincah', info: 'Menyerang 3 jalur sekaligus', cost: 175, rescue: 4, warga: 'Rubah Lincah', hero: 'hero3' },
    { id: 'anak', nama: 'Anak Berani', info: 'Perisai satu baris sebentar', cost: 150, rescue: 5, warga: 'Anak Berani', hero: 'hero1' },
  ];
  const unit = (id) => ROSTER.find((u) => u.id === id);
  // Penduduk yang diselamatkan di level Kejar nomor k (1..8), atau null.
  const rescueFor = (platRef) => ROSTER.find((u) => u.rescue === platRef) || null;

  const MAX_LV = 3, UPG_COST = [0, 2, 4]; // biaya Kunci untuk mencapai level 1, 2, 3
  const LOADOUT_MAX = 4, STAR_BONUS = 50, DAY = 86400000, BOOK_CAP = 200;

  function norm(p) {
    p.stars = p.stars || {}; p.best = p.best || {}; p.seen = p.seen || {};
    p.grade = p.grade || 2; p.hero = p.hero || 'pinki';
    p.rescued = Array.isArray(p.rescued) ? p.rescued : [];
    p.upg = p.upg || {}; p.keys = p.keys | 0;
    p.loadout = Array.isArray(p.loadout) ? p.loadout : [];
    p.book = p.book || {}; p.book.done = p.book.done || []; p.book.later = p.book.later || [];
    p.main = p.main || 0;
    return p;
  }
  function blank(nama, hero, grade) {
    return norm({ nama: String(nama).toUpperCase(), hero: hero || 'pinki', grade: grade || 2, dibuat: Date.now() });
  }

  // ---------- Level dan bintang ----------
  const starsOf = (p, id) => p.stars[id] || 0;
  const totalStars = (p) => Object.values(p.stars).reduce((a, b) => a + b, 0);
  const totalScore = (p) => Object.values(p.best).reduce((a, b) => a + b, 0);
  const crystals = (p) => LEVELS.filter((l) => l.kind === 'plat' && starsOf(p, l.id) > 0).length;
  // Simpan hasil level: bintang terbaik yang pernah dicapai.
  function record(p, id, stars, score) {
    const before = starsOf(p, id);
    p.stars[id] = Math.max(before, stars | 0);
    if ((score | 0) > (p.best[id] || 0)) p.best[id] = score | 0;
    p.main++;
    return { first: before === 0 && stars > 0, more: Math.max(0, stars - before) };
  }
  // Level terbuka jika level sebelumnya (urutan global) sudah minimal 1 bintang.
  function unlocked(p, index, openAll) {
    if (openAll || index === 0) return true;
    return starsOf(p, LEVELS[index - 1].id) > 0;
  }
  function current(p) { return LEVELS.find((l) => starsOf(p, l.id) === 0) || LEVELS[LEVELS.length - 1]; }
  // Kristal yang direbut di level Kejar sebelumnya memberi +50 Bintang awal di level Bertahan sesudahnya.
  function bonusStars(p, index) {
    const prev = LEVELS[index - 1];
    return prev && prev.kind === 'plat' && starsOf(p, prev.id) > 0 ? STAR_BONUS : 0;
  }

  // ---------- Pasukan ----------
  const owned = (p) => ROSTER.filter((u) => u.start || p.rescued.includes(u.id)).map((u) => u.id);
  function rescue(p, id) {
    const u = unit(id);
    if (!u || u.start || p.rescued.includes(id)) return false;
    p.rescued.push(id);
    return true;
  }
  const unitLevel = (p, id) => (owned(p).includes(id) ? Math.min(MAX_LV, Math.max(1, p.upg[id] || 1)) : 0);
  // Biaya Kunci naik ke level berikutnya, atau null bila sudah maksimal / belum dimiliki.
  function upgradeCost(p, id) {
    const lv = unitLevel(p, id);
    return lv === 0 || lv >= MAX_LV ? null : UPG_COST[lv];
  }
  function upgrade(p, id) {
    const cost = upgradeCost(p, id);
    if (cost == null) return { ok: false, why: unitLevel(p, id) ? 'maks' : 'belum' };
    if (p.keys < cost) return { ok: false, why: 'kunci', cost };
    p.keys -= cost; p.upg[id] = unitLevel(p, id) + 1;
    return { ok: true, level: p.upg[id], cost };
  }
  function addKeys(p, n) { p.keys += Math.max(0, n | 0); return p.keys; }

  // Pilihan 4 pasukan untuk level Bertahan. Selalu berisi pasukan yang dimiliki, tanpa ganda, paling banyak 4.
  function loadout(p) {
    const own = owned(p);
    let l = p.loadout.filter((id, i, a) => own.includes(id) && a.indexOf(id) === i).slice(0, LOADOUT_MAX);
    if (!l.length) l = own.slice(0, LOADOUT_MAX);
    return l;
  }
  // Pasang atau lepas satu pasukan. Mengembalikan 'penuh' bila sudah 4, 'terakhir' bila akan jadi kosong, atau null.
  function toggleLoadout(p, id) {
    const l = loadout(p);
    if (!owned(p).includes(id)) return 'belum';
    const at = l.indexOf(id);
    if (at >= 0) { if (l.length === 1) return 'terakhir'; l.splice(at, 1); }
    else { if (l.length >= LOADOUT_MAX) return 'penuh'; l.push(id); }
    p.loadout = l;
    return null;
  }

  // ---------- Buku PR ----------
  const sameHw = (a, b) => a.id === b.id && a.seed === b.seed;
  function kindOf(title) { return /kristal|harta/i.test(title || '') ? 'kunci' : /perisai/i.test(title || '') ? 'perisai' : 'kuasa'; }
  // Catat hasil kartu PR. r = hasil MH3.homework.open (status 'done' atau 'later').
  function logPR(p, r, title, now) {
    now = now || Date.now();
    const e = { id: r.id, seed: r.seed, tier: r.tier, grade: r.grade, title: title || 'PR', kind: kindOf(title), t: now };
    if (!e.id) return null;
    const b = p.book;
    if (r.status === 'done') {
      b.later = b.later.filter((x) => !sameHw(x, e));
      e.stars = r.stars;
      b.done.push(e);
      if (b.done.length > BOOK_CAP) b.done.splice(0, b.done.length - BOOK_CAP);
    } else if (!b.later.some((x) => sameHw(x, e))) b.later.push(e);
    return e;
  }
  // PR tertunda dikerjakan dari Buku PR. Peti Kristal/Harta yang ditunda tetap memberi Kunci (sebanyak bintang).
  function finishLater(p, entry, r, now) {
    const had = p.book.later.some((x) => sameHw(x, entry));
    if (!had) return { keys: 0 };
    logPR(p, r, entry.title, now);
    const done = r.status === 'done';
    const keys = done && entry.kind === 'kunci' ? Math.max(1, Math.min(3, r.stars)) : 0;
    if (keys) addKeys(p, keys);
    return { keys, done };
  }
  const weekCount = (p, now) => p.book.done.filter((e) => e.t >= (now || Date.now()) - 7 * DAY).length;

  return { PATTERN, KIND_LABEL, WORLDS, LEVELS, ROSTER, MAX_LV, UPG_COST, LOADOUT_MAX, STAR_BONUS,
    level, unit, rescueFor, norm, blank, starsOf, totalStars, totalScore, crystals, record, unlocked, current, bonusStars,
    owned, rescue, unitLevel, upgradeCost, upgrade, addKeys, loadout, toggleLoadout, logPR, finishLater, weekCount, kindOf };
});
