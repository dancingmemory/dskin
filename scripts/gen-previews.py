#!/usr/bin/env python3
"""Generate DSKIN preview screenshots (light/dark) as pixel-art mockups.

Sky + clouds + sun / starry night, pixel grass strip, inset app window with
pixel border, two walking mice + a swimming whale. Pure PIL.
"""
from PIL import Image, ImageDraw

W, H = 1280, 800
INK = (46, 58, 89)
MOUSE = [
    '..KK........KK.......', '.KYYK......KYYK......', '.KYYYK....KYYYK......',
    'KYYYYK....KYYYYK.....', 'KYYYYYYYYYYYYYYK.....', 'KYYYYYYYYYYYYYYK.....',
    'KYYEYYYYYYYEYYK......', 'KYYEwYYYYYYEwYK......', 'KYYEYYYYYYYEYYK......',
    'KYYCYYYYYYCYYK.S.....', 'KYYCCYYYYYCCYYK.S....', 'KYYYYYYYYYYYYYK..S...',
    '.KKKKKKKKKKKKKK..SS..', '..KKKK......KKKK.....', '..KK..........KK.....',
]
WHALE = [
    '.....ss........', '.....ss........', '....ssss.......', '....KKKK.......',
    '..KKWWWWKK.....', '.KWWWWWWWWK....', 'KWWWWWWWWWWK...', 'KWEwBBBBKKWWK..',
    'KWWKBBBBKKWWK..', 'KWWWWWWWWWWWK..', '.KWWWWWWWWWK...', '..KWWWWWWWK....',
    '..KKK...KKK....', '..K......K.....',
]
PAL = {'K': INK, 'Y': (255, 210, 63), 'E': INK, 'w': (255, 255, 255),
       'C': (255, 140, 105), 'S': (255, 210, 63), 'W': (74, 144, 217),
       'B': (238, 244, 255), 's': (159, 216, 255)}

def draw_pixels(d, rows, ox, oy, scale, pal=PAL):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.' or ch not in pal:
                continue
            d.rectangle([ox + x * scale, oy + y * scale,
                         ox + (x + 1) * scale - 1, oy + (y + 1) * scale - 1], fill=pal[ch])

def make(theme):
    dark = theme == 'dark'
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky = (16, 22, 46, 30, 42, 88) if dark else (168, 212, 242, 238, 246, 252)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(sky[i] + (sky[i + 3] - sky[i]) * t) for i in range(3)))
    if dark:
        import random
        random.seed(11)
        for _ in range(46):
            x, y = random.randint(0, W), random.randint(0, H - 40)
            s = random.choice([1, 1, 2])
            d.rectangle([x, y, x + s - 1, y + s - 1], fill=(230, 238, 255))
    else:
        d.ellipse([W - 150, 30, W - 60, 120], fill=(255, 210, 100))
        for (cx, cy, r) in [(90, 100, 26), (130, 88, 32), (420, 70, 22), (330, 150, 18), (560, 100, 26), (980, 60, 20)]:
            d.ellipse([cx - r, cy - int(r * 0.6), cx + r, cy + int(r * 0.6)], fill=(255, 255, 255))
    # grass strip
    ga = (76, 133, 56) if dark else (126, 217, 87)
    gb = (63, 112, 47) if dark else (108, 203, 72)
    for i in range(W // 14 + 1):
        d.rectangle([i * 14, H - 26, (i + 1) * 14, H], fill=ga if i % 2 == 0 else gb)

    # inset game window
    wx, wy, ww, wh = 14, 12, W - 28, H - 66
    d.rectangle([wx + 4, wy + 4, wx + ww + 4, wy + wh + 4], fill=(20, 27, 56) if dark else (46, 58, 89))
    panel = (33, 42, 77) if dark else (253, 252, 247)
    d.rectangle([wx, wy, wx + ww, wy + wh], fill=panel, outline=INK, width=3)
    # sidebar
    sb = (40, 52, 96) if dark else (238, 244, 255)
    d.rectangle([wx, wy, wx + 210, wy + wh], fill=sb, outline=INK, width=2)
    for i in range(4):
        row = wy + 36 + i * 58
        fill = (36, 50, 87) if dark else (211, 231, 251)
        d.rectangle([wx + 14, row, wx + 188, row + 40], fill=fill, outline=INK, width=2)
    # chat area
    cx0 = wx + 236
    bubble = (36, 50, 87) if dark else (227, 240, 252)
    d.rectangle([cx0, wy + 36, cx0 + 340, wy + 130], fill=bubble, outline=INK, width=2)
    d.rectangle([cx0, wy + 160, cx0 + 520, wy + 264], fill=bubble, outline=INK, width=2)
    d.rectangle([cx0, wy + 294, cx0 + 270, wy + 356], fill=bubble, outline=INK, width=2)
    for i in range(3):
        bx = cx0 + i * 170
        d.rectangle([bx + 5, wy + 390, bx + 150, wy + 440], fill=(20, 27, 56))
        fill = (74, 144, 217) if i % 2 == 0 else (255, 210, 63)
        d.rectangle([bx, wy + 385, bx + 145, wy + 435], fill=fill, outline=INK, width=2)

    # pets
    draw_pixels(d, MOUSE, 60, H - 64, 2)
    draw_pixels(d, MOUSE, 330, H - 64, 2)
    draw_pixels(d, WHALE, 640, H - 170, 2)
    return img

make('light').save('preview/light.png')
make('dark').save('preview/dark.png')
print('previews written')
