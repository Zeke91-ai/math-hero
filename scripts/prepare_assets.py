"""Menyiapkan aset game dari paket craftpix (Freebie) ke public/assets/game dengan nama pendek.
Hasil: PNG per sheet + manifest.json (ukuran frame, jumlah frame, kotak isi piksel).
Juga membuat varian warna: tileset_pink (Pulau Permen), enemy6 ungu (boss akhir).
Jalankan dari folder project: python scripts/prepare_assets.py
"""
import colorsys
import json
import os
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'public', 'assets', 'svg', 'craftpix', 'craftpix-net-396765-free-simple-platformer-game-kit-pixel-art')
DST = os.path.join(ROOT, 'public', 'assets', 'game')
os.makedirs(DST, exist_ok=True)

FILES = {}
for h in (1, 2, 3):
    for s in ('Idle', 'Run', 'Jump', 'Fall', 'Hit', 'Double_Jump'):
        FILES[f'hero{h}_{s.lower()}'] = f'1 Main Characters/{h}/{s}.png'
FILES['appearing'] = '1 Main Characters/Appearing.png'
FILES['tileset'] = '7 Levels/Tiled/Tileset.png'
for g in range(1, 7):
    FILES[f'gem{g}'] = f'3 Objects/Gems/{g}.png'
for b in (1, 2, 3):
    for s in ('Idle', 'Hit', 'Break'):
        FILES[f'box{b}_{s.lower()}'] = f'3 Objects/Boxes/{b}_{s}.png'
for n in ('Checkpoint_Flag_Idle1', 'Checkpoint_Flag_Idle2', 'Checkpoint_Flag_Out1', 'Checkpoint_Flag_Out2',
          'Checkpoint_No_Flag', 'End_Idle', 'End_Pressed', 'Pointer_Idle', 'Pointer_Static'):
    FILES[n.lower()] = f'3 Objects/Checkpoints/{n}.png'
for t in range(1, 7):
    FILES[f'trap{t}'] = f'6 Traps/{t}.png'
ENEMY = {
    1: ('Idle', 'Run', 'Hit'),
    2: ('Idle', 'Run', 'Hit'),
    3: ('Idle', 'Walk', 'Charge', 'Hit', 'Stun'),
    4: ('Idle', 'Walk', 'Attack', 'Hit'),
    5: ('Idle', 'Fly', 'Attack', 'Hit'),
}
for e, names in ENEMY.items():
    for s in names:
        FILES[f'enemy{e}_{s.lower()}'] = f'4 Enemies/{e}/{s}.png'
for s in ('Idle', 'Run', 'Attack', 'Hit', 'Run_Attack'):
    FILES[f'enemy6_{s.lower()}'] = f'4 Enemies/6 (48x72)/{s}.png'
FILES['cannonball1'] = '4 Enemies/4/Cannonball1.png'
FILES['cannonball2'] = '4 Enemies/4/Cannonball2.png'
for k in range(1, 31):
    FILES[f'icon{k:02d}'] = f'5 GUI/Icons/Icon_{k:02d}.png'
for k in range(1, 41):
    FILES[f'btn{k:02d}'] = f'5 GUI/Buttons/Button_{k:02d}.png'
for k in range(1, 7):
    FILES[f'bg{k}'] = f'2 Locations/Backgrounds/{k}.png'

FRAME_W = {'cannonball1': 10, 'cannonball2': 10}
for k in list(FILES):
    if k.startswith('enemy6'):
        FRAME_W[k] = 72
    if k.startswith('icon'):
        FRAME_W[k] = 17
    if k.startswith('btn'):
        FRAME_W[k] = None  # tombol: satu gambar penuh
    if k.startswith('bg'):
        FRAME_W[k] = None


