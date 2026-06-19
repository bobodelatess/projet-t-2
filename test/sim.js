/* ============================================================
 * test/sim.js — Test "headless" du jeu, sans navigateur.
 * Stubbe le DOM/Canvas, charge les modules du jeu dans un
 * contexte VM, puis pilote le joueur avec une IA simple
 * (avancer, sauter face aux murs et aux trous) pour vérifier :
 *   1) que la boucle de jeu ne lève jamais d'exception,
 *   2) que le niveau est terminable (on atteint le drapeau).
 *
 * Usage : node test/sim.js
 * ============================================================ */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

/* ---- Stub Canvas 2D : toute méthode est un no-op ---- */
function makeCtx() {
  return new Proxy({}, {
    get(t, p) {
      if (p === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (p in t) return t[p];
      return () => {};            // toute autre méthode = no-op
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}

/* ---- Stub DOM minimal ---- */
function makeEl(id) {
  const classes = new Set();
  return {
    id, style: {}, _text: '',
    width: 800, height: 480,
    getContext: () => makeCtx(),
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
    },
    set textContent(v) { this._text = String(v); },
    get textContent() { return this._text; },
  };
}
const els = {};
const document = { getElementById: (id) => (els[id] ||= makeEl(id)) };

/* ---- Sandbox VM ---- */
const sandbox = {
  console,
  document,
  performance: { now: () => sandbox.__now || 0 },
  requestAnimationFrame: (cb) => { sandbox.__raf = cb; return 1; },
  __now: 0,
  __capture: (Input, Level) => { sandbox.__Input = Input; sandbox.__Level = Level; },
  addEventListener: () => {},        // les vrais events clavier sont remplacés par l'IA
};
sandbox.window = sandbox;          // window.Game = Game ; window.AudioContext = undefined
vm.createContext(sandbox);

/* ---- Charge les fichiers du jeu dans l'ordre ---- */
const root = path.join(__dirname, '..', 'js');
const files = ['input.js', 'sprites.js', 'level.js', 'entities.js', 'game.js'];
let code = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
code += '\n;__capture(Input, Level);';
vm.runInContext(code, sandbox, { filename: 'game-bundle.js' });

const { Game, __Input: Input, __Level: Level } = sandbox;
const T = Level.TILE, GT = Level.GROUND_TOP;

function setInput(o) { Object.assign(Input.state, o); }

/* ---- Une frame de simulation ---- */
let now = 0;
function step() {
  now += 1000 / 60;
  sandbox.__now = now;
  sandbox.__raf(now);
}

/* ---- IA très simple basée sur l'état exposé + la grille ---- */
let jumpHold = 0, cooldown = 0, stuckFrames = 0, prevPx = 0, leaping = false, airFrames = 0;
function decide() {
  const s = Game._debug();
  if (s.state !== 'playing') {           // pendant la victoire, on ne touche à rien
    setInput({ left: false, right: false, run: false, jump: false, jumpPressed: false });
    return s;
  }
  if (s.onGround) airFrames = 0; else airFrames++;
  const canCoyote = s.onGround || airFrames <= 5;   // marge "coyote time" pour sauter

  const rightEdgeCol = Math.floor((s.px + 27) / T);
  const aheadCol = rightEdgeCol + 1;
  const bodyRow = Math.floor((s.py + 35) / T);
  const standingRow = Math.floor((s.py + 36) / T);

  // Hauteur de l'obstacle devant (nombre de tuiles à grimper au-dessus des pieds)
  let riseTiles = 0;
  if (Level.isSolid(aheadCol, bodyRow)) {
    let r = bodyRow;
    while (r - 1 >= 0 && Level.isSolid(aheadCol, r - 1)) r--;
    riseTiles = bodyRow - r + 1;
  }

  // Distance (en tuiles) jusqu'au prochain trou, au sol uniquement
  let pitDist = -1;
  if (s.onGround && standingRow >= GT - 1) {
    for (let k = 1; k <= 4; k++) { if (!Level.isSolid(rightEdgeCol + k, GT)) { pitDist = k; break; } }
  }

  // Ennemi proche devant (inclut le cas "en contrebas" lors d'une descente d'escalier)
  const enemyAhead = (s.enemies || []).some((e) => {
    const dx = e.x - s.px, dy = e.y - s.py;
    return dx > -6 && dx < 60 && dy > -55 && dy < 110;
  });

  if (Math.abs(s.px - prevPx) < 0.4) stuckFrames++; else stuckFrames = 0;
  prevPx = s.px;
  const stuck = stuckFrames > 10 && s.onGround;

  // Hauteur de saut adaptée : trou = long ; obstacle = proportionnel ; ennemi = moyen.
  // Les sauts sur obstacle/trou exigent le sol ; sauter sur un ennemi tolère le coyote time.
  let startJump = false;
  if (cooldown === 0 && jumpHold === 0) {
    if (s.onGround && pitDist !== -1 && pitDist <= 2) { jumpHold = 16; leaping = true; }
    else if (s.onGround && (riseTiles >= 3 || stuck)) jumpHold = 16;
    else if (s.onGround && riseTiles === 2) jumpHold = 11;
    else if (s.onGround && riseTiles === 1) jumpHold = 7;
    else if (canCoyote && enemyAhead && pitDist === -1) jumpHold = 8; // pas de hop si un trou est proche
    if (jumpHold > 0) startJump = true;
  }
  if (s.onGround && jumpHold === 0 && cooldown === 0) leaping = false; // atterri

  // Courir uniquement pour prendre de l'élan avant/pendant un saut de trou
  // (priorité au trou même si un ennemi traîne près du bord)
  const run = pitDist !== -1 || leaping;
  setInput({ right: true, left: false, run });

  if (jumpHold > 0) {
    setInput({ jump: true, jumpPressed: startJump });   // jumpPressed seulement à l'amorce
    jumpHold--;
    if (jumpHold === 0) cooldown = 3;
  } else {
    setInput({ jump: false, jumpPressed: false });
    if (cooldown > 0) cooldown--;
  }
  return s;
}

/* ---- Boucle de test ---- */
function run() {
  // Démarre la partie
  setInput({ start: true });
  step();
  setInput({ start: false });

  const MAX = 15000;
  let maxPx = 0, deaths = 0, prevState = 'playing', lastLives = Game._debug().lives;
  const hist = [];
  for (let i = 0; i < MAX; i++) {
    let s;
    try {
      s = decide();
      step();
    } catch (e) {
      console.error(`\n❌ EXCEPTION à la frame ${i} :\n`, e.stack);
      process.exit(1);
    }
    const d = Game._debug();
    maxPx = Math.max(maxPx, d.px);
    // Ring buffer pour diagnostiquer les morts
    const near = (d.enemies || []).map(e => ({ dx: Math.round(e.x - d.px), dy: Math.round(e.y - d.py) }))
      .filter(e => e.dx > -60 && e.dx < 160).sort((a, b) => a.dx - b.dx)[0];
    hist.push({ i, px: Math.round(d.px), py: Math.round(d.py), g: d.onGround ? 1 : 0, e: near });
    if (hist.length > 14) hist.shift();
    if (d.lives < lastLives) {
      deaths++; lastLives = d.lives;
      if (process.env.DEBUG) {
        console.log(`  mort #${deaths} @ frame ${i} (px=${Math.round(d.px)}) :`);
        for (const h of hist) console.log(`      f${h.i} px=${h.px} py=${h.py} sol=${h.g} ennemi=${h.e ? `dx${h.e.dx} dy${h.e.dy}` : '-'}`);
      }
    }
    if (d.state !== prevState) {
      console.log(`  frame ${i}: état -> ${d.state} (px=${Math.round(d.px)}, score=${d.score}, vies=${d.lives})`);
      if (d.state === 'dying' && process.env.DEBUG) {
        for (const h of hist) console.log(`      f${h.i} px=${h.px} py=${h.py} sol=${h.g} ennemi=${h.e ? `dx${h.e.dx} dy${h.e.dy}` : '-'}`);
      }
      prevState = d.state;
    }
    if (d.state === 'win' || d.state === 'lose') {
      report(d, maxPx, deaths, i);
      return;
    }
  }
  report(Game._debug(), maxPx, deaths, MAX);
}

function report(d, maxPx, deaths, frames) {
  const flagX = Level.flagCol * T;
  console.log('\n──────── RÉSULTAT ────────');
  console.log(`État final     : ${d.state}`);
  console.log(`Score          : ${d.score}`);
  console.log(`Pièces         : ${d.coins}`);
  console.log(`Vies restantes : ${d.lives}`);
  console.log(`Morts          : ${deaths}`);
  console.log(`Avancée max    : ${Math.round(maxPx)} / ${flagX} px (drapeau)`);
  console.log(`Frames         : ${frames}`);
  const ok = d.state === 'win';
  console.log(ok ? '\n✅ Niveau terminé sans erreur : le jeu est jouable et gagnable.'
                 : '\n⚠️  Niveau non terminé par l\'IA de test (voir avancée max ci-dessus).');
  console.log('──────────────────────────');
  process.exit(ok ? 0 : 2);
}

run();
