/* ============================================================
 * sprites.js — Rendu pixel-art procédural (aucune image externe)
 * Chaque entité est dessinée sur une grille virtuelle, mise à
 * l'échelle pour remplir le rectangle (x, y, w, h) demandé.
 * ============================================================ */
const Sprites = (function () {

  // Palette
  const COL = {
    hat: '#e52521', hatDark: '#a81916',
    skin: '#ffc18a', skinDark: '#e09b63',
    hair: '#5a2d0c',
    eye: '#1a1a2e',
    overall: '#1f6fd6', overallDark: '#154e99',
    button: '#fcd200',
    shoe: '#5a2d0c',
    white: '#ffffff',
    goomba: '#9c5a2c', goombaDark: '#5e3414', goombaFoot: '#3a1f0a',
    coin: '#fcd200', coinHi: '#fff7b0', coinLo: '#c89200',
    brick: '#c5612b', brickDark: '#8a3d16', brickLine: '#5e2a0e',
    qblock: '#f4a51c', qblockDark: '#c47a00', qblockUsed: '#9c6a2c',
    rivet: '#7a4a00',
    pipe: '#3cc04a', pipeDark: '#1f8a2e', pipeHi: '#8af090',
    grass: '#4caf2e', dirt: '#9c5a2c', dirtDark: '#7a3f16',
    flag: '#2ecc40', pole: '#bdbdbd', poleTop: '#fcd200',
  };

  // Remplit une cellule (ou un bloc de cellules) de la grille courante.
  // Closure créée par chaque drawer pour capturer cw/ch/origine.
  function painter(ctx, ox, oy, cw, ch) {
    return function r(col, row, color, wCells = 1, hCells = 1) {
      ctx.fillStyle = color;
      // +0.6 évite les fines lignes entre cellules dues à l'arrondi
      ctx.fillRect(ox + col * cw, oy + row * ch, cw * wCells + 0.6, ch * hCells + 0.6);
    };
  }

  // Dessine en miroir horizontal si facing === -1
  function withFacing(ctx, x, w, facing, draw) {
    if (facing === -1) {
      ctx.save();
      ctx.translate(x + w, 0);
      ctx.scale(-1, 1);
      draw(0);
      ctx.restore();
    } else {
      draw(x);
    }
  }

  /* ---------------- JOUEUR (plombier) ---------------- */
  function player(ctx, x, y, w, h, opt = {}) {
    const { facing = 1, frame = 0, walking = false, jumping = false } = opt;
    withFacing(ctx, x, w, facing, (px) => {
      const cols = 16, rows = 16;
      const cw = w / cols, ch = h / rows;
      const r = painter(ctx, px, y, cw, ch);

      // Casquette
      r(5, 0, COL.hat, 7, 1);
      r(4, 1, COL.hat, 9, 1);
      r(3, 2, COL.hatDark, 1, 1); r(4, 2, COL.hat, 8, 1); r(12, 2, COL.hat, 1, 1);
      // Visage
      r(4, 3, COL.hair, 1, 1); r(5, 3, COL.skin, 6, 1); r(11, 3, COL.skin, 1, 1);
      r(4, 4, COL.hair, 1, 1); r(5, 4, COL.skin, 1, 1); r(6, 4, COL.eye, 1, 1);
      r(7, 4, COL.skin, 4, 1); r(11, 4, COL.skin, 1, 1);
      r(4, 5, COL.skin, 8, 1);
      // Moustache
      r(4, 6, COL.hair, 2, 1); r(6, 6, COL.skin, 1, 1); r(7, 6, COL.hair, 4, 1); r(11, 6, COL.skin, 1, 1);
      // Cou / haut du t-shirt
      r(6, 7, COL.skin, 4, 1);

      if (jumping) {
        // Bras levé en saut
        r(3, 6, COL.hat, 1, 2);
        r(11, 5, COL.hat, 2, 1); r(12, 4, COL.skin, 1, 1);
        r(4, 8, COL.hat, 8, 1);
        r(3, 9, COL.hat, 1, 1); r(4, 9, COL.overall, 8, 1); r(12, 9, COL.skin, 1, 1);
        r(4, 10, COL.overall, 8, 2);
        r(6, 10, COL.button, 1, 1); r(9, 10, COL.button, 1, 1);
        // Jambes repliées
        r(4, 12, COL.overall, 3, 1); r(9, 12, COL.overall, 3, 1);
        r(3, 13, COL.shoe, 4, 1); r(9, 13, COL.shoe, 4, 1);
      } else {
        // Bras + t-shirt rouge
        r(3, 8, COL.hat, 2, 1); r(5, 8, COL.hat, 6, 1); r(11, 8, COL.hat, 2, 1);
        // Mains
        r(3, 9, COL.skin, 1, 1); r(12, 9, COL.skin, 1, 1);
        // Salopette bleue + boutons
        r(4, 9, COL.overall, 8, 1);
        r(4, 10, COL.overall, 8, 2);
        r(6, 10, COL.button, 1, 1); r(9, 10, COL.button, 1, 1);
        // Jambes (animées)
        if (walking && frame === 1) {
          r(4, 12, COL.overall, 3, 1); r(8, 12, COL.overall, 4, 1);
          r(3, 13, COL.shoe, 3, 1); r(9, 13, COL.shoe, 4, 1);
          r(2, 14, COL.shoe, 4, 1); r(9, 14, COL.shoe, 4, 1);
        } else if (walking && frame === 2) {
          r(4, 12, COL.overall, 4, 1); r(9, 12, COL.overall, 3, 1);
          r(4, 13, COL.shoe, 4, 1); r(10, 13, COL.shoe, 3, 1);
          r(4, 14, COL.shoe, 4, 1); r(9, 14, COL.shoe, 4, 1);
        } else {
          // Debout
          r(4, 12, COL.overall, 3, 1); r(9, 12, COL.overall, 3, 1);
          r(3, 13, COL.shoe, 4, 1); r(9, 13, COL.shoe, 4, 1);
          r(3, 14, COL.shoe, 4, 1); r(9, 14, COL.shoe, 4, 1);
        }
      }
    });
  }

  /* ---------------- GOOMBA ---------------- */
  function goomba(ctx, x, y, w, h, opt = {}) {
    const { frame = 0, squished = false } = opt;
    const cols = 16, rows = 16;
    const cw = w / cols, ch = h / rows;

    if (squished) {
      const r = painter(ctx, x, y, cw, ch);
      r(2, 12, COL.goombaDark, 12, 1);
      r(1, 13, COL.goomba, 14, 2);
      r(3, 13, COL.eye, 2, 1); r(11, 13, COL.eye, 2, 1);
      return;
    }

    const r = painter(ctx, x, y, cw, ch);
    // Tête bombée
    r(5, 2, COL.goomba, 6, 1);
    r(3, 3, COL.goomba, 10, 1);
    r(2, 4, COL.goomba, 12, 3);
    r(2, 7, COL.goomba, 12, 2);
    // Sourcils / yeux fâchés
    r(4, 5, COL.white, 3, 2); r(9, 5, COL.white, 3, 2);
    r(5, 5, COL.eye, 1, 1); r(10, 5, COL.eye, 1, 1);
    r(6, 6, COL.eye, 1, 1); r(9, 6, COL.eye, 1, 1);
    r(4, 4, COL.goombaDark, 3, 1); r(9, 4, COL.goombaDark, 3, 1);
    // Bas du corps
    r(3, 9, COL.goombaDark, 10, 1);
    // Pieds (animés)
    if (frame === 1) {
      r(2, 10, COL.goombaFoot, 5, 2); r(9, 10, COL.goombaFoot, 5, 2);
    } else {
      r(3, 10, COL.goombaFoot, 5, 2); r(8, 10, COL.goombaFoot, 5, 2);
    }
  }

  /* ---------------- PIÈCE ---------------- */
  function coin(ctx, x, y, w, h, frame = 0) {
    // « frame » 0..3 simule la rotation en variant la largeur
    const widths = [1, 0.6, 0.2, 0.6];
    const ww = w * widths[frame % 4];
    const cx = x + w / 2;
    ctx.fillStyle = COL.coinLo;
    ctx.beginPath();
    ctx.ellipse(cx, y + h / 2, ww / 2, h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COL.coin;
    ctx.beginPath();
    ctx.ellipse(cx, y + h / 2, ww / 2 * 0.78, h / 2 * 0.86, 0, 0, Math.PI * 2);
    ctx.fill();
    if (frame % 4 === 0 || frame % 4 === 2) {
      ctx.fillStyle = COL.coinHi;
      ctx.fillRect(cx - ww * 0.08, y + h * 0.22, Math.max(2, ww * 0.16), h * 0.56);
    }
  }

  /* ---------------- BLOC ? ---------------- */
  function questionBlock(ctx, x, y, w, h, opt = {}) {
    const { used = false, bump = 0 } = opt;
    y -= bump; // léger sursaut quand on le frappe
    const base = used ? COL.qblockUsed : COL.qblock;
    const dark = used ? COL.qblockUsed : COL.qblockDark;
    ctx.fillStyle = dark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = base;
    ctx.fillRect(x + w * 0.06, y + h * 0.06, w * 0.88, h * 0.88);
    // Rivets
    ctx.fillStyle = COL.rivet;
    const s = w * 0.1;
    ctx.fillRect(x + w * 0.1, y + h * 0.1, s, s);
    ctx.fillRect(x + w * 0.8, y + h * 0.1, s, s);
    ctx.fillRect(x + w * 0.1, y + h * 0.8, s, s);
    ctx.fillRect(x + w * 0.8, y + h * 0.8, s, s);
    if (!used) {
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.floor(h * 0.6)}px "Press Start 2P", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', x + w / 2, y + h * 0.55);
    }
  }

  /* ---------------- BRIQUE ---------------- */
  function brick(ctx, x, y, w, h) {
    ctx.fillStyle = COL.brickDark;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = COL.brick;
    ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
    ctx.strokeStyle = COL.brickLine;
    ctx.lineWidth = Math.max(1, w * 0.04);
    ctx.beginPath();
    ctx.moveTo(x, y + h / 2); ctx.lineTo(x + w, y + h / 2);
    ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w / 2, y + h / 2);
    ctx.moveTo(x + w * 0.25, y + h / 2); ctx.lineTo(x + w * 0.25, y + h);
    ctx.moveTo(x + w * 0.75, y + h / 2); ctx.lineTo(x + w * 0.75, y + h);
    ctx.stroke();
  }

  /* ---------------- SOL ---------------- */
  function ground(ctx, x, y, w, h, topRow) {
    if (topRow) {
      ctx.fillStyle = COL.grass;
      ctx.fillRect(x, y, w, h * 0.28);
      ctx.fillStyle = COL.dirt;
      ctx.fillRect(x, y + h * 0.28, w, h * 0.72);
    } else {
      ctx.fillStyle = COL.dirt;
      ctx.fillRect(x, y, w, h);
    }
    ctx.strokeStyle = COL.dirtDark;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  }

  /* ---------------- TUYAU ---------------- */
  // Dessine un tuyau complet de hauteur h, embouchure incluse.
  function pipe(ctx, x, y, w, h) {
    const lip = Math.min(h, w * 0.45);
    // Corps
    ctx.fillStyle = COL.pipeDark;
    ctx.fillRect(x + w * 0.12, y + lip, w * 0.76, h - lip);
    ctx.fillStyle = COL.pipe;
    ctx.fillRect(x + w * 0.18, y + lip, w * 0.5, h - lip);
    ctx.fillStyle = COL.pipeHi;
    ctx.fillRect(x + w * 0.2, y + lip, w * 0.12, h - lip);
    // Embouchure
    ctx.fillStyle = COL.pipeDark;
    ctx.fillRect(x, y, w, lip);
    ctx.fillStyle = COL.pipe;
    ctx.fillRect(x + w * 0.06, y + lip * 0.18, w * 0.88, lip * 0.7);
    ctx.fillStyle = COL.pipeHi;
    ctx.fillRect(x + w * 0.1, y + lip * 0.18, w * 0.14, lip * 0.7);
  }

  /* ---------------- DRAPEAU D'ARRIVÉE ---------------- */
  function flag(ctx, x, y, w, h, opt = {}) {
    const { flagY = 0 } = opt; // hauteur du drapeau (descend à l'arrivée)
    // Mât
    ctx.fillStyle = COL.pole;
    ctx.fillRect(x + w * 0.45, y, w * 0.1, h);
    ctx.fillStyle = COL.poleTop;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y, w * 0.16, 0, Math.PI * 2);
    ctx.fill();
    // Drapeau (triangle)
    ctx.fillStyle = COL.flag;
    const fy = y + h * 0.08 + flagY;
    ctx.beginPath();
    ctx.moveTo(x + w * 0.45, fy);
    ctx.lineTo(x - w * 0.35, fy + h * 0.1);
    ctx.lineTo(x + w * 0.45, fy + h * 0.2);
    ctx.closePath();
    ctx.fill();
  }

  /* ---------------- DÉCORS ---------------- */
  function cloud(ctx, x, y, w, h) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    const r = h * 0.5;
    ctx.beginPath();
    ctx.arc(x + r, y + r, r, 0, Math.PI * 2);
    ctx.arc(x + w * 0.45, y + r * 0.7, r * 1.25, 0, Math.PI * 2);
    ctx.arc(x + w - r, y + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + r, y + r, w - 2 * r, r);
  }

  function hill(ctx, x, y, w, h) {
    ctx.fillStyle = '#3aa028';
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    ctx.quadraticCurveTo(x + w / 2, y - h * 0.2, x + w, y + h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2e7d20';
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.55, w * 0.06, 0, Math.PI * 2);
    ctx.arc(x + w * 0.38, y + h * 0.72, w * 0.05, 0, Math.PI * 2);
    ctx.arc(x + w * 0.62, y + h * 0.72, w * 0.05, 0, Math.PI * 2);
    ctx.fill();
  }

  function bush(ctx, x, y, w, h) {
    ctx.fillStyle = '#46c02e';
    const r = h * 0.6;
    ctx.beginPath();
    ctx.arc(x + r, y + h - r, r, 0, Math.PI * 2);
    ctx.arc(x + w * 0.5, y + h - r * 1.3, r * 1.1, 0, Math.PI * 2);
    ctx.arc(x + w - r, y + h - r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillRect(x + r, y + h - r, w - 2 * r, r);
  }

  return {
    player, goomba, coin, questionBlock, brick, ground, pipe, flag,
    cloud, hill, bush, COL,
  };
})();