def bbox_union(im, fw):
    """Kotak isi piksel (alpha>20) gabungan seluruh frame, relatif terhadap satu frame."""
    n = max(1, im.width // fw)
    x0, y0, x1, y1 = fw, im.height, 0, 0
    for i in range(n):
        fr = im.crop((i * fw, 0, (i + 1) * fw, im.height))
        a = fr.split()[3].point(lambda v: 255 if v > 20 else 0)
        bb = a.getbbox()
        if bb:
            x0, y0, x1, y1 = min(x0, bb[0]), min(y0, bb[1]), max(x1, bb[2]), max(y1, bb[3])
    return [x0, y0, x1, y1]


def hue_shift(im, mapper):
    """Terapkan mapper(h, s, v) -> (h, s, v) pada tiap piksel (h 0..1)."""
    px = im.convert('RGBA')
    out = Image.new('RGBA', px.size)
    src, dst = px.load(), out.load()
    for y in range(px.height):
        for x in range(px.width):
            r, g, b, a = src[x, y]
            if a == 0:
                dst[x, y] = (0, 0, 0, 0)
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            h, s, v = mapper(h, s, v)
            r2, g2, b2 = colorsys.hsv_to_rgb(h % 1.0, max(0, min(1, s)), max(0, min(1, v)))
            dst[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return out


def candy(h, s, v):
    # Hijau rumput -> merah muda; tanah oranye -> cokelat cokelat-gelap; bunga putih tetap.
    deg = h * 360
    if 70 <= deg <= 190 and s > 0.15:
        return (330 / 360, s * 0.85, min(1, v * 1.05))
    if (deg <= 50 or deg >= 340) and s > 0.2:
        return (22 / 360, s * 0.7, v * 0.62)
    return (h, s, v)


def purple(h, s, v):
    deg = h * 360
    if 40 <= deg <= 200 and s > 0.2:
        return ((deg + 150) / 360, s, v)
    return (h, s, v)


manifest = {}
for name, rel in FILES.items():
    src = os.path.join(SRC, rel)
    dst = os.path.join(DST, name + '.png')
    shutil.copyfile(src, dst)
    im = Image.open(dst).convert('RGBA')
    fw = FRAME_W.get(name, im.height)
    if fw is None:
        fw = im.width
    frames = max(1, im.width // fw)
    manifest[name] = {'w': im.width, 'h': im.height, 'fw': fw, 'frames': frames, 'bbox': bbox_union(im, fw)}
    if im.width % fw:
        print('PERINGATAN lebar tidak habis dibagi frame:', name, im.width, fw)

# Varian warna.
tile = Image.open(os.path.join(DST, 'tileset.png')).convert('RGBA')
pink = hue_shift(tile, candy)
pink.save(os.path.join(DST, 'tileset_pink.png'))
manifest['tileset_pink'] = {'w': pink.width, 'h': pink.height, 'fw': pink.width, 'frames': 1, 'bbox': [0, 0, pink.width, pink.height]}
manifest['tileset'].update({'fw': tile.width})
for s in ('idle', 'run', 'attack', 'hit', 'run_attack'):
    base = Image.open(os.path.join(DST, f'enemy6_{s}.png')).convert('RGBA')
    p = hue_shift(base, purple)
    p.save(os.path.join(DST, f'enemy7_{s}.png'))
    manifest[f'enemy7_{s}'] = dict(manifest[f'enemy6_{s}'])

with open(os.path.join(DST, 'manifest.json'), 'w', encoding='utf-8') as f:
    json.dump(manifest, f, indent=0)
print('selesai:', len(manifest), 'sheet ->', DST)
for k in ('hero1_idle', 'hero1_run', 'enemy1_run', 'enemy2_run', 'enemy3_walk', 'enemy4_walk', 'enemy5_fly', 'enemy6_run',
          'enemy6_idle', 'enemy6_attack', 'trap4', 'trap2', 'gem1', 'box1_idle', 'end_idle', 'checkpoint_flag_idle1'):
    m = manifest[k]
    print(k, 'frame', m['fw'], 'x', m['h'], 'n', m['frames'], 'bbox', m['bbox'])
