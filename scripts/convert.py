"""Convert X11 Xcursor themes to Windows .cur/.ani + preview assets."""
import struct, json, sys, os, io
from pathlib import Path
from PIL import Image

EX = Path("ex"); OUT = Path("themes")

def read_xcursor(p):
    d = p.read_bytes()
    if d[:4] != b"Xcur": return None
    hsize, ver, ntoc = struct.unpack_from("<III", d, 4)
    imgs = []
    for i in range(ntoc):
        typ, sub, pos = struct.unpack_from("<III", d, hsize + i * 12)
        if typ != 0xFFFD0002: continue
        _, _, _, _, w, h, xh, yh, delay = struct.unpack_from("<IIIIIIIII", d, pos)
        px = d[pos + 36: pos + 36 + w * h * 4]
        im = Image.frombuffer("RGBa", (w, h), px, "raw", "BGRa", 0, 1).convert("RGBA")
        imgs.append(dict(size=sub, img=im, hx=xh, hy=yh, delay=delay))
    by = {}
    for im in imgs: by.setdefault(im["size"], []).append(im)
    return by  # size -> frames

def cur_bytes(entries):
    """entries: list of (RGBA image, hx, hy). 32-bit DIB .cur, multi-size."""
    hdr = struct.pack("<HHH", 0, 2, len(entries)); dirs = b""; blobs = b""
    off = 6 + 16 * len(entries)
    for im, hx, hy in entries:
        w, h = im.size
        bgra = im.transpose(Image.FLIP_TOP_BOTTOM).tobytes("raw", "BGRA")
        maskrow = ((w + 31) // 32) * 4
        bih = struct.pack("<IiiHHIIiiII", 40, w, h * 2, 1, 32, 0, len(bgra) + maskrow * h, 0, 0, 0, 0)
        blob = bih + bgra + b"\0" * (maskrow * h)
        dirs += struct.pack("<BBBBHHII", w % 256, h % 256, 0, 0, hx, hy, len(blob), off)
        blobs += blob; off += len(blob)
    return hdr + dirs + blobs

def chunk(cid, data):
    return cid + struct.pack("<I", len(data)) + data + (b"\0" if len(data) % 2 else b"")

def ani_bytes(frames_by_size, sizes):
    n = len(frames_by_size[sizes[0]])
    icons = b""
    rates = []
    for i in range(n):
        ent = []
        for s in sizes:
            f = frames_by_size[s][i % len(frames_by_size[s])]
            ent.append((f["img"], f["hx"], f["hy"]))
        icons += chunk(b"icon", cur_bytes(ent))
        rates.append(max(1, round(frames_by_size[sizes[0]][i]["delay"] * 60 / 1000)))
    anih = struct.pack("<IIIIIIIII", 36, n, n, 0, 0, 0, 0, rates[0], 1)
    body = b"ACON" + chunk(b"anih", anih) + chunk(b"rate", struct.pack(f"<{n}I", *rates)) + chunk(b"LIST", b"fram" + icons)
    return b"RIFF" + struct.pack("<I", len(body)) + body

ROLES = {  # Windows registry value -> xcursor candidates
 "Arrow": ["default", "left_ptr", "arrow"],
 "Help": ["help", "question_arrow", "left_ptr_help", "whats_this"],
 "AppStarting": ["progress", "left_ptr_watch", "half-busy"],
 "Wait": ["wait", "watch"],
 "Crosshair": ["crosshair", "cross", "tcross"],
 "IBeam": ["text", "xterm", "ibeam"],
 "NWPen": ["pencil", "draft", "draft_large", "text", "xterm"],
 "No": ["not-allowed", "forbidden", "crossed_circle", "circle", "no-drop"],
 "SizeNS": ["ns-resize", "size_ver", "sb_v_double_arrow", "v_double_arrow", "row-resize"],
 "SizeWE": ["ew-resize", "size_hor", "sb_h_double_arrow", "h_double_arrow", "col-resize"],
 "SizeNWSE": ["nwse-resize", "size_fdiag", "fd_double_arrow", "bottom_right_corner"],
 "SizeNESW": ["nesw-resize", "size_bdiag", "bd_double_arrow", "bottom_left_corner"],
 "SizeAll": ["size_all", "fleur", "all-scroll", "all-resize", "move"],
 "UpArrow": ["up-arrow", "center_ptr", "sb_up_arrow", "default", "left_ptr"],
 "Hand": ["pointer", "hand2", "pointing_hand", "hand1", "hand"],
 "Pin": ["default", "left_ptr"],
 "Person": ["default", "left_ptr"],
}
WANT = [32, 48, 64, 96, 128]

def convert(src, tid):
    cd = src / "cursors"; out = OUT / tid
    dirs = [cd]
    it = src / "index.theme"
    if it.exists():
        for line in it.read_text(errors="ignore").splitlines():
            if line.lower().startswith("inherits"):
                for n in line.split("=", 1)[1].split(","):
                    p = src.parent / n.strip() / "cursors"
                    if p.exists(): dirs.append(p)
    (out / "cur").mkdir(parents=True, exist_ok=True); (out / "pv").mkdir(exist_ok=True)
    info = {}
    for role, cands in ROLES.items():
        f = next((d / c for d in dirs for c in cands if (d / c).exists()), None)
        if not f: print("  missing", tid, role); continue
        by = read_xcursor(f.resolve())
        sizes = sorted(by)
        pick = [s for s in WANT if s in by] or sizes[-3:]
        anim = len(by[sizes[0]]) > 1
        if anim:
            asz = [s for s in pick if s <= 64] or pick[:1]
            data = ani_bytes(by, asz); name = role + ".ani"
        else:
            data = cur_bytes([(by[s][0]["img"], by[s][0]["hx"], by[s][0]["hy"]) for s in pick]); name = role + ".cur"
        (out / "cur" / name).write_bytes(data)
        # preview: ~64px frame(s) + 32-48px css cursor png w/ hotspot
        ps = min(sizes, key=lambda s: abs(s - 64)); frames = by[ps]
        if anim:
            ims = [fr["img"] for fr in frames]
            ims[0].save(out / "pv" / f"{role}.webp", save_all=True, append_images=ims[1:],
                        duration=[max(20, fr["delay"]) for fr in frames], loop=0, lossless=True)
        else:
            frames[0]["img"].save(out / "pv" / f"{role}.webp", lossless=True)
        cs = 48 if 48 in by else min(sizes, key=lambda s: abs(s - 48)); c0 = by[cs][0]
        c0["img"].save(out / "pv" / f"{role}.png")
        info[role] = dict(file=name, anim=anim, hx=c0["hx"], hy=c0["hy"], css=c0["img"].size[0])
    return info

if __name__ == "__main__":
    cat = json.load(open(sys.argv[1]))
    for t in cat:
        print("->", t["id"], flush=True)
        t["roles"] = convert(EX / t["src"], t["id"])
    json.dump(cat, open(Path("catalog.json"), "w"), indent=1, ensure_ascii=False)
