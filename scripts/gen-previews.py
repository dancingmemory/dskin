#!/usr/bin/env python3
"""Generate DSKIN preview screenshots (light/dark) as pixel-art mockups.

Draws the cartoon pixel desktop: sky + clouds + sun / starry night, the game
window with hard shadow, a mini sidebar + chat bubbles + chunky buttons, the
blue titlebar with the pixel whale, and the statusbar with grass strip, the
pixel mouse mascot and hearts. Pure PIL, no deps beyond pillow.
"""
from PIL import Image, ImageDraw

W, H = 1280, 800
INK = (46, 58, 89)
WHALE = [
    '......WWW.W.......',
    '.....WWWWWWW......',
    '...WWWWWWWWWW.....',
    '.WWWWWWWWWWWWW....',
    'WWWWWWWWWWWWWWW...',
    'WWKBBBBBBBBWWWW...',
    'WWKBBBBBBBBWWWW...',
    'WWWBBBBBBBBWWW....',
    'WWWWWWWWWWWWWW....',
    '.WWWWWWWWWWWW.....',
    '..WWWWWWWWWW......',
    '..WWW...WWWW......',
    '..WWW....WWW......',
]
MOUSE = [
    '..KK........KK.......',
    '.KYYK......KYYK......',
    '.KYYYK....KYYYK......',
    'KYYYYK....KYYYYK.....',
    'KYYYYYYYYYYYYYYK.....',
    'KYYYYYYYYYYYYYYK.....',
    'KYYEYYYYYYYEYYK......',
    'KYYEwYYYYYYEwYK......',
    'KYYEYYYYYYYEYYK......',
    'KYYCYYYYYYCYYK.S.....',
    'KYYCCYYYYYCCYYK.S....',
    'KYYYYYYYYYYYYYK..S...',
    '.KKKKKKKKKKKKKK..SS..',
]
PAL = {'W': (74, 144, 217), 'K': INK, 'B': (238, 244, 255), 'Y': (255, 210, 63),
       'E': INK, 'w': (255, 255, 255), 'C': (255, 140, 105), 'S': (255, 210, 63)}

def draw_pixels(d, rows, ox, oy, scale, pal=PAL):
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == '.':
                continue
            c = pal.get(ch)
            if c:
                d.rectangle([ox + x * scale, oy + y * scale,
                             ox + x * scale + scale - 1, oy + y * scale + scale - 1], fill=c)

def make(theme):
    dark = theme == 'dark'
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    sky1 = (20, 27, 56) if dark else (124, 196, 242)
    sky2 = (35, 47, 92) if dark else (158, 214, 248)
    sky3 = (52, 68, 120) if dark else (205, 238, 255)
    for y in range(H):
        t = y / H
        col = tuple(int(sky1[i] + (sky3[i] - sky1[i]) * min(t * 1.4, 1)) for i in range(3))
        d.line([(0, y), (W, y)], fill=col)
    if dark:
        for (sx, sy, s) in [(90, 80, 2), (280, 45, 3), (430, 150, 2), (620, 70, 3), (840, 40, 2),
                            (950, 130, 3), (1150, 90, 2), (180, 200, 2), (740, 190, 2)]:
            d.rectangle([sx, sy, sx + s, sy + s], fill=(240, 244, 255, 255))
    else:
        d.ellipse([W - 170, 30, W - 70, 130], fill=(255, 210, 63))
        for (cx, cy, r) in [(180, 110, 34), (240, 100, 40), (860, 90, 36), (700, 60, 24)]:
            d.ellipse([cx - r, cy - r * 0.6, cx + r, cy + r * 0.6], fill=(255, 255, 255, 255))

    # game window
    wx, wy, ww, wh = 60, 120, W - 120, H - 170
    d.rectangle([wx + 8, wy + 8, wx + ww + 8, wy + wh + 8], fill=(20, 27, 56) if dark else (46, 58, 89))
    panel = (33, 42, 77) if dark else (253, 252, 247)
    d.rectangle([wx, wy, wx + ww, wy + wh], fill=panel, outline=INK, width=3)
    # sidebar
    sb = (40, 52, 96) if dark else (238, 244, 255)
    d.rectangle([wx, wy, wx + 240, wy + wh], fill=sb, outline=INK, width=2)
    for i in range(4):
        row = wy + 40 + i * 64
        fill = (36, 50, 87) if dark else (211, 231, 251)
        d.rectangle([wx + 16, row, wx + 214, row + 44], fill=fill, outline=INK, width=2)
    # chat area
    cx0 = wx + 268
    bubble = (36, 50, 87) if dark else (227, 240, 252)
    d.rectangle([cx0, wy + 40, cx0 + 380, wy + 150], fill=bubble, outline=INK, width=2)
    d.rectangle([cx0, wy + 180, cx0 + 560, wy + 300], fill=bubble, outline=INK, width=2)
    d.rectangle([cx0, wy + 330, cx0 + 300, wy + 400], fill=bubble, outline=INK, width=2)
    # chunky buttons
    for i in range(3):
        bx = cx0 + i * 190
        d.rectangle([bx + 5, wy + 440, bx + 170, wy + 496], fill=(20, 27, 56))
        fill = (74, 144, 217) if i % 2 == 0 else (255, 210, 63)
        d.rectangle([bx, wy + 435, bx + 165, wy + 491], fill=fill, outline=INK, width=2)

    # titlebar
    d.rectangle([0, 0, W, 34], fill=(46, 105, 184) if dark else (74, 144, 217), outline=INK, width=0)
    d.rectangle([0, 34, W, 37], fill=INK)
    draw_pixels(d, WHALE, 14, 9, 2)
    d.text((56, 12), 'DSKIN · DEEPSEEK HARNESS', fill=(255, 255, 255))
    for i, g in enumerate(['-', '[]', 'X']):
        d.rectangle([W - 100 + i * 38, 8, W - 100 + i * 38 + 28, 26], fill=(255, 210, 63), outline=INK, width=2)
    # statusbar
    grass = (76, 133, 56) if dark else (126, 217, 87)
    d.rectangle([0, H - 36, W, H - 32], fill=grass)
    d.rectangle([0, H - 32, W, H], fill=(22, 30, 61) if dark else (46, 58, 89))
    draw_pixels(d, MOUSE, 14, H - 32, 1, PAL)
    d.rectangle([60, H - 27, 130, H - 8], fill=(255, 210, 63), outline=(255, 255, 255), width=1)
    d.text((68, H - 25), 'DSKIN', fill=INK)
    for i, txt in enumerate(['DSH WEB', 'PLAYER 1', 'PIXEL MODE ON']):
        d.text((230 + i * 220, H - 26), txt, fill=(207, 227, 249))
    for i in range(3):
        d.text((W - 100 + i * 30, H - 27), chr(9829), fill=(255, 107, 94))
    return img

make('light').save('preview/light.png')
make('dark').save('preview/dark.png')
print('previews written')
