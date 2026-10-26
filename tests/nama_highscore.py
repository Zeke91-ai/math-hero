"""Tes T12: nama pemain (papan huruf di layar, maksimal 6 huruf) dan Papan Juara baru.
A. Papan huruf: 6 slot, 26 huruf, tanpa <input> (keyboard HP tidak muncul), Hapus, batas 6 huruf, keyboard laptop.
B. Alur nyata: isi nama -> pilih karakter -> game over -> skor tercatat bersama karakter.
C. API: validasi nama, nama tidak pantas, satu nama = satu pemain, hero tidak valid diabaikan, skor terbaik per pemain.
D. Papan Juara: urutan, medali 1-3, avatar karakter tergambar, keterangan Tamat/Level.
E. Migrasi: database lama (tanpa kolom hero, nama daftar tetap) tetap terbaca dan berfungsi."""
import json, os, subprocess, sys, tempfile, time, urllib.request, urllib.error
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
hasil = []


def cek(nama, ok, info=''):
    hasil.append(bool(ok))
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info).encode('ascii', 'replace').decode() if info != '' else ''))


def start_server(port, db):
    env = dict(os.environ, PORT=str(port), MATHHERO_DATA_DIR=db)
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def api(port, method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}', data=data, method=method, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read())


def slots(page):
    return ''.join(page.locator('#name-slots .slot').all_inner_texts())


def buka_halaman(browser_ctx, port, errors):
    page = browser_ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(f"http://127.0.0.1:{port}/")
    page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
    return page


def avatar_tergambar(page, selector):
    """True jika semua canvas yang cocok punya piksel yang tergambar (bukan kosong)."""
    return page.evaluate("""(sel) => {
      const cvs = [...document.querySelectorAll(sel)];
      if (!cvs.length) return false;
      return cvs.every((cv) => { const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true; return false; });
    }""", selector)


