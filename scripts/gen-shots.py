#!/usr/bin/env python3
"""Generate close-up "cat cards" for the README gallery (assets/shot-*.png).
Each card: a big crisp pixel kitten (idle frame, scaled up) on a soft
themed backdrop with clouds, a grass strip and its name. Pure PIL."""
import re
import json
from PIL import Image, ImageDraw, ImageFont

REPO = '/Users/vitamin/Desktop/deepseektest'
SRC = open(f'{REPO}/src/client/mascots.ts').read()
CJK = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 30)
CJK_SMALL = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 20)

def get_svg(key):
    m = re.search(rf'export const {key} = (.+)$', SRC, re.M)
    return json.loads(m.group(1))

def parse_rects(svg):
    rects = []
    for m in re.finditer(r'<rect x="(\d+)" y="(\d+)" width="1" height="1" fill="(#[0-9a-f]+)"', svg):
        rects.append((int(m.group(1)), int(m.group(2)), m.group(3)))
    vb = re.search(r'viewBox="0 0 (\d+) (\d+)"', svg)
    return rects, int(vb.group(1)), int(vb.group(2))

def draw_pixels(d, rects, ox, oy, scale):
    for (x, y, c) in rects:
        d.rectangle([ox + x * scale, oy + y * scale, ox + x * scale + scale - 1, oy + y * scale + scale - 1], fill=c)

# per-cat card themes: sky colors + name + subtitle
CATS = [
    ('KIT_BIGORANGE_IDLE', '大橘', 'Orange Tabby', (255, 214, 170), (255, 244, 224)),
    ('KIT_WHITE_IDLE', '小白', 'White Kitten', (226, 232, 248), (246, 248, 253)),
    ('KIT_BLACK_IDLE', '玄猫', 'Black Cat', (58, 66, 92), (84, 96, 128)),
    ('KIT_TUXEDO_IDLE', '花猫', 'Tuxedo Cat', (214, 220, 236), (240, 243, 250)),
]

W, H = 480, 400
SCALE = 9
for key, cn, en, sky1, sky2 in CATS:
    rects, sw, sh = parse_rects(get_svg(key))
    img = Image.new('RGB', (W, H))
    d = ImageDraw.Draw(img)
    # vertical sky gradient
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(int(sky1[i] + (sky2[i] - sky1[i]) * t) for i in range(3)))
    # pixel clouds
    for (cx, cy, r) in [(70, 70, 26), (110, 58, 30), (390, 90, 24), (420, 100, 20)]:
        d.ellipse([cx - r, cy - int(r * 0.6), cx + r, cy + int(r * 0.6)], fill=(255, 255, 255))
    # grass strip
    for i in range(W // 14 + 1):
        d.rectangle([i * 14, H - 40, (i + 1) * 14, H], fill=(126, 217, 87) if i % 2 == 0 else (108, 203, 72))
    # the big cat, centered, standing on the grass
    cx = (W - sw * SCALE) // 2
    cy = H - 40 - sh * SCALE
    draw_pixels(d, rects, cx, cy, SCALE)
    # name plate
    d.rectangle([W // 2 - 90, 26, W // 2 + 90, 96], fill=(255, 255, 255), outline=(46, 58, 89), width=3)
    name_w = d.textlength(cn, font=CJK)
    d.text((W // 2 - name_w / 2, 32), cn, font=CJK, fill=(46, 58, 89))
    en_w = d.textlength(en, font=CJK_SMALL)
    d.text((W // 2 - en_w / 2, 66), en, font=CJK_SMALL, fill=(120, 130, 150))
    img.save(f'{REPO}/assets/shot-{key.split("_")[1].lower()}.png')
    print('saved shot-', key.split('_')[1].lower())
print('done')
