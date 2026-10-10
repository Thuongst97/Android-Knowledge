# Generates the isometric hero illustration for aaos14-academy/index.html.
# Run: python3 tools/hero-art.py > art.svg, then paste it over <svg class="hero-art"> in index.html.
# Colors come from the --hv-* tokens in main.css, so the same SVG works in light and dark mode.
#
# Concept: the software stack (L1-L4) floats as holographic glass panes above the one physical
# board it runs on (L5): the head unit's SoC, the vehicle MCU and the CAN transceivers. A light
# column rises from the SoC through every pane up to the AVN display, and the MCU talks to the
# car through a real wiring harness.
#
# Geometry: everything sits on an isometric grid. Flat detail (tiles, labels, PCB traces, the
# AVN UI) is drawn in plain 2D and mapped onto its surface with an affine matrix.

A, B = 140, 53                 # pane half-width and half-depth on screen (a flat, wide iso)
W, H = 400, 626
CX = [208, 204, 208, 204, 208]
CY = [168, 260, 352, 444, 536]  # L1 .. L5 top-face centres; pitch 92 matches the cards
PANE_T, BOARD_T = 4, 15
COL_U, COL_V = 0.42, -0.52      # where the SoC light column rises (plane coords 142, 48)


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


def uv(X, Y):
    """Plane coordinates (0..200) of a pane to iso u, v."""
    return -1 + X / 100, -1 + Y / 100


def box(cx, cy, u0, u1, v0, v1, z0, z1, mat, top=True):
    left = [P(cx, cy, u0, v1, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u0, v1, z0)]
    right = [P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u1, v1, z0), P(cx, cy, u1, v0, z0)]
    s = f'<g class="m-{mat}"><polygon class="f-l" points="{pts(left)}"/><polygon class="f-r" points="{pts(right)}"/>'
    if top:
        tp = [P(cx, cy, u0, v0, z1), P(cx, cy, u1, v0, z1), P(cx, cy, u1, v1, z1), P(cx, cy, u0, v1, z1)]
        s += f'<polygon class="f-t" points="{pts(tp)}"/>'
    return s + "</g>"


def boxp(cx, cy, X0, Y0, X1, Y1, z0, z1, mat, top=True):
    (u0, v0), (u1, v1) = uv(X0, Y0), uv(X1, Y1)
    return box(cx, cy, u0, u1, v0, v1, z0, z1, mat, top)


def path_d(points):
    return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in points)


def pulse(d, dur, delay, cls="hv-pulse"):
    return f'<circle class="{cls}" r="2" style="offset-path:path(\'{d}\');animation-duration:{dur}s;animation-delay:{delay}s"/>'


def rim(cx, cy, z=0):
    return f'<path class="hv-rim" d="{path_d([P(cx, cy, -1, 0.96, z), P(cx, cy, -0.96, 1, z), P(cx, cy, 0.96, 1, z), P(cx, cy, 1, 0.96, z), P(cx, cy, 1, -0.96, z)])}"/>'


# ------------------------------------------------------------------ software panes (L1-L4)
TILE_H = 3.5


def tile(X0, Y0, X1, Y1, title, sub="", icon=""):
    """Top face of a software module tile, in pane plane coordinates."""
    w = X1 - X0
    s = f'<rect class="sw-tile" x="{X0}" y="{Y0}" width="{w}" height="{Y1 - Y0}" rx="7"/>'
    s += f'<rect class="sw-tile-bar" x="{X0 + 7}" y="{Y0 + 7}" width="{min(22, w - 14)}" height="3" rx="1.5"/>'
    size = min(13, (w - 14) / (len(title) * 0.6))     # shrink long names to fit the tile
    s += f'<text class="sw-label" x="{X0 + 8}" y="{Y0 + 25}" style="font-size:{size:.1f}px">{title}</text>'
    if sub:
        s += f'<text class="sw-sub" x="{X0 + 8}" y="{Y0 + 37}">{sub}</text>'
    if icon:
        s += icon
    return s


