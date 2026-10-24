// Night Lights: a calm puzzle game. Switch off every light in town. Progress is stored in localStorage.

// ---------- helpers ----------

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function detectLang() {
  return (navigator.language || '').toLowerCase().match(/^(nb|nn|no)/) ? 'nb' : 'en';
}

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.textContent = msg;
  document.body.append(el);
  setTimeout(() => el.remove(), 2200);
}

async function copyText(text, okMsg, promptMsg) {
  try {
    await navigator.clipboard.writeText(text);
    toast(okMsg);
  } catch {
    prompt(promptMsg, text);
  }
}

function download(name, text, type) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

// Shared links carry their data in the #fragment, which browsers never send to a server.
function encodeHash(obj) {
  const bytes = new TextEncoder().encode(JSON.stringify(obj));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeHash(str) {
  try {
    const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, ch => ch.charCodeAt(0))));
  } catch {
    return null;
  }
}

// ---------- texts ----------

const T = {
  en: {
    appName: 'Night Lights', tagline: 'Switch off every light in town.',
    levels: 'Levels', howTo: 'How to play', soundOn: 'Sound on', soundOff: 'Sound off',
    moves: 'Moves', par: 'Goal', lit: 'Lights on', undo: 'Undo', restart: 'Restart', hint: 'Hint',
    levelName: 'Level {n}',
    names: 'Moon Lane,Owl Street,Lantern Row,Quiet Road,Harbour Walk,Baker Street,Willow Way,Clock Square,Chimney Hill,Starlight Avenue,Fox Corner,Bell Tower Lane,Mill Road,Riverside,Cobble Court,Pine Street,Garden Row,Station Road,Copper Lane,Lighthouse Point,Market Square,Maple Avenue,Old Bridge,Kite Hill,Velvet Street,Ferry Lane,Night Market,Comet Close,Aurora Heights,Kodeby Main Street',
    winTitle: 'The town is asleep', winText: 'You did it in {moves} moves. The goal was {par}.',
    winBest: 'New best for this street!', again: 'Play again', next: 'Next street', close: 'Close', play: 'Play',
    best: 'Best: {stars}', notYet: 'Not solved yet', hintUsed: 'Hint used: two moons at most',
    help1: 'It is late, and the town should be asleep. Switch off every light.',
    help2: 'Tap a window to flip its light. The windows right above, below, left and right of it flip too.',
    help3: 'Finish in as few moves as the goal to get three moons. Stuck? A hint shows a window worth tapping, but then two moons is the most you can get.',
    help4: 'Keyboard: arrow keys to move, Enter or Space to tap, U to undo.',
    privacy: 'No ads, no account and no tracking. Your progress stays in this browser.',
    madeBy: 'A small game by the Kodeby team.', source: 'Source code',
    window: 'Window, row {r}, column {c}, {state}', on: 'light on', off: 'light off', locked: 'Locked',
    bonus: 'Bonus streets never end. Keep going after level 30.',
  },
  nb: {
    appName: 'Nattlys', tagline: 'Slukk alle lysene i byen.',
    levels: 'Brett', howTo: 'Slik spiller du', soundOn: 'Lyd på', soundOff: 'Lyd av',
    moves: 'Trekk', par: 'Mål', lit: 'Lys på', undo: 'Angre', restart: 'Start på nytt', hint: 'Hint',
    levelName: 'Brett {n}',
    names: 'Månestien,Uglegata,Lyktegata,Stilleveien,Havnepromenaden,Bakergata,Pileveien,Klokketorget,Pipebakken,Stjerneallé,Revehjørnet,Klokketårnveien,Møllebakken,Elvekanten,Brosteinsgården,Furugata,Hagerekka,Stasjonsveien,Kobbergata,Fyrlykta,Torget,Lønneallé,Gamlebrua,Dragebakken,Fløyelsgata,Fergeveien,Nattmarkedet,Kometveien,Nordlyshøyden,Kodeby hovedgate',
    winTitle: 'Byen sover', winText: 'Du klarte det på {moves} trekk. Målet var {par}.',
    winBest: 'Ny rekord for denne gata!', again: 'Spill igjen', next: 'Neste gate', close: 'Lukk', play: 'Spill',
    best: 'Beste: {stars}', notYet: 'Ikke løst ennå', hintUsed: 'Hint brukt: maks to måner',
    help1: 'Det er sent, og byen skal sove. Slukk alle lysene.',
    help2: 'Trykk på et vindu for å snu lyset. Vinduene rett over, under, til venstre og til høyre snur også.',
    help3: 'Bli ferdig på like få trekk som målet for å få tre måner. Står du fast? Et hint viser et vindu det lønner seg å trykke på, men da får du maks to måner.',
    help4: 'Tastatur: piltaster for å flytte, Enter eller mellomrom for å trykke, U for å angre.',
    privacy: 'Ingen reklame, ingen konto og ingen sporing. Fremgangen din blir i denne nettleseren.',
    madeBy: 'Et lite spill fra Kodeby-teamet.', source: 'Kildekode',
    window: 'Vindu, rad {r}, kolonne {c}, {state}', on: 'lys på', off: 'lys av', locked: 'Låst',
    bonus: 'Bonusgatene tar aldri slutt. Fortsett etter brett 30.',
  },
};

