// Membuat seri Math Hero baru dari templat kit (public/shared/template/).
// Pakai: node scripts/buat_seri.js <id> "<Judul>" [--keluar <folder>]
//   contoh: node scripts/buat_seri.js mh4 "Math Hero 4: Pulau Pecahan"
// Hasil: public/<id>/ berisi index.html, js/scenes.js (dari templat), js/gfx.js dan assets/ (disalin dari MH3).
// Setelah itu: tambah kartu di public/index.html, lalu ikuti shared/PANDUAN_SERI_BARU.md.
const fs = require('fs');
const path = require('path');

const PUBLIC = path.join(__dirname, '..', 'public');
const TEMPLAT = path.join(PUBLIC, 'shared', 'template');
const GFX_DARI = path.join(PUBLIC, 'mh3');

function salinDenganGanti(dari, ke, ganti) {
  fs.mkdirSync(path.dirname(ke), { recursive: true });
  let s = fs.readFileSync(dari, 'utf8');
  for (const [k, v] of Object.entries(ganti)) s = s.split(k).join(v);
  fs.writeFileSync(ke, s);
}

function buat(id, judul, keluar) {
  if (!/^[a-z][a-z0-9-]{1,20}$/.test(id)) throw new Error('id seri harus huruf kecil, angka, atau strip (contoh: mh4)');
  if (!judul || !judul.trim()) throw new Error('judul seri wajib diisi');
  const dir = keluar || path.join(PUBLIC, id);
  if (fs.existsSync(dir)) throw new Error('folder sudah ada, tidak ditimpa: ' + dir);
  const ganti = { __JUDUL__: judul.trim().replace(/[<>&"'\\`$]/g, ''), __ID__: id };
  salinDenganGanti(path.join(TEMPLAT, 'index.html'), path.join(dir, 'index.html'), ganti);
  salinDenganGanti(path.join(TEMPLAT, 'js', 'scenes.js'), path.join(dir, 'js', 'scenes.js'), ganti);
  // Grafis seri masih per seri (gfx.js + atlas sprite). Disalin dari MH3 sebagai titik awal.
  fs.copyFileSync(path.join(GFX_DARI, 'js', 'gfx.js'), path.join(dir, 'js', 'gfx.js'));
  fs.mkdirSync(path.join(dir, 'assets'), { recursive: true });
  for (const f of ['sprites.json', 'sprites.png']) fs.copyFileSync(path.join(GFX_DARI, 'assets', f), path.join(dir, 'assets', f));
  return dir;
}

module.exports = { buat };
if (require.main === module) {
  const a = process.argv.slice(2);
  const i = a.indexOf('--keluar');
  const keluar = i >= 0 ? a.splice(i, 2)[1] : null;
  try {
    const dir = buat(a[0], a[1], keluar);
    console.log(`Seri dibuat di ${dir}\nBuka http://localhost:8091/${a[0]}/ (npm start). Langkah berikut: shared/PANDUAN_SERI_BARU.md`);
  } catch (e) { console.error('Gagal: ' + e.message); process.exit(1); }
}
