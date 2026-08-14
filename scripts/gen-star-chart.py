#!/usr/bin/env python3
"""Regenerate the DSKIN star-trend chart (assets/star-trend.svg).

Fetches the stargazers timeline from the GitHub API (paginated) using
GH_TOKEN, then renders a clean, ordinary line chart with a small pixel cat
accent. Runs daily via .github/workflows/star-chart.yml; never overwrites
the chart on failure."""
import datetime
import json
import os
import sys
import urllib.request

REPO = "dancingmemory/dskin"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "star-trend.svg")
TOKEN = os.environ.get("GH_TOKEN", "")

W, H = 900, 440
INK = "#2e3a59"
ACCENT = "#ff9f1c"


def fetch_stargazers():
    stars = []
    page = 1
    while True:
        url = f"https://api.github.com/repos/{REPO}/stargazers?per_page=100&page={page}"
        req = urllib.request.Request(url, headers={
            "Accept": "application/vnd.github.star+json",
            "Authorization": f"token {TOKEN}",
            "User-Agent": "dskin-star-chart",
        })
        with urllib.request.urlopen(req, timeout=20) as r:
            batch = json.load(r)
        if not batch:
            break
        stars.extend(s["starred_at"] for s in batch)
        if len(batch) < 100:
            break
        page += 1
    return sorted(stars)


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def ts(s):
    return datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()


def fmt_date(s):
    d = datetime.datetime.fromisoformat(s.replace("Z", "+00:00"))
    return d.strftime("%Y-%m-%d")


def pixel_cat(s=2):
    """Small pixel cat as SVG rects (used as a decorative accent)."""
    CAT = [
        '...KK........KK....', '..KFFK......KFFK...', '.KFFAK....KAAFK....',
        '.KFAKKK..KKKAFK....', 'KKKKKKKKKKKKKKKKKK.', 'KFFFFFFFFFFFFFFFFK.',
        'KFFFFFFFFFFFFFFFFK.', 'KFEwFFFFFFFwEFFFK..', 'KFFFFFFFFFFFFFFFFK.',
        'WFFMMMNNNMMMFFFW...', 'WFFMFMKKKMFMFFFW...', 'KFFFFMMFFMMFFFFK...',
        'KKKFFFFFFFFFFFFKK..', '.KKKKKKKKKKKKKKKK..', '......KK....KK......',
    ]
    PAL = {'K': '#4a3323', 'F': '#f5a35c', 'E': '#3d2b1f', 'w': '#ffffff',
           'A': '#ffb39a', 'N': '#ff8a80', 'M': '#fff1de', 'W': '#fff1de', 'B': '#fff1de'}
    out = []
    for i, row in enumerate(CAT):
        for j, ch in enumerate(row):
            if ch in PAL:
                out.append(f'<rect x="{j*s}" y="{i*s}" width="{s}" height="{s}" fill="{PAL[ch]}"/>')
    return "".join(out)


