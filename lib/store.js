// Penyimpanan Math Hero: pemain, skor, dan progres "Lanjutkan" di SQLite (data/mathhero.sqlite).
// Memakai modul bawaan node:sqlite (Node 22.13+), jadi tidak ada paket npm yang perlu diinstal.
// Data yang disimpan hanya nama panggilan (1-6 huruf A-Z, dipilih pemain) dan karakter yang dipakai. Tidak ada data pribadi anak.
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = process.env.MATHHERO_DATA_DIR || path.join(__dirname, '..', 'data'); // MATHHERO_DATA_DIR dipakai tes agar tidak menyentuh data asli
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(path.join(DATA_DIR, 'mathhero.sqlite'));

db.exec(`
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nama TEXT NOT NULL UNIQUE,
    avatar TEXT NOT NULL,
    dibuat TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS scores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL REFERENCES players(id),
    skor INTEGER NOT NULL,
    area INTEGER NOT NULL,
    hasil TEXT NOT NULL,
    waktu TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS progress (
    player_id INTEGER PRIMARY KEY REFERENCES players(id),
    area INTEGER NOT NULL,
    skor INTEGER NOT NULL,
    diperbarui TEXT NOT NULL
  );
`);

// Migrasi aman untuk database lama: tambah kolom hero (karakter yang dipakai, 1-3) di scores dan progress.
// Data lama tidak diubah; baris lama memakai hero NULL dan ditampilkan dengan karakter bawaan.
function addColumnIfMissing(table, column, type) {
  const ada = db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
  if (!ada) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}
addColumnIfMissing('scores', 'hero', 'INTEGER');
addColumnIfMissing('progress', 'hero', 'INTEGER');

// Nama pemain: 1-6 huruf A-Z (diketik lewat papan huruf di layar), selalu huruf besar.
const NAME_MAX = 6;
// Nama yang tidak pantas untuk papan skor anak. Pencocokan persis (nama maksimal 6 huruf); daftar ini tidak lengkap.
const BLOCKED = new Set(['ANJING', 'BABI', 'BAJING', 'BANGSAT', 'KONTOL', 'MEMEK', 'PANTEK', 'PUKI', 'TOLOL', 'GOBLOK', 'BEGO',
  'JANCOK', 'JANCUK', 'NGENTO', 'TETEK', 'SEX', 'FUCK', 'SHIT', 'BITCH', 'DICK', 'PUSSY', 'COCK', 'CUNT', 'NAZI', 'RAPE', 'PORN', 'PORNO']);

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

function now() {
  return new Date().toISOString();
}

function listPlayers() {
  return db.prepare(`
    SELECT p.id, p.nama, pr.hero AS hero, (pr.player_id IS NOT NULL) AS punya_progres, pr.area AS area_progres
    FROM players p LEFT JOIN progress pr ON pr.player_id = p.id
    ORDER BY p.id`).all();
}

// Satu nama = satu pemain (seperti simpanan di mesin arkade). Nama lama dari daftar tetap dikenali tanpa membedakan huruf besar/kecil.
function getOrCreatePlayer(raw) {
  const nama = cleanName(raw);
  const lama = db.prepare('SELECT id, nama FROM players WHERE nama = ? COLLATE NOCASE').get(nama);
  if (lama) return lama;
  db.prepare("INSERT INTO players(nama, avatar, dibuat) VALUES(?,'',?)").run(nama, now());
  return db.prepare('SELECT id, nama FROM players WHERE nama = ?').get(nama);
}

// Papan skor: skor terbaik tiap pemain (bukan semua permainan), lengkap dengan karakter yang dipakai saat skor itu.
function topScores(limit) {
  return db.prepare(`
    SELECT nama, hero, skor, area, hasil, waktu FROM (
      SELECT p.nama, s.hero, s.skor, s.area, s.hasil, s.waktu,
             ROW_NUMBER() OVER (PARTITION BY s.player_id ORDER BY s.skor DESC, s.waktu ASC) AS urut
      FROM scores s JOIN players p ON p.id = s.player_id
    ) WHERE urut = 1
    ORDER BY skor DESC, waktu ASC LIMIT ?`).all(limit || 10);
}

function addScore(playerId, skor, area, hasil, hero) {
  db.prepare('INSERT INTO scores(player_id, skor, area, hasil, waktu, hero) VALUES(?,?,?,?,?,?)')
    .run(playerId, Math.max(0, Math.floor(skor)), area, hasil, now(), cleanHero(hero));
}

function getProgress(playerId) {
  return db.prepare('SELECT area, skor, hero, diperbarui FROM progress WHERE player_id = ?').get(playerId) || null;
}

function saveProgress(playerId, area, skor, hero) {
  db.prepare(`INSERT INTO progress(player_id, area, skor, diperbarui, hero) VALUES(?,?,?,?,?)
    ON CONFLICT(player_id) DO UPDATE SET area = excluded.area, skor = excluded.skor, diperbarui = excluded.diperbarui, hero = excluded.hero`)
    .run(playerId, area, Math.max(0, Math.floor(skor)), now(), cleanHero(hero));
}

function clearProgress(playerId) {
  db.prepare('DELETE FROM progress WHERE player_id = ?').run(playerId);
}

// ---- Endpoint API ----
function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 10000) req.destroy(); });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

// Mengembalikan true jika permintaan ditangani di sini.
async function handleApi(req, res, urlPath) {
  if (!urlPath.startsWith('/api/')) return false;
  try {
    if (req.method === 'GET' && urlPath === '/api/players') {
      send(res, 200, { players: listPlayers() });
      return true;
    }
    if (req.method === 'POST' && urlPath === '/api/players') {
      const b = await readBody(req);
      send(res, 200, { player: getOrCreatePlayer(String(b.nama || '')) });
      return true;
    }
    if (req.method === 'GET' && urlPath === '/api/highscores') {
      send(res, 200, { scores: topScores(10) });
      return true;
    }
    if (req.method === 'POST' && urlPath === '/api/scores') {
      const b = await readBody(req);
      addScore(Number(b.playerId), Number(b.skor) || 0, Number(b.area) || 1, b.hasil === 'tamat' ? 'tamat' : 'kalah', b.hero);
      send(res, 200, { ok: true });
      return true;
    }
    const m = urlPath.match(/^\/api\/progress\/(\d+)$/);
    if (m) {
      const id = Number(m[1]);
      if (req.method === 'GET') { send(res, 200, { progress: getProgress(id) }); return true; }
      if (req.method === 'PUT') {
        const b = await readBody(req);
        saveProgress(id, Number(b.area) || 1, Number(b.skor) || 0, b.hero);
        send(res, 200, { ok: true });
        return true;
      }
      if (req.method === 'DELETE') { clearProgress(id); send(res, 200, { ok: true }); return true; }
    }
    send(res, 404, { error: 'tidak ditemukan' });
    return true;
  } catch (e) {
    send(res, 400, { error: String(e.message || e) });
    return true;
  }
}

module.exports = { handleApi, cleanName };
