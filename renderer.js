const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const ROLES = ['Arrow','Help','AppStarting','Wait','Crosshair','IBeam','NWPen','No','SizeNS','SizeWE','SizeNWSE','SizeNESW','SizeAll','UpArrow','Hand','Pin','Person'];
const LABEL = { Arrow:'Normal select', Help:'Help select', AppStarting:'Working in background', Wait:'Busy', Crosshair:'Precision select', IBeam:'Text select', NWPen:'Handwriting', No:'Unavailable', SizeNS:'Vertical resize', SizeWE:'Horizontal resize', SizeNWSE:'Diagonal resize 1', SizeNESW:'Diagonal resize 2', SizeAll:'Move', UpArrow:'Alternate select', Hand:'Link select', Pin:'Location select', Person:'Person select' };
const SHORT = { AppStarting:'Working', Crosshair:'Precision', IBeam:'Text', NWPen:'Pen', No:'No', SizeNS:'↕', SizeWE:'↔', SizeNWSE:'⤡', SizeNESW:'⤢', SizeAll:'Move', UpArrow:'Alt', Hand:'Link' };

let CAT = [], byId = {};
let st = { favs: [], recent: [], size: 48, bg: 'auto', mix: {}, mixBase: 'bibata-modern-classic', mixName: 'My Mix' };
let family = '', filter = 'All', sort = 'curated', query = '', current = null, kbIndex = -1, shuffleSeed = Math.random(), applying = false;
let visible = [];

const pv = (id, role, ext = 'webp') => `themes/${id}/pv/${role}.${ext}`;
const cursorCss = (id, role) => { const r = byId[id]?.roles[role]; if (!r) return 'auto'; return `url("${pv(id, role, 'png')}") ${r.hx} ${r.hy}, auto`; };
const save = () => window.api.saveState(st);
const isLight = (hex) => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 150; };

function toast(msg, err) { const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : ''); clearTimeout(toast.t); toast.t = setTimeout(() => t.className = 'toast', 2600); }
function setAccent(hex) {
  // very light/dark accents make poor UI accents → nudge toward a usable colour
  const n = parseInt(hex.slice(1), 16), l = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000;
  document.documentElement.style.setProperty('--acc', l > 225 || l < 50 ? '#8b7cff' : hex);
}

async function init() {
  CAT = await window.api.catalog(); CAT.forEach((t, i) => { t.i = i; byId[t.id] = t; });
  Object.assign(st, await window.api.loadState() || {});
  $('#size').value = st.size; $('#sizeVal').textContent = st.size;
  $$('#bg button').forEach(b => b.classList.toggle('on', b.dataset.v === st.bg));
  $('#tagline').textContent = `${CAT.length} open-source cursor themes`;
  buildFamilies(); buildChips(); render(); renderRecent(); buildMixer(); refreshCurrent();
  wire();
}

function buildChips() {
  const tags = {}; CAT.forEach(t => t.tags.forEach(g => tags[g] = (tags[g] || 0) + 1));
  const order = ['All', '★ Favourites', ...Object.keys(tags).sort((a, b) => tags[b] - tags[a])];
  $('#chips').innerHTML = order.map(g => `<button class="chip ${g === filter ? 'on' : ''}" data-t="${g}">${g}<span class="n">${g === 'All' ? CAT.length : g[0] === '★' ? st.favs.length : tags[g]}</span></button>`).join('');
}

function buildFamilies() {
  const f = {}; CAT.forEach(t => f[t.family] = (f[t.family] || 0) + 1);
  $('#family').innerHTML = `<option value="">All collections (${Object.keys(f).length})</option>` +
    Object.keys(f).sort((a, b) => a.localeCompare(b)).map(k => `<option value="${k}">${k} · ${f[k]}</option>`).join('');
}
function list() {
  let l = CAT.filter(t => {
    if (family && t.family !== family) return false;
    if (filter === '★ Favourites' && !st.favs.includes(t.id)) return false;
    if (filter !== 'All' && filter !== '★ Favourites' && !t.tags.includes(filter)) return false;
    if (query) { const hay = (t.name + ' ' + t.family + ' ' + t.tags.join(' ') + ' ' + t.blurb + ' ' + t.repo).toLowerCase(); return query.split(/\s+/).every(w => hay.includes(w)); }
    return true;
  });
  if (sort === 'az') l.sort((a, b) => a.name.localeCompare(b.name));
  if (sort === 'fav') l.sort((a, b) => (st.favs.includes(b.id) - st.favs.includes(a.id)) || a.i - b.i);
  if (sort === 'shuffle') { const h = s => Math.sin(s * 9301 + shuffleSeed * 49297) % 1; l.sort((a, b) => h(a.i) - h(b.i)); }
  return l;
}

