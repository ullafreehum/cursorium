import json, re
from pathlib import Path
EX = Path("ex")
base = json.load(open(Path(__file__).with_name("catalog_in.json")))
FAM = [("bibata-rainbow","Bibata Rainbow"),("bibata","Bibata"),("breezex","BreezeX"),("rose-pine","Rosé Pine"),("banana","Banana"),("fuchsia","Fuchsia"),
       ("googledot","GoogleDot"),("xcursor","XCursor Pro"),("phinger","Phinger"),("catppuccin","Catppuccin"),("dracula","Dracula"),("nordzy","Nordzy"),("capitaine","Capitaine")]
extra = [
 {"id":"breezex-dark","name":"BreezeX Dark","src":"ful1e5__BreezeX_Cursor/BreezeX-Dark","tags":["Dark","Minimal","KDE"],"accent":"#2a2d33","repo":"ful1e5/BreezeX_Cursor","license":"GPL-3.0","blurb":"BreezeX with a dark fill and light outline."},
 {"id":"capitaine-nord","name":"Capitaine Nord","src":"sainnhe__capitaine-cursors/Capitaine Cursors (Nord)","tags":["Dark","Theme","Mac-like"],"accent":"#5e81ac","repo":"sainnhe/capitaine-cursors","license":"LGPL-3.0","blurb":"Capitaine in cool Nord slate."},
 {"id":"capitaine-nord-white","name":"Capitaine Nord White","src":"sainnhe__capitaine-cursors/Capitaine Cursors (Nord) - White","tags":["Light","Theme","Mac-like"],"accent":"#d8dee9","repo":"sainnhe/capitaine-cursors","license":"LGPL-3.0","blurb":"Snowy Nord white Capitaine."},
 {"id":"capitaine-gruvbox-white","name":"Capitaine Gruvbox White","src":"sainnhe__capitaine-cursors/Capitaine Cursors (Gruvbox) - White","tags":["Light","Retro","Theme"],"accent":"#ebdbb2","repo":"sainnhe/capitaine-cursors","license":"LGPL-3.0","blurb":"Warm gruvbox cream."},
 {"id":"capitaine-palenight-white","name":"Capitaine Palenight White","src":"sainnhe__capitaine-cursors/Capitaine Cursors (Palenight) - White","tags":["Light","Pastel","Theme"],"accent":"#e2d7f5","repo":"sainnhe/capitaine-cursors","license":"LGPL-3.0","blurb":"Pale lavender-white Capitaine."},
 {"id":"bibata-rainbow-modern","name":"Bibata Rainbow Modern","src":"ful1e5__Bibata_Cursor_Rainbow/Bibata-Rainbow-Modern","tags":["Colorful","Playful","Rounded","Animated"],"accent":"#ff5ea8","repo":"ful1e5/Bibata_Cursor_Rainbow","license":"GPL-3.0","blurb":"Rounded Bibata with a rainbow that cycles through every pointer. Animated everywhere."},
 {"id":"bibata-rainbow-original","name":"Bibata Rainbow Original","src":"ful1e5__Bibata_Cursor_Rainbow/Bibata-Rainbow-Original","tags":["Colorful","Playful","Sharp","Animated"],"accent":"#5ec8ff","repo":"ful1e5/Bibata_Cursor_Rainbow","license":"GPL-3.0","blurb":"Sharp Bibata with animated rainbow gradients."},
 {"id":"googledot-white","name":"GoogleDot White","src":"ful1e5__Google_Cursor/GoogleDot-White","tags":["Light","Material","Rounded"],"accent":"#f1f3f4","repo":"ful1e5/Google_Cursor","license":"GPL-3.0","blurb":"Clean white GoogleDot."},
 {"id":"xcursor-pro-light","name":"XCursor Pro Light","src":"ful1e5__XCursor-pro/XCursor-Pro-Light","tags":["Light","Modern","Sharp"],"accent":"#f5f5f5","repo":"ful1e5/XCursor-pro","license":"GPL-3.0","blurb":"XCursor Pro in white."},
 {"id":"nordzy-white","name":"Nordzy White","src":"guillaumeboehm__Nordzy-cursors/@NORDZYWHITE","tags":["Light","Theme","Minimal"],"accent":"#eceff4","repo":"guillaumeboehm/Nordzy-cursors","license":"GPL-3.0","blurb":"Nordzy flipped to snow white."},
]
LEFT = [
 ("bibata-modern-classic-left","Bibata Modern Classic · Left-handed","ful1e5__Bibata_Cursor/Bibata-Modern-Classic-Right","#1d1d1f","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
 ("bibata-modern-ice-left","Bibata Modern Ice · Left-handed","ful1e5__Bibata_Cursor/Bibata-Modern-Ice-Right","#e8eef5","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
 ("bibata-modern-amber-left","Bibata Modern Amber · Left-handed","ful1e5__Bibata_Cursor/Bibata-Modern-Amber-Right","#ff8300","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
 ("phinger-dark-left","Phinger Dark · Left-handed","phisch__phinger-cursors/phinger-cursors-dark-left","#353535","Phinger","CC-BY-SA-4.0","phisch/phinger-cursors"),
 ("phinger-light-left","Phinger Light · Left-handed","phisch__phinger-cursors/phinger-cursors-light-left","#f0f0f0","Phinger","CC-BY-SA-4.0","phisch/phinger-cursors"),
 ("bibata-original-ice-left","Bibata Original Ice · Left-handed","ful1e5__Bibata_Cursor/Bibata-Original-Ice-Right","#f4f4f4","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
 ("bibata-original-amber-left","Bibata Original Amber · Left-handed","ful1e5__Bibata_Cursor/Bibata-Original-Amber-Right","#ffa000","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
 ("bibata-original-classic-left","Bibata Original Classic · Left-handed","ful1e5__Bibata_Cursor/Bibata-Original-Classic-Right","#202020","Bibata","GPL-3.0","ful1e5/Bibata_Cursor"),
]
PAL = {
 "latte":{"rosewater":"dc8a78","flamingo":"dd7878","pink":"ea76cb","mauve":"8839ef","red":"d20f39","maroon":"e64553","peach":"fe640b","yellow":"df8e1d","green":"40a02b","teal":"179299","sky":"04a5e5","sapphire":"209fb5","blue":"1e66f5","lavender":"7287fd","dark":"4c4f69","light":"eff1f5"},
 "frappe":{"rosewater":"f2d5cf","flamingo":"eebebe","pink":"f4b8e4","mauve":"ca9ee6","red":"e78284","maroon":"ea999c","peach":"ef9f76","yellow":"e5c890","green":"a6d189","teal":"81c8be","sky":"99d1db","sapphire":"85c1dc","blue":"8caaee","lavender":"babbf1","dark":"303446","light":"c6d0f5"},
 "macchiato":{"rosewater":"f4dbd6","flamingo":"f0c6c6","pink":"f5bde6","mauve":"c6a0f6","red":"ed8796","maroon":"ee99a0","peach":"f5a97f","yellow":"eed49f","green":"a6da95","teal":"8bd5ca","sky":"91d7e3","sapphire":"7dc4e4","blue":"8aadf4","lavender":"b7bdf8","dark":"24273a","light":"cad3f5"},
 "mocha":{"rosewater":"f5e0dc","flamingo":"f2cdcd","pink":"f5c2e7","mauve":"cba6f7","red":"f38ba8","maroon":"eba0ac","peach":"fab387","yellow":"f9e2af","green":"a6e3a1","teal":"94e2d5","sky":"89dceb","sapphire":"74c7ec","blue":"89b4fa","lavender":"b4befe","dark":"1e1e2e","light":"cdd6f4"}}
FLNAME = {"latte":"Latte","frappe":"Frappé","macchiato":"Macchiato","mocha":"Mocha"}
FLDESC = {"latte":"light latte","frappe":"muted frappé","macchiato":"deep macchiato","mocha":"darkest mocha"}

def fam(i):
    return next(n for p, n in FAM if i.startswith(p))

out = []
for t in base + extra:
    t = dict(t)
    if "@NORDZYWHITE" in t["src"]:
        cands = [p.parent for p in (EX/"guillaumeboehm__Nordzy-cursors").rglob("cursors") if "white" in str(p).lower()]
        if not cands: continue
        t["src"] = str(cands[0].relative_to(EX))
    if not (EX / t["src"] / "cursors").exists(): print("skip", t["id"]); continue
    t["family"] = fam(t["id"]); out.append(t)
have = {t["id"] for t in out}
for d in sorted((EX/"catppuccin__cursors").glob("catppuccin-*-cursors")):
    m = re.match(r"catppuccin-(\w+)-(\w+)-cursors", d.name); f, a = m.groups()
    tid = f"catppuccin-{f}-{a}"
    if tid in have or not (d/"cursors").exists(): continue
    lightflavour = f == "latte"
    tags = ["Light" if (lightflavour and a != "dark") or a == "light" else "Dark", "Pastel", "Theme"]
    out.append({"id": tid, "name": f"Catppuccin {FLNAME[f]} {a.title()}", "src": str(d.relative_to(EX)), "tags": tags,
                "accent": "#" + PAL[f][a], "repo": "catppuccin/cursors", "license": "GPL-2.0", "family": "Catppuccin",
                "blurb": f"Catppuccin's {FLDESC[f]} flavour with a {a} accent."})
for tid, name, src, acc, famname, lic, repo in LEFT:
    if len(out) >= 100: break
    out.append({"id": tid, "name": name, "src": src, "tags": ["Left-handed", "Dark" if acc < "#8" else "Light"], "accent": acc, "repo": repo,
                "license": lic, "family": famname, "blurb": "Mirrored for left-handed mouse users: the hotspot sits on the right tip."})
# keep existing catppuccin names consistent
for t in out:
    if t["id"].startswith("catppuccin-") and t["id"] in {"catppuccin-mocha-mauve","catppuccin-mocha-dark","catppuccin-latte-peach","catppuccin-frappe-blue","catppuccin-macchiato-green"}:
        f, a = t["id"].split("-")[1:3]; t["name"] = f"Catppuccin {FLNAME[f]} {a.title()}"
out = out[:100]
print(len(out), {f: sum(1 for t in out if t["family"] == f) for f in sorted({t["family"] for t in out})})
json.dump(out, open(Path(__file__).with_name("catalog_in2.json"), "w"), indent=1, ensure_ascii=False)
