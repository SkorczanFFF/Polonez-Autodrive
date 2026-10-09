# P O L O N E Z – A U T O D R I V E

**Created by:** Maciej Skorus

A synthwave-styled Three.js "coloring book"-like animation with a minigame: dodge the oncoming communist-era traffic. A built-in GUI lets you experiment with the scene's models and colors. See [CHANGELOG.md](CHANGELOG.md) for what the app does and how it got here.

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
| **H** | Hide / show the menu (eye button in the top-left corner) to enjoy or recolor the scene |
| **G** | Glow on the wireframes on / off (also in the side panel) |

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
  core/            renderer, wireframe bloom, main loop, tweens, asset loading, input
  scene/           materials, shader wireframes, car, minigame traffic, spawner, world
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

- Procedurally generated roadside (sidewalk, palms, rocks, hills) instead of the rotating cylinders
- Palette presets: Original 2024, Take On Me, Game Boy, Tron, Vaporwave
- More communist-era cars in the minigame; springy suspension
- Touch controls

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).
