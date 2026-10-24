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
  120). Dodge it: every car that passes scores a point, and every few points the world speeds up
  (`SPEED` in `src/config.js`). A crash ends the game; the best score is kept in the browser.
- **Scene:** road and scrolling terrain grid that rises into endless procedural mountains on both
  sides and a range in front of the sun, palms and rocks appearing out of the haze, a sky that
  glows crimson at the horizon, soft sunset shadows, glowing
  wireframes, a CRT overlay and an intentionally half-resolution, slightly blurry 80s look.
- **Side panel:** per layer (Polonez, traffic, road, terrain, palms, rocks, horizon range, side
  mountains, city) the fill and line colors and visibility, line fading and glow, palm and rock
  density; sun colors and stripes, mountain height / roughness / start / seed, the city's layout
  and haze, the night sky, sky and fog, bloom, CRT, line width, and "Randomize all".
- **Keys:** ENTER start, F free ride, ESC menu, ← / → steer, H hide menu, G glow on/off, R
  randomize all colors, F10
  developer stats.

## [Unreleased]

Everything after the 2.0 parity rebuild, on the `vite-three-refactor` branch.

### Added

- New start menu: neon logo in the scene's live colors (the Polonez over the sun, Commodore-style
  stripes of the scene around AUTODRIVE; recolored by the side panel and "Randomize all"), equal
  MINI GAME / FREE RIDE buttons with keycaps, steering hint, best score, and a HIDE button (**H**)
  that leaves only a faint eye icon in the corner.
- In-game HUD (best, score and level), animated countdown, game over panel (score, best,
  NEW BEST, AGAIN / FREE RIDE / MENU); best score saved in `localStorage`.
- Self-hosted fonts: VT323 (HUD, terminal, side panel) and Yellowtail (logo, titles); the loader
  switches off like a CRT; `prefers-reduced-motion` turns UI animations and the CRT flicker off.
- F10 developer stats restyled as a SYS.MONITOR terminal panel.
- Car handling like a real lane change: the nose turns towards where the car really goes, the
  body leans out on its own pivot (wheels stay on the road) on the way in and rocks the other way
  when the car straightens out; the front wheels steer (12°) and counter-steer as the nose swings
  back.
- Minigame traffic instead of boxes: low-poly Fiat 126p and Škoda 120 built in code from real
  dimensions (wheel arches, cabin, side windows, chrome bumpers, headlights), burnt-orange bodies
  with yellow lines.
- Visuals:
  - the sun as a wide soft light source (five shadow-casting lights spread over the disc);
  - toon shading (three flat bands) and the Retrowave Dusk palette (dark fills, neon lines);
  - procedural, anti-aliased terrain grid and synthwave sun shaders;
  - sky gradient with a glowing horizon; road and terrain reach the horizon inside the fog;
  - palms, rocks and traffic fade in and out (eased) instead of popping up and vanishing;
  - wireframes drawn by a shader: line width in world units, lines of tiny on-screen triangles
    fade out (per layer), so far palms no longer turn into solid blobs;
  - bloom on the wireframes and the terrain grid, glow strength per layer, **G** to switch it;
  - optional ink-outline mode (`WIRE.mode: "edges"`).
- Procedural synthwave mountains instead of the 2020 hill models: ridged noise on the ground
  grid, low-poly triangles split along the ridges. Both sides of the road roll endlessly towards
  the camera and grow out of the ground as they come closer (flat strips for palms and rocks
  stay). A static range in front of the sun rises layer behind layer and is parted like a sea for
  the road, the striped sun showing in the pass. A new landscape on every visit; a Mountains
  folder in the side panel sets height, roughness, where they start and the seed, plus a
  "New landscape" button.
- Side panel: Glow switch, Bloom folder, line width, per-layer line fade / line min / glow,
  traffic layer, aligned columns with square color previews and `#hex` values.
- Phones and tablets: the scene fits portrait screens (a wider view, and the camera follows the
  car sideways), the HUD keeps clear of notches and the home indicator, and free ride has
  on-screen steering (hold ← / →) and a MENU button. The minigame is not offered on touch screens
  yet.
- **R** randomizes all the scene colors, like the side panel's "Randomize all" button, in the
  menu and mid-game alike (the button says "Randomize all (R)").

### Changed

- The scene shows a grab cursor only where it can be orbited (menu, free ride) and a grabbing one
  while the left button holds it; the minigame keeps the plain cursor.
- Free ride: the camera rides along with the Polonez (you can still orbit around it) and comes
  back with it on ESC; the minigame and the menu keep their fixed camera.
- Free ride: the Polonez brakes into the road edge instead of stopping dead (which jolted the
  whole view, worst on phones), stops before turning back, and no longer shows steering while it
  pushes against the edge. The minigame keeps its handling.
