"""Tes menu: mulai baru, pilih nama, pilih karakter, bermain, lanjutkan, skor tertinggi. Memakai database SQLite sementara."""
import os, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright
import _tanpa_skor  # noqa: F401  (mematikan papan skor online selama tes)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = 8095
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


def main():
    db = tempfile.mkdtemp()
    server = start_server(db)
    try:
        with sync_playwright() as p:
            browser = p.chromium.launch()
            page = browser.new_context(**p.devices["Pixel 5"]).new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
            page.goto(f"http://127.0.0.1:{PORT}/mh1/")
            page.wait_for_function("document.body.classList.contains('loaded')", timeout=15000)
            cek('menu utama tampil', ' '.join(page.locator('#splash h1').inner_text().split()) == 'Math Hero')
            page.click('#btn-start')
            page.wait_for_selector('#name-keys .key')
            for huruf in 'ZEKE':
                page.locator('#name-keys .key', has_text=huruf).first.click()
            page.click('#name-ok')
            page.wait_for_selector('#hero-list .hero-card')
            cek('pilihan tiga karakter tampil', page.locator('#hero-list .hero-card').count() == 3)
            page.screenshot(path=os.path.join(ROOT, 'tests', 'shots', 'menu_hero.png'))
            page.locator('#hero-list .hero-card').nth(2).click()
            page.wait_for_timeout(600)
            cek('game mulai dengan karakter ke-3', page.evaluate("window.__mathHero.game.hero") == 3 and page.locator('#splash').is_hidden())
            page.evaluate("window.__mathHero.game.score = 120; window.__mathHero.world.crates[0].done = true")
            page.evaluate("window.__mathHero.loadLevel(2)")
            page.wait_for_timeout(500)
            page.evaluate("window.Menu.goMenu()")
            page.click('#btn-continue')
            page.wait_for_timeout(500)
            cek('lanjutkan menampilkan level terakhir', 'Level 3' in page.inner_text('#menu-pick'), page.inner_text('#menu-pick')[:60])
            page.locator('#pick-list .pick-item').first.click()
            page.wait_for_selector('#hero-list .hero-card')
            page.locator('#hero-list .hero-card').first.click()
            page.wait_for_timeout(600)
            cek('lanjut dari level 3 dengan skor tersimpan', page.evaluate("window.__mathHero.world.levelIndex") == 2)
            cek('tanpa error console', errors == [], errors)
            browser.close()
    finally:
        server.kill()
    print('HASIL:', 'LULUS' if all(hasil) else 'GAGAL', f'({sum(hasil)}/{len(hasil)})')
    sys.exit(0 if all(hasil) else 1)


main()