const STORAGE_KEY = 'night-lights-v1';
const LEVELS = 30;

// ---------- levels ----------

function mulberry32(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let x = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function levelSpec(n) {
  if (n <= 3) return { size: 3, presses: n + 1 };
  if (n <= 8) return { size: 4, presses: n - 1 };
  if (n <= 15) return { size: 5, presses: n - 5 };
  if (n <= 23) return { size: 6, presses: n - 10 };
  if (n <= LEVELS) return { size: 7, presses: n - 15 };
  return { size: 7, presses: 10 + (n % 6) };
}

function press(board, size, i) {
  const r = Math.floor(i / size), c = i % size;
  board[i] ^= 1;
  if (r > 0) board[i - size] ^= 1;
  if (r < size - 1) board[i + size] ^= 1;
  if (c > 0) board[i - 1] ^= 1;
  if (c < size - 1) board[i + 1] ^= 1;
}

// Every level is made by tapping random windows on a dark street, so it can always be solved.
// Tapping the same windows again switches everything off, and that set is the hint.
function makeLevel(n) {
  const { size, presses } = levelSpec(n);
  for (let attempt = 0; ; attempt++) {
    const rnd = mulberry32(n * 7919 + attempt * 104729);
    const cells = [...Array(size * size).keys()];
    for (let i = cells.length - 1; i > 0; i--) {
      const j = Math.floor(rnd() * (i + 1));
      [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    const solution = cells.slice(0, presses);
    const board = new Array(size * size).fill(0);
    solution.forEach(i => press(board, size, i));
    if (board.some(Boolean)) return { size, par: presses, board, solution };
  }
}

// ---------- state ----------

function freshProgress(lang) {
  return { version: 1, lang, sound: true, unlocked: 1, stars: {}, level: 1, play: null, seenHelp: false };
}

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (!d || d.version !== 1) return null;
    const p = freshProgress(d.lang === 'nb' ? 'nb' : 'en');
    p.sound = d.sound !== false;
    p.seenHelp = !!d.seenHelp;
    p.unlocked = Math.max(1, Math.min(9999, parseInt(d.unlocked, 10) || 1));
    p.level = Math.max(1, Math.min(p.unlocked, parseInt(d.level, 10) || 1));
    if (d.stars && typeof d.stars === 'object') {
      for (const [k, v] of Object.entries(d.stars)) if (/^\d+$/.test(k) && [1, 2, 3].includes(v)) p.stars[k] = v;
    }
    const pl = d.play;
    if (pl && pl.level === p.level && Array.isArray(pl.board) && Array.isArray(pl.taps)) {
      const lv = makeLevel(p.level);
      if (pl.board.length === lv.board.length) {
        p.play = {
          level: p.level, board: pl.board.map(v => (v ? 1 : 0)), taps: pl.taps.filter(i => Number.isInteger(i) && i >= 0 && i < lv.board.length),
          hintUsed: !!pl.hintUsed,
        };
      }
    }
    return p;
  } catch {
    return null;
  }
}

let prog = load() || freshProgress(detectLang());
let level = makeLevel(prog.level);
let play = prog.play || { level: prog.level, board: level.board.slice(), taps: [], hintUsed: false };
let hintCell = -1;
let focusCell = 0;
let won = false;

function save() {
  prog.play = play;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prog)); } catch { /* storage blocked: the game still works */ }
}

