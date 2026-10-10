# P O L O N E Z – A U T O D R I V E

**Created by:** Maciej Skorus

A synthwave-styled Three.js "coloring book"-like animation with a minigame: dodge the oncoming communist-era traffic. A built-in GUI lets you experiment with the scene's models and colors. See [CHANGELOG.md](CHANGELOG.md) for what the app does and how it got here.

The Polonez, its wheels, the palms and the rocks were modeled in 3Ds Max 2018, updated in 3Ds Max 2023, and exported as `.fbx` files. The minigame traffic (Fiat 126p, Škoda 120) and the mountains are built in code.

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
  core/            renderer, wireframe bloom, main loop, tweens, asset loading, input, seeded noise
  scene/           materials, shader wireframes, car, minigame traffic, spawner, height fields,
                   mountain shapes, world
    environment/   independent world parts: sky, lights, ground, sun, horizon range (hills),
                   side mountains (side hills), scenery
  game/            state machine, minigame, game orchestration
  ui/              theme, loader, HUD, scene GUI, CRT overlay, F10 stats
public/            FBX models (Polonez, wheel, palm, rocks) and textures
tests/             Vitest unit tests
```

- Change colors, world dimensions, speeds or texts in `src/config.js` only; CSS gets the palette as custom properties.
- Every world part follows `create(context) -> { update(dt, speedMultiplier) }`, so a part (e.g. the procedural mountains) can be replaced without touching the rest.
- Everything that moves or waits runs inside the single main loop.

---

## ℹ️ Info

- Resolution is intentionally halved to enhance the 80s aesthetic
- The mountains are procedural: ridged noise on the ground grid, low-poly triangles split along the ridges.
  - Both sides of the road are an endless conveyor of chunks rolling towards the camera; they grow out of the ground as they come closer, rising out of the horizon range.
  - The horizon range in front of the sun is static and parted like a sea for the road, so the striped sun shows in the pass.
  - The side panel (**Mountains**) sets their height, roughness and where they start, and the seed: a new landscape on every visit, or **New landscape**. The line style (triangles or squares) is `MOUNTAINS.lines` in `src/config.js`.
- The road starts lined with palms and rocks; they come from 200 m ahead and fade in and out.

---

## 🐞 Known Bugs

- None known

---

## 🌟 Future Ideas

- Rocks and palms that follow the terrain, so the mountains can start closer to the road; a sidewalk
- Palette presets: Original 2024, Take On Me, Game Boy, Tron, Vaporwave
- More communist-era cars in the minigame; springy suspension
- Touch controls

---

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).
