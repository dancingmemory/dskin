#!/usr/bin/env python3
"""Generate a pixel-style star-trend placeholder chart (assets/star-trend.png).
GitHub restricted the stargazers API, so live charts cannot render for a
0-star repo; this cute placeholder keeps the section visible until the first
star arrives, then it can be swapped for the live star-history embed."""
from PIL import Image, ImageDraw, ImageFont

W, H = 900, 420
INK = (46, 58, 89)
SKY = (168, 212, 242)
img = Image.new('RGB', (W, H))
d = ImageDraw.Draw(img)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=tuple(int(SKY[i] + (238 - SKY[i]) * t * 0.7) for i in range(3)))

# chart panel
px, py, pw, ph = 60, 60, 620, 290
d.rectangle([px + 6, py + 6, px + pw + 6, py + ph + 6], fill=(74, 51, 35))
d.rectangle([px, py, px + pw, py + ph], fill=(255, 253, 247), outline=INK, width=3)
# axes
d.line([(px + 50, py + ph - 50), (px + pw - 30, py + ph - 50)], fill=INK, width=3)
d.line([(px + 50, py + 30), (px + 50, py + ph - 50)], fill=INK, width=3)
# dashed "waiting for the first star" line
dash = 14
x = px + 50
y0 = py + ph - 50
while x < px + pw - 30:
    d.line([(x, y0), (min(x + dash, px + pw - 30), y0)], fill=(255, 179, 0), width=4)
    x += dash * 2
# star marker at origin
d.polygon([(px + 50, y0 - 12), (px + 53, y0 - 5), (px + 61, y0 - 5), (px + 55, y0), (px + 57, y0 + 8),
           (px + 50, y0 + 4), (px + 43, y0 + 8), (px + 45, y0), (px + 39, y0 - 5), (px + 47, y0 - 5)],
          fill=(255, 179, 0), outline=INK)
# axis labels
CJK = ImageFont.truetype('/System/Library/Fonts/Hiragino Sans GB.ttc', 22)
d.text((px + 40, py + 14), 'stars', font=CJK, fill=INK)
d.text((px + pw - 130, py + ph - 34), 'time →', font=CJK, fill=INK)
d.text((px + 66, py + ph - 88), '0', font=CJK, fill=INK)
# title text
d.text((px + 40, py - 40), 'DSKIN ⭐ Star 趋势图', font=CJK, fill=INK)
d.text((px + 40, py + ph + 22), '等第一颗星点亮，这里会自动生成实时曲线', font=CJK, fill=(74, 74, 74))
# a small pixel cat sitting on the origin
CAT = [
    '...KK........KK....', '..KFFK......KFFK...', '.KFFAK....KAAFK....',
    '.KFAKKK..KKKAFK....', 'KKKKKKKKKKKKKKKKKK.', 'KFFFFFFFFFFFFFFFFK.',
    'KFFFFFFFFFFFFFFFFK.', 'KFEwFFFFFFFwEFFFK..', 'KFFFFFFFFFFFFFFFFK.',
    'WFFMMMNNNMMMFFFW...', 'WFFMFMKKKMFMFFFW...', 'KFFFFMMFFMMFFFFK...',
    'KKKFFFFFFFFFFFFKK..', '.KKKKKKKKKKKKKKKK..', '......KK....KK......',
]
PAL = {'K': (74, 51, 35), 'F': (245, 163, 92), 'E': (61, 43, 31), 'w': (255, 255, 255),
       'A': (255, 179, 154), 'N': (255, 138, 128), 'M': (255, 241, 222), 'W': (255, 241, 222), 'B': (255, 241, 222)}
cx, cy, s = px + 24, y0 - 14, 3
for i, row in enumerate(CAT):
    for j, ch in enumerate(row):
        if ch in PAL:
            d.rectangle([cx + j * s, cy + i * s, cx + j * s + s - 1, cy + i * s + s - 1], fill=PAL[ch])
img.save('/Users/vitamin/Desktop/deepseektest/assets/star-trend.png')
print('saved star-trend.png')
