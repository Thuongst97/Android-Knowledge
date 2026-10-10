# Generates the isometric 5-layer hero illustration for aaos14-academy/index.html.
# Run: python3 tools/hero-art.py > art.svg, then paste it over <svg class="hero-art"> in index.html.
# Colors come from the --hv-* tokens in main.css, so the same SVG works in light and dark mode.
#
# Geometry: every slab is a box on an isometric grid. Flat detail (circuit traces, labels, the AVN
# screen UI) is drawn in plain 2D and mapped onto its surface with an affine matrix, so it lands in
# perfect perspective.

A, B, T = 118, 53, 12          # slab half-width, half-depth (iso), thickness
W, H = 380, 600
PITCH = 96
CX = [200, 180, 200, 180, 194]
CY = [158 + PITCH * i for i in range(5)]
LAYER = ["APPLICATIONS", "CAR API · FRAMEWORK", "SYSTEM IPC · BINDER", "VEHICLE HAL", "MCU · VEHICLE BUS"]


def P(cx, cy, u, v, z=0):
    return (cx + (u - v) * A / 2, cy + (u + v) * B / 2 - z)


def pts(ps):
    return " ".join(f"{x:.1f},{y:.1f}" for x, y in ps)


def plane(cx, cy, z, u0=-1, u1=1, v0=-1, v1=1, w=200, h=200):
    """SVG transform mapping 2D (0..w, 0..h) onto the iso rectangle [u0,u1]x[v0,v1] at height z."""
    a = (u1 - u0) / w * A / 2
    b = (u1 - u0) / w * B / 2
    c = -(v1 - v0) / h * A / 2
    d = (v1 - v0) / h * B / 2
    e = cx + (u0 - v0) * A / 2
    f = cy + (u0 + v0) * B / 2 - z
    return f"matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.2f} {f:.2f})"


def box(cx, cy, u0, u1, v0, v1, z0, z1, mat, top=True):
    left = [P(cx, cy, u0, v1, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u0, v1, z0)]
    right = [P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u1, v0, z0)]
    s = f'<g class="m-{mat}"><polygon class="f-l" points="{pts(left)}"/><polygon class="f-r" points="{pts(right)}"/>'
    if top:
        tp = [P(cx, cy, u0, v0, z1), P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u0, v1, z1)]
        s += f'<polygon class="f-t" points="{pts(tp)}"/>'
    return s + "</g>"


def shadow(cx, cy, u0, u1, v0, v1, z=0, spread=0.06):
    """Soft contact shadow under an object."""
    return (f'<g transform="{plane(cx, cy, z, u0 - spread, u1 + spread, v0 - spread, v1 + spread)}">'
            f'<rect class="hv-ao" x="0" y="0" width="200" height="200" rx="30"/></g>')


def chip(cx, cy, u0, u1, v0, v1, z, hgt, label="", legs=True, sub=""):
    """IC package: legs on all four sides, a dark molded body and a labeled top."""
    s = shadow(cx, cy, u0, u1, v0, v1, z, 0.1)
    if legs:
        n = max(3, int((u1 - u0) * 9))
        for k in range(n):
            t = u0 + (k + 0.5) * (u1 - u0) / n
            s += box(cx, cy, t - 0.018, t + 0.018, v1, v1 + 0.07, z, z + 1.6, "leg")
        n = max(3, int((v1 - v0) * 9))
        for k in range(n):
            t = v0 + (k + 0.5) * (v1 - v0) / n
            s += box(cx, cy, u1, u1 + 0.07, t - 0.018, t + 0.018, z, z + 1.6, "leg")
    s += box(cx, cy, u0, u1, v0, v1, z, z + hgt, "chip")
    s += f'<g transform="{plane(cx, cy, z + hgt, u0, u1, v0, v1)}">'
    s += '<rect class="hv-chip-hi" x="6" y="6" width="188" height="188" rx="10"/>'
    s += '<circle class="hv-pin1" cx="26" cy="26" r="9"/>'
    if label:
        s += f'<text class="hv-chip-txt" x="100" y="{112 if not sub else 98}" text-anchor="middle">{label}</text>'
    if sub:
        s += f'<text class="hv-chip-sub" x="100" y="134" text-anchor="middle">{sub}</text>'
    return s + "</g>"


