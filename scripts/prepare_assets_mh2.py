# Menyiapkan sprite Math Hero 2 dari paket CraftPix (gratis untuk komersial, file aslinya tidak boleh disebarkan).
# Sprite yang dipakai dipotong ke isi pikselnya, dipilih barisnya, lalu disatukan ke SATU atlas
# (public/mh2/assets/sprites.png) beserta peta frame (sprites.json). File asli tidak ikut disalin.
#
# Pakai:  python scripts/prepare_assets_mh2.py <folder craftpix>
# Contoh: python scripts/prepare_assets_mh2.py ../games/assets/craftpix
import json
import os
import sys

from PIL import Image

OUT_DIR = os.path.join(os.path.dirname(__file__), '..', 'public', 'mh2', 'assets')

TINY = 'craftpix-net-622999-free-pixel-art-tiny-hero-sprites'
ANIM = 'craftpix-net-789196-free-top-down-hunt-animals-pixel-sprite-pack/PNG/Without_shadow'
SLIME = 'craftpix-net-788364-free-slime-mobs-pixel-art-top-down-sprite-pack/PNG'
SHMUP = 'craftpix-net-814823-free-roguelike-shoot-em-up-pixel-art-game-kit'

# (nama di atlas, file sumber, lebar frame, tinggi frame, baris yang diambil (None = baris tunggal))
JOBS = []


def add(name, path, fw, fh, row=None, frames=None):
    JOBS.append((name, path, fw, fh, row, frames))


# Tiga pahlawan baru (32x32): Pinki, Owi, Dudu.
for key, folder, base in [('pinki', '1 Pink_Monster', 'Pink_Monster'), ('owi', '2 Owlet_Monster', 'Owlet_Monster'),
                          ('dudu', '3 Dude_Monster', 'Dude_Monster')]:
    for anim, n in [('Idle', 4), ('Run', 6), ('Walk', 6), ('Jump', 8), ('Hurt', 4), ('Throw', 4), ('Death', 8),
                    ('Climb', 4), ('Push', 6)]:
        add(f'{key}_{anim.lower()}', f'{TINY}/{folder}/{base}_{anim}_{n}.png', 32, 32)
add('dust_jump', f'{TINY}/1 Pink_Monster/Double_Jump_Dust_5.png', 32, 32)
add('dust_run', f'{TINY}/1 Pink_Monster/Walk_Run_Push_Dust_6.png', 32, 32)
add('rock1', f'{TINY}/1 Pink_Monster/Rock1.png', 8, 8)

# Hewan pembalap (32x32, 4 baris arah): 0 menghadap kamera, 1 membelakangi, 2 ke kanan, 3 ke kiri.
for key, folder, run in [('kelinci', 'Hare', 'Hare_Run'), ('rubah', 'Fox', 'Fox_Run'), ('rusa', 'Deer', 'Deer_Run'),
                         ('babi', 'Boar', 'Boar_Run')]:
    for row, d in [(1, 'u'), (2, 'r'), (3, 'l')]:
        add(f'{key}_run_{d}', f'{ANIM}/{folder}/{run}.png', 32, 32, row)
    add(f'{key}_idle_r', f'{ANIM}/{folder}/{folder}_Idle.png', 32, 32, 2)
for row, d in [(0, 'd'), (2, 'r'), (3, 'l')]:
    add(f'burung_fly_{d}', f'{ANIM}/Black_grouse/Black_grouse_Flight.png', 32, 32, row)

# Slime (64x64 per frame, baris 0 menghadap kamera).
for i in (1, 2, 3):
    for anim in ['Idle', 'Walk', 'Hurt', 'Death', 'Attack']:
        add(f'slime{i}_{anim.lower()}', f'{SLIME}/Slime{i}/Without_shadow/Slime{i}_{anim}_without_shadow.png', 64, 64, 0)

