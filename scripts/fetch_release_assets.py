"""Download the cursor theme release assets listed in sources.json, politely (10 s apart, identified bot)."""
import sys, json
from pathlib import Path
from urllib.robotparser import RobotFileParser
from polite import PoliteClient, PoliteStop, save_raw
RAW = Path(sys.argv[1])
# (repo, [candidate asset names in order]) — first that returns 200 wins
C = [(r, [n]) for r, n in json.load(open(Path(__file__).with_name("sources.json")))]
c = PoliteClient("https://github.com", max_requests=80)
# The original build ran behind a proxy that blocked robots.txt, so it was skipped there with the
# user's approval. Left enabled here: robots.txt is read and obeyed.
log = []
try:
    for repo, names in C:
        for n in names:
            dest = RAW / repo.replace("/", "__") / n
            if dest.exists(): break
            r = c.get(f"/{repo}/releases/latest/download/{n}")
            print(repo, n, r.status, len(r.body or b""), flush=True)
            log.append([repo, n, r.status])
            if r.status == 200 and len(r.body) > 1000:
                save_raw(r, dest, note=f"{repo} latest release asset"); break
except PoliteStop as e:
    print("STOP:", e, flush=True)
print("requests used:", c.count, flush=True)
json.dump(log, open(RAW / "fetch_log.json", "w"), indent=1)