def render_step_chart(stars):
    n = len(stars)
    # chart geometry
    ml, mr, mt, mb = 90, 60, 60, 70
    cw, ch = W - ml - mr, H - mt - mb
    ax0, ay0 = ml, mt + ch
    tmin, tmax = ts(stars[0]), ts(stars[-1])
    xspan = max(tmax - tmin, 1)

    def X(t): return ax0 + (t - tmin) / xspan * cw
    def Y(v): return ay0 - v / max(n, 1) * (ch - 10)

    # unique points (one star may have repeated timestamps)
    pts = []
    seen = set()
    for i, s in enumerate(stars, start=1):
        if s not in seen:
            seen.add(s)
            pts.append((ts(s), i))
    max_y = max(v for _, v in pts)

    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="-apple-system, BlinkMacSystemFont, PingFang SC, Hiragino Sans GB, sans-serif">')
    out.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')

    # title: small pixel cat + text
    out.append(f'<g transform="translate(24, 24)">{pixel_cat(3)}</g>')
    out.append(f'<text x="92" y="44" font-size="22" font-weight="700" fill="{INK}">DSKIN · Star History</text>')
    out.append(f'<text x="92" y="64" font-size="13" fill="#7a869e">星标趋势 · 每日自动更新 · {n} stars</text>')

    # gridlines + y ticks
    ticks = 4
    for i in range(ticks + 1):
        v = max_y * i / ticks
        y = Y(v)
        out.append(f'<line x1="{ax0}" y1="{y:.1f}" x2="{ax0+cw}" y2="{y:.1f}" stroke="#eceff5" stroke-width="1"/>')
        out.append(f'<text x="{ax0-10}" y="{y+4:.1f}" font-size="12" fill="#9aa3b5" text-anchor="end">{v:g}</text>')

    # axes
    out.append(f'<line x1="{ax0}" y1="{ay0}" x2="{ax0+cw}" y2="{ay0}" stroke="#d5dae4" stroke-width="1.5"/>')
    out.append(f'<line x1="{ax0}" y1="{mt}" x2="{ax0}" y2="{ay0}" stroke="#d5dae4" stroke-width="1.5"/>')
    # x labels: first & last star dates
    out.append(f'<text x="{ax0}" y="{ay0+22}" font-size="12" fill="#9aa3b5" text-anchor="middle">{fmt_date(stars[0])}</text>')
    if xspan > 1:
        out.append(f'<text x="{ax0+cw}" y="{ay0+22}" font-size="12" fill="#9aa3b5" text-anchor="middle">{fmt_date(stars[-1])}</text>')

    # area + line
    if len(pts) >= 2:
        poly = " ".join(f"{X(t):.1f},{Y(v):.1f}" for t, v in pts)
        out.append(f'<polygon points="{ax0},{ay0} {poly} {X(pts[-1][0]):.1f},{ay0}" fill="url(#area)" stroke="none"/>')
    path = " ".join(
        f"{'M' if i == 0 else 'L'}{X(t):.1f} {Y(v):.1f}" for i, (t, v) in enumerate(pts)
    )
    out.append(f'<defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1">'
               f'<stop offset="0" stop-color="{ACCENT}" stop-opacity="0.25"/>'
               f'<stop offset="1" stop-color="{ACCENT}" stop-opacity="0"/></linearGradient></defs>')
    out.append(f'<path d="{path}" fill="none" stroke="{ACCENT}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>')
    # dots
    for t, v in pts:
        out.append(f'<circle cx="{X(t):.1f}" cy="{Y(v):.1f}" r="4" fill="{ACCENT}" stroke="#ffffff" stroke-width="1.5"/>')
    # last value label
    lt, lv = pts[-1]
    out.append(f'<rect x="{X(lt)+8:.1f}" y="{Y(lv)-22:.1f}" width="34" height="22" rx="4" fill="{INK}"/>')
    out.append(f'<text x="{X(lt)+25:.1f}" y="{Y(lv)-6:.1f}" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">{lv}</text>')

    # caption
    out.append(f'<text x="{W/2}" y="{H-16}" font-size="12" fill="#aab2c3" text-anchor="middle">由 GitHub Actions 每日自动更新 · auto-updated daily by GitHub Actions</text>')
    out.append('</svg>')
    return "\n".join(out)


def main():
    if not TOKEN:
        print("GH_TOKEN not set; leaving the chart untouched", file=sys.stderr)
        sys.exit(1)
    try:
        stars = fetch_stargazers()
    except Exception as e:
        print(f"chart fetch failed ({e}); leaving the chart untouched", file=sys.stderr)
        sys.exit(1)
    if not stars:
        print("no stargazers data; leaving the chart untouched", file=sys.stderr)
        sys.exit(1)
    svg = render_step_chart(stars)
    with open(OUT, "w") as f:
        f.write(svg)
    print(f"wrote {OUT} ({len(svg)} bytes)")


if __name__ == "__main__":
    main()