function stageBg(t) { if (st.bg !== 'auto') return st.bg; const n = parseInt(t.accent.slice(1), 16), l = ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000; return l < 90 ? 'light' : 'dark'; }

function render() {
  visible = list();
  $('#heading').textContent = query ? `“${query}”` : [family, filter === 'All' ? '' : filter].filter(Boolean).join(' · ') || 'All themes';
  $('#count').textContent = `${visible.length} theme${visible.length === 1 ? '' : 's'}`;
  const g = $('#grid');
  if (!visible.length) { g.innerHTML = `<div class="empty">Nothing here yet${filter.startsWith('★') ? '. Star a theme with F or ☆' : ''}.</div>`; return; }
  g.innerHTML = visible.map((t, k) => `
    <article class="card ${current === t.id ? 'applied' : ''}" tabindex="0" data-id="${t.id}" style="--ca:${t.accent};animation-delay:${Math.min(k, 20) * 18}ms">
      <div class="stage bg-${stageBg(t)}">
        <img class="hero" loading="lazy" src="${pv(t.id, 'Arrow')}" alt="">
        <img class="mini" loading="lazy" src="${pv(t.id, 'Hand')}" alt="">
        <img class="mini" loading="lazy" src="${pv(t.id, 'IBeam')}" alt="">
        <img class="mini anim" loading="lazy" src="${pv(t.id, 'Wait', 'png')}" data-role="Wait" alt="">
        <img class="mini anim" loading="lazy" src="${pv(t.id, 'AppStarting', 'png')}" data-role="AppStarting" alt="">
      </div>
      <button class="quick" data-act="apply">Apply</button>
      <div class="cbody"><span class="dot"></span><div style="min-width:0"><div class="cname">${t.name}</div><div class="ctags">${t.tags.join(' · ')}</div></div>
        <button class="star ${st.favs.includes(t.id) ? 'on' : ''}" data-act="fav" title="Favourite">${st.favs.includes(t.id) ? '★' : '☆'}</button></div>
    </article>`).join('');
  // live "feel": the card itself becomes the theme
  $$('.card', g).forEach(c => {
    const id = c.dataset.id;
    c.style.cursor = cursorCss(id, 'Arrow');
    $$('button', c).forEach(b => b.style.cursor = cursorCss(id, 'Hand'));
    c.addEventListener('mouseenter', () => { setAccent(byId[id].accent); $$('img.anim', c).forEach(i => i.src = pv(id, i.dataset.role)); });
    c.addEventListener('mouseleave', () => $$('img.anim', c).forEach(i => i.src = pv(id, i.dataset.role, 'png')));
  });
  if (kbIndex >= visible.length) kbIndex = visible.length - 1;
  markKb();
}

function markKb() { $$('.card').forEach((c, i) => c.classList.toggle('kb', i === kbIndex)); const el = $$('.card')[kbIndex]; el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }

