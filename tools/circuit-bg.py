#!/usr/bin/env python3
"""Generate aaos14-academy/assets/img/circuit-bg.svg: faint PCB traces at the page edges (dark theme backdrop).

python3 tools/circuit-bg.py > aaos14-academy/assets/img/circuit-bg.svg
"""
import random

W, H = 1600, 1000
random.seed(14)
out = []


def trace(x, y, steps, dirx, cls):
    """A trace that runs vertically, then jogs 45 degrees toward/away from the edge; ends in a pad."""
    pts = [(x, y)]
    for _ in range(steps):
        seg = random.choice([60, 90, 120, 160])
        y += seg
        pts.append((x, y))
        if random.random() < 0.6:
            d = random.choice([20, 34, 48]) * dirx * random.choice([1, -1])
            x += d
            y += abs(d)
            pts.append((x, y))
    d = " ".join(f"{px:.0f},{py:.0f}" for px, py in pts)
    out.append(f'<polyline class="{cls}" points="{d}"/>')
    out.append(f'<circle class="pad {cls}" cx="{pts[0][0]:.0f}" cy="{pts[0][1]:.0f}" r="3.2"/>')
    out.append(f'<circle class="pad {cls}" cx="{pts[-1][0]:.0f}" cy="{pts[-1][1]:.0f}" r="3.2"/>')


def side(x0, x1, dirx, glow):
    x = x0
    i = 0
    while (x < x1) if x1 > x0 else (x > x1):
        y = random.choice([-40, 40, 120, 220, 340])
        cls = glow if i in (2, 5) else "t"
        trace(x, y, random.randint(4, 7), dirx, cls)
        x += (x1 - x0) / abs(x1 - x0) * random.choice([22, 28, 36])
        i += 1


side(18, 250, 1, "gb")
side(W - 18, W - 250, -1, "ga")

print(f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">
<defs>
  <radialGradient id="l" cx="0" cy="0.35" r="0.55"><stop offset="0" stop-color="#5aa9e6" stop-opacity="0.10"/><stop offset="1" stop-color="#5aa9e6" stop-opacity="0"/></radialGradient>
  <radialGradient id="r" cx="1" cy="0.8" r="0.5"><stop offset="0" stop-color="#d9a35b" stop-opacity="0.09"/><stop offset="1" stop-color="#d9a35b" stop-opacity="0"/></radialGradient>
  <linearGradient id="fade" x1="0" x2="1"><stop offset="0" stop-color="#fff"/><stop offset="0.2" stop-color="#fff" stop-opacity="0.35"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/><stop offset="0.8" stop-color="#fff" stop-opacity="0.35"/><stop offset="1" stop-color="#fff"/></linearGradient>
  <mask id="m"><rect width="{W}" height="{H}" fill="url(#fade)"/></mask>
  <filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="2.2"/></filter>
</defs>
<style>
  polyline {{ fill: none; stroke-width: 1.3; stroke-linejoin: round; }}
  .t {{ stroke: #a7b0bd; stroke-opacity: 0.09; }}
  .pad.t {{ fill: #17191d; stroke-opacity: 0.16; }}
  .gb {{ stroke: #6cb8f0; stroke-opacity: 0.28; }}
  .ga {{ stroke: #e0ab62; stroke-opacity: 0.26; }}
  .pad.gb, .pad.ga {{ fill: #17191d; }}
  .glow polyline {{ stroke-width: 3; stroke-opacity: 0.35; filter: url(#g); }}
  .glow circle {{ display: none; }}
</style>
<rect width="{W}" height="{H}" fill="url(#l)"/>
<rect width="{W}" height="{H}" fill="url(#r)"/>
<g mask="url(#m)">
{chr(10).join(out)}
<g class="glow">{"".join(o for o in out if 'class="gb"' in o or 'class="ga"' in o)}</g>
</g>
</svg>''')
