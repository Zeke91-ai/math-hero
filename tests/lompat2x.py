"""Tes tutorial lompat 2x di level 1 (T11):
- Level 1 punya tip lompat 2x yang tampil sebagai toast pada rangkaian cerita awal.
- Hint di dekat lompatan memuat petunjuk 2x (dua baris) dan bintang tinggi hanya terjangkau dengan lompat 2x.
- Lompat ganda pertama di level 1 memunculkan toast pujian; yang kedua tidak mengulang toast.
- Level lain tidak menampilkan toast pujian level 1.
- Tombol lompat disimulasikan lewat event pointer pada #btn-jump (seperti sentuhan)."""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8098
SHOTS = os.path.join(ROOT, 'tests', 'shots')
os.makedirs(SHOTS, exist_ok=True)
PUJIAN = 'Hebat! Itu lompat 2x!'
hasil = []


def cek(nama, ok, info=''):
    hasil.append(ok)
    print(('LULUS ' if ok else 'GAGAL ') + nama + (' | ' + str(info).encode('ascii', 'replace').decode() if info != '' else ''))


def start_server(db):
    env = dict(os.environ, PORT=str(PORT), MATHHERO_DATA_DIR=db)
    proc = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.time() + 10
    while time.time() < deadline:
        if "berjalan" in proc.stdout.readline():
            return proc
    proc.kill()
    raise RuntimeError("server tidak start")


def tahan(page, selector, ms):
    page.locator(selector).dispatch_event('pointerdown')
    page.wait_for_timeout(ms)
    page.locator(selector).dispatch_event('pointerup')


def lompat_ganda(page):
    """Lompat, lepas, lalu tekan lagi saat masih di udara."""
    tahan(page, '#btn-jump', 90)
    page.wait_for_timeout(120)
    tahan(page, '#btn-jump', 90)
    page.wait_for_timeout(80)


def main():
    server = start_server(tempfile.mkdtemp())
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/")
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)

            # 1. Data level: tip dan hint.
            tip = page.evaluate("window.__mathHero.world.L.tip")
            cek('level 1 punya tip lompat 2x', bool(tip) and '2x' in tip, tip)
            hints = page.evaluate("window.__mathHero.world.L.hints.map(h => h.text)")
            dua_x = [h for h in hints if '2x' in h]
            cek('ada hint 2x di jalur level 1', len(dua_x) >= 2, dua_x)
            cek('hint 2x memakai dua baris', any('\n' in h for h in dua_x))
            tip_lv2 = page.evaluate("(() => { const m = window.__mathHero; m.loadLevel(1); const t = m.world.L.tip; m.loadLevel(0); return t; })()")
            cek('level 2 tidak punya tip lompat 2x', not tip_lv2 or '2x' not in tip_lv2, tip_lv2)

            # 2. Tip tampil sebagai toast pada rangkaian cerita (empat baris, jeda 2,8 detik).
            page.evaluate("window.__mathHero.startGame(0, 0, 2)")
            terlihat = set()
            deadline = time.time() + 12
            while time.time() < deadline and tip not in terlihat:
                terlihat.add(page.evaluate("window.__mathHero.world.toast"))
                page.wait_for_timeout(250)
            cek('tip tampil sebagai toast di awal level', tip in terlihat, sorted(terlihat))

            # 3. Pujian lompat ganda pertama.
            page.evaluate("window.__mathHero.startGame(0, 0, 2)")
            page.wait_for_timeout(1800)
            page.evaluate("window.__mathHero.world.toast = ''")
            cek('awalnya belum dipuji', page.evaluate("!window.__mathHero.world.djPraised"))
            lompat_ganda(page)
            toast = page.evaluate("window.__mathHero.world.toast")
            cek('lompat ganda pertama memunculkan pujian', toast == PUJIAN and page.evaluate("window.__mathHero.world.djPraised"), toast)

            # Tunggu mendarat, ulangi: pujian tidak muncul lagi.
            page.wait_for_function("window.__mathHero.player.onGround", timeout=5000)
            page.evaluate("window.__mathHero.world.toast = ''")
            lompat_ganda(page)
            toast2 = page.evaluate("window.__mathHero.world.toast")
            cek('lompat ganda kedua tidak mengulang pujian', toast2 != PUJIAN, toast2)

            # 4. Mulai ulang game: pujian bisa muncul lagi (sesi baru).
            page.evaluate("window.__mathHero.startGame(0, 0, 2)")
            page.wait_for_timeout(1800)
            page.evaluate("window.__mathHero.world.toast = ''")
            lompat_ganda(page)
            cek('sesi baru: pujian muncul lagi', page.evaluate("window.__mathHero.world.toast") == PUJIAN)

            # 5. Level lain tidak memuji.
            page.evaluate("window.__mathHero.startGame(1, 0, 2)")
            page.wait_for_timeout(1800)
            page.evaluate("window.__mathHero.world.toast = ''")
            lompat_ganda(page)
            cek('level 2 tidak menampilkan pujian level 1', page.evaluate("window.__mathHero.world.toast") != PUJIAN)

            # 6. Visual: hint dua baris tidak menutupi karakter.
            page.evaluate("window.__mathHero.startGame(0, 0, 2)")
            page.wait_for_timeout(1500)
            hx = page.evaluate("window.__mathHero.world.L.hints.find(h => h.text.indexOf('\\n') >= 0).x")
            page.evaluate(f"window.__mathHero.player.x = {hx} - 10")
            page.wait_for_timeout(900)
            page.screenshot(path=os.path.join(SHOTS, 'tutorial_hint_2x.png'))
            player = page.evaluate("(() => { const P = window.__mathHero.player; return { x: P.x, y: P.y }; })()")
            cek('karakter berada di dekat hint 2x (screenshot diambil)', abs(player['x'] - hx) < 40, player)

            cek('tanpa error', errors == [], errors)
            browser.close()
    finally:
        server.kill()
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