def main():
    PORT = 8099
    server = start_server(PORT, tempfile.mkdtemp())
    errors = []
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            ctx = browser.new_context(**p.devices["Pixel 5"])
            page = buka_halaman(ctx, PORT, errors)

            # ---- A. Papan huruf ----
            page.click('#btn-start')
            page.wait_for_selector('#name-keys .key')
            cek('A1 enam slot nama dan 26 huruf', page.locator('#name-slots .slot').count() == 6 and page.locator('#name-keys .key').count() == 26)
            cek('A2 tidak ada kolom ketik (keyboard HP tidak muncul)', page.evaluate("document.querySelectorAll('input, textarea').length") == 0)
            cek('A3 tombol Lanjut mati saat nama kosong', page.locator('#name-ok').is_disabled())
            ukuran = page.evaluate("[...document.querySelectorAll('#name-keys .key, #name-ok, #name-del')].map(b => { const r = b.getBoundingClientRect(); return Math.min(r.width, r.height); })")
            cek('A4 semua tombol cukup besar (>= 44 px)', min(ukuran) >= 44, round(min(ukuran), 1))
            for ch in 'ZEKE':
                page.locator('#name-keys .key').nth(ord(ch) - 65).click()
            cek('A5 mengetuk huruf mengisi slot', slots(page) == 'ZEKE', slots(page))
            cek('A6 tombol Lanjut menyala', page.locator('#name-ok').is_enabled())
            page.click('#name-del')
            cek('A7 Hapus menghapus huruf terakhir', slots(page) == 'ZEK', slots(page))
            for ch in 'ABCDEFG':
                page.locator('#name-keys .key').nth(ord(ch) - 65).click()
            cek('A8 maksimal 6 huruf', slots(page) == 'ZEKABC', slots(page))
            page.screenshot(path=os.path.join(SHOTS, 'isi_nama.png'))
            for _ in range(6):
                page.click('#name-del')
            cek('A9 bisa dikosongkan', slots(page) == '' and page.locator('#name-ok').is_disabled())
            page.keyboard.press('m'); page.keyboard.press('I'); page.keyboard.press('a'); page.keyboard.press('7')
            cek('A10 keyboard laptop: huruf jadi kapital, angka diabaikan', slots(page) == 'MIA', slots(page))

            # ---- B. Alur nyata ----
            page.keyboard.press('Enter')
            page.wait_for_selector('#hero-list .hero-card')
            page.locator('#hero-list .hero-card').nth(1).click()
            page.wait_for_timeout(600)
            cek('B1 game mulai dengan nama MIA dan karakter 2',
                page.evaluate("window.Store.player && window.Store.player.nama") == 'MIA' and page.evaluate("window.__mathHero.game.hero") == 2)
            page.evaluate("const h = window.__mathHero; h.game.score = 4321; h.game.lives = 1; h.player.inv = 0; h.damagePlayer(500, 0)")
            page.wait_for_selector('#over:not(.hidden)', timeout=5000)
            page.wait_for_timeout(500)
            st, d = api(PORT, 'GET', '/api/highscores')
            baris = d['scores'][0] if d['scores'] else {}
            cek('B2 skor tercatat bersama nama dan karakter', (baris.get('nama'), baris.get('hero'), baris.get('skor')) == ('MIA', 2, 4321), baris)

            # ---- C. API ----
            st, d = api(PORT, 'POST', '/api/players', {'nama': 'abc1'})
            cek('C1 nama dengan angka ditolak', st == 400, d)
            st, d = api(PORT, 'POST', '/api/players', {'nama': 'ABCDEFG'})
            cek('C2 nama 7 huruf ditolak', st == 400, d)
            st, d = api(PORT, 'POST', '/api/players', {'nama': ''})
            cek('C3 nama kosong ditolak', st == 400, d)
            st, d = api(PORT, 'POST', '/api/players', {'nama': 'anjing'})
            cek('C4 nama tidak pantas ditolak dengan pesan ramah', st == 400 and 'nama lain' in d.get('error', ''), d)
            st, d1 = api(PORT, 'POST', '/api/players', {'nama': 'xyz'})
            st2, d2 = api(PORT, 'POST', '/api/players', {'nama': 'XYZ'})
            cek('C5 huruf kecil jadi kapital, satu nama = satu pemain', d1['player']['nama'] == 'XYZ' and d1['player']['id'] == d2['player']['id'], d1)
            # Seed skor untuk papan juara.
            def pemain(n):
                return api(PORT, 'POST', '/api/players', {'nama': n})[1]['player']['id']
            mia = pemain('MIA')
            for nama, skor, area, hasil_, hero in [('BOBO', 9000, 8, 'tamat', 1), ('CICI', 7000, 5, 'kalah', 3), ('DIDI', 2500, 3, 'kalah', 1),
                                                  ('EKO', 100, 1, 'kalah', 2), ('HEROX', 50, 1, 'kalah', 9)]:
                api(PORT, 'POST', '/api/scores', {'playerId': pemain(nama), 'skor': skor, 'area': area, 'hasil': hasil_, 'hero': hero})
            api(PORT, 'POST', '/api/scores', {'playerId': mia, 'skor': 1000, 'area': 2, 'hasil': 'kalah', 'hero': 2})
            st, d = api(PORT, 'GET', '/api/highscores')
            urut = [s['nama'] for s in d['scores']]
            cek('C6 skor terbaik per pemain (MIA hanya sekali, skor 4321)', urut == ['BOBO', 'CICI', 'MIA', 'DIDI', 'EKO', 'HEROX'] and d['scores'][2]['skor'] == 4321, urut)
            cek('C7 hero tidak valid (9) disimpan kosong', [s for s in d['scores'] if s['nama'] == 'HEROX'][0]['hero'] is None)

            # ---- D. Papan Juara ----
            page.evaluate("window.Menu.goMenu()")
            page.click('#btn-highscore')
            page.wait_for_selector('#hs-list .hs-row')
            page.wait_for_timeout(400)
            cek('D1 enam baris, urutan benar', page.locator('#hs-list .hs-row').count() == 6 and page.locator('#hs-list .hs-name').all_inner_texts() == urut)
            cek('D2 medali untuk peringkat 1-3',
                [page.locator('#hs-list .hs-row').nth(i).get_attribute('class') for i in range(4)] == ['hs-row rank-1', 'hs-row rank-2', 'hs-row rank-3', 'hs-row'])
            cek('D3 avatar karakter tergambar di semua baris', avatar_tergambar(page, '#hs-list .hs-avatar'))
            skor1 = page.locator('#hs-list .hs-score').nth(0).inner_text().replace('\n', ' ')
            skor2 = page.locator('#hs-list .hs-score').nth(1).inner_text().replace('\n', ' ')
            cek('D4 skor dan keterangan (Tamat! / Level 5)', '9.000' in skor1 and 'Tamat!' in skor1 and 'Level 5' in skor2, [skor1, skor2])
            cek('D5 papan muat di layar tanpa menggulir ke samping',
                page.evaluate("document.getElementById('splash').scrollWidth <= document.getElementById('splash').clientWidth + 1"))
            page.screenshot(path=os.path.join(SHOTS, 'papan_juara.png'))
            page.click('#hs-back')
            cek('D6 kembali ke menu utama', page.locator('#menu-main').is_visible())
            browser.close()
    finally:
        server.kill()

    # ---- E. Migrasi database lama ----
    db = tempfile.mkdtemp()
    lama = r"""
      const { DatabaseSync } = require('node:sqlite');
      const db = new DatabaseSync(process.env.MATHHERO_DATA_DIR + '/mathhero.sqlite');
      db.exec(`CREATE TABLE players (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL UNIQUE, avatar TEXT NOT NULL, dibuat TEXT NOT NULL);
        CREATE TABLE scores (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER NOT NULL REFERENCES players(id), skor INTEGER NOT NULL, area INTEGER NOT NULL, hasil TEXT NOT NULL, waktu TEXT NOT NULL);
        CREATE TABLE progress (player_id INTEGER PRIMARY KEY REFERENCES players(id), area INTEGER NOT NULL, skor INTEGER NOT NULL, diperbarui TEXT NOT NULL);
        INSERT INTO players VALUES (1, 'Awan', 'x', '2026-10-25T00:00:00Z'), (2, 'Kupu-kupu', 'y', '2026-10-25T00:00:00Z');
        INSERT INTO scores(player_id, skor, area, hasil, waktu) VALUES (1, 2560, 3, 'tamat', '2026-10-25T01:00:00Z'), (1, 900, 2, 'kalah', '2026-10-25T02:00:00Z'), (2, 3330, 4, 'tamat', '2026-10-25T03:00:00Z');
        INSERT INTO progress VALUES (1, 2, 730, '2026-10-26T00:00:00Z');`);
    """
    subprocess.run(["node", "-e", lama], env=dict(os.environ, MATHHERO_DATA_DIR=db), check=True)
    PORT2 = 8100
    server = start_server(PORT2, db)
    try:
        st, d = api(PORT2, 'GET', '/api/highscores')
        nama = [(s['nama'], s['skor'], s['hero']) for s in d['scores']]
        cek('E1 skor lama terbaca (terbaik per pemain, hero kosong)', nama == [('Kupu-kupu', 3330, None), ('Awan', 2560, None)], nama)
        st, d = api(PORT2, 'GET', '/api/progress/1')
        cek('E2 progres lama terbaca', d['progress'] and d['progress']['area'] == 2 and d['progress']['skor'] == 730, d)
        st, d = api(PORT2, 'POST', '/api/players', {'nama': 'awan'})
        cek('E3 nama baru "awan" memakai pemain lama (tanpa membedakan besar/kecil)', d.get('player', {}).get('id') == 1, d)
        api(PORT2, 'PUT', '/api/progress/1', {'area': 3, 'skor': 800, 'hero': 3})
        st, d = api(PORT2, 'GET', '/api/progress/1')
        cek('E4 menyimpan progres baru dengan hero', d['progress']['hero'] == 3 and d['progress']['area'] == 3, d)
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = buka_halaman(browser.new_context(**p.devices["Pixel 5"]), PORT2, errors)
            page.click('#btn-highscore')
            page.wait_for_selector('#hs-list .hs-row')
            page.wait_for_timeout(300)
            cek('E5 papan menampilkan nama lama (huruf kapital) dengan avatar',
                page.locator('#hs-list .hs-name').all_inner_texts() == ['KUPU-KUPU', 'AWAN'] and avatar_tergambar(page, '#hs-list .hs-avatar'))
            page.click('#hs-back')
            page.click('#btn-continue')
            page.wait_for_selector('#pick-list .pick-item')
            cek('E6 Lanjutkan menampilkan pemain lama dengan sprite', 'AWAN (Level 3)' in page.inner_text('#pick-list') and avatar_tergambar(page, '#pick-list .pick-avatar'))
            browser.close()
    finally:
        server.kill()

    cek('tanpa error console', errors == [], errors)
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
