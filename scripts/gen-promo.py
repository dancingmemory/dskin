#!/usr/bin/env python3
"""Generate DSKIN promo art: assets/logo.png (square) and assets/banner.png.

Pixel letters + mascots drawn with PIL rectangles. No deps beyond pillow.
"""
from PIL import Image, ImageDraw, ImageFont

INK = (46, 58, 89)
CJK = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 30)
CJK_SMALL = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 24)
LETTERS = {
    'D': ['XXXX.', 'X...X', 'X...X', 'X...X', 'X...X', 'X...X', 'XXXX.'],
    'S': ['.XXXX', 'X....', 'X....', '.XXX.', '....X', '....X', 'XXXX.'],
    'K': ['X...X', 'X..X.', 'X.X..', 'XX...', 'X.X..', 'X..X.', 'X...X'],
    'I': ['XXXXX', '..X..', '..X..', '..X..', '..X..', '..X..', 'XXXXX'],
    'N': ['X...X', 'XX..X', 'X.X.X', 'X..XX', 'X...X', 'X...X', 'X...X'],
}
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

def draw_word(d, word, ox, oy, cell, fill, outline):
    x = ox
    for ch in word:
        for i, row in enumerate(LETTERS[ch]):
            for j, px in enumerate(row):
                if px != '.':
                    r = [x + j * cell, oy + i * cell, x + (j + 1) * cell - 1, oy + (i + 1) * cell - 1]
                    d.rectangle(r, fill=outline)
                    d.rectangle([r[0] + 2, r[1] + 2, r[2] - 2, r[3] - 2], fill=fill)
        x += 6 * cell + cell

def sky_bg(d, W, H, dark=False):
    if dark:
        top, bot = (16, 22, 46), (30, 42, 88)
    else:
        top, bot = (168, 212, 242), (238, 246, 252)
    for y in range(H):
        t = y / H
        col = tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3))
        d.line([(0, y), (W, y)], fill=col)
    if dark:
        import random
        random.seed(7)
        for _ in range(40):
            x, y = random.randint(0, W), random.randint(0, H - 60)
            s = random.choice([1, 1, 2])
            d.rectangle([x, y, x + s - 1, y + s - 1], fill=(230, 238, 255))
    else:
        d.ellipse([W - 190, 24, W - 90, 124], fill=(255, 210, 100))
        for (cx, cy, r) in [(90, 90, 30), (130, 80, 36), (430, 60, 24), (330, 120, 20), (560, 90, 28)]:
            d.ellipse([cx - r, cy - int(r * 0.6), cx + r, cy + int(r * 0.6)], fill=(255, 255, 255))

def grass_strip(d, W, H, dark=False):
    a = (76, 133, 56) if dark else (126, 217, 87)
    b = (63, 112, 47) if dark else (108, 203, 72)
    n = W // 14
    for i in range(n + 1):
        col = a if i % 2 == 0 else b
        d.rectangle([i * 14, H - 14, (i + 1) * 14, H], fill=col)

def banner(dark=False):
    W, H = 1280, 420
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky_bg(d, W, H, dark)
    grass_strip(d, W, H, dark)
    draw_word(d, 'DSKIN', 90, 96, 22, (255, 210, 63), INK)
    d.text((96, 296), 'DeepSeek Harness · 卡通像素宠物皮肤', font=CJK, fill=(255, 255, 255), stroke_width=3, stroke_fill=INK)
    draw_pixels(d, MOUSE, 780, 236, 4)
    draw_pixels(d, MOUSE, 880, 236, 4)
    draw_pixels(d, WHALE, 1030, 210, 4)
    return img

def logo():
    S = 512
    img = Image.new('RGB', (S, S), (168, 212, 242))
    d = ImageDraw.Draw(img)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(168 + (238 - 168) * t * 0.9) for _ in range(1)) or None)
    # simpler vertical gradient
    img = Image.new('RGB', (S, S))
    d = ImageDraw.Draw(img)
    top, bot = (168, 212, 242), (238, 246, 252)
    for y in range(S):
        t = y / S
        d.line([(0, y), (S, y)], fill=tuple(int(top[i] + (bot[i] - top[i]) * t) for i in range(3)))
    for (cx, cy, r) in [(60, 70, 26), (100, 58, 30), (430, 90, 22)]:
        d.ellipse([cx - r, cy - int(r * 0.6), cx + r, cy + int(r * 0.6)], fill=(255, 255, 255))
    draw_word(d, 'DSKIN', 74, 120, 26, (255, 210, 63), INK)
    d.text((96, 322), 'DeepSeek Harness', font=CJK_SMALL, fill=INK)
    d.text((76, 352), '卡通像素宠物皮肤', font=CJK_SMALL, fill=INK, stroke_width=2, stroke_fill=(255, 255, 255))
    draw_pixels(d, MOUSE, 100, 380, 4)
    draw_pixels(d, WHALE, 290, 372, 4)
    return img

banner(False).save('assets/banner-light.png')
banner(True).save('assets/banner-dark.png')
logo().save('assets/logo.png')
print('assets written')