function t(key, vars) {
  let s = (T[prog.lang] && T[prog.lang][key]) ?? T.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, v);
  return s;
}

function moonText(n) {
  return '●'.repeat(n) + '○'.repeat(3 - n);
}

function starsFor(moves, par, hintUsed) {
  const s = moves <= par ? 3 : moves <= par + Math.ceil(par / 2) ? 2 : 1;
  return hintUsed ? Math.min(2, s) : s;
}

// ---------- sound ----------

let audio = null;
function beep(freq, len = 0.12, vol = 0.12, at = 0) {
  if (!prog.sound) return;
  try {
    audio ||= new AudioContext();
    const o = audio.createOscillator(), g = audio.createGain();
    const t0 = audio.currentTime + at;
    o.type = 'triangle';
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
    o.connect(g).connect(audio.destination);
    o.start(t0);
    o.stop(t0 + len + 0.02);
  } catch { /* no sound */ }
}

// ---------- rendering ----------

function streetName(n) {
  const names = t('names').split(',');
  return names[(n - 1) % names.length];
}

function renderBoard() {
  const { size } = level;
  const b = $('#board');
  b.style.setProperty('--size', size);
  b.innerHTML = play.board.map((v, i) => {
    const r = Math.floor(i / size) + 1, c = (i % size) + 1;
    return `<button type="button" role="gridcell" class="win-cell ${v ? 'on' : ''} ${i === hintCell ? 'hint' : ''}" data-i="${i}"
      tabindex="${i === focusCell ? 0 : -1}" aria-label="${esc(t('window', { r, c, state: t(v ? 'on' : 'off') }))}"><span class="pane"></span></button>`;
  }).join('');
}

function updateCells(changed) {
  const cells = $$('#board .win-cell');
  for (const i of changed) {
    const el = cells[i];
    const v = play.board[i];
    el.classList.toggle('on', !!v);
    el.classList.remove('flip');
    void el.offsetWidth; // restart the animation
    el.classList.add('flip');
    const r = Math.floor(i / level.size) + 1, c = (i % level.size) + 1;
    el.setAttribute('aria-label', t('window', { r, c, state: t(v ? 'on' : 'off') }));
  }
  cells.forEach((el, i) => el.classList.toggle('hint', i === hintCell));
}

function renderHud() {
  $('#street').textContent = `${t('levelName', { n: prog.level })} · ${level.size}×${level.size}`;
  $('#level-name').textContent = streetName(prog.level);
  $('#moves').textContent = play.taps.length;
  $('#par').textContent = level.par;
  $('#lit').textContent = play.board.filter(Boolean).length;
  $('#btn-undo').disabled = !play.taps.length || won;
  $('#btn-restart').disabled = !play.taps.length && !play.hintUsed;
  const best = prog.stars[prog.level];
  $('#stars-line').textContent = [best ? t('best', { stars: moonText(best) }) : t('notYet'), play.hintUsed ? t('hintUsed') : ''].filter(Boolean).join(' · ');
}

function renderSound() {
  const b = $('#btn-sound');
  b.textContent = prog.sound ? `🔊 ${t('soundOn')}` : `🔈 ${t('soundOff')}`;
  b.setAttribute('aria-pressed', prog.sound);
}

