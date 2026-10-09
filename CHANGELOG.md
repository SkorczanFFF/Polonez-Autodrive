# Changelog

All notable changes to Polonez Autodrive. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); new entries go to **Unreleased** first.
Entries describe what changes for someone using the app, compared with the previous version.

## What the app is

A synthwave "coloring book" scene in three.js: a Polonez drives towards a striped sunset sun on an
endless road. Every model is drawn as a flat-colored solid with a neon wireframe, and a side panel
lets you recolor and tweak everything.

- **Menu (idle):** the scene runs, the camera can be orbited with the mouse, the menu can be hidden
  (**H**) to enjoy or recolor the view.
- **Free ride (F):** steer the Polonez with **← / →**, no obstacles.
- **Minigame (ENTER):** a 3-2-1 countdown, then oncoming communist-era traffic (Fiat 126p, Škoda
  120). Dodge it: every car that passes scores a point, every 20 points the world gets 15% faster.
  A crash ends the game; the best score is kept in the browser.
- **Scene:** road and scrolling terrain grid, horizon hills and animated side hills, palms and rocks
  appearing out of the haze, a sky that glows magenta at the horizon, soft sunset shadows, glowing
  wireframes, a CRT overlay and an intentionally half-resolution, slightly blurry 80s look.
- **Side panel:** per layer (Polonez, hills, side hills, road, terrain, palms, rocks, traffic) the
  fill and line colors and visibility, line fading and glow, palm and rock density; sun colors and
  stripes, bloom, CRT, sky and fog, line width, and "Randomize all".
- **Keys:** ENTER start, F free ride, ESC menu, ← / → steer, H hide menu, G glow on/off, F10
  developer stats.

## [Unreleased]

Everything after the 2.0 parity rebuild, on the `vite-three-refactor` branch.

### Added

- New start menu: neon logo, equal MINI GAME / FREE RIDE buttons with keycaps, steering hint,
  best score, and a HIDE button (**H**) that leaves only a faint eye icon in the corner.
- In-game HUD (best, score and level), animated countdown, game over panel (score, best,
  NEW BEST, AGAIN / FREE RIDE / MENU); best score saved in `localStorage`.
- Self-hosted fonts: VT323 (HUD, terminal, side panel) and Pacifico (logo); the loader switches
  off like a CRT; `prefers-reduced-motion` turns UI animations and the CRT flicker off.
- F10 developer stats restyled as a SYS.MONITOR terminal panel.
- Car handling: the body rolls outwards on its own pivot while the wheels stay on the road, the
  front wheels steer (5°) and the car yaws with its sideways speed.
- Minigame traffic instead of boxes: low-poly Fiat 126p and Škoda 120 built in code from real
  dimensions (wheel arches, cabin, side windows, chrome bumpers, headlights), burnt-orange bodies
  with yellow lines.
- Visuals:
  - the sun as a wide soft light source (five shadow-casting lights spread over the disc);
  - toon shading (three flat bands) and the Retrowave Dusk palette (dark fills, neon lines);
  - procedural, anti-aliased terrain grid and synthwave sun shaders;
  - sky gradient with a glowing horizon; road and terrain reach the horizon inside the fog;
  - palms, rocks and traffic fade in instead of popping up;
  - wireframes drawn by a shader: line width in world units, lines of tiny on-screen triangles
    fade out (per layer), so far palms no longer turn into solid blobs;
  - bloom on the wireframes and the terrain grid, glow strength per layer, **G** to switch it;
  - optional ink-outline mode (`WIRE.mode: "edges"`).
- Side panel: Glow switch, Bloom folder, line width, per-layer line fade / line min / glow,
  traffic layer, aligned columns with square color previews and `#hex` values.

### Changed

- The Polonez sits 4 cm higher (`CAR.lift`), so its tyres no longer look sunk into the road.

### Removed

- `gridline2.png` and `suneffectalt.png` (820 KB), replaced by shaders.

## [2.0.0] – October 2026

Rebuilt from scratch on Vite and three.js r186 (from r116), with the same look and gameplay.
Tag `v2.0-parity`.

### Changed

- Vite build, JSDoc type checking, Vitest unit tests, Prettier; GitHub Pages workflow and a
  pinned Vercel config.
- One source of truth (`src/config.js`): palette, layers, world size, gameplay, keys and texts.
- One main loop for everything that moves or waits; a pure state machine for idle / free ride /
  countdown / playing / game over; modular world parts.
- Real loading progress; every asset is loaded once.
- Data-driven side panel (lil-gui) with smooth "Randomize all".
- ESC also works during the countdown; after game over the app returns to the menu.

### Added

- Free ride mode (**F**); ENTER always starts the minigame.

### Fixed

- Frame-rate dependent steering; hold-to-accelerate now works.
- Restarting right after game over; ENTER resetting the car mid-game.
- Memory leaks in the minigame and the side panel; a hitbox larger than the visible boxes.

## [1.x] – 2024 to January 2026

The original version (three.js r116, plain JavaScript). Tag `v1-legacy`.

### January 2026

- Codebase cleanup and dead code removal.
- Fixed the wheel and texture animation speed.

### August 2025

- Fixed boxes spawning too far left and right in the minigame.

### June 2025

- Smooth camera move when the minigame starts; smooth Polonez steering.
- Grab cursor on the scene; the Polonez stays still during the countdown and resets after a
  crash or escape.
- Box spawning tweaks; steering disabled during the countdown.
- "Randomize" scene colors in the side panel.

### May 2025

- Fixed the Polonez model; the wheels are separate from the body.
- Steering (left / right) after pressing ENTER.
- Retro loading screen; the CRT effect adjustable in the side panel.

### September 2024

- Palm trees and road elements; updated color palette.
- Deployed to Vercel.
