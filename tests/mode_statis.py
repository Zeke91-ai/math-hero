"""Tes T15 (zeke): mode hosting statis (tanpa server API), seperti GitHub Pages/Netlify di sub-folder.
Server statis murni (http.server) menyajikan folder public di bawah /math-hero/ dan TIDAK punya /api.
Menu harus otomatis memakai LocalApi (localStorage): nama, skor terbaik per pemain, checkpoint, nama tidak pantas, dan bertahan setelah reload."""
import functools, http.server, json, os, socketserver, sys, threading
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, 'public')
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
PREFIX = '/math-hero/'
PORT = 8102
hasil = []


def cek(nama, ok, info=''):
    hasil.append(bool(ok))
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info).encode('ascii', 'replace').decode() if info != '' else ''))


class Handler(http.server.SimpleHTTPRequestHandler):
    """Hanya berkas statis di bawah /math-hero/; selain itu 404 HTML (seperti hosting statis sungguhan)."""
    def translate_path(self, path):
        path = path.split('?')[0]
        if not path.startswith(PREFIX):
            return os.path.join(PUBLIC, '__tidak_ada__')
        return super().translate_path('/' + path[len(PREFIX):])

    def do_POST(self):
        self.send_error(405)  # GitHub Pages menjawab 405 HTML untuk POST

    do_PUT = do_DELETE = do_POST

    def log_message(self, *a):
        pass


def nama_via_papan(page, nama):
    for ch in nama:
        page.locator('#name-keys .key').nth(ord(ch) - 65).click()


def buka(ctx, errors):
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(f"http://127.0.0.1:{PORT}{PREFIX}mh1/")
    page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
    return page


def main():
    handler = functools.partial(Handler, directory=PUBLIC)
    socketserver.TCPServer.allow_reuse_address = True
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', PORT), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(**p.devices["Pixel 5"])
            page = buka(ctx, errors)

            # ---- A. Tidak ada API di server ini ----
            st = page.evaluate("fetch('/math-hero/api/players').then(r => r.status)")
            cek('A1 server statis tidak punya /api (404)', st == 404, st)
            cek('A2 LocalApi dimuat', page.evaluate("typeof window.LocalApi === 'object'"))

            # ---- B. Nama tidak pantas dan nama valid ----
            page.click('#btn-start')
            page.wait_for_selector('#name-keys .key')
            nama_via_papan(page, 'ANJING')
            page.click('#name-ok')
            page.wait_for_timeout(500)
            pesan = page.locator('#menu-msg').inner_text()
            cek('B1 nama tidak pantas ditolak dengan pesan ramah (tanpa server)', 'nama lain' in pesan, pesan)
            for _ in range(6):
                page.click('#name-del')
            nama_via_papan(page, 'ZEKE')
            page.click('#name-ok')
            page.wait_for_selector('#hero-list .hero-card')
            cek('B2 nama valid lanjut ke pilih karakter', page.locator('#hero-list .hero-card').count() == 3)
            page.locator('#hero-list .hero-card').nth(2).click()
            page.wait_for_timeout(600)
            cek('B3 game mulai, pemain ZEKE karakter 3',
                page.evaluate("window.Store.player && window.Store.player.nama") == 'ZEKE' and page.evaluate("window.__mathHero.game.hero") == 3)

            # ---- C. Skor dan checkpoint tersimpan di localStorage ----
            raw = page.evaluate("localStorage.getItem('mathhero.v1')")
            d = json.loads(raw) if raw else {}
            cek('C1 pemain tersimpan di localStorage', [x['nama'] for x in d.get('players', [])] == ['ZEKE'], raw)
            page.evaluate("const h = window.__mathHero; h.game.score = 1234; h.game.lives = 1; h.player.inv = 0; h.damagePlayer(500, 0)")
            page.wait_for_selector('#over:not(.hidden)', timeout=5000)
            page.wait_for_timeout(500)
            d = json.loads(page.evaluate("localStorage.getItem('mathhero.v1')"))
            s = d['scores'][0] if d['scores'] else {}
            cek('C2 skor game over tercatat bersama karakter', (s.get('skor'), s.get('hero'), s.get('hasil')) == (1234, 3, 'kalah'), s)

            # ---- D. Papan Juara dan bertahan setelah reload ----
            page.reload()
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
            page.click('#btn-highscore')
            page.wait_for_selector('#hs-list .hs-row')
            nama = page.locator('#hs-list .hs-name').all_inner_texts()
            skor = page.locator('#hs-list .hs-score').nth(0).inner_text().replace('\n', ' ')
            cek('D1 Papan Juara menampilkan ZEKE 1.234 setelah reload', nama == ['ZEKE'] and '1.234' in skor, [nama, skor])
            page.screenshot(path=os.path.join(SHOTS, 'statis_papan_juara.png'))
            page.click('#hs-back')

            # ---- E. Satu nama = satu pemain, skor terbaik per pemain ----
            page.click('#btn-start')
            page.wait_for_selector('#name-keys .key')
            nama_via_papan(page, 'ZEKE')
            page.click('#name-ok')
            page.wait_for_selector('#hero-list .hero-card')
            d = json.loads(page.evaluate("localStorage.getItem('mathhero.v1')"))
            cek('E1 nama sama tidak membuat pemain ganda', len(d['players']) == 1, d['players'])
            page.locator('#hero-list .hero-card').nth(0).click()
            page.wait_for_timeout(600)
            page.evaluate("const h = window.__mathHero; h.game.score = 50; h.game.lives = 1; h.player.inv = 0; h.damagePlayer(500, 0)")
            page.wait_for_selector('#over:not(.hidden)', timeout=5000)
            page.wait_for_timeout(500)
            d = json.loads(page.evaluate("localStorage.getItem('mathhero.v1')"))
            cek('E2 dua skor tersimpan, papan hanya menampilkan yang terbaik', len(d['scores']) == 2)
            page.evaluate("window.Menu.goMenu()")
            page.click('#btn-highscore')
            page.wait_for_selector('#hs-list .hs-row')
            page.wait_for_timeout(300)
            cek('E3 papan: satu baris ZEKE dengan skor 1.234',
                page.locator('#hs-list .hs-row').count() == 1 and '1.234' in page.locator('#hs-list .hs-score').nth(0).inner_text())

            browser.close()
    finally:
        httpd.shutdown()

    # Satu permintaan /api yang gagal (404/405) per pemuatan halaman memang diharapkan di hosting statis; error lain tidak boleh ada.
    lain = [e for e in errors if not e.startswith('Failed to load resource') or not any(c in e for c in ('404', '405'))]
    cek('Z tanpa error console/halaman selain probe /api yang diharapkan', not lain, lain[:3])
    print(f'\n{sum(hasil)}/{len(hasil)} lulus')
    sys.exit(0 if all(hasil) else 1)


main()
