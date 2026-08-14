#!/usr/bin/env python3
"""Generate DSKIN preview screenshots (light/dark): pets at the bottom edge
of a normal DSH screen, no frame, with the kitten switcher visible.
Pure PIL."""
from PIL import Image, ImageDraw

W, H = 1280, 800
INK = (46, 58, 89)
MOUSE = [
    '..KK........KK.......', '.KYYK......KYYK......', '.KYYYK....KYYYK......',
    'KYYYYK....KYYYYK.....', 'KYYYYYYYYYYYYYYK.....', 'KYYYYYYYYYYYYYYK.....',
    'KYYEYYYYYYYEYYK......', 'KYYEwYYYYYYEwYK......', 'KYYEYYYYYYYEYYK......',
    'KYYCYYYYYYCYYK.S.....', 'KYYCCYYYYYCCYYK.S....', 'KYYYYYYYYYYYYYK..S...',
    '.KKKKKKKKKKKKKK..SS..',
]
WHALE = [
    '.....ss........', '.....ss........', '....ssss.......', '....KKKK.......',
    '..KKWWWWKK.....', '.KWWWWWWWWK....', 'KWWWWWWWWWWK...', 'KWEwBBBBKKWWK..',
    'KWWKBBBBKKWWK..', 'KWWWWWWWWWWWK..', '.KWWWWWWWWWK...', '..KWWWWWWWK....',
    '..KKK...KKK....', '..K......K.....',
]
CAT_ORANGE = [
    '...KK........KK....', '..KFFK......KFFK...', '.KFFAK....KAAFK....',
    '.KFAKKK..KKKAFK....', 'KKKKKKKKKKKKKKKKKK.', 'KFFFFFFFFFFFFFFFFK.',
    'KFFFFFFFFFFFFFFFFK.', 'KFEwFFFFFFFwEFFFK..', 'KFFFFFFFFFFFFFFFFK.',
    'WFFMMMNNNMMMFFFW...', 'WFFMFMKKKMFMFFFW...', 'KFFFFMMFFMMFFFFK...',
    'KKKFFFFFFFFFFFFKK..', '.KKKKKKKKKKKKKKKK..', '......KK....KK......',
]
PAL = {
    'K': (74, 51, 35), 'F': (245, 163, 92), 'E': (61, 43, 31), 'w': (255, 255, 255),
    'A': (255, 179, 154), 'N': (255, 138, 128), 'M': (255, 241, 222), 'W': (255, 241, 222),
    'B': (255, 241, 222), 'T': (217, 127, 43), 'Y': (255, 210, 63), 'S': (255, 210, 63),
    'C': (255, 140, 105), 's': (159, 216, 255), 'W2': (74, 144, 217), 'BB': (238, 244, 255),
}
MP = {**PAL, 'K2': INK, 'W2': (74, 144, 217), 'BB': (238, 244, 255)}
def draw_pixels(d, rows, ox, oy, scale, pal):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.' or ch not in pal:
                continue
            c = pal[ch]
            d.rectangle([ox + x * scale, oy + y * scale,
                         ox + (x + 1) * scale - 1, oy + (y + 1) * scale - 1], fill=c)

def make(theme):
    dark = theme == 'dark'
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    # normal DSH screen: white (light) / dark (dark)
    panel = (33, 42, 77) if dark else (253, 252, 247)
    d.rectangle([0, 0, W, H], fill=panel)
    # sidebar
    sb = (40, 52, 96) if dark else (238, 244, 255)
    d.rectangle([0, 0, 210, H], fill=sb)
    d.rectangle([0, 0, 210, 56], fill=(74, 144, 217) if not dark else (44, 74, 125))
    for i in range(4):
        row = 80 + i * 58
        fill = (36, 50, 87) if dark else (211, 231, 251)
        d.rectangle([14, row, 188, row + 40], fill=fill, outline=(46, 58, 89) if not dark else None, width=1 if not dark else 0)
    # main area
    d.text((260, 60), 'Into the Unknown', fill=(207, 227, 249) if dark else INK)
    bubble = (36, 50, 87) if dark else (227, 240, 252)
    d.rectangle([260, 110, 600, 200], fill=bubble, outline=(46, 58, 89) if not dark else None, width=1 if not dark else 0)
    d.rectangle([260, 230, 820, 330], fill=bubble, outline=(46, 58, 89) if not dark else None, width=1 if not dark else 0)
    d.rectangle([260, 360, 560, 420], fill=bubble, outline=(46, 58, 89) if not dark else None, width=1 if not dark else 0)
    # composer
    d.rectangle([260, H - 70, W - 60, H - 22], fill=(255, 255, 255) if not dark else (20, 27, 56),
                outline=(46, 58, 89) if not dark else None, width=1 if not dark else 0)
    # pets at the bottom edge
    mpal = {**MP, 'K': INK, 'Y': (255, 210, 63), 'E': INK, 'C': (255, 140, 105), 'S': (255, 210, 63), 'w': (255, 255, 255)}
    draw_pixels(d, MOUSE, 60, H - 26, 2, mpal)
    draw_pixels(d, MOUSE, 300, H - 26, 2, mpal)
    draw_pixels(d, CAT_ORANGE, 560, H - 30, 2, PAL)
    wpal = {**MP, 'K': INK, 'W': (74, 144, 217), 'B': (238, 244, 255), 'E': INK, 'w': (255, 255, 255), 's': (159, 216, 255)}
    draw_pixels(d, WHALE, 980, H - 26, 2, wpal)
    # paw switcher
    d.rectangle([W - 46, H - 40, W - 16, H - 10], fill=(255, 255, 255) if not dark else (46, 58, 89),
                outline=(46, 58, 89), width=2)
    d.ellipse([W - 44, H - 38, W - 18, H - 12], fill=(255, 210, 100))
    return img

make('light').save('preview/light.png')
make('dark').save('preview/dark.png')
print('previews written')