/* ---------- drawer ---------- */
let openId = null;
function openDrawer(id) {
  const t = byId[id]; openId = id; setAccent(t.accent);
  $('#dName').textContent = t.name;
  $('#dMeta').innerHTML = `${t.tags.join(' · ')} &nbsp;·&nbsp; ${t.license} &nbsp;·&nbsp; github.com/${t.repo}`;
  $('#dBlurb').textContent = t.blurb;
  $('#dFav').textContent = st.favs.includes(id) ? '★' : '☆';
  $('#dApply').textContent = current === id ? 'Re-apply' : 'Apply to Windows';
  $('#drawer').style.cursor = cursorCss(id, 'Arrow');
  $$('#drawer button, #drawer .seg button').forEach(b => b.style.cursor = cursorCss(id, 'Hand'));
  $$('#play [data-role]').forEach(el => el.style.cursor = cursorCss(id, el.dataset.role));
  $('#pBusyImg').src = pv(id, 'Wait'); $('#pWorkImg').src = pv(id, 'AppStarting');
  $('#roles').innerHTML = ROLES.map(r => {
    const ri = t.roles[r]; if (!ri) return '';
    return `<div class="role" data-role="${r}" style="cursor:${cursorCss(id, r)}">${ri.anim ? '<span class="anim">● animated</span>' : ''}
      <button class="add" data-role="${r}" title="Add to mixer" style="cursor:${cursorCss(id, 'Hand')}">⊕</button>
      <img src="${pv(id, r)}" alt=""><div class="rl">${LABEL[r]}</div></div>`;
  }).join('');
  clearCanvas();
  $('#drawer').classList.add('open'); $('#drawer').setAttribute('aria-hidden', 'false');
}
function closeDrawer() { $('#drawer').classList.remove('open'); openId = null; }

function clearCanvas() { for (const c of [$('#pdraw'), $('#pcross')]) c.getContext('2d').clearRect(0, 0, c.width, c.height); }
function wirePlay() {
  const pt = (c, e) => [e.offsetX * c.width / c.clientWidth, e.offsetY * c.height / c.clientHeight];
  const d = $('#pdraw'), dc = d.getContext('2d'); let down = false;
  d.addEventListener('pointerdown', e => { down = true; dc.beginPath(); dc.moveTo(...pt(d, e)); });
  d.addEventListener('pointermove', e => { if (!down) return; dc.lineTo(...pt(d, e)); dc.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--acc'); dc.lineWidth = 3; dc.lineCap = 'round'; dc.stroke(); });
  addEventListener('pointerup', () => down = false);
  const x = $('#pcross'), xc = x.getContext('2d');
  x.addEventListener('click', e => { xc.fillStyle = '#ff5d73'; xc.beginPath(); xc.arc(...pt(x, e), 4, 0, 7); xc.fill(); });
  const mv = $('.pmove'); let drag = null;
  mv.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; mv.setPointerCapture(e.pointerId); });
  mv.addEventListener('pointermove', e => { if (drag) mv.style.transform = `translate(${e.clientX - drag.x}px,${e.clientY - drag.y}px)`; });
  mv.addEventListener('pointerup', () => { drag = null; mv.style.transition = 'transform .3s'; mv.style.transform = ''; setTimeout(() => mv.style.transition = '', 300); });
  $('#pbg').addEventListener('click', e => { const v = e.target.dataset.v; if (!v) return; $$('#pbg button').forEach(b => b.classList.toggle('on', b === e.target)); $('#play').className = 'play p-' + v; });
  $('#play').classList.add('p-dark');
}

/* ---------- apply ---------- */
const slug = s => s.toLowerCase().normalize('NFD').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '');
function themeSpec(id) { const t = byId[id]; const picks = {}; ROLES.forEach(r => t.roles[r] && (picks[r] = { theme: id, file: t.roles[r].file })); return { name: `Cursorium · ${t.name}`, slug: id, size: +st.size, picks }; }
function mixSpec() {
  const base = byId[st.mixBase]; const picks = {};
  ROLES.forEach(r => { const m = st.mix[r]; if (m && byId[m]?.roles[r]) picks[r] = { theme: m, file: byId[m].roles[r].file }; else if (base.roles[r]) picks[r] = { theme: base.id, file: base.roles[r].file }; });
  const nm = (st.mixName || 'My Mix').trim(); return { name: `Cursorium · ${nm}`, slug: 'mix-' + slug(nm), size: +st.size, picks };
}
async function apply(spec, recentId) {
  if (applying) return; applying = true; document.body.classList.add('busy');
  try {
    const r = await window.api.apply(spec);
    if (r && r.demo) toast('Preview mode: applying only works on Windows');
    else { toast(`✓ ${spec.name.replace('Cursorium · ', '')} is now your Windows cursor`); }
    if (recentId) { st.recent = [recentId, ...st.recent.filter(x => x !== recentId)].slice(0, 6); save(); renderRecent(); }
    await refreshCurrent();
  } catch (e) { toast('Could not apply: ' + e.message, true); }
  finally { applying = false; document.body.classList.remove('busy'); }
}
async function refreshCurrent() {
  const c = await window.api.current();
  const name = c && c.scheme ? String(c.scheme) : '';
  current = CAT.find(t => name === `Cursorium · ${t.name}`)?.id || null;
  $('#now').innerHTML = name ? `Now: <b>${name.replace('Cursorium · ', '')}</b>` : (c && c.error ? 'Windows only' : 'Now: <b>Windows default</b>');
  $$('.card').forEach(el => el.classList.toggle('applied', el.dataset.id === current));
}
function renderRecent() {
  $('#recent').innerHTML = st.recent.filter(id => byId[id]).map(id => `<button data-id="${id}"><img src="${pv(id, 'Arrow')}">${byId[id].name}</button>`).join('') || '<span class="hint">Nothing yet</span>';
}

