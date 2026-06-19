/* ============================================================
 * input.js — Gestion centralisée du clavier
 * ============================================================ */
const Input = (function () {
  // État courant des actions du jeu
  const state = {
    left: false,
    right: false,
    jump: false,    // true tant que la touche est maintenue
    jumpPressed: false, // true seulement à la frame d'appui (front montant)
    run: false,
    start: false,   // Espace / Entrée (menus)
  };

  // Mapping touche physique -> action(s)
  const keyMap = {
    ArrowLeft: 'left',
    KeyA: 'left',
    ArrowRight: 'right',
    KeyD: 'right',
    ArrowUp: 'jump',
    KeyW: 'jump',
    Space: 'jump',
    ShiftLeft: 'run',
    ShiftRight: 'run',
  };

  // Touches qui valident les menus
  const startKeys = new Set(['Space', 'Enter', 'NumpadEnter']);

  window.addEventListener('keydown', (e) => {
    if (keyMap[e.code] || startKeys.has(e.code)) e.preventDefault();

    const action = keyMap[e.code];
    if (action) {
      // Détecte le front montant du saut (ignore l'auto-répétition clavier)
      if (action === 'jump' && !state.jump && !e.repeat) {
        state.jumpPressed = true;
      }
      state[action] = true;
    }

    if (startKeys.has(e.code) && !e.repeat) {
      state.start = true;
    }
  });

  window.addEventListener('keyup', (e) => {
    const action = keyMap[e.code];
    if (action) state[action] = false;
    if (startKeys.has(e.code)) state.start = false;
  });

  // Réinitialise les fronts montants après chaque frame de jeu
  function endFrame() {
    state.jumpPressed = false;
  }

  // Consomme l'appui « start » (pour ne pas redéclencher en boucle)
  function consumeStart() {
    const was = state.start;
    state.start = false;
    return was;
  }

  return { state, endFrame, consumeStart };
})();
