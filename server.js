// Server statis untuk Math Hero. Bind ke 0.0.0.0 agar bisa diakses dari HP di jaringan hotspot yang sama.
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');
const store = require('./lib/store');

const PORT = Number(process.env.PORT) || 8091;
const HOST = '0.0.0.0';
const ROOT = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ttf': 'font/ttf',
};

function lanAddresses() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list || []) {
      if (a.family === 'IPv4' && !a.internal) out.push(a.address);
    }
  }
  return out;
}

const server = http.createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (await store.handleApi(req, res, urlPath)) return;
  let filePath = path.normalize(path.join(ROOT, urlPath));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); return res.end('Forbidden');
  }
  // Folder (/, /mh1/, /mh2/) dilayani dengan index.html-nya. Tanpa garis miring akhir, arahkan ulang
  // agar path relatif di halaman (css/, js/, assets/) mengarah ke folder yang benar.
  let isDir = false;
  try { isDir = fs.statSync(filePath).isDirectory(); } catch (e) { /* tidak ada: 404 di bawah */ }
  if (isDir) {
    if (!urlPath.endsWith('/')) {
      const q = (req.url || '').includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
      res.writeHead(301, { Location: urlPath + '/' + q }); return res.end();
    }
    filePath = path.join(filePath, 'index.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Tidak ditemukan');
    }
    res.writeHead(200, {
      'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log('Math Hero berjalan.');
  console.log(`Di laptop : http://localhost:${PORT}`);
  const ips = lanAddresses();
  if (ips.length === 0) {
    console.log('Alamat LAN tidak terdeteksi. Jalankan "ipconfig" dan cari IPv4 Address.');
  } else {
    for (const ip of ips) console.log(`Di HP     : http://${ip}:${PORT}`);
  }
  console.log('Pastikan HP tersambung ke hotspot yang sama dengan laptop.');
});
