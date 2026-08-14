#!/usr/bin/env python3
"""Generate a pixel-style star-trend placeholder chart (assets/star-trend.png).
GitHub restricted the stargazers API, so live charts cannot render for a
0-star repo; this placeholder keeps the section visible until the first star
arrives. Uses drawn pixel art (no emoji — they render as tofu in PIL)."""
from PIL import Image, ImageDraw, ImageFont

W, H = 900, 440
INK = (46, 58, 89)
SKY = (168, 212, 242)
CJK = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 24)
CJK_SMALL = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 20)

img = Image.new('RGB', (W, H))
d = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=tuple(int(SKY[i] + (238 - SKY[i]) * t * 0.7) for i in range(3)))

# ---- chart panel ----
px, py, pw, ph = 60, 74, 620, 268
d.rectangle([px + 6, py + 6, px + pw + 6, py + ph + 6], fill=(74, 51, 35))
d.rectangle([px, py, px + pw, py + ph], fill=(255, 253, 247), outline=INK, width=3)

# axes
ax0, ay0 = px + 56, py + ph - 56
d.line([(ax0, py + 20), (ax0, ay0)], fill=INK, width=3)          # y axis
d.line([(ax0, ay0), (px + pw - 24, ay0)], fill=INK, width=3)     # x axis
# subtle gridlines (2)
for g in (0.33, 0.66):
    gy = py + 20 + (ay0 - py - 20) * g
    d.line([(ax0, gy), (px + pw - 24, gy)], fill=(210, 214, 224), width=2)

# axis labels
d.text((ax0 + 6, py + 16), 'stars', font=CJK, fill=INK)
d.text((px + pw - 130, ay0 + 12), 'time →', font=CJK, fill=INK)
d.text((ax0 - 78, ay0 + 8), '0', font=CJK, fill=INK)

# ---- the "waiting" data line: dashed yellow, floating above the axis ----
base = ay0 - 22
dash = 16
x = ax0
while x < px + pw - 60:
    d.line([(x, base), (min(x + dash, px + pw - 60), base)], fill=(255, 179, 0), width=4)
    x += dash * 2

# star marker at the end of the line (drawn pixel star, not an emoji)
def pixel_star(cx, cy, s, fill):
    pts = [(2, 0), (3, 1), (5, 1), (3, 3), (4, 5), (2, 4), (0, 5), (1, 3), (-1, 3), (0, 1)]
    for (ox, oy) in pts:
        d.rectangle([cx + ox * s, cy + oy * s, cx + ox * s + s - 1, cy + oy * s + s - 1], fill=fill)

pixel_star(px + pw - 52, base - 14, 4, (255, 179, 0))
d.rectangle([px + pw - 52, base - 14, px + pw - 52 + 2, base - 14 + 2], fill=(255, 255, 255))

# a little rising hint arrow above the line (diagonal up-right = growth)
d.line([(px + pw - 170, base - 26), (px + pw - 120, base - 44)], fill=(120, 200, 120), width=4)
d.polygon([(px + pw - 116, base - 48), (px + pw - 114, base - 36), (px + pw - 128, base - 42)], fill=(120, 200, 120))

# ---- small pixel cat sitting at the origin ----
CAT = [
    '...KK........KK....', '..KFFK......KFFK...', '.KFFAK....KAAFK....',
    '.KFAKKK..KKKAFK....', 'KKKKKKKKKKKKKKKKKK.', 'KFFFFFFFFFFFFFFFFK.',
    'KFFFFFFFFFFFFFFFFK.', 'KFEwFFFFFFFwEFFFK..', 'KFFFFFFFFFFFFFFFFK.',
    'WFFMMMNNNMMMFFFW...', 'WFFMFMKKKMFMFFFW...', 'KFFFFMMFFMMFFFFK...',
    'KKKFFFFFFFFFFFFKK..', '.KKKKKKKKKKKKKKKK..', '......KK....KK......',
]
PAL = {'K': (74, 51, 35), 'F': (245, 163, 92), 'E': (61, 43, 31), 'w': (255, 255, 255),
       'A': (255, 179, 154), 'N': (255, 138, 128), 'M': (255, 241, 222), 'W': (255, 241, 222), 'B': (255, 241, 222)}
cx, cy, s = ax0 - 40, ay0 - 12, 3
for i, row in enumerate(CAT):
    for j, ch in enumerate(row):
        if ch in PAL:
            d.rectangle([cx + j * s, cy + i * s, cx + j * s + s - 1, cy + i * s + s - 1], fill=PAL[ch])

# ---- title with drawn pixel stars (no emoji) ----
pixel_star(40, 26, 3, (255, 179, 0))
pixel_star(52, 22, 3, (255, 179, 0))
pixel_star(64, 26, 3, (255, 179, 0))
d.text((82, 18), 'DSKIN  Star 趋势图', font=CJK, fill=INK)
d.text((82, 46), 'waiting for the first star', font=CJK_SMALL, fill=(110, 120, 140))

# ---- caption ----
d.text((px + 8, py + ph + 26), '等第一颗星点亮，这里会自动生成实时曲线',
       font=CJK_SMALL, fill=(74, 74, 74))

img.save('/Users/vitamin/Desktop/deepseektest/assets/star-trend.png')
print('saved star-trend.png')
