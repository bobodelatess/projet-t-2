/* ============================================================
 * entities.js — Joueur, ennemis, pièces, particules + physique.
 * Collisions AABB résolues axe par axe contre la grille de tuiles.
 * Pas de temps fixe : 1 "step" == 1 frame à 60 Hz.
 * ============================================================ */

const PHYS = {
  GRAVITY: 0.72,
  MAX_FALL: 15,
  WALK_ACCEL: 0.5,
  RUN_ACCEL: 0.85,
  FRICTION: 0.6,
  MAX_WALK: 4.0,
  MAX_RUN: 6.6,
  JUMP_V: -14.5,      // hauteur de saut max ~146 px (≈ 3,6 tuiles)
  JUMP_CUT: 0.45,     // coupe le saut quand on relâche (hauteur variable)
  COYOTE: 6,          // frames de tolérance après avoir quitté le sol
  JUMP_BUFFER: 6,     // frames pendant lesquelles un saut "anticipé" reste mémorisé
};

const T = Level.TILE;

/* ---- Collision AABB contre la grille ---- */
function collideX(e) {
  e.x += e.vx;
  const top = Math.floor(e.y / T);
  const bottom = Math.floor((e.y + e.h - 1) / T);
  e.hitWall = false;
  if (e.vx > 0) {
    const col = Math.floor((e.x + e.w - 1) / T);
    for (let row = top; row <= bottom; row++) {
      if (Level.isSolid(col, row)) { e.x = col * T - e.w; e.vx = 0; e.hitWall = true; break; }
    }
  } else if (e.vx < 0) {
    const col = Math.floor(e.x / T);
    for (let row = top; row <= bottom; row++) {
      if (Level.isSolid(col, row)) { e.x = (col + 1) * T; e.vx = 0; e.hitWall = true; break; }
    }
  }
}

function collideY(e) {
  e.y += e.vy;
  const left = Math.floor(e.x / T);
  const right = Math.floor((e.x + e.w - 1) / T);
  e.onGround = false;
  e.headHit = null;
  if (e.vy > 0) {
    const row = Math.floor((e.y + e.h - 1) / T);
    for (let col = left; col <= right; col++) {
      if (Level.isSolid(col, row)) { e.y = row * T - e.h; e.vy = 0; e.onGround = true; break; }
    }
  } else if (e.vy < 0) {
    const row = Math.floor(e.y / T);
    for (let col = left; col <= right; col++) {
      if (Level.isSolid(col, row)) {
        e.y = (row + 1) * T; e.vy = 0;
        // Mémorise la tuile frappée la plus proche du centre du joueur
        e.headHit = { col, row };
        break;
      }
    }
  }
}

/* ===================== JOUEUR ===================== */
class Player {
  constructor(x, y) {
    this.spawn = { x, y };
    this.w = 28; this.h = 36;
    this.reset(x, y);
  }
  reset(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.walkTimer = 0;
    this.frame = 0;
    this.coyote = 0;
    this.jumpBuffer = 0;
    this.invuln = 0;        // frames d'invincibilité après un coup
    this.dead = false;
    this.deadTimer = 0;
    this.won = false;
    this.headHit = null;
  }

  takeDamage() {
    if (this.invuln > 0 || this.dead) return false;
    this.die();
    return true;
  }
  die() {
    this.dead = true;
    this.deadTimer = 0;
    this.vy = -11;          // petit saut de mort
    this.vx = 0;
  }

  update(input) {
    // Animation de mort : on tombe simplement
    if (this.dead) {
      this.deadTimer++;
      this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
      this.y += this.vy;
      return;
    }
    if (this.won) {
      // glisse / marche gérée par le jeu pendant la séquence de victoire
      this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
      collideY(this);
      this.x += this.vx;
      this.walkTimer += Math.abs(this.vx);
      this.frame = (Math.floor(this.walkTimer / 8) % 2) + 1;
      return;
    }

    const accel = input.run ? PHYS.RUN_ACCEL : PHYS.WALK_ACCEL;
    const maxSpeed = input.run ? PHYS.MAX_RUN : PHYS.MAX_WALK;

    // Déplacement horizontal
    if (input.left && !input.right) {
      this.vx -= accel; this.facing = -1;
    } else if (input.right && !input.left) {
      this.vx += accel; this.facing = 1;
    } else {
      // Friction
      if (this.vx > 0) this.vx = Math.max(0, this.vx - PHYS.FRICTION);
      else if (this.vx < 0) this.vx = Math.min(0, this.vx + PHYS.FRICTION);
    }
    this.vx = Math.max(-maxSpeed, Math.min(maxSpeed, this.vx));

    // Gestion du saut (coyote time + buffer + hauteur variable)
    if (this.onGround) this.coyote = PHYS.COYOTE; else if (this.coyote > 0) this.coyote--;
    if (input.jumpPressed) this.jumpBuffer = PHYS.JUMP_BUFFER; else if (this.jumpBuffer > 0) this.jumpBuffer--;

    if (this.jumpBuffer > 0 && this.coyote > 0) {
      this.vy = PHYS.JUMP_V;
      this.onGround = false;
      this.coyote = 0;
      this.jumpBuffer = 0;
      this.jumping = true;
      if (window.Game) Game.sfx('jump');
    }
    // Coupe le saut si on relâche tôt -> saut plus court
    if (!input.jump && this.vy < 0) this.vy *= PHYS.JUMP_CUT;

    // Gravité
    this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);