/* ---------- favourites ---------- */
function toggleFav(id) {
  st.favs = st.favs.includes(id) ? st.favs.filter(x => x !== id) : [...st.favs, id]; save();
  buildChips(); if (filter.startsWith('★') || sort === 'fav') render();
  else $$(`.card[data-id="${id}"] .star`).forEach(s => { const on = st.favs.includes(id); s.classList.toggle('on', on); s.textContent = on ? '★' : '☆'; });
  if (openId === id) $('#dFav').textContent = st.favs.includes(id) ? '★' : '☆';
}

/* ---------- mixer ---------- */
function buildMixer() {
  $('#mixBase').innerHTML = CAT.map(t => `<option value="${t.id}" ${t.id === st.mixBase ? 'selected' : ''}>${t.name}</option>`).join('');
  $('#mixName').value = st.mixName; renderSlots();
}
function renderSlots() {
  $('#slots').innerHTML = ROLES.map(r => {
    const m = st.mix[r]; const id = m || st.mixBase;
    return `<div class="slot ${m ? 'filled' : 'base'}" title="${LABEL[r]}${m ? ' · ' + byId[m].name : ' (base)'}" style="cursor:${cursorCss(id, r)}">
      ${m ? `<button class="x" data-role="${r}">✕</button>` : ''}<img src="${pv(id, r)}">${SHORT[r] || r}</div>`;
  }).join('');
}
function toggleMixer(force) { const o = force ?? !$('#mixer').classList.contains('open'); $('#mixer').classList.toggle('open', o); $('#mixToggle').textContent = o ? 'Close mixer' : 'Open mixer'; }