def pane(i, tiles, extra_top="", label=""):
    """A glass pane with extruded module tiles; tiles = [(X0, Y0, X1, Y1, title, sub, icon)]."""
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, -PANE_T - 6, -1.08, 1.08, -1.08, 1.08)}"><rect class="hv-underglow" width="200" height="200" rx="44"/></g>'
    s += box(cx, cy, -1, 1, -1, 1, -PANE_T, 0, "pane", top=False)
    s += f'<g transform="{plane(cx, cy, 0)}">'
    s += '<rect class="sw-glass" width="200" height="200" rx="8"/>'
    s += "".join(f'<path class="sw-grid" d="M{k},4 V196 M4,{k} H196"/>' for k in range(25, 200, 25))
    s += '<rect class="sw-sheen" width="200" height="200" rx="8"/>'
    s += extra_top
    s += f'<text class="hv-engrave" x="10" y="193">{label}</text></g>'
    for X0, Y0, X1, Y1, *_ in tiles:
        s += boxp(cx, cy, X0, Y0, X1, Y1, 0, TILE_H, "tile", top=False)
    s += f'<g transform="{plane(cx, cy, TILE_H)}">' + "".join(tile(*t) for t in tiles) + "</g>"
    s += rim(cx, cy)
    return s


def app_icon(x, y, kind):
    c = {"nav": "a1", "hvac": "a5", "media": "a3", "cluster": "a2"}[kind]
    return f'<circle class="sw-ico {c}" cx="{x}" cy="{y}" r="7"/>'


def layer1():
    tiles = [
        (14, 14, 70, 66, "Launcher", "apps", app_icon(58, 52, "nav")),
        (14, 82, 70, 134, "HVAC", "climate", app_icon(58, 120, "hvac")),
        (84, 82, 140, 134, "Media", "audio", app_icon(128, 120, "media")),
        (154, 82, 190, 180, "Cluster", "", app_icon(172, 160, "cluster")),
        (14, 148, 140, 180, "SystemUI · CarUiLib", "", ""),
    ]
    return pane(0, tiles, label="L1 · APPLICATIONS")


def layer2():
    inner = "".join(
        f'<rect class="sw-chip" x="{x}" y="{y}" width="40" height="17" rx="4"/><text class="sw-chip-t" x="{x + 20}" y="{y + 11.5}" text-anchor="middle">{t}</text>'
        for x, y, t in ((22, 52, "Property"), (68, 52, "Audio"), (22, 74, "Power"), (68, 74, "User")))
    tiles = [
        (14, 14, 118, 104, "CarService", "car services", inner),
        (14, 120, 118, 180, "Car API", "CarPropertyManager", ""),
        (160, 100, 190, 180, "SDK", "", ""),
    ]
    return pane(1, tiles, label="L2 · CAR API · FRAMEWORK")


def layer3():
    cx, cy = CX[2], CY[2]
    top = ('<path class="sw-boundary" d="M118,6 V194"/>'
           '<text class="sw-zone" x="12" y="20">SYSTEM</text><text class="sw-zone" x="188" y="20" text-anchor="end">VENDOR</text>'
           '<text class="sw-zone c" x="112" y="104" text-anchor="end">BINDER</text>'
           '<path class="sw-lane" d="M10,92 H190 M10,112 H190"/>')
    tiles = [(76, 128, 160, 176, "IVehicle.aidl", "stable AIDL · V2", "")]
    s = pane(2, tiles, top, "L3 · SYSTEM IPC · AIDL")
    # Binder transactions crossing the Treble boundary, both ways
    for Y, rev, delay in ((92, False, 0), (112, True, -1.1)):
        a_, b_ = P(cx, cy, *uv(14, Y), 1.5), P(cx, cy, *uv(186, Y), 1.5)
        d = path_d([b_, a_] if rev else [a_, b_])
        s += pulse(d, 2.2, delay, "hv-packet") + pulse(d, 2.2, delay - 1.1, "hv-packet")
    return s