    // Collisions axe par axe
    collideX(this);
    collideY(this);
    if (this.onGround) this.jumping = false;

    // Empêche de sortir à gauche du niveau
    if (this.x < 0) { this.x = 0; this.vx = 0; }

    // Animation de marche
    if (this.onGround && Math.abs(this.vx) > 0.4) {
      this.walkTimer += Math.abs(this.vx);
      this.frame = (Math.floor(this.walkTimer / 18) % 2) + 1;
    } else {
      this.frame = 0;
      this.walkTimer = 0;
    }

    if (this.invuln > 0) this.invuln--;
  }

  draw(ctx, cam) {
    // Clignotement pendant l'invincibilité
    if (this.invuln > 0 && Math.floor(this.invuln / 4) % 2 === 0) return;
    const sx = Math.round(this.x - cam.x);
    const sy = Math.round(this.y - cam.y);
    Sprites.player(ctx, sx, sy, this.w, this.h, {
      facing: this.facing,
      frame: this.frame,
      walking: this.onGround && Math.abs(this.vx) > 0.4,
      jumping: !this.onGround && !this.dead,
    });
  }
}

/* ===================== GOOMBA ===================== */
class Goomba {
  constructor(x, y) {
    this.w = 34; this.h = 34;
    this.x = x; this.y = y;
    this.vx = -1.2; this.vy = 0;
    this.onGround = false;
    this.animTimer = 0;
    this.frame = 0;
    this.dead = false;
    this.squished = false;
    this.squishTimer = 0;
    this.remove = false;
  }

  stomp() {
    this.squished = true;
    this.dead = true;
    this.vx = 0;
    this.squishTimer = 0;
  }
  // Tué autrement (ex. brique qui éclate dessous) -> bascule
  kill() {
    this.dead = true;
    this.flipped = true;
    this.vy = -8;
  }

  update() {
    if (this.squished) {
      this.squishTimer++;
      if (this.squishTimer > 30) this.remove = true;
      return;
    }
    if (this.flipped) {
      this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
      this.y += this.vy;
      if (this.y > Level.height + 100) this.remove = true;
      return;
    }

    this.vy = Math.min(this.vy + PHYS.GRAVITY, PHYS.MAX_FALL);
    collideX(this);
    if (this.hitWall) this.vx = -this.vx; // demi-tour au mur

    collideY(this);

    // Demi-tour au bord d'une plateforme (ne tombe pas dans les trous)
    if (this.onGround) {
      const aheadCol = this.vx > 0
        ? Math.floor((this.x + this.w + 1) / T)
        : Math.floor((this.x - 1) / T);
      const footRow = Math.floor((this.y + this.h) / T);
      if (!Level.isSolid(aheadCol, footRow)) this.vx = -this.vx;
    }

    this.animTimer++;
    if (this.animTimer % 12 === 0) this.frame = this.frame ? 0 : 1;
  }

  draw(ctx, cam) {
    const sx = Math.round(this.x - cam.x);
    const sy = Math.round(this.y - cam.y);
    if (this.flipped) {
      ctx.save();
      ctx.translate(sx + this.w / 2, sy + this.h / 2);
      ctx.scale(1, -1);
      Sprites.goomba(ctx, -this.w / 2, -this.h / 2, this.w, this.h, { frame: this.frame });
      ctx.restore();
    } else {
      Sprites.goomba(ctx, sx, sy, this.w, this.h, { frame: this.frame, squished: this.squished });
    }
  }
}

/* ===================== PIÈCE ===================== */
class Coin {
  constructor(x, y) {
    this.w = 24; this.h = 28;
    this.x = x; this.y = y;
    this.frame = 0;
    this.timer = Math.floor(Math.random() * 8);
    this.collected = false;
  }
  update() {
    this.timer++;
    if (this.timer % 8 === 0) this.frame = (this.frame + 1) % 4;
  }
  draw(ctx, cam) {
    Sprites.coin(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, this.frame);
  }
}

/* ===================== PARTICULES ===================== */
class Particle {
  constructor(x, y, vx, vy, color, size = 6, life = 40) {
    this.x = x; this.y = y; this.vx = vx; this.vy = vy;
    this.color = color; this.size = size; this.life = life; this.maxLife = life;
  }
  update() {
    this.vy += 0.4;
    this.x += this.vx; this.y += this.vy;
    this.life--;
  }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x - cam.x, this.y - cam.y, this.size, this.size);
    ctx.globalAlpha = 1;
  }
}

/* Pièce qui jaillit d'un bloc "?" */
class CoinPop {
  constructor(x, y) {
    this.x = x; this.y = y; this.w = 24; this.h = 28;
    this.vy = -9; this.frame = 0; this.timer = 0; this.life = 26;
  }
  update() {
    this.vy += 0.6; this.y += this.vy; this.timer++; this.life--;
    if (this.timer % 4 === 0) this.frame = (this.frame + 1) % 4;
  }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    Sprites.coin(ctx, this.x - cam.x, this.y - cam.y, this.w, this.h, this.frame);
  }
}

/* Texte de score flottant (+100, +200...) */
class FloatingText {
  constructor(x, y, text) {
    this.x = x; this.y = y; this.text = text; this.life = 50;
  }
  update() { this.y -= 1.1; this.life--; }
  get dead() { return this.life <= 0; }
  draw(ctx, cam) {
    ctx.globalAlpha = Math.max(0, this.life / 50);
    ctx.fillStyle = '#fff';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.text, this.x - cam.x, this.y - cam.y);
    ctx.globalAlpha = 1;
  }
}