def circuit(seed):
    """Circuit-board traces and vias drawn on a 200x200 slab top."""
    import random
    r = random.Random(seed)
    s = ""
    for _ in range(16):
        x, y = r.choice([(r.randint(14, 186), 14), (14, r.randint(14, 186))])
        d = f"M{x},{y}"
        for _ in range(3):
            if r.random() < 0.5:
                x = min(186, x + r.randint(20, 60))
            else:
                y = min(186, y + r.randint(20, 60))
            d += f" L{x},{y}"
        s += f'<path class="hv-pcb" d="{d}"/><circle class="hv-via" cx="{x}" cy="{y}" r="2.6"/>'
    return s


def slab_top(i):
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, 0)}">'
    s += '<rect class="hv-glass" x="0" y="0" width="200" height="200" rx="9"/>'
    s += f'<g class="hv-circuit">{circuit(i * 7 + 3)}</g>'
    s += '<rect class="hv-sheen" x="0" y="0" width="200" height="200" rx="9"/>'
    s += '<rect class="hv-inner" x="7" y="7" width="186" height="186" rx="6"/>'
    # corner brackets, like alignment marks on a wafer
    for x, y, dx, dy in ((7, 7, 1, 1), (193, 7, -1, 1), (193, 193, -1, -1), (7, 193, 1, -1)):
        s += f'<path class="hv-mark" d="M{x},{y + 14 * dy} V{y} H{x + 14 * dx}"/>'
    s += f'<text class="hv-engrave" x="14" y="190">L{i + 1} · {LAYER[i]}</text>'
    return s + "</g>"


def slab(i):
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, -T - 4, -1.05, 1.05, -1.05, 1.05)}"><rect class="hv-underglow" x="0" y="0" width="200" height="200" rx="40"/></g>'
    s += box(cx, cy, -1, 1, -1, 1, -T, 0, "slab", top=False)
    # light strip along the bottom of both front faces
    s += f'<path class="hv-strip" d="M{pts([P(cx, cy, -1, 1, -T + 2.5), P(cx, cy, 1, 1, -T + 2.5), P(cx, cy, 1, -1, -T + 2.5)]).replace(" ", " L")}"/>'
    s += slab_top(i)
    # glowing rim on the front edges of the top face
    s += f'<path class="hv-rim" d="M{pts([P(cx, cy, -1, 0.94), P(cx, cy, -0.94, 1), P(cx, cy, 0.94, 1), P(cx, cy, 1, 0.94), P(cx, cy, 1, -0.94)]).replace(" ", " L")}"/>'
    return s


def trace(cx, cy, uvs, z=0.4, cls="hv-trace"):
    d = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in (P(cx, cy, u, v, z) for u, v in uvs))
    return f'<path class="{cls}" d="{d}"/>'


def pulse(d, dur, delay, cls="hv-pulse"):
    return f'<circle class="{cls}" r="2.2" style="offset-path:path(\'{d}\');animation-duration:{dur}s;animation-delay:{delay}s"/>'


SW, SH = 200, 120