def layer4():
    tiles = [
        (14, 14, 112, 70, "VHAL", "DefaultVehicleHal", ""),
        (14, 86, 112, 136, "IVehicleHardware", "OEM implementation", ""),
        (126, 96, 190, 180, "Bus I/O", "SPI · CAN", ""),
        (14, 150, 112, 180, "hal_vehicle · SEPolicy", "", ""),
    ]
    return pane(3, tiles, label="L4 · VEHICLE HAL · /vendor")


# ------------------------------------------------------------------ hardware board (L5)
def chip(cx, cy, X0, Y0, X1, Y1, h, label, sub="", legs=True, cls="chip"):
    (u0, v0), (u1, v1) = uv(X0, Y0), uv(X1, Y1)
    s = f'<g transform="{plane(cx, cy, 0.3, u0 - 0.08, u1 + 0.08, v0 - 0.08, v1 + 0.08)}"><rect class="hv-ao" width="200" height="200" rx="30"/></g>'
    if legs:
        n = max(3, int((u1 - u0) * 10))
        for k in range(n):
            t = u0 + (k + 0.5) * (u1 - u0) / n
            s += box(cx, cy, t - 0.016, t + 0.016, v1, v1 + 0.06, 0, 1.4, "leg")
        n = max(3, int((v1 - v0) * 10))
        for k in range(n):
            t = v0 + (k + 0.5) * (v1 - v0) / n
            s += box(cx, cy, u1, u1 + 0.06, t - 0.016, t + 0.016, 0, 1.4, "leg")
    s += box(cx, cy, u0, u1, v0, v1, 0, h, cls)
    w = X1 - X0
    s += f'<g transform="{plane(cx, cy, h)}"><circle class="hv-pin1" cx="{X0 + 5}" cy="{Y0 + 5}" r="1.8"/>'
    fs = 15 if w >= 45 else 9
    s += f'<text class="hv-chip-txt" x="{(X0 + X1) / 2}" y="{(Y0 + Y1) / 2 + (1 if sub else 4)}" text-anchor="middle" style="font-size:{fs}px">{label}</text>'
    if sub:
        s += f'<text class="hv-chip-sub" x="{(X0 + X1) / 2}" y="{(Y0 + Y1) / 2 + 13}" text-anchor="middle">{sub}</text>'
    return s + "</g>"


def layer5():
    i = 4
    cx, cy = CX[i], CY[i]
    s = f'<g transform="{plane(cx, cy, -BOARD_T - 10, -1.25, 1.25, -1.25, 1.25)}"><rect class="hv-floor" width="200" height="200" rx="60"/></g>'
    s += f'<g transform="{plane(cx, cy, -BOARD_T - 6, -1.08, 1.08, -1.08, 1.08)}"><rect class="hv-underglow" width="200" height="200" rx="44"/></g>'
    s += box(cx, cy, -1, 1, -1, 1, -BOARD_T, -3, "chassis", top=False)
    s += box(cx, cy, -0.98, 0.98, -0.98, 0.98, -3, 0, "pcb", top=False)
    pcb = '<rect class="hw-pcb" x="2" y="2" width="196" height="196" rx="6"/>'
    # gold traces: SoC <-> MCU (SPI), MCU -> CAN transceivers -> connector, SoC -> Ethernet PHY
    for d in ("M118,52 H84 V100", "M118,62 H90 V100", "M66,128 V156 H96", "M74,128 V146 H126 V156",
              "M108,166 H170", "M140,166 H170", "M150,42 H176 V70", "M150,52 H168 V70"):
        pcb += f'<path class="hw-trace" d="{d}"/>'
    for x, y in ((84, 100), (90, 100), (96, 156), (126, 156), (176, 70), (168, 70)):
        pcb += f'<circle class="hw-via" cx="{x}" cy="{y}" r="2"/>'
    pcb += '<text class="hw-silk" x="92" y="80">SPI</text><text class="hw-silk" x="150" y="160">CAN FD</text>'
    s += f'<g transform="{plane(cx, cy, 0)}">{pcb}<text class="hv-engrave" x="10" y="193">L5 · MCU · VEHICLE BUS · hardware</text></g>'
    # passives
    for X, Y in ((104, 30), (104, 86), (176, 30), (36, 92), (36, 150), (186, 120)):
        s += boxp(cx, cy, X - 3, Y - 2, X + 3, Y + 2, 0, 2.4, "cap")
    s += chip(cx, cy, 118, 18, 166, 66, 7, "SoC", "Android 14")
    s += chip(cx, cy, 40, 88, 92, 128, 6, "MCU", "AUTOSAR")
    s += chip(cx, cy, 96, 150, 120, 174, 4, "CAN", legs=False)
    s += chip(cx, cy, 126, 150, 150, 174, 4, "CAN", legs=False)
    s += chip(cx, cy, 160, 70, 186, 92, 4, "ETH", legs=False)
    # automotive connector on the front-right edge, harness leaving the board
    s += boxp(cx, cy, 170, 150, 196, 190, 0, 9, "plug")
    lx, ly = P(cx, cy, *uv(196, 156), 6)
    s += f'<circle class="hv-led" cx="{lx:.1f}" cy="{ly:.1f}" r="1.4"/>'
    for k in range(6):
        Y = 158 + k * 5.5
        x0, y0 = P(cx, cy, *uv(197, Y), 4.5)
        d = f"M{x0:.1f},{y0:.1f} C{x0 + 24:.1f},{y0 + 8:.1f} {x0 + 34:.1f},{y0 + 26:.1f} {x0 + 46 + k * 3:.1f},{y0 + 58:.1f}"
        s += f'<path class="hv-wire w{k % 5 + 1}" d="{d}"/>'
        if k in (1, 4):
            s += pulse(d, 1.9, -0.6 * k)
    s += rim(cx, cy)
    return s