# Shoot 'em up: alien kecil, ledakan, debu, portal, altar, batu meteor.
for i in range(1, 7):
    add(f'alien{i}', f'{SHMUP}/3 Enemies/{i}/RunSD.png', 48, 48)
    add(f'alien{i}_mati', f'{SHMUP}/3 Enemies/{i}/DeathSD.png', 48, 48)
add('boom1', f'{SHMUP}/3 Enemies/8 Other/Boom1.png', 48, 48)
add('boom2', f'{SHMUP}/3 Enemies/8 Other/Boom2.png', 48, 48)
add('debu', f'{SHMUP}/3 Enemies/8 Other/Dust.png', 64, 64)
add('portal', f'{SHMUP}/2 Location/3 Animated objects/Portal1_Idle.png', 96, 96)
add('portal2', f'{SHMUP}/2 Location/3 Animated objects/Portal2_Idle.png', 96, 96)
add('altar', f'{SHMUP}/2 Location/3 Animated objects/Altar_Idle.png', 48, 48)
add('robo_jalan', f'{SHMUP}/1 Main Character/1 Character/Walk1.png', 48, 48)
for i in (4, 6, 7, 10, 16):  # gambar tunggal: ukuran frame = ukuran gambar
    add(f'batu{i}', f'{SHMUP}/2 Location/2 Objects/Rocks/{i}.png', None, None)
for i in (1, 3, 5):
    add(f'xp{i}', f'{SHMUP}/2 Location/2 Objects/XP/{i}.png', None, None)


def frames_of(src, fw, fh, row, frames):
    im = Image.open(src).convert('RGBA')
    if fw is None:
        return [im]
    n = frames or im.width // fw
    y = (row or 0) * fh
    return [im.crop((i * fw, y, (i + 1) * fw, y + fh)) for i in range(n)]


def main():
    if len(sys.argv) < 2:
        print(__doc__ or 'pakai: python scripts/prepare_assets_mh2.py <folder craftpix>')
        sys.exit(1)
    root = sys.argv[1]
    sheets = []
    for name, rel, fw, fh, row, frames in JOBS:
        fr = frames_of(os.path.join(root, rel), fw, fh, row, frames)
        # Kotak isi gabungan semua frame: potong ruang kosong tetapi frame tetap sejajar satu sama lain.
        boxes = [f.getbbox() for f in fr if f.getbbox()]
        x0 = min(b[0] for b in boxes); y0 = min(b[1] for b in boxes)
        x1 = max(b[2] for b in boxes); y1 = max(b[3] for b in boxes)
        fr = [f.crop((x0, y0, x1, y1)) for f in fr]
        sheets.append((name, fr, x1 - x0, y1 - y0))

    # Susun per rak (shelf packing), dari yang tertinggi.
    W = 1024
    order = sorted(sheets, key=lambda s: -s[3])
    x = y = shelf = 0
    place = {}
    for name, fr, w, h in order:
        total = w * len(fr)
        if total > W:
            raise SystemExit(f'{name} terlalu lebar untuk atlas')
        if x + total > W:
            x = 0; y += shelf + 1; shelf = 0
        place[name] = (x, y)
        x += total + 1
        shelf = max(shelf, h)
    H = y + shelf
    atlas = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    meta = {}
    for name, fr, w, h in sheets:
        px, py = place[name]
        for i, f in enumerate(fr):
            atlas.paste(f, (px + i * w, py))
        meta[name] = {'x': px, 'y': py, 'w': w, 'h': h, 'n': len(fr)}
    os.makedirs(OUT_DIR, exist_ok=True)
    atlas.save(os.path.join(OUT_DIR, 'sprites.png'), optimize=True)
    with open(os.path.join(OUT_DIR, 'sprites.json'), 'w', encoding='utf-8') as fh:
        json.dump(meta, fh, separators=(',', ':'), sort_keys=True)
    print(f'atlas {W}x{H}, {len(meta)} animasi')


if __name__ == '__main__':
    main()