/* ---------- wiring ---------- */
function wire() {
  $('#family').addEventListener('change', e => { family = e.target.value; kbIndex = -1; render(); });
  $('#q').addEventListener('input', e => { query = e.target.value.trim().toLowerCase(); kbIndex = -1; render(); });
  $('#chips').addEventListener('click', e => { const b = e.target.closest('.chip'); if (!b) return; filter = b.dataset.t; kbIndex = -1; buildChips(); render(); });
  $('#sort').addEventListener('click', e => { const v = e.target.dataset.v; if (!v) return; sort = v; if (v === 'shuffle') shuffleSeed = Math.random(); $$('#sort button').forEach(b => b.classList.toggle('on', b === e.target)); render(); });
  $('#bg').addEventListener('click', e => { const v = e.target.dataset.v; if (!v) return; st.bg = v; save(); $$('#bg button').forEach(b => b.classList.toggle('on', b === e.target)); render(); });
  $('#size').addEventListener('input', e => { st.size = +e.target.value; $('#sizeVal').textContent = st.size; });
  $('#size').addEventListener('change', async () => { save(); if (current || Object.keys(st.mix).length) { try { await window.api.setSize(st.size); toast(`Pointer size → ${st.size}`); } catch (e) { toast(e.message, true); } } });

  $('#grid').addEventListener('click', e => {
    const card = e.target.closest('.card'); if (!card) return; const id = card.dataset.id;
    const act = e.target.closest('[data-act]')?.dataset.act;
    if (act === 'fav') return toggleFav(id);
    if (act === 'apply') return apply(themeSpec(id), id);
    kbIndex = visible.findIndex(t => t.id === id); markKb(); openDrawer(id);
  });
  $('#grid').addEventListener('dblclick', e => { const c = e.target.closest('.card'); if (c && !e.target.closest('button')) apply(themeSpec(c.dataset.id), c.dataset.id); });
  $('#recent').addEventListener('click', e => { const b = e.target.closest('button'); if (b) openDrawer(b.dataset.id); });

  $('#dClose').onclick = closeDrawer;
  $('#dFav').onclick = () => openId && toggleFav(openId);
  $('#dApply').onclick = () => openId && apply(themeSpec(openId), openId);
  $('#dExport').onclick = async () => { if (!openId) return; try { const r = await window.api.exportInf(themeSpec(openId)); toast('Installer folder created on your Desktop'); } catch (e) { toast(e.message, true); } };
  $('#dSource').onclick = () => openId && window.api.openExternal(`https://github.com/${byId[openId].repo}`);
  $('#roles').addEventListener('click', e => {
    const b = e.target.closest('.add'); if (!b || !openId) return;
    st.mix[b.dataset.role] = openId; save(); renderSlots(); toggleMixer(true);
    toast(`${LABEL[b.dataset.role]} from ${byId[openId].name} → mixer`);
  });
  wirePlay();

  $('#mixToggle').onclick = () => toggleMixer();
  $('#mixClose').onclick = () => toggleMixer(false);
  $('#mixBase').onchange = e => { st.mixBase = e.target.value; save(); renderSlots(); };
  $('#mixName').oninput = e => { st.mixName = e.target.value; save(); };
  $('#mixClear').onclick = () => { st.mix = {}; save(); renderSlots(); };
  $('#slots').addEventListener('click', e => { const x = e.target.closest('.x'); if (x) { delete st.mix[x.dataset.role]; save(); renderSlots(); } });
  $('#mixApply').onclick = () => apply(mixSpec());
  $('#mixExport').onclick = async () => { try { await window.api.exportInf(mixSpec()); toast('Mix installer folder created on your Desktop'); } catch (e) { toast(e.message, true); } };

  $('#surprise').onclick = surprise;
  $('#restorePrev').onclick = async () => { const r = await window.api.restorePrevious().catch(e => ({ error: e.message })); if (r?.error) toast(r.error, true); else { toast('↶ Your previous cursors are back'); refreshCurrent(); } };
  $('#restoreDef').onclick = async () => { try { await window.api.restoreDefault(); toast('Windows default cursors restored'); refreshCurrent(); } catch (e) { toast(e.message, true); } };

  addEventListener('keydown', e => {
    const typing = /INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName);
    if (e.key === 'Escape') { if (typing) document.activeElement.blur(); else if (openId) closeDrawer(); else toggleMixer(false); return; }
    if (typing) { if (e.key === 'Enter' && document.activeElement.id === 'q' && visible[0]) { kbIndex = 0; markKb(); document.activeElement.blur(); } return; }
    if (e.key === '/') { e.preventDefault(); $('#q').focus(); return; }
    const cols = Math.max(1, getComputedStyle($('#grid')).gridTemplateColumns.split(' ').length);
    const mv = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: cols, ArrowUp: -cols }[e.key];
    if (mv && visible.length) { e.preventDefault(); kbIndex = Math.max(0, Math.min(visible.length - 1, (kbIndex < 0 ? 0 : kbIndex + mv))); markKb(); setAccent(visible[kbIndex].accent); if (openId) openDrawer(visible[kbIndex].id); return; }
    const sel = openId || visible[kbIndex]?.id;
    const k = e.key.toLowerCase();
    if (e.key === 'Enter' && visible[kbIndex]) openDrawer(visible[kbIndex].id);
    else if (k === 'a' && sel) apply(themeSpec(sel), sel);
    else if (k === 'f' && sel) toggleFav(sel);
    else if (k === 'r') surprise();
    else if (k === 'm') toggleMixer();
  });
}

function surprise() {
  const pool = visible.length ? visible : CAT; const t = pool[Math.floor(Math.random() * pool.length)];
  kbIndex = visible.indexOf(t); markKb(); openDrawer(t.id);
}

init();