- The Polonez sits 4 cm higher (`CAR.lift`), so its tyres no longer look sunk into the road.
- The UI tints that follow the scene colors (panels, buttons, titles after "Randomize all") are
  now mixed by the stylesheet in oklch: the same hue turn, lightness and chroma kept perceptually.
- Performance: the city is drawn in bands, so it costs nothing while it is behind the camera (it
  used to be drawn every frame: about a quarter of the frame's triangles).
- Side panel: sky and fog in an Environment folder, line width in the Polonez folder, CRT Effect
  starts closed.
- The game over panel stays until you pick AGAIN, FREE RIDE or MENU (it used to return to the
  menu after 3 s). The score is its headline, a big centered number with the record (or
  NEW BEST!) under it, and the panel is frosted, so the scene behind it no longer competes.
- Side panel: color fields take a typed or pasted `#hex`; a roomier "Randomize all" button.
- Crimson fog (`#c70050`) instead of magenta.
- The world is twice as long: palms and rocks come from 200 m ahead (the road starts lined with
  them), the fog reaches 400 m and the sun is twice as far and twice as big (same size on screen).
- Game over counts the score up arcade style once its panel is in, then flashes it and keeps it
  pulsing like a neon sign; the tail of the big "G" in "Game Over" is no longer cut off.
- A crash no longer cuts straight to the menu: the world brakes to a halt with the traffic still on
  the road, the camera shakes and the screen flashes; the game over panel shows up 0.6 s later,
  when keys and buttons work again (no accidental restart). The camera and the side panel come
  back only when you leave game over.
- Menu, game over and the loading screen fit phone screens: the buttons stack, the loader's
  terminal and text shrink to the width, and the logo shrinks smoothly with narrow screens
  ("Polonez" never under ~300 px) instead of jumping between sizes.
- Touch screens (phones, tablets without a keyboard) get the scene to look at: a bigger logo,
  HIDE, the side panel (starting folded) and the camera orbiting with one finger, pinch to zoom.
  Pinching the scene zooms the scene, never the page.
- Side panel: the hill layers are now "Horizon range" and "Side mountains"; "Line width (all)"
  says that it sets every line.
- "Randomize all" picks a palette instead of unrelated random colors: a few related hues, and
  lines in another hue than their model that always stand out from it (at least 3:1 contrast),
  so they no longer vanish into a fill of a similar color. Three moods: night (dark fills, neon
  lines, dark sky, glowing fog), day (pastel fills, dark lines, light sky) and mixed, where every
  layer goes dark or light on its own.
- The interface wears the scene's palette: panels, buttons, the loader, the HUD and the side
  panel take their hue from the ground grid, the Polonez lines and the sun, keeping their
  brightness, so a recolored or randomized scene no longer sits under a blue UI and every text
  stays as readable as with the default colors.
- No flash of unstyled buttons on a white page before the app loads: the page stays dark and
  empty until its styles and colors are in, then the loader appears.
- Behind the car: night falls over the back of the sky, with stars and a crescent moon striped
  like the sun, blending softly into the sunset (only under a dark sky: a light, daytime sky stays
  without stars). Far away stands the neon metropolis we drive away from, far wider than the
  valley: a ragged skyline bending away like a banana, its tall, dense downtown nearest, the lower
  outskirts further back, its towers rising over the side mountains out of a haze in the fog
  color, outlined in neon with lit windows (whole floors, columns or single ones, different per
  tower). A Night sky folder sets the night color, how far round the sky it reaches and how soft
  the dusk is, the stars and the moon; the City layer sets the number of towers, their height,
  lit windows and the haze. "New landscape" moves the city too.
- Behind the car the side mountains sink back into the ground before they leave, opening onto
  the city, instead of vanishing in big chunks in front of it.
- The horizon range no longer starts with an even, flat ramp: its foot is ragged, the rock
  beginning further back in some places than in others, rising in steep faces, with loose crags
  in front.
- Side panel in thematic order: the cars and the sun, the road and its sides, the landscape
  (mountains, horizon range, side mountains, city), the night sky and the environment (with the
  landscape seed and "New landscape"), the effects, then the switches; the glow switch is now
  "Wireframe glow (G)".
- Shadows are drawn only for things near the car, not for the palms and rocks far behind it
  (about 18% fewer triangles and 29% fewer draw calls per frame).

### Removed

- `gridline2.png` and `suneffectalt.png` (820 KB), replaced by shaders.
- `hills.fbx` and `side.fbx` (161 KB), replaced by the procedural mountains; with them the
  side hills clipping through the horizon hills.

### Fixed

- With "reduce motion" on in the OS, the CRT flicker is off by default but can be switched on in the
  side panel again; the stylesheet no longer overrides the switch.
- The sun's "Show effect" switch in the side panel works again: since the rebuild it had not been
  toggling the gradient, the cuts and the halo.

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
