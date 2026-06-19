/* ============================================================
 * level.js — Définition du monde 1-1 via un "level builder".
 * On stampe des éléments sur une grille de tuiles, ce qui évite
 * d'aligner à la main d'immenses chaînes de caractères.
 * ============================================================ */
const Level = (function () {
  const TILE = 40;
  const ROWS = 12;          // 12 * 40 = 480 px => pas de scroll vertical
  const GROUND_TOP = 10;    // les 2 rangées du bas sont le sol
  const COLS = 214;

  // Grille de tuiles ('?' '#' 'B' 'P' 'o' ' ')
  const grid = Array.from({ length: ROWS }, () => new Array(COLS).fill(' '));
  const enemies = [];       // { col, row }
  const pipes = [];         // { col, row, h } pour le rendu groupé
  const decor = [];         // { type, x, y, w, h } arrière-plan
  let flagCol = COLS - 6;
  let playerStart = { col: 2, row: GROUND_TOP - 1 };

  /* ---- Helpers de construction (toujours appelés en row, col) ---- */
  const set = (row, col, ch) => {
    if (row >= 0 && row < ROWS && col >= 0 && col < COLS) grid[row][col] = ch;
  };
  const fillGround = () => {
    for (let c = 0; c < COLS; c++) { set(GROUND_TOP, c, '#'); set(GROUND_TOP + 1, c, '#'); }
  };
  const pit = (c0, c1) => {
    for (let c = c0; c <= c1; c++) { set(GROUND_TOP, c, ' '); set(GROUND_TOP + 1, c, ' '); }
  };
  const bricks = (row, c0, c1) => { for (let c = c0; c <= c1; c++) set(row, c, 'B'); };
  const coinRow = (row, c0, c1) => { for (let c = c0; c <= c1; c++) set(row, c, 'o'); };
  const goomba = (col, row = GROUND_TOP - 1) => enemies.push({ col, row });
  const pipe = (col, h) => {
    const top = GROUND_TOP - h;
    for (let r = top; r < GROUND_TOP; r++) { set(r, col, 'P'); set(r, col + 1, 'P'); }
    pipes.push({ col, row: top, h });
  };
  // Escalier de blocs solides (#) montant vers la droite (dir=1) ou la gauche
  const stairs = (startCol, height, dir = 1) => {
    for (let i = 0; i < height; i++) {
      const col = startCol + i * dir;
      for (let r = GROUND_TOP - 1 - i; r < GROUND_TOP; r++) set(r, col, '#');
    }
  };

  /* ======================= MONDE 1-1 ======================= */
  fillGround();

  // Décor d'arrière-plan
  decor.push({ type: 'hill', x: 1.5 * TILE, y: 7 * TILE, w: 4 * TILE, h: 3 * TILE });
  decor.push({ type: 'bush', x: 8 * TILE, y: 9 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 5 * TILE, y: 1.5 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 14 * TILE, y: 2.2 * TILE, w: 2.2 * TILE, h: 0.8 * TILE });
  decor.push({ type: 'hill', x: 24 * TILE, y: 8 * TILE, w: 3 * TILE, h: 2 * TILE });
  decor.push({ type: 'cloud', x: 28 * TILE, y: 1.4 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'bush', x: 33 * TILE, y: 9 * TILE, w: 4 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 44 * TILE, y: 2 * TILE, w: 2.5 * TILE, h: 0.9 * TILE });
  decor.push({ type: 'hill', x: 60 * TILE, y: 7 * TILE, w: 5 * TILE, h: 3 * TILE });
  decor.push({ type: 'bush', x: 70 * TILE, y: 9 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 76 * TILE, y: 1.8 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 95 * TILE, y: 2.4 * TILE, w: 2.4 * TILE, h: 0.9 * TILE });
  decor.push({ type: 'hill', x: 110 * TILE, y: 8 * TILE, w: 3 * TILE, h: 2 * TILE });
  decor.push({ type: 'bush', x: 120 * TILE, y: 9 * TILE, w: 4 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 130 * TILE, y: 1.6 * TILE, w: 3 * TILE, h: TILE });
  decor.push({ type: 'cloud', x: 150 * TILE, y: 2 * TILE, w: 2.6 * TILE, h: 0.9 * TILE });
  decor.push({ type: 'hill', x: 165 * TILE, y: 7 * TILE, w: 5 * TILE, h: 3 * TILE });
  decor.push({ type: 'bush', x: 185 * TILE, y: 9 * TILE, w: 3 * TILE, h: TILE });

  // Tous les tuyaux ont une hauteur <= 3 (franchissables d'un saut),
  // les trous font 3 tuiles de large, les plateformes "flottantes" sont
  // toujours atteignables (<= 3 tuiles au-dessus d'un appui).

  // --- Section 1 : prise en main ---
  set(7, 7, '?');
  bricks(7, 9, 12); set(7, 10, '?'); set(7, 8, '?');
  coinRow(6, 9, 12);
  goomba(15);
  pipe(18, 2);
  goomba(22);
  pipe(25, 3);

  // --- Section 2 : premières plateformes ---
  pipe(30, 3);
  set(7, 35, '?');
  bricks(7, 38, 42);
  goomba(40); goomba(41);
  coinRow(5, 38, 42);
  pit(46, 48);                 // 1er trou (saut simple)

  // --- Section 3 : escalier + briques flottantes ---
  stairs(52, 4, 1);
  bricks(6, 58, 61); set(6, 59, '?'); set(6, 60, '?');
  goomba(64); goomba(66);
  pipe(70, 2);
  coinRow(8, 73, 78);
  pit(80, 82);                 // 2e trou

  // --- Section 4 : zone de pièces en hauteur ---
  bricks(7, 88, 90);           // marche d'accès
  bricks(5, 92, 99);
  coinRow(4, 92, 99);
  goomba(95); goomba(97);
  pipe(103, 3);
  pit(109, 111);               // 3e trou (large appui après le tuyau)

  // --- Section 5 : pyramide de blocs ---
  stairs(115, 4, 1);
  stairs(122, 4, -1);          // descente
  goomba(130); goomba(132);
  set(7, 130, '?'); set(7, 132, '?'); set(7, 134, '?');
  coinRow(6, 130, 134);
  pipe(138, 2);

  // --- Section 6 : défi ---
  pit(144, 146);               // 4e trou
  bricks(7, 151, 156);
  set(7, 152, '?'); set(7, 155, '?');
  goomba(154);
  coinRow(6, 151, 156);
  pit(160, 162);               // 5e trou
  goomba(167); goomba(170); goomba(173);

  // --- Section 7 : couloir de pièces ---
  bricks(7, 172, 180);
  coinRow(6, 172, 180);
  pipe(184, 2);
  goomba(188);

  // --- Section finale : escalier + drapeau ---
  stairs(194, 4, 1);
  flagCol = 204;
  // château décoratif après le drapeau
  decor.push({ type: 'castle', x: 208 * TILE, y: 6 * TILE, w: 4 * TILE, h: 4 * TILE });

  /* ---- Calcul des structures dérivées (collision) ---- */
  const SOLID = new Set(['#', 'B', '?', 'P']);
  function isSolid(col, row) {
    if (row < 0 || row >= ROWS || col < 0 || col >= COLS) return false;
    return SOLID.has(grid[row][col]);
  }

  // Liste des pièces et des blocs interactifs à partir de la grille
  const coins = [];
  const blocks = [];           // briques & blocs '?' (peuvent être frappés)
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const ch = grid[r][c];
      if (ch === 'o') coins.push({ col: c, row: r });
      else if (ch === '?') blocks.push({ col: c, row: r, type: 'question', used: false });
      else if (ch === 'B') blocks.push({ col: c, row: r, type: 'brick' });
    }
  }

  return {
    TILE, ROWS, COLS, GROUND_TOP,
    grid, isSolid, SOLID,
    coins, blocks, enemies, pipes, decor,
    flagCol, playerStart,
    width: COLS * TILE,
    height: ROWS * TILE,
  };
})();