# ------------------------------------------------------------------ light column (SoC -> display)
def column(i_low, z_low, i_high, z_high, cls=""):
    """Segment of the light column between the top of pane i_low and the underside of pane i_high."""
    (x1, y1) = P(CX[i_low], CY[i_low], COL_U, COL_V, z_low)
    (x2, y2) = P(CX[i_high], CY[i_high], COL_U, COL_V, z_high)
    up = f"M{x1:.1f},{y1:.1f} L{x2:.1f},{y2:.1f}"
    s = f'<path class="hv-col-halo" d="{up}"/><path class="hv-col-core" d="{up}"/>'
    s += pulse(up, 1.2, 0) + pulse(up, 1.2, -0.6)
    s += f'<ellipse class="hv-col-foot" cx="{x1:.1f}" cy="{y1:.1f}" rx="9" ry="4"/>'
    return f'<g class="{cls}">{s}</g>'


# ------------------------------------------------------------------ AVN display (on L1)
SW, SH = 320, 112


def avn():
    cx, cy = CX[0], CY[0]
    u0, du, v0, dv, ztop, zdrop = -1.34, 2.68, -0.78, 0.36, 132, 84
    a = du / SW * A / 2
    b = du / SW * B / 2
    c = -dv / SH * A / 2
    d = dv / SH * B / 2 + zdrop / SH
    e = cx + (u0 - v0) * A / 2
    f = cy + (u0 + v0) * B / 2 - ztop
    m = f"matrix({a:.4f} {b:.4f} {c:.4f} {d:.4f} {e:.1f} {f:.1f})"
    zb = ztop - zdrop
    s = ""
    # slim floating stand: a puck on the pane and a brushed arm into the back of the display
    s += f'<g transform="{plane(cx, cy, 0.4, -0.34, 0.34, -0.74, -0.34)}"><rect class="hv-ao" width="200" height="200" rx="100"/></g>'
    s += box(cx, cy, -0.26, 0.26, -0.66, -0.42, 0, 2.5, "metal")
    s += box(cx, cy, -0.07, 0.07, -0.6, -0.5, 2.5, zb + 22, "metal")
    # housing depth: the back shell stacked a few pixels below the glass
    s += "".join(f'<g transform="translate(0 {k})"><g transform="{m}"><rect class="avn-back" x="-4" y="-4" width="{SW + 8}" height="{SH + 8}" rx="9"/></g></g>'
                 for k in (5, 3.5, 2))
    ui = f'<rect class="avn-frame" x="-4" y="-4" width="{SW + 8}" height="{SH + 8}" rx="9"/>'
    ui += f'<rect class="avn-glass" width="{SW}" height="{SH}" rx="6"/>'
    # status line
    ui += ('<text class="avn-t dim" x="10" y="10">10:24</text>'
           '<text class="avn-t dim" x="160" y="10" text-anchor="middle">D · 24°C outside</text>'
           f'<text class="avn-t dim" x="{SW - 10}" y="10" text-anchor="end">5G</text>')
    # navigation (left third)
    ui += ('<rect class="avn-map" x="6" y="15" width="128" height="76" rx="5"/>'
           '<g class="avn-blocks"><rect x="10" y="19" width="24" height="16" rx="2"/><rect x="42" y="19" width="40" height="16" rx="2"/>'
           '<rect x="90" y="19" width="40" height="16" rx="2"/><rect x="10" y="43" width="24" height="18" rx="2"/><rect x="90" y="43" width="40" height="18" rx="2"/>'
           '<rect x="42" y="69" width="40" height="18" rx="2"/><rect x="90" y="69" width="40" height="18" rx="2"/></g>'
           '<path class="avn-road" d="M6,39 H134 M6,65 H134 M38,15 V91 M86,15 V91"/>'
           '<path class="avn-route-glow" d="M30,91 L38,65 L86,65 L86,39 L112,39 L122,24"/>'
           '<path class="avn-route" d="M30,91 L38,65 L86,65 L86,39 L112,39 L122,24"/>'
           '<path class="avn-car" d="M30,78 l5,9 l-5,-3 l-5,3z"/>'
           '<path class="avn-pin" d="M122,13 a5,5 0 0 1 5,5 c0,4 -5,9 -5,9 c0,0 -5,-5 -5,-9 a5,5 0 0 1 5,-5z"/>'
           '<rect class="avn-card" x="11" y="44" width="23" height="26" rx="4"/>'
           '<path class="avn-turn" d="M17,64 V55 H26 M23,52 L26,55 L23,58"/>'
           '<text class="avn-t big" x="44" y="58">300 m</text><text class="avn-t dim" x="44" y="66">Hai Ba Trung</text>')
    # media (centre)
    ui += ('<rect class="avn-card" x="140" y="15" width="84" height="76" rx="5"/>'
           '<rect class="avn-art" x="147" y="22" width="34" height="34" rx="4"/>'
           '<path class="avn-note" d="M160,47 V31 L171,28 V44"/><circle class="avn-note-h" cx="157" cy="47" r="3"/><circle class="avn-note-h" cx="168" cy="44" r="3"/>'
           '<text class="avn-t" x="186" y="33">Night Drive</text><text class="avn-t dim" x="186" y="41">FM 98.5</text><text class="avn-t dim" x="186" y="49">Zone 1 · Front</text>'
           '<rect class="avn-bar" x="147" y="64" width="70" height="2.5" rx="1"/><rect class="avn-bar on" x="147" y="64" width="44" height="2.5" rx="1"/>'
           '<text class="avn-t ctl" x="182" y="83" text-anchor="middle">⏮   ⏸   ⏭</text>')
    # vehicle (right): car silhouette, range and status
    ui += ('<rect class="avn-card" x="230" y="15" width="84" height="76" rx="5"/>'
           '<path class="avn-carbody" d="M252,52 c0,-8 6,-11 20,-11 c14,0 20,3 20,11 v8 c0,3 -2,5 -5,5 h-30 c-3,0 -5,-2 -5,-5z"/>'
           '<rect class="avn-glasscar" x="258" y="45" width="28" height="6" rx="2"/>'
           '<circle class="avn-wheel" cx="259" cy="65" r="3.5"/><circle class="avn-wheel" cx="285" cy="65" r="3.5"/>'
           '<text class="avn-t big" x="236" y="31">412 km</text><text class="avn-t dim" x="236" y="38">range · Eco</text>'
           '<text class="avn-t dim" x="236" y="85">Doors locked · TPMS OK</text>')
    # climate + dock
    ui += (f'<rect class="avn-dock" y="95" width="{SW}" height="17"/>'
           '<text class="avn-t temp" x="12" y="108">22.0°</text>'
           f'<text class="avn-t temp" x="{SW - 12}" y="108" text-anchor="end">21.5°</text>')
    for k in range(6):
        ui += f'<rect class="avn-ico a{k % 5 + 1}" x="{118 + k * 15}" y="98" width="10" height="10" rx="3"/>'
    ui += f'<path class="avn-reflect" d="M-4,-4 H130 L60,{SH + 4} H-4 Z"/>'
    ui += f'<path class="avn-reflect soft" d="M170,-4 H215 L150,{SH + 4} H105 Z"/>'
    # ambient light strip along the bottom edge
    ui += f'<path class="avn-ambient" d="M14,{SH + 4.5} H{SW - 14}"/>'
    s += f'<g transform="{m}">{ui}</g>'
    return s


