# Generates the isometric 5-layer hero illustration for aaos14-academy/index.html.
# Run: python3 tools/hero-art.py > art.svg, then paste it over <svg class="hero-art"> in index.html.
# Colors come from the --hv-* tokens in main.css, so the same SVG works in light and dark mode.
A, B, T = 118, 53, 11          # slab half-width, half-depth (iso), thickness
W, H = 380, 600
PITCH = 96
CX = [200, 180, 200, 180, 194]
CY = [158 + PITCH * i for i in range(5)]

def P(cx, cy, u, v, z=0):
    return (cx + (u - v) * A / 2, cy + (u + v) * B / 2 - z)

def pts(ps):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in ps)

def box(cx, cy, u0, u1, v0, v1, z0, z1, cls, extra=""):
    top = [P(cx, cy, u0, v0, z1), P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u0, v1, z1)]
    left = [P(cx, cy, u0, v1, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u0, v1, z0)]
    right = [P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u1, v0, z0)]
    return (f'<g class="{cls}"{extra}><polygon class="f-l" points="{pts(left)}"/>'
            f'<polygon class="f-r" points="{pts(right)}"/><polygon class="f-t" points="{pts(top)}"/></g>')

def line(cx, cy, a, b, z=0, cls="hv-trace"):
    (x1, y1), (x2, y2) = P(cx, cy, *a, z), P(cx, cy, *b, z)
    return f'<line class="{cls}" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>'

def path(cx, cy, uvs, z=0, cls="hv-trace"):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in (P(cx, cy, u, v, z) for u, v in uvs))
    return f'<path class="{cls}" d="{d}"/>'

def dot(cx, cy, u, v, z=0, r=2.6, cls="hv-dot"):
    x, y = P(cx, cy, u, v, z)
    return f'<circle class="{cls}" cx="{x:.1f}" cy="{y:.1f}" r="{r}"/>'


SW, SH = 200, 120                       # AVN screen drawn flat, then mapped onto a tilted plane
def avn(cx, cy):
    u0, du, v0, dv, ztop, zdrop = -0.98, 1.96, -0.42, 0.8, 112, 92
    a = du / SW * A / 2
    b = du / SW * B / 2
    c = -dv / SH * A / 2
    d = dv / SH * B / 2 + zdrop / SH
    e = cx + (u0 - v0) * A / 2
    f = cy + (u0 + v0) * B / 2 - ztop
    m = f'matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.1f} {f:.1f})'
    ui = (
        # bezel + glass
        '<rect class="avn-bezel" x="-6" y="-6" width="212" height="132" rx="10"/>'
        '<rect class="avn-glass" x="0" y="0" width="200" height="120" rx="5"/>'
        # status bar
        '<text class="avn-txt dim" x="8" y="9">10:24</text><text class="avn-txt dim" x="192" y="9" text-anchor="end">5G ▮▮▮</text>'
        # map: blocks, streets, route, position and destination
        '<rect class="avn-map" x="4" y="13" width="128" height="86" rx="4"/>'
        '<path class="avn-street" d="M4,40 H132 M4,72 H132 M36,13 V99 M88,13 V99 M4,92 L60,13 M70,99 L132,30"/>'
        '<path class="avn-route" d="M30,94 L36,72 L88,72 L88,40 L112,40 L120,26"/>'
        '<circle class="avn-pos" cx="30" cy="94" r="4.5"/><path class="avn-pin" d="M120,16 a5,5 0 0 1 5,5 c0,4 -5,9 -5,9 c0,0 -5,-5 -5,-9 a5,5 0 0 1 5,-5z"/>'
        # turn card
        '<rect class="avn-card" x="9" y="18" width="50" height="22" rx="4"/>'
        '<path class="avn-turn" d="M16,35 V27 H24 M21,24 L24,27 L21,30"/><text class="avn-txt big" x="30" y="32">300 m</text>'
        # media card
        '<rect class="avn-card" x="137" y="13" width="59" height="86" rx="4"/>'
        '<rect class="avn-art" x="146" y="19" width="41" height="41" rx="4"/>'
        '<path class="avn-note" d="M162,49 V30 L174,27 V45"/><circle class="avn-note-h" cx="159" cy="49" r="3.5"/><circle class="avn-note-h" cx="171" cy="45" r="3.5"/>'
        '<text class="avn-txt" x="142" y="70">Night Drive</text><text class="avn-txt dim" x="142" y="78">Radio · FM 98.5</text>'
        '<rect class="avn-bar" x="142" y="84" width="49" height="2.5" rx="1"/><rect class="avn-bar on" x="142" y="84" width="30" height="2.5" rx="1"/>'
        '<text class="avn-txt" x="166.5" y="95" text-anchor="middle">⏮  ⏸  ⏭</text>'
        # climate / dock bar
        '<rect class="avn-dock" x="0" y="103" width="200" height="17"/>'
        '<text class="avn-txt temp" x="10" y="115">22°</text><text class="avn-txt temp" x="190" y="115" text-anchor="end">21°</text>'
    )
    for k in range(5):
        ui += f'<rect class="avn-ico a{k + 1}" x="{62 + k * 16}" y="106" width="11" height="11" rx="3"/>'
    return f'<g transform="translate(0 6)"><g transform="{m}"><rect class="avn-back" x="-6" y="-6" width="212" height="132" rx="10"/></g></g><g transform="{m}">{ui}</g>'

