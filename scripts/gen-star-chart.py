#!/usr/bin/env python3
"""Regenerate the DSKIN star-trend chart (assets/star-trend.svg).

Fetches the stargazers timeline from the GitHub API (paginated) using
GH_TOKEN (the Actions default token in CI, or any repo-admin token locally),
then renders a clean SVG step chart. When the API is unreachable it falls
back to a "waiting for the first star" placeholder so the README never shows
a broken image. Runs daily via .github/workflows/star-chart.yml."""
import json
import os
import sys
import urllib.request

REPO = "dancingmemory/dskin"
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "star-trend.svg")
TOKEN = os.environ.get("GH_TOKEN", "")

W, H = 900, 440


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


def render_step_chart(stars):
    n = len(stars)
    # panel geometry
    px, py, pw, ph = 60, 74, 620, 268
    ax0, ay0 = px + 56, py + ph - 56
    chart_w = pw - 80
    chart_h = ay0 - (py + 20)
    if n < 2:
        points = [(0, 1)]  # a single dot at star #1
        xspan = 1
    else:
        first = stars[0]
        last = stars[-1]
        import datetime
        def ts(s):
            return datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
        xspan = ts(last) - ts(first)
        points = []
        prev_t = None
        for i, s in enumerate(stars, start=1):
            t = ts(s)
            if t == prev_t:
                continue
            prev_t = t
            points.append((0 if xspan == 0 else (t - ts(first)) / xspan, i))
    max_y = max(p for _, p in points)

    def X(t): return ax0 + t * chart_w
    def Y(v): return ay0 - (v / max(1, max_y)) * chart_h

    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="PingFang SC, Hiragino Sans GB, sans-serif">')
    # sky background
    out.append('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="#a8d4f2"/><stop offset="1" stop-color="#eef6fc"/></linearGradient></defs>')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    # panel
    out.append(f'<rect x="{px+6}" y="{py+6}" width="{pw}" height="{ph}" fill="#4a3323"/>')
    out.append(f'<rect x="{px}" y="{py}" width="{pw}" height="{ph}" fill="#fffdf7" stroke="#2e3a59" stroke-width="3"/>')
    # gridlines + y ticks
    for g in (0.33, 0.66):
        gy = py + 20 + (ay0 - py - 20) * g
        out.append(f'<line x1="{ax0}" y1="{gy}" x2="{px+pw-24}" y2="{gy}" stroke="#dde1ec" stroke-width="2"/>')
    # axes
    out.append(f'<line x1="{ax0}" y1="{py+20}" x2="{ax0}" y2="{ay0}" stroke="#2e3a59" stroke-width="3"/>')
    out.append(f'<line x1="{ax0}" y1="{ay0}" x2="{px+pw-24}" y2="{ay0}" stroke="#2e3a59" stroke-width="3"/>')
    # axis labels
    out.append(f'<text x="{ax0+6}" y="{py+40}" font-size="16" fill="#2e3a59">stars</text>')
    out.append(f'<text x="{ax0-70}" y="{ay0+22}" font-size="16" fill="#2e3a59">0</text>')
    out.append(f'<text x="{px+pw-140}" y="{ay0+22}" font-size="16" fill="#2e3a59">time →</text>')
    # step line
    path = []
    prev = None
    for (t, v) in points:
        x, y = round(X(t), 1), round(Y(v), 1)
        if prev is None:
            path.append(f"M{x} {y}")
        else:
            px0, py0 = prev
            path.append(f"H{px0} V{y} H{x}")
        prev = (x, y)
    if path:
        out.append(f'<path d="{" ".join(path)}" fill="none" stroke="#f5a35c" stroke-width="4" stroke-linejoin="round"/>')
    # star dots
    for (t, v) in points:
        x, y = X(t), Y(v)
        out.append(f'<circle cx="{x}" cy="{y}" r="5" fill="#ffb300" stroke="#2e3a59" stroke-width="2"/>')
    # last value label
    if points:
        x, y = X(points[-1][0]), Y(points[-1][1])
        out.append(f'<text x="{min(x+10, px+pw-120)}" y="{max(y-10, py+30)}" font-size="15" font-weight="bold" fill="#b06e00">{max_y} ⭐</text>')
    # title (drawn stars via text-safe ⭐ fallback: use small circles)
    for i, sx in enumerate((34, 46, 58)):
        out.append(f'<circle cx="{sx}" cy="28" r="5" fill="#ffb300" stroke="#2e3a59" stroke-width="1.5"/>')
    out.append(f'<text x="76" y="36" font-size="24" font-weight="bold" fill="#2e3a59">DSKIN Star 趋势图</text>')
    out.append(f'<text x="76" y="58" font-size="14" fill="#6e7a92">star history · 自动更新 / auto-updates daily</text>')
    # caption
    out.append(f'<text x="{px+8}" y="{py+ph+32}" font-size="15" fill="#4a4a4a">共 {n} 颗星 · 图表由 GitHub Actions 每日自动重绘</text>')
    out.append('</svg>')
    return "\n".join(out)


def render_placeholder():
    out = []
    out.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" font-family="PingFang SC, Hiragino Sans GB, sans-serif">')
    out.append('<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">'
               '<stop offset="0" stop-color="#a8d4f2"/><stop offset="1" stop-color="#eef6fc"/></linearGradient></defs>')
    out.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
    out.append(f'<rect x="66" y="80" width="620" height="268" fill="#fffdf7" stroke="#2e3a59" stroke-width="3"/>')
    out.append(f'<line x1="116" y1="100" x2="116" y2="292" stroke="#2e3a59" stroke-width="3"/>')
    out.append(f'<line x1="116" y1="292" x2="656" y2="292" stroke="#2e3a59" stroke-width="3"/>')
    out.append(f'<text x="122" y="120" font-size="16" fill="#2e3a59">stars</text>')
    out.append(f'<text x="46" y="314" font-size="16" fill="#2e3a59">0</text>')
    out.append(f'<text x="520" y="314" font-size="16" fill="#2e3a59">time →</text>')
    dash = " ".join("12 10" for _ in range(20))
    out.append(f'<line x1="116" y1="270" x2="620" y2="270" stroke="#ffb300" stroke-width="4" stroke-dasharray="{dash}"/>')
    out.append(f'<circle cx="620" cy="270" r="6" fill="#ffb300" stroke="#2e3a59" stroke-width="2"/>')
    for i, sx in enumerate((34, 46, 58)):
        out.append(f'<circle cx="{sx}" cy="28" r="5" fill="#ffb300" stroke="#2e3a59" stroke-width="1.5"/>')
    out.append(f'<text x="76" y="36" font-size="24" font-weight="bold" fill="#2e3a59">DSKIN Star 趋势图</text>')
    out.append(f'<text x="76" y="58" font-size="14" fill="#6e7a92">waiting for the first star</text>')
    out.append(f'<text x="68" y="386" font-size="15" fill="#4a4a4a">等第一颗星点亮，这里会自动生成实时曲线（GitHub Actions 每日更新）</text>')
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