function applyLanguage() {
  document.documentElement.lang = prog.lang;
  document.title = t('appName');
  $('#lang').value = prog.lang;
  $$('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
}

function renderAll() {
  applyLanguage();
  renderSound();
  renderBoard();
  renderHud();
}

function renderLevels() {
  const max = Math.max(LEVELS, prog.unlocked);
  let html = '';
  for (let n = 1; n <= max; n++) {
    const open = n <= prog.unlocked;
    const s = prog.stars[n] || 0;
    html += `<button type="button" class="lvl ${n === prog.level ? 'current' : ''} ${s ? 'solved' : ''}" data-level="${n}" ${open ? '' : 'disabled'}
      aria-label="${esc(open ? `${t('levelName', { n })} ${s ? moonText(s) : ''}` : `${t('levelName', { n })}, ${t('locked')}`)}">
      <strong>${n}</strong><span>${open ? (s ? moonText(s) : '') : '🔒'}</span><small>${levelSpec(n).size}×${levelSpec(n).size}</small></button>`;
  }
  $('#level-grid').innerHTML = html + `<p class="hint wide">${esc(t('bonus'))}</p>`;
}

// ---------- play ----------

function startLevel(n) {
  prog.level = n;
  level = makeLevel(n);
  play = { level: n, board: level.board.slice(), taps: [], hintUsed: false };
  hintCell = -1;
  focusCell = Math.floor(level.board.length / 2);
  won = false;
  save();
  renderBoard();
  renderHud();
}

function neighbours(i) {
  const s = level.size, r = Math.floor(i / s), c = i % s;
  return [i, r > 0 && i - s, r < s - 1 && i + s, c > 0 && i - 1, c < s - 1 && i + 1].filter(x => x !== false);
}

function tap(i) {
  if (won) return;
  press(play.board, level.size, i);
  play.taps.push(i);
  if (i === hintCell) hintCell = -1;
  else if (hintCell >= 0) hintCell = -1;
  const litNow = play.board[i];
  beep(litNow ? 520 : 392, 0.09, 0.08);
  updateCells(neighbours(i));
  renderHud();
  if (!play.board.some(Boolean)) win();
  save();
}

function win() {
  won = true;
  const moves = play.taps.length;
  const s = starsFor(moves, level.par, play.hintUsed);
  const prev = prog.stars[prog.level] || 0;
  if (s > prev) prog.stars[prog.level] = s;
  prog.unlocked = Math.max(prog.unlocked, prog.level + 1);
  renderHud();
  $('#win-stars').textContent = moonText(s);
  $('#win-text').textContent = t('winText', { moves, par: level.par }) + (s > prev && prev ? ` ${t('winBest')}` : '');
  [523, 659, 784, 1047].forEach((f, k) => beep(f, 0.35, 0.09, k * 0.12));
  document.body.classList.add('asleep');
  setTimeout(() => $('#dlg-win').showModal(), 650);
}

// The windows that still need a tap: the original set, flipped by every tap you made.
function hint() {
  const need = new Set(level.solution);
  for (const i of play.taps) need.has(i) ? need.delete(i) : need.add(i);
  const options = [...need];
  if (!options.length) return;
  hintCell = options[Math.floor(Math.random() * options.length)];
  play.hintUsed = true;
  save();
  updateCells([]);
  renderHud();
  $(`#board .win-cell[data-i="${hintCell}"]`).focus();
}

// ---------- events ----------

$('#board').addEventListener('click', e => {
  const cell = e.target.closest('.win-cell');
  if (!cell) return;
  focusCell = Number(cell.dataset.i);
  tap(focusCell);
});

$('#board').addEventListener('keydown', e => {
  const cell = e.target.closest('.win-cell');
  if (!cell) return;
  const s = level.size;
  let i = Number(cell.dataset.i);
  const r = Math.floor(i / s), c = i % s;
  if (e.key === 'ArrowUp' && r > 0) i -= s;
  else if (e.key === 'ArrowDown' && r < s - 1) i += s;
  else if (e.key === 'ArrowLeft' && c > 0) i -= 1;
  else if (e.key === 'ArrowRight' && c < s - 1) i += 1;
  else return;
  e.preventDefault();
  const cells = $$('#board .win-cell');
  cells[focusCell].tabIndex = -1;
  focusCell = i;
  cells[i].tabIndex = 0;
  cells[i].focus();
});

document.addEventListener('keydown', e => {
  if ((e.key === 'u' || e.key === 'U') && !e.target.closest('input, select, textarea') && !document.querySelector('dialog[open]')) undo();
});

function undo() {
  if (!play.taps.length || won) return;
  const i = play.taps.pop();
  press(play.board, level.size, i);
  hintCell = -1;
  beep(330, 0.08, 0.06);
  updateCells(neighbours(i));
  renderHud();
  save();
}

$('#btn-undo').addEventListener('click', undo);
$('#btn-restart').addEventListener('click', () => { document.body.classList.remove('asleep'); startLevel(prog.level); });
$('#btn-hint').addEventListener('click', hint);

$('#btn-next').addEventListener('click', () => {
  $('#dlg-win').close();
  document.body.classList.remove('asleep');
  startLevel(prog.level + 1);
});
$('#btn-again').addEventListener('click', () => {
  $('#dlg-win').close();
  document.body.classList.remove('asleep');
  startLevel(prog.level);
});

$('#btn-levels').addEventListener('click', () => { renderLevels(); $('#dlg-levels').showModal(); });
$('#level-grid').addEventListener('click', e => {
  const b = e.target.closest('[data-level]');
  if (!b || b.disabled) return;
  $('#dlg-levels').close();
  document.body.classList.remove('asleep');
  startLevel(Number(b.dataset.level));
});

$('#btn-help').addEventListener('click', () => $('#dlg-help').showModal());
$$('[data-close]').forEach(b => b.addEventListener('click', () => b.closest('dialog').close()));
$('#dlg-help').addEventListener('close', () => {
  if (!prog.seenHelp) { prog.seenHelp = true; save(); }
  $(`#board .win-cell[data-i="${focusCell}"]`)?.focus();
});

$('#btn-sound').addEventListener('click', () => { prog.sound = !prog.sound; save(); renderSound(); });

$('#lang').addEventListener('change', e => {
  prog.lang = e.target.value === 'nb' ? 'nb' : 'en';
  save();
  renderAll();
});

// ---------- the sky ----------

function drawSky() {
  const rnd = mulberry32(42);
  let stars = '';
  for (let i = 0; i < 90; i++) {
    const x = Math.round(rnd() * 1600), y = Math.round(rnd() * 520), r = (rnd() * 1.4 + 0.4).toFixed(1);
    stars += `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff" class="${rnd() < 0.3 ? 'twinkle' : ''}" opacity="${(rnd() * 0.6 + 0.3).toFixed(2)}"/>`;
  }
  $('#stars').innerHTML = stars;
  let city = '';
  for (let x = -20; x < 1620;) {
    const w = 50 + Math.round(rnd() * 90), h = 120 + Math.round(rnd() * 220);
    city += `<rect x="${x}" y="${900 - h}" width="${w}" height="${h}"/>`;
    for (let wy = 900 - h + 16; wy < 880; wy += 22) {
      for (let wx = x + 10; wx < x + w - 12; wx += 16) {
        if (rnd() < 0.16) city += `<rect class="far-light" x="${wx}" y="${wy}" width="7" height="9" fill="#ffd77a" opacity="${(rnd() * 0.5 + 0.35).toFixed(2)}"/>`;
      }
    }
    x += w + Math.round(rnd() * 8);
  }
  $('#skyline').innerHTML = city;
}

drawSky();
focusCell = Math.floor(level.board.length / 2);
won = !play.board.some(Boolean);
if (won) startLevel(Math.min(prog.level + 1, prog.unlocked));
save();
renderAll();
if (!prog.seenHelp) $('#dlg-help').showModal();
