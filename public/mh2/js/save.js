// Math Hero 2: penyimpanan progres di localStorage (per HP/browser). Tiga slot pemain.
// Disimpan hanya: nama panggilan (1-6 huruf A-Z), pahlawan pilihan, bintang dan skor terbaik tiap level.
// Tidak ada data pribadi dan tidak ada yang dikirim ke mana pun.
(function () {
  const M = window.MH2;
  const KEY = 'mathHero2.save.v1';
  const SLOTS = 3;
  // Sama dengan daftar Math Hero 1: nama yang tidak pantas untuk anak ditolak (pencocokan persis).
  const BLOCKED = new Set(['ANJING', 'BABI', 'BAJING', 'BANGSAT', 'KONTOL', 'MEMEK', 'PANTEK', 'PUKI', 'TOLOL', 'GOBLOK', 'BEGO',
    'JANCOK', 'JANCUK', 'NGENTO', 'TETEK', 'SEX', 'FUCK', 'SHIT', 'BITCH', 'DICK', 'PUSSY', 'COCK', 'CUNT', 'NAZI', 'RAPE', 'PORN', 'PORNO']);

  let data = null, memory = null;
  function blank() { return { slots: Array(SLOTS).fill(null), active: -1 }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) { const d = JSON.parse(raw); if (d && Array.isArray(d.slots)) return d; }
    } catch (e) { /* rusak atau ditolak */ }
    return memory || blank();
  }
  function persist() {
    memory = data;
    try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* tetap jalan dari memori */ }
  }
  data = load();

  function checkName(nama) {
    nama = String(nama || '').toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(nama)) return 'Nama harus 1 sampai 6 huruf.';
    if (BLOCKED.has(nama)) return 'Nama itu tidak bisa dipakai. Coba nama lain, ya!';
    return null;
  }

  const S = M.save = {
    slots: () => data.slots,
    get active() { return data.active >= 0 ? data.slots[data.active] : null; },
    checkName,
    create(i, nama) {
      data.slots[i] = { nama: nama.toUpperCase(), hero: 'pinki', stars: {}, best: {}, seen: {}, dibuat: Date.now(), main: 0 };
      data.active = i; persist();
      return data.slots[i];
    },
    use(i) { if (data.slots[i]) { data.active = i; persist(); } },
    remove(i) { data.slots[i] = null; if (data.active === i) data.active = -1; persist(); },
    setHero(key) { if (S.active) { S.active.hero = key; persist(); } },
    // Simpan hasil level: bintang dan skor terbaik yang pernah dicapai.
    record(levelId, stars, score) {
      const p = S.active;
      if (!p) return { newBest: false, more: 0 };
      const before = p.stars[levelId] || 0;
      p.stars[levelId] = Math.max(before, stars);
      const newBest = score > (p.best[levelId] || 0);
      if (newBest) p.best[levelId] = score;
      p.main = (p.main || 0) + 1;
      persist();
      return { newBest, more: Math.max(0, stars - before) };
    },
    markSeen(key) { if (S.active) { S.active.seen[key] = true; persist(); } },
    seen(key) { return !!(S.active && S.active.seen[key]); },
    totalStars(p) { p = p || S.active; return p ? Object.values(p.stars).reduce((a, b) => a + b, 0) : 0; },
    totalScore(p) { p = p || S.active; return p ? Object.values(p.best).reduce((a, b) => a + b, 0) : 0; },
    starsOf(levelId) { return (S.active && S.active.stars[levelId]) || 0; },
    // Level terbuka jika level sebelumnya (urutan global) sudah selesai minimal 1 bintang.
    unlocked(levelIndex) {
      // ?buka=1 membuka semua level (untuk guru/orang tua yang ingin langsung ke materi tertentu).
      if (/[?&]buka=1(&|$)/.test(location.search)) return true;
      if (levelIndex === 0) return true;
      const prev = M.ALL_LEVELS[levelIndex - 1];
      return S.starsOf(prev.id) > 0;
    },
    heroUnlocked(h) { return S.totalStars() >= h.need; },
  };
})();