def avn(cx, cy):
    """The head unit's AVN display: navigation, media and climate, on a tilted stand."""
    u0, du, v0, dv, ztop, zdrop = -0.98, 1.96, -0.42, 0.8, 112, 92
    a = du / SW * A / 2
    b = du / SW * B / 2
    c = -dv / SH * A / 2
    d = dv / SH * B / 2 + zdrop / SH
    e = cx + (u0 - v0) * A / 2
    f = cy + (u0 + v0) * B / 2 - ztop
    m = f"matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.1f} {f:.1f})"
    # depth: stack the back plate a few pixels down to fake the housing thickness
    s = "".join(f'<g transform="translate(0 {k})"><g transform="{m}"><rect class="avn-back" x="-7" y="-7" width="214" height="134" rx="11"/></g></g>'
                for k in (7, 5, 3))
    ui = (
        '<rect class="avn-bezel" x="-7" y="-7" width="214" height="134" rx="11"/>'
        '<rect class="avn-glass" x="0" y="0" width="200" height="120" rx="5"/>'
        '<text class="avn-txt dim" x="8" y="9">10:24</text>'
        '<text class="avn-txt dim" x="100" y="9" text-anchor="middle">24°C · D</text>'
        '<text class="avn-txt dim" x="192" y="9" text-anchor="end">5G ▮▮▮</text>'
        # map with 3D-ish blocks, roads, the route and the car
        '<rect class="avn-map" x="4" y="13" width="128" height="86" rx="4"/>'
        '<g class="avn-blocks"><rect x="8" y="17" width="24" height="19" rx="2"/><rect x="40" y="17" width="44" height="19" rx="2"/>'
        '<rect x="92" y="44" width="36" height="24" rx="2"/><rect x="8" y="44" width="24" height="24" rx="2"/><rect x="40" y="76" width="44" height="19" rx="2"/>'
        '<rect x="92" y="76" width="36" height="19" rx="2"/></g>'
        '<path class="avn-road" d="M4,40 H132 M4,72 H132 M36,13 V99 M88,13 V99"/>'
        '<path class="avn-route-glow" d="M30,99 L36,72 L88,72 L88,40 L112,40 L120,24"/>'
        '<path class="avn-route" d="M30,99 L36,72 L88,72 L88,40 L112,40 L120,24"/>'
        '<path class="avn-car" d="M30,86 l5,9 l-5,-3 l-5,3z"/>'
        '<path class="avn-pin" d="M120,12 a5,5 0 0 1 5,5 c0,4 -5,9 -5,9 c0,0 -5,-5 -5,-9 a5,5 0 0 1 5,-5z"/>'
        '<rect class="avn-card" x="9" y="18" width="54" height="24" rx="4"/>'
        '<path class="avn-turn" d="M16,37 V28 H25 M22,25 L25,28 L22,31"/>'
        '<text class="avn-txt big" x="31" y="31">300 m</text><text class="avn-txt dim" x="31" y="38">Hai Ba Trung</text>'
        '<rect class="avn-card" x="9" y="84" width="40" height="11" rx="3"/><text class="avn-txt dim" x="13" y="91.5">ETA 10:41 · 8 km</text>'
        # media
        '<rect class="avn-card" x="137" y="13" width="59" height="86" rx="4"/>'
        '<rect class="avn-art" x="146" y="19" width="41" height="41" rx="4"/>'
        '<path class="avn-note" d="M162,49 V30 L174,27 V45"/><circle class="avn-note-h" cx="159" cy="49" r="3.5"/><circle class="avn-note-h" cx="171" cy="45" r="3.5"/>'
        '<text class="avn-txt" x="142" y="70">Night Drive</text><text class="avn-txt dim" x="142" y="78">FM 98.5 · Zone 1</text>'
        '<rect class="avn-bar" x="142" y="84" width="49" height="2.5" rx="1"/><rect class="avn-bar on" x="142" y="84" width="30" height="2.5" rx="1"/>'
        '<text class="avn-txt" x="166.5" y="95" text-anchor="middle">⏮  ⏸  ⏭</text>'
        # climate bar + app dock
        '<rect class="avn-dock" x="0" y="103" width="200" height="17"/>'
        '<text class="avn-txt temp" x="10" y="115">22°</text><text class="avn-txt temp" x="190" y="115" text-anchor="end">21°</text>'
    )
    for k in range(5):
        ui += f'<rect class="avn-ico a{k + 1}" x="{62 + k * 16}" y="106" width="11" height="11" rx="3"/>'
    ui += '<path class="avn-reflect" d="M-7,-7 H90 L30,127 H-7 Z"/>'
    return s + f'<g transform="{m}">{ui}</g>'


