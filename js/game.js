/* ============================================================
 * game.js — Boucle principale, caméra, états, collisions,
 * rendu, HUD et effets sonores (WebAudio).
 * ============================================================ */
const Game = (function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const VIEW_W = canvas.width;   // 800
  const VIEW_H = canvas.height;  // 480
  const T = Level.TILE;

  // Éléments HUD / overlays
  const el = {
    score: document.getElementById('hud-score'),
    coins: document.getElementById('hud-coins'),
    world: document.getElementById('hud-world'),
    lives: document.getElementById('hud-lives'),
    start: document.getElementById('start-screen'),
    end: document.getElementById('end-screen'),
    endTitle: document.getElementById('end-title'),
    endMsg: document.getElementById('end-message'),
  };

  // État global
  let state = 'start';   // start | playing | dying | win | lose
  let score = 0, coins = 0, lives = 3;
  const cam = { x: 0, y: 0 };

  // Entités du monde
  let player, goombas, coinEnts, particles, pops, texts, blockMap;
  let win = null;        // séquence de victoire

  /* ---------------- Audio ---------------- */
  let actx = null;
  function audio() {
    if (!actx) {
      try { actx = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { actx = false; }
    }
    return actx;
  }
  function beep(freq, dur, type = 'square', vol = 0.12, delay = 0) {
    const a = audio(); if (!a) return;
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g); g.connect(a.destination);
    osc.start(t0); osc.stop(t0 + dur);
  }
  function sfx(name) {
    switch (name) {
      case 'jump':   beep(420, 0.12, 'square', 0.10); beep(640, 0.1, 'square', 0.08, 0.05); break;
      case 'coin':   beep(988, 0.07, 'square', 0.12); beep(1319, 0.18, 'square', 0.12, 0.07); break;
      case 'stomp':  beep(180, 0.12, 'triangle', 0.18); break;
      case 'bump':   beep(120, 0.1, 'square', 0.16); break;
      case 'brick':  beep(90, 0.12, 'sawtooth', 0.16); break;
      case 'die':    beep(500, 0.15, 'square', 0.14); beep(300, 0.2, 'square', 0.14, 0.15); beep(160, 0.35, 'square', 0.14, 0.32); break;
      case '1up':    [523,659,784,1047].forEach((f,i)=>beep(f,0.14,'square',0.12,i*0.08)); break;
      case 'win':    [523,659,784,1047,784,1047,1319].forEach((f,i)=>beep(f,0.18,'square',0.12,i*0.16)); break;
    }
  }

  /* ---------------- Init / reset ---------------- */
  function buildWorld() {
    const ps = Level.playerStart;
    player = new Player(ps.col * T + 6, Level.GROUND_TOP * T - 36);

    goombas = Level.enemies.map(e => {
      const g = new Goomba(e.col * T + 3, 0);
      g.y = Level.GROUND_TOP * T - g.h;   // pieds posés sur le sol
      return g;
    });

    coinEnts = Level.coins.map(c => new Coin(c.col * T + (T - 24) / 2, c.row * T + (T - 28) / 2));

    // Réinitialise l'état des blocs (briques cassées / "?" utilisés)
    blockMap = {};
    for (const b of Level.blocks) {
      b.used = false; b.broken = false; b.bump = 0;
      blockMap[b.col + ',' + b.row] = b;
      if (b.type === 'brick') Level.grid[b.row][b.col] = 'B';
    }

    particles = []; pops = []; texts = [];
    win = null;
    cam.x = 0; cam.y = 0;
  }

  function startGame() {
    score = 0; coins = 0; lives = 3;
    buildWorld();
    state = 'playing';
    el.start.classList.add('hidden');
    el.end.classList.add('hidden');
  }

  function respawn() {
    buildWorld();
    state = 'playing';
  }

  function loseLife() {
    lives--;
    if (lives <= 0) {
      gameOver(false);
    } else {
      respawn();
    }
  }

  function gameOver(victory) {
    state = victory ? 'win' : 'lose';
    el.end.classList.remove('hidden');
    el.endTitle.textContent = victory ? 'VICTOIRE !' : 'GAME OVER';
    el.endTitle.style.color = victory ? '#fcd200' : '#ff5555';
    el.endMsg.textContent = victory
      ? `Tu as sauvé le royaume !   Score : ${score}`
      : `Score final : ${score}`;
    if (victory) sfx('win'); else sfx('die');
  }

  /* ---------------- Récompenses ---------------- */
  function addScore(n, x, y, label) {
    score += n;
    if (label && x != null) texts.push(new FloatingText(x, y, label));
  }
  function addCoin(x, y) {
    coins++;
    addScore(100, x, y, '+100');
    sfx('coin');
    if (coins >= 100) { coins -= 100; lives++; sfx('1up'); }
  }

  /* ---------------- Interactions blocs ---------------- */
  function handleHeadHit() {
    if (!player.headHit) return;
    const { col, row } = player.headHit;
    const b = blockMap[col + ',' + row];
    if (!b || b.broken) return;

    if (b.type === 'question' && !b.used) {
      b.used = true; b.bump = 8;
      pops.push(new CoinPop(col * T + (T - 24) / 2, row * T - 24));
      addCoin(col * T + T / 2, row * T - 10);
      sfx('bump');
    } else if (b.type === 'brick') {
      b.broken = true;
      Level.grid[row][col] = ' ';   // n'est plus solide
      sfx('brick');
      addScore(50, col * T + T / 2, row * T, '+50');
      // éclats de brique
      const cx = col * T + T / 2, cy = row * T + T / 2;
      const c = Sprites.COL.brick;
      particles.push(
        new Particle(cx, cy, -3, -7, c, 8, 45),
        new Particle(cx, cy, 3, -7, c, 8, 45),
        new Particle(cx, cy, -2, -4, c, 8, 45),
        new Particle(cx, cy, 2, -4, c, 8, 45),
      );
    } else if (b.type === 'question' && b.used) {
      b.bump = 4; sfx('bump');
    }
  }

  function aabb(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  /* ---------------- Mise à jour ---------------- */
  function update() {
    // Transitions de menu
    if (state === 'start') {
      if (Input.consumeStart()) startGame();
      Input.endFrame();
      return;
    }
    if (state === 'win' || state === 'lose') {
      if (Input.consumeStart()) startGame();
      Input.endFrame();
      return;
    }

    if (state === 'playing') {
      player.update(Input.state);
      handleHeadHit();

      // Décrémente les animations de "bump" des blocs
      for (const b of Level.blocks) if (b.bump > 0) b.bump--;

      // Goombas
      for (const g of goombas) {
        g.update();
        if (g.remove || g.dead) continue;
        if (player.dead) continue;
        if (aabb(player, g)) {
          // Écrasement : le joueur descendait et ses pieds étaient au-dessus
          // de la tête du Goomba à la frame précédente.
          const prevFeet = player.y + player.h - player.vy;
          const falling = player.vy > 0 && prevFeet <= g.y + 12;
          if (falling) {
            g.stomp();
            player.vy = -8;            // rebond
            addScore(100, g.x + g.w / 2, g.y, '+100');
            sfx('stomp');
          } else if (player.takeDamage()) {
            state = 'dying';
            sfx('die');
          }
        }
      }
      goombas = goombas.filter(g => !g.remove);

      // Pièces
      for (const c of coinEnts) {
        c.update();
        if (!c.collected && aabb(player, c)) {
          c.collected = true;
          addCoin(c.x + c.w / 2, c.y);
        }
      }
      coinEnts = coinEnts.filter(c => !c.collected);

      // Particules / pops / textes
      particles.forEach(p => p.update()); particles = particles.filter(p => !p.dead);
      pops.forEach(p => p.update()); pops = pops.filter(p => !p.dead);
      texts.forEach(t => t.update()); texts = texts.filter(t => !t.dead);

      // Chute dans un trou
      if (player.y > Level.height + 40) { loseLife(); Input.endFrame(); return; }

      // Atteinte du drapeau
      if (player.x + player.w / 2 >= Level.flagCol * T) startWin();

      updateCamera();
    }
    else if (state === 'dying') {
      player.update(Input.state);
      particles.forEach(p => p.update()); particles = particles.filter(p => !p.dead);
      if (player.deadTimer > 95) { loseLife(); }
    }
    else if (state === 'win-seq') {
      updateWinSeq();
    }

    Input.endFrame();
  }

  function updateCamera() {
    const target = player.x + player.w / 2 - VIEW_W / 2;
    cam.x = Math.max(0, Math.min(target, Level.width - VIEW_W));
    cam.y = 0;
  }

  /* ---------------- Séquence de victoire ---------------- */
  function startWin() {
    state = 'win-seq';
    player.won = true;
    player.x = Level.flagCol * T - player.w / 2;
    player.vx = 0; player.vy = 2;
    player.facing = 1;
    win = { phase: 0, flagY: 0, timer: 0 };
    sfx('coin');
  }
  function updateWinSeq() {
    const poleH = (Level.GROUND_TOP - 2) * T;
    win.timer++;
    if (win.phase === 0) {
      // le drapeau descend, le joueur glisse le long du mât
      win.flagY = Math.min(win.flagY + 7, poleH * 0.78);
      player.update(Input.state);
      addScoreTrickle();
      if (player.onGround && win.flagY >= poleH * 0.78) { win.phase = 1; win.timer = 0; player.vx = 2.6; }
    } else if (win.phase === 1) {
      // marche vers le château
      player.update(Input.state);
      if (win.timer > 70) { win.phase = 2; }
    } else if (win.phase === 2) {
      gameOver(true);
    }
    updateCamera();
  }
  function addScoreTrickle() { if (win.timer % 3 === 0) score += 50; }

  /* ---------------- Rendu ---------------- */
  function drawSky() {
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, '#5c94fc');
    g.addColorStop(1, '#9bd0ff');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }

  function drawDecor() {
    for (const d of Level.decor) {
      let factor = 1;
      if (d.type === 'cloud') factor = 0.3;
      else if (d.type === 'hill') factor = 0.5;
      else if (d.type === 'castle') factor = 1;
      const x = d.x - cam.x * factor;
      if (x + d.w < -50 || x > VIEW_W + 50) continue;
      if (d.type === 'cloud') Sprites.cloud(ctx, x, d.y, d.w, d.h);
      else if (d.type === 'hill') Sprites.hill(ctx, x, d.y, d.w, d.h);
      else if (d.type === 'bush') Sprites.bush(ctx, x, d.y, d.w, d.h);
      else if (d.type === 'castle') drawCastle(x, d.y, d.w, d.h);
    }
  }

  function drawCastle(x, y, w, h) {
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#922b21';
    // créneaux
    for (let i = 0; i < 5; i++) ctx.fillRect(x + i * w / 5, y - h * 0.12, w / 10, h * 0.12);
    // porte
    ctx.fillStyle = '#2c0d08';
    ctx.fillRect(x + w * 0.38, y + h * 0.5, w * 0.24, h * 0.5);
    // fenêtres
    ctx.fillRect(x + w * 0.15, y + h * 0.2, w * 0.12, h * 0.16);
    ctx.fillRect(x + w * 0.73, y + h * 0.2, w * 0.12, h * 0.16);
  }

  function drawTiles() {
    const c0 = Math.max(0, Math.floor(cam.x / T) - 1);
    const c1 = Math.min(Level.COLS - 1, Math.ceil((cam.x + VIEW_W) / T) + 1);
    for (let col = c0; col <= c1; col++) {
      for (let row = 0; row < Level.ROWS; row++) {
        if (Level.grid[row][col] === '#') {
          const top = !Level.isSolid(col, row - 1);
          Sprites.ground(ctx, col * T - cam.x, row * T - cam.y, T, T, top);
        }
      }
    }
    // Tuyaux
    for (const p of Level.pipes) {
      const x = p.col * T - cam.x;
      if (x + 2 * T < 0 || x > VIEW_W) continue;
      Sprites.pipe(ctx, x, p.row * T - cam.y, 2 * T, p.h * T);
    }
    // Blocs (briques / "?")
    for (const b of Level.blocks) {
      if (b.broken) continue;
      const x = b.col * T - cam.x;
      if (x + T < 0 || x > VIEW_W) continue;
      const y = b.row * T - cam.y;
      if (b.type === 'question') Sprites.questionBlock(ctx, x, y, T, T, { used: b.used, bump: b.bump });
      else Sprites.brick(ctx, x, y - (b.bump || 0), T, T);
    }
  }

  function drawFlag() {
    const x = Level.flagCol * T - cam.x;
    if (x < -T || x > VIEW_W + T) return;
    const top = 2 * T - cam.y;
    const h = (Level.GROUND_TOP - 2) * T;
    Sprites.flag(ctx, x, top, T, h, { flagY: win ? win.flagY : 0 });
  }

  function render() {
    drawSky();
    drawDecor();
    drawTiles();
    drawFlag();
    coinEnts.forEach(c => c.draw(ctx, cam));
    pops.forEach(p => p.draw(ctx, cam));
    goombas.forEach(g => g.draw(ctx, cam));
    particles.forEach(p => p.draw(ctx, cam));
    if (player) player.draw(ctx, cam);
    texts.forEach(t => t.draw(ctx, cam));
  }

  /* ---------------- HUD ---------------- */
  function updateHUD() {
    el.score.textContent = String(score).padStart(6, '0');
    el.coins.textContent = '×' + String(coins).padStart(2, '0');
    el.lives.textContent = '×' + Math.max(0, lives);
    el.world.textContent = '1-1';
  }

  /* ---------------- Boucle (pas de temps fixe) ---------------- */
  const STEP = 1000 / 60;
  let last = performance.now();
  let acc = 0;
  function frame(now) {
    acc += now - last;
    last = now;
    let steps = 0;
    while (acc >= STEP && steps < 5) { update(); acc -= STEP; steps++; }
    if (steps === 0 && acc > STEP * 5) acc = 0; // anti-spirale
    render();
    updateHUD();
    requestAnimationFrame(frame);
  }

  function init() {
    updateHUD();
    requestAnimationFrame(frame);
  }

  // API publique (utilisée par les entités pour le son ;
  // _debug sert aux tests automatisés / à l'inspection)
  return {
    init, sfx,
    _debug: () => ({
      state, score, coins, lives,
      px: player ? player.x : 0,
      py: player ? player.y : 0,
      onGround: player ? player.onGround : false,
      camx: cam.x,
      enemies: goombas
        ? goombas.filter(g => !g.dead && !g.squished && !g.remove).map(g => ({ x: g.x, y: g.y }))
        : [],
    }),
  };
})();

window.Game = Game;
Game.init();
