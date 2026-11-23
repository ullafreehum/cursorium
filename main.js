const { app, BrowserWindow, ipcMain, shell, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');

const ROOT = __dirname;
const UNPACKED = ROOT.replace(/app\.asar$/, 'app.asar.unpacked');
const ROLES = ['Arrow','Help','AppStarting','Wait','Crosshair','IBeam','NWPen','No','SizeNS','SizeWE','SizeNWSE','SizeNESW','SizeAll','UpArrow','Hand','Pin','Person'];
const WIN_DEFAULT = {
  scheme: 'Windows Default',
  Arrow: '%SystemRoot%\\cursors\\aero_arrow.cur', Help: '%SystemRoot%\\cursors\\aero_helpsel.cur',
  AppStarting: '%SystemRoot%\\cursors\\aero_working.ani', Wait: '%SystemRoot%\\cursors\\aero_busy.ani',
  Crosshair: '', IBeam: '', NWPen: '%SystemRoot%\\cursors\\aero_pen.cur', No: '%SystemRoot%\\cursors\\aero_unavail.cur',
  SizeNS: '%SystemRoot%\\cursors\\aero_ns.cur', SizeWE: '%SystemRoot%\\cursors\\aero_ew.cur',
  SizeNWSE: '%SystemRoot%\\cursors\\aero_nwse.cur', SizeNESW: '%SystemRoot%\\cursors\\aero_nesw.cur',
  SizeAll: '%SystemRoot%\\cursors\\aero_move.cur', UpArrow: '%SystemRoot%\\cursors\\aero_up.cur',
  Hand: '%SystemRoot%\\cursors\\aero_link.cur', Pin: '%SystemRoot%\\cursors\\aero_pin.cur',
  Person: '%SystemRoot%\\cursors\\aero_person.cur',
};

const userDir = () => app.getPath('userData');
const statePath = () => path.join(userDir(), 'state.json');
const backupPath = () => path.join(userDir(), 'backup.json');

function ps(spec) {
  return new Promise((resolve, reject) => {
    if (process.platform !== 'win32') return resolve({ ok: false, demo: true });
    const f = path.join(os.tmpdir(), `cursorium-${Date.now()}-${Math.random().toString(36).slice(2)}.json`);
    fs.writeFileSync(f, JSON.stringify(spec), 'utf8');
    execFile('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(UNPACKED, 'apply.ps1'), '-Spec', f],
      { windowsHide: true, timeout: 60000 }, (err, stdout, stderr) => {
        fs.rm(f, () => {});
        if (err) return reject(new Error((stderr || err.message).trim().split('\n').slice(-3).join(' ')));
        try { resolve(JSON.parse(stdout.trim() || '{}')); } catch { resolve({ raw: stdout }); }
      });
  });
}

async function ensureBackup() {
  if (fs.existsSync(backupPath())) return;
  try {
    const cur = await ps({ action: 'read' });
    if (cur && cur.scheme !== undefined) fs.writeFileSync(backupPath(), JSON.stringify(cur, null, 1));
  } catch { /* best effort */ }
}

function abs(themeId, file) { return path.join(ROOT, 'themes', themeId, 'cur', file); }

function createWindow() {
  nativeTheme.themeSource = 'dark';
  const win = new BrowserWindow({
    width: 1360, height: 860, minWidth: 980, minHeight: 640,
    backgroundColor: '#0d0e12',
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#cfd3dc', height: 44 },
    title: 'Cursorium',
    icon: path.join(ROOT, 'icon.png'),
    webPreferences: { preload: path.join(ROOT, 'preload.js'), contextIsolation: true, sandbox: true },
  });
  win.removeMenu();
  win.loadFile(path.join(ROOT, 'index.html'));
}

ipcMain.handle('catalog', () => JSON.parse(fs.readFileSync(path.join(ROOT, 'catalog.json'), 'utf8')));
ipcMain.handle('current', async () => { try { return await ps({ action: 'read' }); } catch (e) { return { error: e.message }; } });

// spec: { name, slug, size, picks: { Role: { theme, file } } }
ipcMain.handle('apply', async (_e, spec) => {
  await ensureBackup();
  // copy out of the app archive into a stable per-user folder; Windows reads cursors from there
  const dest = path.join(process.env.LOCALAPPDATA || app.getPath('userData'), 'Cursorium', 'schemes', spec.slug);
  fs.mkdirSync(dest, { recursive: true });
  const files = {};
  for (const r of ROLES) {
    const p = spec.picks[r]; if (!p) continue;
    const out = path.join(dest, r + path.extname(p.file));
    fs.writeFileSync(out, fs.readFileSync(abs(p.theme, p.file)));
    files[r] = out;
  }
  return ps({ action: 'apply', scheme: spec.name, slug: spec.slug, size: spec.size || 0, files });
});
ipcMain.handle('size', (_e, size) => ps({ action: 'size', size }));
ipcMain.handle('restore-default', async () => { await ensureBackup(); return ps({ action: 'restore', values: { ...WIN_DEFAULT, size: 32 } }); });
ipcMain.handle('restore-previous', async () => {
  if (!fs.existsSync(backupPath())) return { ok: false, error: 'No backup yet. Nothing has been applied.' };
  return ps({ action: 'restore', values: JSON.parse(fs.readFileSync(backupPath(), 'utf8')) });
});

// Build a classic right-click → Install folder, for sharing a scheme without the app
ipcMain.handle('export-inf', async (_e, spec) => {
  const dir = path.join(app.getPath('desktop'), `${spec.name.replace(/[^\w\- ]+/g, '').trim()} cursors`);
  fs.mkdirSync(dir, { recursive: true });
  const names = {};
  for (const r of ROLES) {
    const p = spec.picks[r]; if (!p) continue;
    const out = `${r}${path.extname(p.file)}`;
    fs.copyFileSync(abs(p.theme, p.file), path.join(dir, out)); names[r] = out;
  }
  const folder = spec.name.replace(/[^\w\- ]+/g, '').trim();
  const strs = ROLES.map(r => `${r.toLowerCase()} = "${names[r] || ''}"`).join('\r\n');
  const list = ROLES.map(r => names[r] ? `%10%\\%CUR_DIR%\\%${r.toLowerCase()}%` : '').join(',');
  const inf = `[Version]\r\nsignature="$CHICAGO$"\r\n\r\n[DefaultInstall]\r\nCopyFiles = Scheme.Cur\r\nAddReg = Scheme.Reg\r\n\r\n[DestinationDirs]\r\nScheme.Cur = 10,"%CUR_DIR%"\r\n\r\n[Scheme.Reg]\r\nHKCU,"Control Panel\\Cursors\\Schemes","%SCHEME_NAME%",,"${list}"\r\n\r\n[Scheme.Cur]\r\n${Object.values(names).join('\r\n')}\r\n\r\n[Strings]\r\nCUR_DIR = "Cursors\\${folder}"\r\nSCHEME_NAME = "${spec.name}"\r\n${strs}\r\n`;
  fs.writeFileSync(path.join(dir, 'install.inf'), '\ufeff' + inf, 'utf16le');
  fs.writeFileSync(path.join(dir, 'README.txt'), `Right-click install.inf → Install (or "Show more options" → Install on Windows 11).\r\nThen open Mouse settings → Additional mouse settings → Pointers, and pick "${spec.name}".\r\n`, 'utf8');
  shell.openPath(dir);
  return { ok: true, dir };
});

ipcMain.handle('open-external', (_e, url) => { if (/^https:\/\/github\.com\//.test(url)) shell.openExternal(url); });
ipcMain.handle('state-load', () => { try { return JSON.parse(fs.readFileSync(statePath(), 'utf8')); } catch { return {}; } });
ipcMain.handle('state-save', (_e, st) => { fs.mkdirSync(userDir(), { recursive: true }); fs.writeFileSync(statePath(), JSON.stringify(st)); });

app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