def objects(i):
    cx, cy = CX[i], CY[i]
    o = ""
    if i == 0:      # Applications: head unit on its stand
        o += shadow(cx, cy, -0.9, 0.9, -0.35, 0.5, 0, 0.08)
        o += box(cx, cy, -0.3, 0.3, 0.1, 0.38, 0, 8, "metal")
        o += avn(cx, cy)
    elif i == 1:    # Car API & Framework: the managers app code talks to
        o += trace(cx, cy, [(-0.2, 0.12), (0.05, 0.12), (0.05, -0.38), (0.22, -0.38)], 0.4, "hv-trace on")
        o += trace(cx, cy, [(-0.85, 0.85), (-0.48, 0.48)], 0.4, "hv-trace on")
        o += trace(cx, cy, [(0.75, -0.38), (0.92, -0.38)], 0.4, "hv-trace on")
        o += chip(cx, cy, -0.78, -0.22, -0.16, 0.4, 0.5, 9, "CarProperty", sub="Manager")
        o += chip(cx, cy, 0.22, 0.78, -0.66, -0.1, 0.5, 9, "CarService", sub="A14")
    elif i == 2:    # System IPC: Binder transactions between processes
        nodes = [(-0.62, -0.08, "app"), (0.02, -0.64, "car"), (0.58, 0.12, "hal"), (-0.04, 0.58, "sm")]
        links = [(0, 1), (1, 2), (2, 3), (3, 0), (1, 3)]
        for a_, b_ in links:
            (x1, y1), (x2, y2) = P(cx, cy, nodes[a_][0], nodes[a_][1], 6), P(cx, cy, nodes[b_][0], nodes[b_][1], 6)
            dd = f"M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}"
            o += f'<path class="hv-beam" d="{dd}"/>' + pulse(dd, 1.8 + 0.3 * a_, -0.4 * b_, "hv-pulse sm")
        for u, v, name in nodes:
            o += chip(cx, cy, u - 0.15, u + 0.15, v - 0.15, v + 0.15, 0.5, 8, name, legs=False)
    elif i == 3:    # Vehicle HAL: the VHAL process on its SoC, with decoupling caps
        for u, v in ((-0.82, -0.4), (-0.82, 0.1), (0.4, 0.82), (-0.1, 0.82), (0.82, -0.6)):
            o += box(cx, cy, u - 0.06, u + 0.06, v - 0.04, v + 0.04, 0.5, 4, "cap")
        o += chip(cx, cy, -0.6, 0.6, -0.6, 0.6, 0.5, 13)
        o += box(cx, cy, -0.36, 0.36, -0.36, 0.36, 13.5, 16, "spreader")
        o += (f'<g transform="{plane(cx, cy, 16, -0.36, 0.36, -0.36, 0.36)}">'
              '<text class="hv-etch" x="100" y="100" text-anchor="middle">VHAL</text>'
              '<text class="hv-etch sm" x="100" y="138" text-anchor="middle">AIDL V2 · A14</text></g>')
    else:           # MCU and vehicle bus: MCU, CAN transceivers and the wiring harness
        o += trace(cx, cy, [(-0.05, -0.33), (0.3, -0.42)], 0.4, "hv-trace on")
        o += trace(cx, cy, [(-0.05, -0.03), (0.3, -0.02)], 0.4, "hv-trace on")
        o += trace(cx, cy, [(-0.05, 0.25), (0.3, 0.38)], 0.4, "hv-trace on")
        o += chip(cx, cy, -0.68, -0.08, -0.5, 0.1, 0.5, 8, "MCU", sub="AUTOSAR")
        for k, v in enumerate((-0.55, -0.15, 0.25)):
            wire = [P(cx, cy, 0.62, v + 0.12, 3), P(cx, cy, 1.0, v + 0.12, 3), P(cx, cy, 1.25, v + 0.2, -10), P(cx, cy, 1.45, v + 0.32, -28)]
            o += f'<path class="hv-wire w{k + 1}" d="M{wire[0][0]:.1f},{wire[0][1]:.1f} L{wire[1][0]:.1f},{wire[1][1]:.1f} Q{wire[2][0]:.1f},{wire[2][1]:.1f} {wire[3][0]:.1f},{wire[3][1]:.1f}"/>'
            o += chip(cx, cy, 0.32, 0.62, v, v + 0.24, 0.5, 6, ["CAN", "CAN", "ETH"][k], legs=False)
    return o