def slab(i):
    cx, cy = CX[i], CY[i]
    s = box(cx, cy, -1, 1, -1, 1, -T, 0, "hv-slab")
    # accent rim along the front edges of the top face
    s += path(cx, cy, [(-1, 1), (1, 1), (1, -1)], 0, "hv-rim")
    return s

def objects(i):
    cx, cy = CX[i], CY[i]
    o = ""
    if i == 0:   # Applications: the head unit's AVN screen (navigation, media, climate)
        o += box(cx, cy, -0.32, 0.32, 0.05, 0.4, 0, 6, "hv-dev")          # stand
        o += avn(cx, cy)
    elif i == 1:  # Car API & Framework: two managers wired together
        o += path(cx, cy, [(-0.45, 0.1), (0, 0.1), (0, -0.4), (0.45, -0.4)])
        o += path(cx, cy, [(-0.8, 0.75), (-0.45, 0.4)])
        o += box(cx, cy, -0.75, -0.2, -0.15, 0.4, 0, 10, "hv-chip")
        o += box(cx, cy, 0.2, 0.75, -0.65, -0.1, 0, 10, "hv-chip")
        o += box(cx, cy, -0.62, -0.33, -0.02, 0.27, 10, 11, "hv-die")
        o += box(cx, cy, 0.33, 0.62, -0.52, -0.23, 10, 11, "hv-die")
        o += dot(cx, cy, 0, 0.1) + dot(cx, cy, 0, -0.4)
    elif i == 2:  # System IPC / Binder: processes linked by transactions
        nodes = [(-0.6, -0.1), (0.05, -0.6), (0.55, 0.15), (-0.05, 0.55)]
        for a in range(4):
            for b in range(a + 1, 4):
                if (a, b) != (0, 2):
                    o += line(cx, cy, nodes[a], nodes[b], 0, "hv-trace hv-flow")
        for u, v in nodes:
            o += box(cx, cy, u - 0.12, u + 0.12, v - 0.12, v + 0.12, 0, 9, "hv-node")
            o += dot(cx, cy, u, v, 9, 2.2)
    elif i == 3:  # Vehicle HAL: the big VHAL processor
        for k in range(7):
            t = -0.5 + k * (1.0 / 6)
            o += line(cx, cy, (t, 0.62), (t, 0.86)) + line(cx, cy, (0.62, t), (0.86, t))
            o += line(cx, cy, (t, -0.62), (t, -0.86)) + line(cx, cy, (-0.62, t), (-0.86, t))
        o += box(cx, cy, -0.62, 0.62, -0.62, 0.62, 0, 14, "hv-chip big")
        o += box(cx, cy, -0.36, 0.36, -0.36, 0.36, 14, 16, "hv-die")
    else:         # MCU & vehicle bus: MCU, transceivers and CAN wires
        for k, v in enumerate((-0.55, -0.15, 0.25)):
            o += path(cx, cy, [(0.15, v + 0.12), (0.62, v + 0.12), (1.0, v + 0.12)], 0, f"hv-wire w{k + 1}")
        o += path(cx, cy, [(-0.2, 0.35), (-0.2, 1.0)], 0, "hv-wire w2")
        o += box(cx, cy, -0.6, 0.0, -0.45, 0.15, 0, 8, "hv-chip")
        o += box(cx, cy, -0.46, -0.14, -0.31, 0.01, 8, 9, "hv-die")
        for k, v in enumerate((-0.55, -0.15, 0.25)):
            o += box(cx, cy, 0.35, 0.6, v, v + 0.24, 0, 7, f"hv-conn c{k + 1}")
    return o

def riser(i):
    """Glowing link from layer i (above) down to layer i+1."""
    cx1, cy1, cx2, cy2 = CX[i], CY[i], CX[i + 1], CY[i + 1]
    out = ""
    for u, v in ((0.82, 0.55), (-0.55, 0.82)):
        x1, y1 = P(cx1, cy1, u, v, -T)
        x2, y2 = P(cx2, cy2, u, v, 0)
        out += f'<line class="hv-riser" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>'
        out += f'<line class="hv-riser hv-flow" x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}"/>'
        out += f'<circle class="hv-dot" cx="{x2:.1f}" cy="{y2:.1f}" r="2.4"/>'
    return out

body = ""
for i in range(4, -1, -1):           # paint bottom layer first
    g = f'<g class="hv-layer hv-l{i + 1}">' + slab(i) + objects(i)
    if i < 4:
        g = f'<g class="hv-l{i + 1}">{riser(i)}</g>' + g
    body += g + "</g>"

svg = (f'<svg class="hero-art" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">'
       '<defs><linearGradient id="hv-art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient></defs>' + body + "</svg>")
print(svg)
