"""Polite Scrapling client: robots.txt, identified UA, >=10 s gap, stop on 429/5xx, provenance."""
import hashlib, json, time
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin, urlsplit
from urllib.robotparser import RobotFileParser
from scrapling.fetchers import Fetcher

UA = "CursorPickerResearchBot/0.1 (non-commercial; personal cursor collection; contact: {contact})"

class PoliteStop(RuntimeError):
    pass

class PoliteClient:
    def __init__(self, base_url, contact="https://github.com/ullafreehum/cursorium", min_delay=10.0,
                 max_requests=50, timeout=90):
        if "@" not in contact and not contact.startswith("https://"):
            raise ValueError("contact must be an email or https:// URL")
        p = urlsplit(base_url)
        self.root = f"{p.scheme}://{p.netloc}"
        self.ua = UA.format(contact=contact)
        self.min_delay = max(float(min_delay), 10.0)
        self.max_requests, self.timeout = max_requests, timeout
        self.count, self._last, self._rp = 0, 0.0, None

    def _request(self, method, url, **kw):
        if self.count >= self.max_requests:
            raise PoliteStop(f"request cap {self.max_requests} reached")
        wait = self.min_delay - (time.monotonic() - self._last)
        if wait > 0:
            time.sleep(wait)
        self._last = time.monotonic(); self.count += 1
        extra = {k: v for k, v in kw.pop("headers", {}).items()
                 if k.lower() not in ("user-agent", "referer")}
        call = Fetcher.get if method == "GET" else Fetcher.post
        return call(url, headers={"User-Agent": self.ua, **extra},
                    stealthy_headers=False, impersonate=None,
                    follow_redirects=True, timeout=self.timeout, retries=1, **kw)

    def robots(self):
        if self._rp is None:
            url = self.root + "/robots.txt"
            try:
                r = self._request("GET", url)
            except Exception as e:
                raise PoliteStop(f"cannot read {url} ({e}); fetching nothing") from e
            rp = RobotFileParser()
            ctype = ((r.headers or {}).get("content-type") or "").lower()
            if r.status == 404 or (r.status < 400 and "html" in ctype):
                rp.parse([])
            elif r.status >= 400:
                raise PoliteStop(f"{url} returned {r.status}; treating site as off limits")
            else:
                rp.parse(r.body.decode("utf-8", "replace").splitlines())
            self._rp = rp
        return self._rp

    def get(self, url, **kw):  return self._checked("GET", url, **kw)

    def _checked(self, method, url, **kw):
        url = urljoin(self.root + "/", url)
        if urlsplit(url).netloc != urlsplit(self.root).netloc:
            raise PoliteStop(f"{url} is outside {self.root}")
        if not self.robots().can_fetch(self.ua, url):
            raise PoliteStop(f"robots.txt disallows {url}")
        r = self._request(method, url, **kw)
        if r.status == 429 or r.status >= 500:
            raise PoliteStop(f"{url} returned {r.status}; stopping")
        if r.status in (401, 403):
            raise PoliteStop(f"{url} returned {r.status}; the site is refusing the bot. Stop, do not bypass")
        return r

def save_raw(resp, dest, note=""):
    dest = Path(dest)
    if dest.exists():
        raise FileExistsError(f"{dest} exists; raw files are never overwritten")
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(resp.body)
    dest.with_name(dest.name + ".kaynak.json").write_text(json.dumps({
        "url": resp.url, "status": resp.status,
        "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sha256": hashlib.sha256(resp.body).hexdigest(), "bytes": len(resp.body),
        "content_type": (resp.headers or {}).get("content-type"), "note": note,
    }, ensure_ascii=False, indent=2), encoding="utf-8")
    return dest
