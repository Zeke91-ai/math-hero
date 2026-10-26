// Math Hero 3: penyimpanan progres di localStorage (per HP/browser). Tiga slot pemain.
// Disimpan: nama panggilan (1-6 huruf A-Z), pahlawan, kelas, bintang dan skor tiap level, pasukan yang diselamatkan,
// upgrade, Kunci Kristal, pilihan 4 pasukan, dan Buku PR. Tidak ada data pribadi dan tidak ada yang dikirim ke mana pun.
// Aturannya ada di progress.js (murni logika); berkas ini hanya membungkusnya dengan penyimpanan.
(function () {
  const M = window.MH2;
  const P = window.MH3.progress;
  const KEY = 'mathHero3.save.v1';
  const SLOTS = 3;
  // Sama dengan daftar Math Hero 1: nama yang tidak pantas untuk anak ditolak (pencocokan persis).
  const BLOCKED = new Set(['ANJING', 'BABI', 'BAJING', 'BANGSAT', 'KONTOL', 'MEMEK', 'PANTEK', 'PUKI', 'TOLOL', 'GOBLOK', 'BEGO',
    'JANCOK', 'JANCUK', 'NGENTO', 'TETEK', 'SEX', 'FUCK', 'SHIT', 'BITCH', 'DICK', 'PUSSY', 'COCK', 'CUNT', 'NAZI', 'RAPE', 'PORN', 'PORNO']);

  let data = null, memory = null;
  function blank() { return { slots: Array(SLOTS).fill(null), active: -1 }; }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.slots)) {
          d.slots = d.slots.slice(0, SLOTS).map((p) => (p ? P.norm(p) : null));
          while (d.slots.length < SLOTS) d.slots.push(null);
          return d;
        }
      }
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
  // Jalankan fungsi progres pada pemain aktif lalu simpan. Tanpa pemain aktif: tidak melakukan apa-apa.
  function act(fn, fallback) {
    const p = S.active;
    if (!p) return fallback;
    const r = fn(p);
    persist();
    return r;
  }
  const cur = () => S.active || P.blank('X');

  const S = M.save = {
    slots: () => data.slots,
    get active() { return data.active >= 0 ? data.slots[data.active] : null; },
    checkName,
    create(i, nama) {
      data.slots[i] = P.blank(nama);
      data.active = i; persist();
      return data.slots[i];
    },
    use(i) { if (data.slots[i]) { data.active = i; persist(); } },
    remove(i) { data.slots[i] = null; if (data.active === i) data.active = -1; persist(); },
    setHero(key) { act((p) => { p.hero = key; }); },
    setGrade(g) { act((p) => { p.grade = Math.max(2, Math.min(5, g | 0)); }); },
    // Muat ulang dari penyimpanan (dipakai tes untuk meniru buka-tutup aplikasi).
    reload() { data = load(); },
    markSeen(key) { act((p) => { p.seen[key] = true; }); },
    seen(key) { return !!(S.active && S.active.seen[key]); },

    // Level dan bintang.
    record(id, stars, score) { return act((p) => P.record(p, id, stars, score), { first: false, more: 0 }); },
    starsOf: (id) => P.starsOf(cur(), id),
    totalStars: (p) => P.totalStars(p || cur()),
    totalScore: (p) => P.totalScore(p || cur()),
    crystals: (p) => P.crystals(p || cur()),
    current: () => P.current(cur()),
    bonusStars: (index) => P.bonusStars(cur(), index),
    // ?buka=1 membuka semua level (untuk guru/orang tua yang ingin langsung ke materi tertentu).
    unlocked: (index) => P.unlocked(cur(), index, /[?&]buka=1(&|$)/.test(location.search)),
    heroUnlocked: (h) => S.totalStars() >= h.need,

    // Pasukan, Kunci, upgrade.
    owned: () => P.owned(cur()),
    rescue(id) { return act((p) => P.rescue(p, id), false); },
    unitLevel: (id) => P.unitLevel(cur(), id),
    upgradeCost: (id) => P.upgradeCost(cur(), id),
    upgrade(id) { return act((p) => P.upgrade(p, id), { ok: false, why: 'belum' }); },
    keys: () => cur().keys,
    addKeys(n) { return act((p) => P.addKeys(p, n), 0); },
    loadout: () => P.loadout(cur()),
    toggleLoadout(id) { return act((p) => P.toggleLoadout(p, id), 'belum'); },

    // Buku PR.
    logPR(r, title) { return act((p) => P.logPR(p, r, title), null); },
    finishLater(entry, r) { return act((p) => P.finishLater(p, entry, r), { keys: 0 }); },
    book: () => cur().book,
    weekCount: () => P.weekCount(cur()),
  };
})();
