"""Tes input nyata: joystick dan tombol lompat benar-benar menggerakkan pemain lewat loop game."""
import os, subprocess, time
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = dict(os.environ, PORT='8096', MATHHERO_DATA_DIR=__import__('tempfile').mkdtemp())  # DB sementara, bukan data asli
srv = subprocess.Popen(["node", "server.js"], cwd=ROOT, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
while "berjalan" not in srv.stdout.readline():
    pass
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        page = b.new_context(**p.devices["Pixel 5"]).new_page()
        page.goto("http://127.0.0.1:8096/")
        page.wait_for_function("document.body.classList.contains('loaded')")
        page.evaluate("window.__mathHero.startGame(0, 0, 1)")
        page.wait_for_timeout(1500)
        x0 = page.evaluate("window.__mathHero.player.x")
        page.evaluate("window.Input.joy.x = 1")
        page.wait_for_timeout(1000)
        x1 = page.evaluate("window.__mathHero.player.x")
        print('jalan kanan 1 dtk:', round(x1 - x0), 'px (harapan ~190)')
        page.evaluate("window.Input.joy.x = 0")
        page.wait_for_timeout(300)
        page.evaluate("window.Input.jump = true")
        page.wait_for_timeout(120)
        vy = page.evaluate("window.__mathHero.player.vy")
        page.evaluate("window.Input.jump = false")
        print('kecepatan vertikal setelah lompat:', round(vy), '(harus negatif)')
        # tekan tombol layar sungguhan
        box = page.locator('#btn-jump').bounding_box()
        page.touchscreen.tap(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        print('tap tombol lompat tanpa error')
        b.close()
finally:
    srv.kill()