def cable(p0, c1, c2, p3, n=5, gap=1.7, cls="", pulses=True):
    """A ribbon of n coloured wires along a cubic Bezier, with a dark sheath under it."""
    def d(off):
        q = [(x + off, y) for x, y in (p0, c1, c2, p3)]
        return f"M{q[0][0]:.1f},{q[0][1]:.1f} C{q[1][0]:.1f},{q[1][1]:.1f} {q[2][0]:.1f},{q[2][1]:.1f} {q[3][0]:.1f},{q[3][1]:.1f}"
    mid = d(0)
    out = f'<path class="hv-sheath" style="stroke-width:{n * gap + 3:.1f}px" d="{mid}"/>'
    for k in range(n):
        out += f'<path class="hv-wire w{k % 5 + 1}" d="{d((k - (n - 1) / 2) * gap)}"/>'
    if pulses:
        out += pulse(mid, 1.7, 0) + pulse(mid, 1.7, -0.85)
    return out


def plug(cx, cy, u, v):
    """Connector housing where a cable lands on a slab, with a status LED."""
    return (box(cx, cy, u - 0.1, u + 0.1, v - 0.07, v + 0.07, 0.4, 6, "plug")
            + f'<circle class="hv-led" cx="{P(cx, cy, u + 0.05, v + 0.07, 3)[0]:.1f}" cy="{P(cx, cy, u + 0.05, v + 0.07, 3)[1]:.1f}" r="1.3"/>')


def riser(i):
    """Cable bundles from layer i (above) down to layer i+1, with travelling data pulses."""
    cx1, cy1, cx2, cy2 = CX[i], CY[i], CX[i + 1], CY[i + 1]
    out = ""
    # right-hand bundle: leaves the right face of the upper slab, loops out and lands on the slab below
    s0 = P(cx1, cy1, 1.0, 0.35, -T / 2)
    e0 = P(cx2, cy2, 0.72, 0.42, 4)
    out += cable(s0, (s0[0] + 26, s0[1] + 6), (e0[0] + 34, e0[1] - 30), e0)
    # left-hand bundle: leaves the left face and drops onto the slab below
    s1 = P(cx1, cy1, -0.35, 1.0, -T / 2)
    e1 = P(cx2, cy2, -0.55, 0.62, 4)
    out += cable(s1, (s1[0] - 8, s1[1] + 20), (e1[0] - 22, e1[1] - 26), e1, n=4)
    return out


def plugs(i):
    if i == 0:
        return ""
    cx, cy = CX[i], CY[i]
    return plug(cx, cy, 0.72, 0.42) + plug(cx, cy, -0.55, 0.62)


DEFS = """<defs>
<linearGradient id="hv-g-slab-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-side-a)"/><stop offset="1" style="stop-color:var(--hv-side-b)"/></linearGradient>
<linearGradient id="hv-g-slab-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-side-b)"/><stop offset="1" style="stop-color:var(--hv-side-c)"/></linearGradient>
<linearGradient id="hv-g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" style="stop-color:var(--hv-glass-a)"/><stop offset="1" style="stop-color:var(--hv-glass-b)"/></linearGradient>
<linearGradient id="hv-g-sheen" x1="0" y1="0" x2="1" y2="0.6"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/><stop offset="0.7" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#fff" stop-opacity="0.08"/></linearGradient>
<linearGradient id="hv-g-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3f4b"/><stop offset="1" stop-color="#15181e"/></linearGradient>
<linearGradient id="hv-g-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e8ecf1"/><stop offset="0.5" stop-color="#9aa3af"/><stop offset="1" stop-color="#cfd5dd"/></linearGradient>
<linearGradient id="hv-g-art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
<linearGradient id="hv-g-reflect" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="hv-g-ao"><stop offset="0.55" stop-color="#000" stop-opacity="0.4"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="hv-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="9"/></filter>
<filter id="hv-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="1.6" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>"""

body = ""
for i in range(4, -1, -1):            # paint the bottom layer first
    g = f'<g class="hv-layer hv-l{i + 1}">' + slab(i) + objects(i) + plugs(i) + "</g>"
    if i < 4:
        g = f'<g class="hv-l{i + 1}">{riser(i)}</g>' + g
    body += g

print(f'<svg class="hero-art" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">{DEFS}{body}</svg>')