DEFS = """<defs>
<linearGradient id="hv-g-chassis-l" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-side-a)"/><stop offset="1" style="stop-color:var(--hv-side-b)"/></linearGradient>
<linearGradient id="hv-g-chassis-r" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--hv-side-b)"/><stop offset="1" style="stop-color:var(--hv-side-c)"/></linearGradient>
<linearGradient id="hv-g-pcb" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1d2a26"/><stop offset="1" stop-color="#0b1210"/></linearGradient>
<linearGradient id="hv-g-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.2"/><stop offset="0.5" stop-color="#fff" stop-opacity="0.05"/><stop offset="1" stop-color="#fff" stop-opacity="0.12"/></linearGradient>
<linearGradient id="hv-g-sheen" x1="0" y1="0" x2="1" y2="0.5"><stop offset="0" stop-color="#fff" stop-opacity="0.3"/><stop offset="0.3" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="hv-g-chip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3b404c"/><stop offset="1" stop-color="#14171c"/></linearGradient>
<linearGradient id="hv-g-metal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f1f4f7"/><stop offset="0.5" stop-color="#a3acb8"/><stop offset="1" stop-color="#d9dee5"/></linearGradient>
<linearGradient id="hv-g-frame" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#d8dde4"/><stop offset="0.45" stop-color="#5c636e"/><stop offset="1" stop-color="#c3c9d1"/></linearGradient>
<linearGradient id="hv-g-screen" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1524"/><stop offset="1" stop-color="#060a12"/></linearGradient>
<linearGradient id="hv-g-art" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#a78bfa"/><stop offset="1" stop-color="#f472b6"/></linearGradient>
<linearGradient id="hv-g-reflect" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="hv-g-ao"><stop offset="0.5" stop-color="#000" stop-opacity="0.45"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<radialGradient id="hv-g-floor"><stop offset="0" stop-color="#000" stop-opacity="0.35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
<filter id="hv-blur" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10"/></filter>
<filter id="hv-soft" x="-50%" y="-10%" width="200%" height="120%"><feGaussianBlur stdDeviation="3"/></filter>
</defs>"""

# paint bottom-up: board, then each pane with the column segment beneath it, then the display
body = f'<g class="hv-l5">{layer5()}</g>'
body += column(4, 7, 3, -PANE_T, "hv-l4")
body += f'<g class="hv-l4">{layer4()}</g>'
body += column(3, 0, 2, -PANE_T, "hv-l3")
body += f'<g class="hv-l3">{layer3()}</g>'
body += column(2, 0, 1, -PANE_T, "hv-l2")
body += f'<g class="hv-l2">{layer2()}</g>'
body += column(1, 0, 0, -PANE_T, "hv-l1")
body += f'<g class="hv-l1">{layer1()}{column(0, 0, 0, 44)}{avn()}</g>'

print(f'<svg class="hero-art" viewBox="0 0 {W} {H}" aria-hidden="true" focusable="false">{DEFS}{body}</svg>')
