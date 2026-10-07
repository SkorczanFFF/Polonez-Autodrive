# P O L O N E Z – A U T O D R I V E

**Created by:** Maciej Skorus

A synthwave-styled Three.js "coloring book"-like animation with a dodge-the-boxes minigame. A built-in GUI lets you experiment with the scene's models and colors.

All models were created in 3Ds Max 2018, updated in 3Ds Max 2023, and exported as `.fbx` files (some include animations).

---

## 🔗 Live Demo

- [https://polonez-autodrive.vercel.app/](https://polonez-autodrive.vercel.app/)
- [https://skorczanfff.github.io/Polonez-Autodrive/](https://skorczanfff.github.io/Polonez-Autodrive/)

---

## 🎮 Controls

| Key | Action |
|---|---|
| **ENTER** | Start the minigame (also from free ride or game over) |
| **F** | Free ride: steer without obstacles |
| **← / →** | Steer (hold to speed up) |
| **ESC** | Back to the menu |
| **H** | Hide / show the menu (eye button under FREE RIDE) to enjoy or recolor the scene |

All menu and game over buttons are clickable too. Drag with the mouse to orbit the camera outside the minigame.

---

## 🛠️ Development

Requires Node.js 22.12+.

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve the production build
npm test           # unit tests (Vitest)
npm run typecheck  # JSDoc type check (tsc)
npm run format     # Prettier
```

Press **F10** in the app for the developer stats overlay (FPS, draw calls, triangles, memory).

### Project layout

```
src/
  config.js        single source of truth: palette, layers, world size, gameplay, keys, texts
  main.js          bootstrap
  core/            renderer, main loop, tweens, asset loading, input
  scene/           materials, wireframe helpers, car, spawner, world
    environment/   independent world parts: sky, lights, ground, sun, hills, side hills, scenery
  game/            state machine, minigame, game orchestration
  ui/              theme, loader, HUD, scene GUI, CRT overlay, F10 stats
public/            FBX models and textures
tests/             Vitest unit tests
```

- Change colors, world dimensions, speeds or texts in `src/config.js` only; CSS gets the palette as custom properties.
- Every world part follows `create(context) -> { update(dt, speedMultiplier) }`, so a part (e.g. the animated side hills) can be replaced without touching the rest.
- Everything that moves or waits runs inside the single main loop.

---

## ℹ️ Info

- Resolution is intentionally halved to enhance the 80s aesthetic
- The side hills are two slowly rotating cylinders baked into `side.fbx`

---

## 🐞 Known Bugs

- Occasionally, the side hills clip through the front hills (the rotating cylinders intersect the horizon hills)

---

## 🌟 Future Ideas

- Procedurally generated side hills instead of the rotating cylinders
- Neon glow effects and cleaner "ink" outlines instead of triangle wireframes
- Touch controls

---

## 📝 Changelog

### October 2026
- Rebuilt on Vite and three.js r186, with the same look and gameplay
- Single source of truth (`src/config.js`), modular world parts, one main loop
- Real loading progress, every asset loaded once
- Free ride mode (**F**); ENTER always starts the minigame
- Fixed: frame-rate dependent steering, hold-to-accelerate, restart right after game over, ENTER resetting the car mid-game, memory leaks in the minigame and GUI, hitbox larger than the boxes

### May 2025
- Fixed Polonez 3D model; wheels are now separate from the body
- Added steering functionality (left/right) after pressing ENTER
- Introduced retro loading screen
- CRT effect now adjustable via GUI

### September 2024
- Added palm trees and road elements
- Updated color palette
- Deployed to Vercel
