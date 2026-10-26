// Penyimpanan lokal Math Hero untuk hosting statis (tanpa server): meniru API server (lib/store.js) di localStorage.
// Dipakai otomatis oleh menu.js jika server API tidak ada (mis. di GitHub Pages atau Netlify).
// Data tersimpan per HP/browser: nama panggilan (1-6 huruf A-Z), skor, dan checkpoint. Tidak ada data pribadi, tidak ada yang dikirim ke mana pun.
(function () {
  const KEY = 'mathhero.v1';
  const NAME_MAX = 6;
  const MAX_SKOR = 300; // batasi riwayat skor agar penyimpanan tetap kecil
  // Daftar sama dengan server; pencocokan persis, tidak lengkap.
  const BLOCKED = new Set(['ANJING', 'BABI', 'BAJING', 'BANGSAT', 'KONTOL', 'MEMEK', 'PANTEK', 'PUKI', 'TOLOL', 'GOBLOK', 'BEGO',
    'JANCOK', 'JANCUK', 'NGENTO', 'TETEK', 'SEX', 'FUCK', 'SHIT', 'BITCH', 'DICK', 'PUSSY', 'COCK', 'CUNT', 'NAZI', 'RAPE', 'PORN', 'PORNO']);

  let memory = null; // cadangan di memori jika localStorage ditolak browser (mis. mode pribadi tertentu)

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && Array.isArray(d.players) && Array.isArray(d.scores) && d.progress) return d;
      }
    } catch (e) { /* rusak atau ditolak: pakai cadangan */ }
    return memory || { next: 1, players: [], scores: [], progress: {} };
  }

  function save(d) {
    memory = d;
    try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* tetap jalan dari memori */ }
  }

  function cleanName(raw) {
    const nama = String(raw || '').trim().toUpperCase();
    if (!/^[A-Z]{1,6}$/.test(nama)) throw new Error(`Nama harus 1 sampai ${NAME_MAX} huruf A-Z.`);
    if (BLOCKED.has(nama)) throw new Error('Nama itu tidak bisa dipakai. Coba nama lain, ya!');
    return nama;
  }

  function cleanHero(h) {
    const n = Math.floor(Number(h));
    return n >= 1 && n <= 3 ? n : null;
  }

  const nowIso = () => new Date().toISOString();
  const nat = (v, min) => Math.max(min, Math.floor(Number(v)) || min);

  function listPlayers(d) {
    return d.players.map((p) => {
      const pr = d.progress[p.id];
      return { id: p.id, nama: p.nama, hero: pr ? pr.hero : null, punya_progres: pr ? 1 : 0, area_progres: pr ? pr.area : null };
    });
  }

  function getOrCreatePlayer(d, raw) {
    const nama = cleanName(raw);
    let p = d.players.find((x) => x.nama === nama);
    if (!p) {
      p = { id: d.next++, nama, dibuat: nowIso() };
      d.players.push(p);
    }
    return { id: p.id, nama: p.nama };
  }

  // Skor terbaik tiap pemain, urut skor tertinggi lalu yang lebih dulu mencapainya.
  function topScores(d, limit) {
    const best = new Map();
    for (const s of d.scores) {
      const b = best.get(s.playerId);
      if (!b || s.skor > b.skor || (s.skor === b.skor && s.waktu < b.waktu)) best.set(s.playerId, s);
    }
    const nama = new Map(d.players.map((p) => [p.id, p.nama]));
    return [...best.values()]
      .filter((s) => nama.has(s.playerId))
      .sort((a, b) => b.skor - a.skor || (a.waktu < b.waktu ? -1 : 1))
      .slice(0, limit || 10)
      .map((s) => ({ nama: nama.get(s.playerId), hero: s.hero, skor: s.skor, area: s.area, hasil: s.hasil, waktu: s.waktu }));
  }

  // Sama seperti fetch ke server: mengembalikan objek data, atau melempar Error dengan pesan ramah.
  async function handle(method, url, body) {
    const b = body || {};
    const d = load();
    if (method === 'GET' && url === '/api/players') return { players: listPlayers(d) };
    if (method === 'POST' && url === '/api/players') {
      const player = getOrCreatePlayer(d, b.nama);
      save(d);
      return { player };
    }
    if (method === 'GET' && url === '/api/highscores') return { scores: topScores(d, 10) };
    if (method === 'POST' && url === '/api/scores') {
      const id = Number(b.playerId);
      if (!d.players.some((p) => p.id === id)) throw new Error('pemain tidak ditemukan');
      d.scores.push({ playerId: id, skor: nat(b.skor, 0), area: nat(b.area, 1), hasil: b.hasil === 'tamat' ? 'tamat' : 'kalah', hero: cleanHero(b.hero), waktu: nowIso() });
      if (d.scores.length > MAX_SKOR) {
        // buang skor lama satu per satu, tetapi jangan pernah membuang skor terbaik tiap pemain
        const bestBy = new Map();
        for (const s of d.scores) { const x = bestBy.get(s.playerId); if (!x || s.skor > x.skor) bestBy.set(s.playerId, s); }
        const keep = new Set(bestBy.values());
        for (let i = 0; i < d.scores.length && d.scores.length > MAX_SKOR;) {
          if (keep.has(d.scores[i])) i++; else d.scores.splice(i, 1);
        }
      }
      save(d);
      return { ok: true };
    }
    const m = url.match(/^\/api\/progress\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      if (method === 'GET') return { progress: d.progress[id] || null };
      if (method === 'PUT') {
        d.progress[id] = { area: nat(b.area, 1), skor: nat(b.skor, 0), hero: cleanHero(b.hero), diperbarui: nowIso() };
        save(d);
        return { ok: true };
      }
      if (method === 'DELETE') {
        delete d.progress[id];
        save(d);
        return { ok: true };
      }
    }
    throw new Error('tidak ditemukan');
  }

  window.LocalApi = { handle };
})();
