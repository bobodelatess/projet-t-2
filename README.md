# 🍄 Super Plombier Bros

Un jeu de plateforme à défilement horizontal façon **Super Mario Bros**, écrit en
**HTML5 Canvas + JavaScript pur** — aucune dépendance, aucune image externe
(tous les sprites sont dessinés en pixel-art au canvas).

![type](https://img.shields.io/badge/HTML5-Canvas-orange) ![deps](https://img.shields.io/badge/d%C3%A9pendances-0-brightgreen)

## ▶️ Jouer

Le plus simple : **ouvrir `index.html` dans un navigateur** (double-clic).
Le jeu fonctionne directement en `file://`, hors-ligne.

Ou, pour le servir localement :

```bash
npm start            # lance python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

## 🎮 Commandes

| Touche | Action |
| --- | --- |
| **← →** ou **A / D** | Se déplacer |
| **Espace** / **↑** / **W** | Sauter (maintenir = saut plus haut) |
| **Maj** | Courir |
| **Espace / Entrée** | Démarrer / rejouer (menus) |

## ✨ Fonctionnalités

- **Physique** soignée : gravité, accélération/friction, **saut à hauteur variable**,
  *coyote time* et *jump buffer* pour un contrôle agréable.
- **Défilement latéral** avec caméra qui suit le joueur et **parallaxe** sur le décor.
- **Ennemis** (Goombas) qui patrouillent, font demi-tour aux murs et aux bords, et
  qu'on peut **écraser** en sautant dessus.
- **Blocs `?`** (donnent des pièces), **briques** cassables, **tuyaux**, **trous**,
  **pièces** à collecter, **drapeau d'arrivée** avec séquence de victoire.
- **HUD** : score, pièces (100 pièces = 1 vie), monde, vies, écrans d'accueil / fin.
- **Effets sonores** rétro générés via la **Web Audio API**.

## 🗂️ Structure

```
index.html        Page + canvas + HUD + overlays
css/style.css     Style rétro
js/input.js       Clavier (avec fronts montants / buffering)
js/sprites.js     Rendu pixel-art procédural de toutes les entités
js/level.js       Construction du monde 1-1 (level builder + collisions)
js/entities.js    Joueur, Goomba, pièces, particules + physique/collisions
js/game.js        Boucle de jeu, caméra, états, score, son
test/sim.js       Test "headless" (sans navigateur)
```

## ✅ Test automatisé

Un harnais headless stubbe le DOM/Canvas, charge le vrai code du jeu et le **pilote
avec une IA simple** (avancer, sauter face aux murs / trous / ennemis) pour vérifier
que la boucle ne plante jamais **et** que le niveau est terminable :

```bash
npm test           # node test/sim.js  -> doit afficher "Niveau terminé... gagnable"
```

Le niveau a été conçu pour rester franchissable : tuyaux ≤ 3 tuiles, trous de 3 tuiles,
plateformes toujours atteignables (hauteur de saut ≈ 3,6 tuiles).
