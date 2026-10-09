# REVIEW — Polonez Autodrive (przed deployem)

> Stan: `main` @ `a3dc09a`. Przeczytane w całości: `js/core`, `js/models`, `js/utils`, `index.html`, `style.css`. Pominięte jako vendor: `three.js`, `FBXLoader.js`, `inflate.min.js`, `dat.gui.module.js`.
> Scena była też odpalona lokalnie: ok. 69 FPS przy 1920×889, 104 meshe, 64 draw calle, ok. 13 tys. trójkątów, 27 warningów z FBXLoadera w konsoli.

## TL;DR

Scena wygląda dobrze i działa. Pod spodem są jednak **trzy nachodzące na siebie mechanizmy czasu**: główna pętla, osobne `requestAnimationFrame` per obiekt i `setTimeout`/`setInterval`. Do tego **dwa źródła prawdy dla kolorów i stanu** oraz **ręczna synchronizacja klonów wireframe w każdym miejscu**. Z tego biorą się prawie wszystkie bugi poniżej.

Trzy zmiany robią 80% roboty:

1. **Wireframe jako dziecko mesha** (współdzielona geometria) zamiast osobnego klonu w scenie. Znika cały kod `sync*`, podwójne mixery i podwójne ładowanie `side.FBX`.
2. **Jedna pętla i jedna prędkość świata.** Wszystko, co się rusza (palmy, skały, boxy, tekstury, koła), aktualizuje się w `update(delta)` i czyta `world.speed`. Koniec z `Date.now()` i rAF per obiekt.
3. **`THREE.LoadingManager` + `Promise.all`** zamiast sztucznych timerów 2000/3000/4000/5000/8000 ms.

Szacunek: ~2400 linii własnego JS → ~1100–1300 linii, przy tej samej funkcjonalności.

## Decyzje (2026-10-07)

- **Three.js:** podbijamy do aktualnej wersji (ESM).
- **Build:** Vite.
- **Mobile:** nice-to-have, odkładamy na później. Input od razu robimy przez warstwę „akcji” (`left/right/start/free/exit`), a nie surowe klawisze, żeby dotyk dało się dopiąć bez przeróbek.
- **Render w 1/2 rozdzielczości z rozmyciem zostaje.** To zamierzony styl lat 80. Poprawiamy tylko bug z `Math.floor` (P0 #11).
- **ENTER = start minigry.** Dochodzi osobny tryb **wolnej jazdy** poza minigrą: klawisz `F` + klikalny przycisk na ekranie (ten sam przycisk posłuży potem na mobile). ESC wraca z wolnej jazdy do idle.
- **Strategia: przepisanie warstwy kodu na nowym szkielecie, nie refactor w miejscu.** Uzasadnienie i plan są w sekcji „Plan przepisania” na końcu.

---

## P0 — bugi do poprawki przed deployem

| # | Gdzie | Problem | Skutek |
|---|---|---|---|
| 1 | `Application.js:113` | Fallback po 5 s wywołuje `initializeControllers()` nawet wtedy, gdy `polonez.FBX` (668 KB) się nie wczytał. `PolonezController.initialize()` loguje błąd i **nie podpina listenerów**, a `modelsLoaded = true` blokuje ponowną próbę. | Na wolnym łączu sterowanie i minigra są martwe do odświeżenia strony. |
| 2 | `Application.js:77` + `ModelLoader.js:53` | `itemLoaded()` liczony podwójnie: raz w callbacku loadera, drugi raz w sztucznym `setTimeout(2000)`. Do tego `LoadingManager` kończy przy >75% (`LoadingManager.js:114`), a `totalItems` jest obcięte do 10 (`:100`). | Pasek postępu jest fikcją. Loader potrafi zniknąć przed modelami (pop-in) albo wisieć 2 s przy szybkim łączu. |
| 3 | `PolonezController.js:69` | ENTER **w trakcie gry** woła `resetPosition()`, czyli auto płynnie wraca na środek. | Darmowy „unik” i cheat. ENTER powinien być zablokowany, kiedy gra jest aktywna. |
| 4 | `MinigameManager.js:453` | Po kolizji `setTimeout(3000)` chowa overlay. Jeśli gracz w ciągu 3 s zacznie nową grę ENTERem, timeout schowa overlay **nowej** gry. | Znika odliczanie i wynik w trakcie rozgrywki. |
| 5 | `MinigameManager.js:145` | `countdownInterval` nie jest zapisany ani czyszczony w `endMinigame`. ESC dokładnie przy „START!” kończy grę, ale interval dalej leci i ustawia `scoreElement.display = block`. | Przy następnym starcie podczas odliczania widać „SCORE: 0”. Interval wycieka. |
| 6 | `PolonezController.js:92,95` | `lastKeyPressTime = Date.now()` na **każdym** `keydown`, łącznie z autorepeatem OS (co ~30 ms, brak sprawdzenia `event.repeat`). | `keyPressDuration` jest zawsze ≈0, więc przyspieszenie przy przytrzymaniu klawisza **nigdy nie działa**. |
| 7 | `PolonezController.js:120–160, 239` | Sterowanie liczone „na klatkę” (`+= currentSpeed`, easing `0.15`/klatkę) bez `delta`, a przeszkody ruszają się wg czasu. | Na 144 Hz auto skręca ~2,4× szybciej niż na 60 Hz. Trudność gry zależy od monitora. |
| 8 | `MinigameManager.js:298–300` | Każdy box tworzy nowe `BoxGeometry` + `MeshPhongMaterial`, a usuwanie to tylko `scene.remove()` bez `dispose()`. | Wyciek pamięci GPU rosnący z każdą grą (`renderer.info.memory.geometries`). |
| 9 | `MinigameManager.js:365` | `Box3().setFromObject(polonez)` liczone **per box, per klatkę**, czyli traversal wszystkich wierzchołków auta (~kilka tys.) N razy na klatkę. Do tego `new Vector3` per klatkę (`:336`). | Niepotrzebne koszty CPU i GC. Bounding box auta wystarczy policzyć raz na klatkę (albo raz w ogóle i przesuwać o `x`). |
| 10 | `MinigameManager.js:298 vs 336` | Box wizualnie ma 4.25×4×6, a kolizyjnie 4.5×4×8. | Kolizje „z powietrzem”: gracz ginie, choć wizualnie nie dotknął boxa. |
| 11 | `SceneManager.js:128` | `clientWidth / 2` bywa ułamkiem (np. 1365/2 = 682.5), a `canvas.width` jest intem, więc warunek `!==` jest zawsze prawdziwy. | Przy nieparzystej szerokości okna `setSize()` + `updateProjectionMatrix()` lecą **co klatkę**. Wystarczy `Math.floor`. |
| 12 | `SpawnManager.js:72`, `MinigameManager.js:318` i in. | Animacje oparte na `Date.now()` + rAF, a spawn na `setInterval`. Przy schowanej karcie rAF stoi, a interval dalej spawnuje (throttling 1/s). `clock.getDelta()` po powrocie nie jest przycięty. | Po powrocie do karty: skok tekstur i kół, palmy i skały teleportują się albo pojawiają hurtem. W grze boxy przeskakują przez auto. Brakuje `delta = Math.min(delta, 0.1)` i pauzy na `visibilitychange`. |
| 13 | `GUIManager.js:177, 204, 700–703` | `material.clone()` przy każdej zmianie koloru auta, a w „Randomize” **co klatkę przez 1 s** (×2 materiały). Nic nie jest dispose'owane. | Wyciek materiałów. Do tego niepotrzebne: koła i tak używają tego samego materiału `polonez`, więc zmiana koloru propagowałaby się sama. Klon to łata, która wymusiła kolejną łatę (`setWheelsVisibility`). |
| 14 | `GUIManager.js:11–69` vs `MaterialManager.js:3–42` | Domyślne kolory w GUI ≠ kolory materiałów: `polonezWireframe` `#fff6ba` vs `#ffdf7c`, `rock` `#8b8b8b` vs `#9047c3`, `rockWireframe` `#ff5a5a` vs `#66b6cf`. | GUI na starcie pokazuje nieprawdziwe kolory. Klasyczne dwa źródła prawdy. |
| 15 | `MinigameManager.js:424` | Po ESC rotacja auta jest ustawiana na `(0,0,0)` zamiast `initialRotation`. | Dziś działa, bo root FBX ma rotację 0. Pęknie po re-eksporcie modelu z inną osią. |
| 16 | `ModelLoader.js:61` i 3 inne miejsca | `xhr.loaded / xhr.total`, a przy gzip/brotli bez `Content-Length` (Vercel, GH Pages) `total === 0`. | Napisy typu „LOADING: POLONEZ Infinity%” albo „NaN%”. |

---

## Architektura / bad patterns

### A. Wireframe jako osobny obiekt w scenie (root cause wielu problemów)
Każdy model istnieje 2× w scenie: solid i klon wireframe. Każdy ma własny transform, a dla animowanych także własny `AnimationMixer`. Skutek:
- ręczne `syncModels` / `position.copy` / `rotation.z =` w `SpawnManager`, `PolonezController` (×4 miejsca), `ModelLoader`, `Application`;
- `side.FBX` **pobierany i parsowany dwa razy** (`Application.js:128` i `:142`);
- 2× więcej mixerów, 2× więcej obiektów do przesuwania co klatkę;
- trzy prawie identyczne ścieżki ładowania: `loadModel`, `preloadModel` (`ModelLoader.js:102` to copy-paste `createWireframeClone`) i inline'owe `loadSideHillsModels`.

**Fix:** jeden helper:
```js
function addWireframe(root, material) {
  root.traverse((m) => {
    if (m.isMesh && !m.userData.isWire) {
      const wire = new THREE.Mesh(m.geometry, material);
      wire.userData.isWire = true;
      m.add(wire);
    }
  });
}
```
Wireframe dziedziczy transform i animację rodzica, geometria jest współdzielona i nie trzeba nic synchronizować. Pokazywanie/ukrywanie zostaje przez `material.visible`, tak jak dziś. Z-fighting usuwamy przez `polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1` na materiale solid.

### B. Auto to nie grupa
Koła są luźno w scenie, a `Environment.updateWheelsPosition` (`:151`) ręcznie przesuwa je za autem i **aproksymuje przechył** przez `y ± rotZ*0.5`. Do tego offsety `1.227` są zduplikowane z tablicą `positions`, a update jest wołany do 3× na klatkę.
**Fix:** `carGroup = new THREE.Group()` z body i 4 kołami jako dziećmi. Sterowanie zmienia `carGroup.position.x` i `carGroup.rotation.z`, a resztę robi scene graph. Koła powinny się ładować przez ten sam loader co reszta (dziś `Environment.js:80` ma własny `FBXLoader` poza loading screenem).

### C. Czas: trzy niezależne zegary
- główna pętla (`Application.animate`) z `clock.getDelta()`;
- **osobny rAF per palma, skała i box** (`SpawnManager.animatePair`, `MinigameManager.animateBox`), a do tego per animacja kamery i resetu auta (`SceneManager:140`, `MinigameManager:169`, `PolonezController:184`, `GUIManager:628`);
- `setInterval`/`setTimeout` do spawnu, odliczania i ukrywania UI.

Konsekwencja: zmiana prędkości w grze nie działa na obiekty już lecące (czas trwania zamrożony przy spawnie), obiekty desynchronizują się z teksturą drogi, a karta w tle rozwala stan (P0 #12).

**Fix:** jeden `world.speed` (jednostki/s). Każdy ruchomy obiekt dostaje w `update(dt)`: `z += world.speed * dt`, a po przekroczeniu `z > 100` jest usuwany. Spawn przez akumulator (`this.t += dt; if (this.t > interval) …`). Tweeny przez jeden mini-helper `tween(duration, onUpdate)` tykający w głównej pętli. Tekstury: `offset.y = (offset.y + world.speed * k * dt) % 1` (dziś offset rośnie w nieskończoność, `MaterialManager.js:97`).

### D. Stan gry rozsmarowany po dwóch klasach
`isSteeringEnabled`, `disableKeyboardInputs`, `isSteeringLocked` (nigdy nie ustawiane na `true`, bo `setSteeringLock` nie jest wołane), `isTransitioning` (zapisywane, nigdy nie czytane), `isMinigameActive`, `countdown <= 0`, `boxSpawningActive`. ESC obsługują **dwa** listenery, a wynik zależy od kolejności rejestracji: `PolonezController` wyłącza sterowanie, a zaraz potem `MinigameManager.endMinigame` włącza je z powrotem.
**Fix:** jedna maszyna stanów `idle → countdown → playing → gameover → idle` (+ opcjonalnie `free`), jeden `keydown`/`keyup` handler, mapa `state → dozwolone akcje`. `enterKeyListeners` (własny mini event-bus) znika.

### E. Wstrzykiwanie zależności przez settery
`MinigameManager.setEnvironment/setMaterialManager/setGUI/setSceneManager/setPalmManager/setRockManager` plus `guiManager.palmManager = …` z trywialnymi getterami/setterami (`GUIManager.js:106–131`) i `palmManager = null` w konstruktorze. Do tego `MinigameManager.defaultCameraPosition` kopiowane z kamery w momencie inicjalizacji: jeśli user zdążył obrócić kamerę w trakcie ładowania, to ta pozycja staje się „domyślna”.
**Fix:** obiekt `ctx` (`{ scene, camera, controls, world, materials, gui }`) przekazany do konstruktorów. Domyślne pozycje kamery jako stałe w `config.js` (dziś zduplikowane w `SceneManager` i `MinigameManager`).

### F. GUI to 600 linii copy-paste
7 folderów × 4 kontrolki, każda z identycznym `onChange`. Do tego `color.replace("#","0x")` + `setHex(string)` działa tylko dzięki niejawnej koercji. Poprawnie: `material.color.set(color)`.
**Fix:** konfiguracja danych:
```js
const LAYERS = [
  { folder: "Polonez", solid: "polonez", wire: "polonezWireframe" },
  { folder: "Hills",   solid: "hills",   wire: "hillsWireframe" },
  // ...
];
```
Jedna pętla buduje foldery, a parametry startowe bierze z `material.color.getHexString()`, więc jest jedno źródło prawdy (to załatwia P0 #14). „Randomize” robi to samo w pętli po `LAYERS` zamiast 50 linii ręcznych `setHex`. Wbudowane `easeInOutCubic` jest tam też zduplikowane inline (`GUIManager.js:675`), mimo że istnieje `utils/easing.js`.

### G. Spawnery
- `RockManager.startSpawning` (`:30`) to kopia bazowej metody z drugim, przesuniętym intervalem i `setTimeout` id wrzuconym do tablicy intervali. Ten sam efekt da `spawnInterval = 750` i usunięcie override'u.
- `PalmManager` (`:9–18`) ma fallback na `palm.fbx` z małej litery, czyli martwy kod (plik to `palm.FBX`).
- `updateVisibility` trzyma stan per instancja, a instancje współdzielą materiał, więc wystarczy `material.visible` (tak jak robi reszta GUI). Dwa różne mechanizmy do tego samego.
- Palmy i skały ładują się dopiero w `initializeControllers`, czyli po głównych modelach, i pojawiają się z opóźnieniem. Lepiej wczytywać wszystko w jednym `Promise.all`.

---

## Martwy kod i assety do usunięcia

| Co | Waga |
|---|---|
| `models/materials/suneffect.png` | 827 KB |
| `models/materials/suneffect2.png` | 690 KB |
| `models/polonez_beta.FBX` | 324 KB |
| `js/dat.gui.module.js` (dat.gui i tak leci z unpkg) | 89 KB |
| `models/materials/gridline.png` | 4.5 KB |
| `userData.isPalm / isPalmWireframe / isRock / isRockWireframe / isBox` (nikt nie czyta) | — |
| `PolonezController`: `setSteeringLock`, `isSteeringLocked`, `isTransitioning`, `transitionCallback` (pole zamiast parametru), `steerLeft/steerRight` (wrappery na `steer(±1)`) | — |
| `MinigameManager`: `boxSpawningInterval` (nigdy nie przypisywany), `showMinigameInstructions` (zawsze `true`), interpolacja `camera.rotation` (nadpisywana przez `lookAt` w tej samej klatce), usuwanie boxów w gałęzi `collision` (robi to już `animateBox`) | — |
| `SceneManager.resetCameraWithTransition` (nieużywane), `renderer.shadowMapSoft` (nie istnieje w API), `shadowMap.type` ustawiane 2× (VSM, potem PCFSoft) | — |
| `GUIManager`: `scene.orbitControls` (nigdy nie istnieje), `initCRTEffect` (ustawia `animationName = "crtFlicker"`, czyli keyframes loadera, po czym od razu nadpisuje to `updateCRTFlickerState`), retry `setTimeout(…,100)` gdy brak `.crt-overlay` (jest w HTML) | — |
| `ModelLoader.mixers{}` i `Environment.elements{}` (zapisywane, nigdy nie czytane), `MaterialManager.colors.lightpink/white` | — |
| `cleanup()` / `dispose()` w 5 klasach: nikt ich nie woła. Albo podpiąć pod `pagehide`/HMR, albo usunąć. | — |
| `style.css`: `.crt-overlay::before` z niezdefiniowanym `var(--scan-line-gradient)`, `::after` z `opacity: 0` (niewidoczny „vignette”), keyframes `crtFlicker` na custom property bez `@property` (animuje się skokowo, nie płynnie), zakomentowany blok scanline | — |
| `DevStats.js:70`: etykieta „Vertices” pokazuje `memory.geometries`. Do tego `innerHTML` przebudowywany co klatkę (wystarczy raz na sekundę). | — |
| `main.js`: `window.app` na produkcji (OK do debugowania, ale świadomie) | — |

**Razem ok. 1,9 MB assetów do usunięcia** z repo i deployu.

---

## Wydajność

1. **5 świateł kierunkowych z `castShadow` i mapami 1024²** (`SceneManager.js:72`) daje 5 dodatkowych passów renderu sceny co klatkę. Przy ambient 0.95 cienie są ledwo widoczne, a jedyny wyraźny efekt to ciemna plama na drodze za autem. Wystarczy **1 directional z cieniem** (frustum ciasno wokół auta, np. ±15) + `HemisphereLight`. Albo w ogóle bez cieni, bo w stylistyce kolorowanki są zbędne.
2. **`three.js` nieminifikowany (1,28 MB) + blokujące `<script>` w `<head>`.** Minimum: `three.min.js` i `defer`. Do tego mieszanka: three **r116** lokalnie, a `OrbitControls` i `dat.gui` z unpkg w wersji **0.115** (niezgodne wersje plus zależność od zewnętrznego CDN).
3. `suneffectalt.png` to **1024² PNG, 820 KB**, na prosty gradient z paskami. Shader (patrz niżej) waży 0 KB.
4. FBXLoader dla każdego mesha tworzy domyślny `MeshPhongMaterial`, który od razu jest wyrzucany (27 warningów w konsoli). To kosmetyka, ale docelowo modele lepiej przekonwertować do **GLB** (mniejsze, szybsze, bez `inflate.min.js` i 105 KB FBXLoadera). Tu trzeba pamiętać, że animacja `side`/`polonez` musi przejść eksport. Do weryfikacji.
5. `anisotropy = 16` na sztywno (`MaterialManager.js:83`). Lepiej `renderer.capabilities.getMaxAnisotropy()`.
6. `antialias: true` przy renderze w połowie rozdzielczości zjada sporo wydajności, a i tak jest rozmywane przez upscale.

---

## Wizualne usprawnienia sceny (od najtańszych)

1. ~~Ostry „retro pixel” zamiast rozmycia.~~ **Odrzucone:** rozmycie przy 1/2 rozdzielczości jest zamierzone (patrz Decyzje).
2. **Kontury jak w kolorowance zamiast trójkątnego wireframe'u.** `wireframe: true` rysuje przekątne każdego trójkąta (na aucie widać siatkę trójkątów zamiast linii karoserii). `new THREE.EdgesGeometry(geometry, 20)` + `LineSegments` rysują tylko krawędzie powyżej kąta progowego, czyli prawdziwy rysunek tuszem. Na aucie i skałach różnica będzie największa.
3. **Cel-shading.** `MeshToonMaterial` z `gradientMap` (3 progi, `NearestFilter`) zamiast Phonga z ambientem 0.95 daje płaskie plamy koloru jak z kredki. To idealne pod koncept kolorowanki i lepiej trzyma kolory z palety (dziś Phong + 6 świateł je przepala).
4. **Siatka terenu.** Na zrzucie siatka `gridline2.png` (50 powtórzeń na 200 m) prawie znika przez mipmapy w niskiej rozdzielczości, a teren wychodzi jako płaski aqua. Proceduralny grid w shaderze (antyaliasowane linie przez `fwidth`, w r116 `material.extensions.derivatives = true`) jest ostry w każdej rozdzielczości, ma regulowaną grubość i kolor z GUI, i daje się animować offsetem w uniformie.
5. **Słońce jako shader:** gradient góra→dół + poziome paski, które grubieją ku dołowi (klasyczne synthwave sun). Wtedy GUI „Sun color top / bottom” zrobi dokładnie to, co mówi (dziś „top” to kolor dysku, a „bottom” to tint overlaya PNG). Minus 820 KB.
6. **Niebo gradientowe** (duża sfera albo `scene.background = CanvasTexture`) przechodzące w **kolor mgły przy horyzoncie**. Dziś tło `#eb94c1` ≠ mgła `#c348dd`, więc na horyzoncie widać szew między wzgórzami a niebem.
7. **Pop-in obiektów.** Palmy i skały spawnują się na `z = -100`, czyli ok. 107 m od kamery, gdzie mgła ma tylko ~44%. Obiekty „wyskakują” z niczego. Spawn na `z ≈ -190` albo `fogFar ≈ 110`, ewentualnie krótki fade-in skalą.
8. **Neon glow** (pomysł z README). `UnrealBloomPass` z wysokim `threshold`, żeby świeciły tylko linie i słońce. Przy renderze w 1/2 koszt jest akceptowalny. To jednak dokłada EffectComposer, więc jako opcja w GUI, domyślnie off na mobile.
9. **Boxy w minigrze** to dziś żółte Phongi bez stylu i odstają od sceny. Lepiej, żeby miały ten sam język co reszta: solid + kontur w kolorze z palety (np. czerwony neon `#fc3b96`) i delikatny pulse emissive.
10. Drobne: FOV 90° mocno rozciąga krawędzie (70–75° wygląda bardziej filmowo, do sprawdzenia). Asymetryczny, losowy offset `z` palm L/P, żeby nie szły idealnie parami. Lekki bujający „camera shake” zależny od `world.speed`.

---

## UI (poza panelem dat.gui)

Obecnie: elementy tworzone w JS przez `createElement` + `innerHTML`, widoczność przez rozsiane `style.display = …` (ok. 20 miejsc), inline style w stringu (`gameOverElement`), dwie prawie identyczne klasy `.minigame-instructions` / `.minigame-escape`, `MinigameManager.update()` zapisuje DOM **co klatkę**.

Propozycja:
1. **Markup w `index.html`** (`<div id="hud">` z `#prompt`, `#countdown`, `#score`, `#gameover`), a JS tylko przełącza **jedną klasę stanu** na `<body data-state="playing">`. CSS decyduje, co widać. Znika całe żonglowanie `display`, a P0 #4/#5 przestają być możliwe.
2. **Spójna typografia:** dziś Courier New + Pacifico ładowane przez `@import` w CSS (blokujące). Propozycja: `VT323` albo `Press Start 2P` do HUD/terminala + `Pacifico`/`Monoton` do tytułu i countdownu, przez `<link rel="preconnect">` + `display=swap`.
3. **Ekran startowy:** neonowe logo „POLONEZ AUTODRIVE” + prompt w formie keycapów `[ENTER] graj · [←][→] steruj · [F10] stats`. Dziś jest tylko mała ramka w rogu.
4. **HUD w grze:** wynik + **rekord (`localStorage`)** + wskaźnik poziomu prędkości (tier co 20 pkt jest dziś niewidoczny dla gracza).
5. **Game over:** panel z wynikiem, rekordem i akcjami `[ENTER] jeszcze raz · [ESC] wolna jazda` zamiast znikania po 3 s.
6. **Mobile / touch (później):** dziś na telefonie nie da się zagrać (tylko klawiatura, brak `<meta name="viewport">`). Wystarczy tap = start i dwie strefy dotyku lewo/prawo. Do tego panel GUI domyślnie zwinięty na wąskich ekranach. Teraz robimy tylko warstwę akcji i klikalne przyciski „START” / „WOLNA JAZDA”.
7. **Loader:** zostawić klimat terminala, ale z **prawdziwym** postępem z `THREE.LoadingManager.onProgress`. Wyrzucić force-timeout 8 s i 75%.
8. **Dostępność:** pełnoekranowy flicker 0.15 s (≈6–7 Hz) z amplitudą opacity 0.08–0.96 to realne ryzyko dla osób z epilepsją fotogenną. `@media (prefers-reduced-motion: reduce)` → flicker off, a domyślna intensywność niższa. Do tego `aria-live="polite"` na wyniku.
9. `index.html`: brakuje `<meta charset="utf-8">`, `viewport`, `description`/OG tagów (link na socialach), a `z-index` loadera i minigry to oba `1000`.

---

## Docelowa struktura (Vite + three ESM, bez frameworka)

```
package.json         # vite, three, lil-gui
vite.config.js       # base: './'  → ten sam build działa na Vercel i GH Pages (/Polonez-Autodrive/)
index.html           # markup HUD + loader, meta
public/models/       # FBX + tekstury (bez martwych plików)
src/
  main.js            # bootstrap: load → build world → loop
  config.js          # paleta, prędkości, pozycje kamery, wymiary boxa — JEDNO źródło prawdy
  assets.js          # THREE.LoadingManager + loadFBX(): Promise
  world.js           # renderer, kamera, światła, teren, droga, słońce, update(dt)
  car.js             # Group(body+koła), sterowanie (dt-based), bbox
  spawner.js         # generyczny spawner (palmy, skały, boxy) na world.speed
  input.js           # klawisze (i później dotyk) → akcje
  game.js            # state machine: idle | free | countdown | playing | gameover
  hud.js             # przełączanie data-state, wynik, rekord
  gui.js             # data-driven lil-gui
  crt.js             # CSS-owy overlay + ustawienia
  fx/wire.js         # addWireframe / addEdges
  utils/tween.js     # tween w głównej pętli
  style.css
```

**Three.js (aktualna wersja):**
- `three/addons/loaders/FBXLoader.js` i `three/addons/controls/OrbitControls.js`. `inflate.min.js` znika (FBXLoader używa wbudowanego `fflate`).
- `CircleBufferGeometry` → `CircleGeometry`. Tekstury z kolorem: `texture.colorSpace = THREE.SRGBColorSpace`.
- **Zarządzanie kolorem i jednostki świateł się zmieniły.** Żeby na start wyglądało jak dziś: `THREE.ColorManagement.enabled = false`, `renderer.outputColorSpace = THREE.LinearSRGBColorSpace` i intensywności ambient/directional **×π**. Potem porównanie ze zrzutami referencyjnymi i ewentualne przejście na poprawny pipeline sRGB z przekalibrowaną paletą (najlepiej razem z przejściem na toon/edges).
- **dat.gui → lil-gui:** następca dat.gui, prawie to samo API (`add`, `addColor`, `addFolder`, `onChange`, `close`), motyw przez zmienne CSS. Panel zostaje funkcjonalnie identyczny. Jeśli wygląd ma być 1:1, można zostać przy `dat.gui` z npm (paczka nierozwijana).

---

## Plan przepisania

### Dlaczego przepisanie, a nie refactor w miejscu
- Upgrade three + Vite zmienia **każdy** plik (globalne `THREE` → importy, `examples/js` → addons).
- Cztery kluczowe zmiany (wireframe jako dziecko, jedna pętla, state machine, prawdziwy loader) przepisują rdzeń każdej klasy. Szacunkowo z obecnych linii przetrwa <25%.
- Refactor w miejscu wymagałby utrzymywania starego systemu czasu i stanu w działającej formie na każdym kroku pośrednim. To kod tymczasowy do wyrzucenia.
- Hotfixy P0 na starej bazie byłyby w większości pracą wyrzuconą, bo dotyczą właśnie tego, co znika. Wersja live działa od miesięcy, a te bugi to przypadki brzegowe, więc nie blokują.

### Czego NIE przepisujemy (to jest wartość projektu)
Modele, tekstury, paleta, wszystkie dostrojone liczby (kamera, mgła, światła, pozycje kół, zasięgi spawnu, marginesy boxów, stałe sterowania, tiery prędkości), logika pasów spawnu boxów, wygląd loadera i CRT w CSS, lista parametrów GUI. Najpierw trafiają do `config.js`, a stary kod służy jako **specyfikacja**.

### Kroki (osobny branch, każdy krok uruchamialny)
0. **Snapshot:** tag `v1-legacy`, 3–4 zrzuty referencyjne (ten sam rozmiar okna i kąt kamery), krótkie nagranie sterowania i minigry (żeby porównać „feel”).
1. **Szkielet Vite + three latest + statyczna scena** (`world.js`: renderer w 1/2 z `Math.floor`, kamera, światła, teren, droga, słońce, mgła). Porównanie kolorów ze zrzutami.
2. **Assets + auto:** `LoadingManager` z prawdziwym postępem, `Promise.all`, car Group, wireframe jako dziecko, animowane wzgórza (1 mixer zamiast 2, `side.FBX` ładowany raz).
3. **Jedna pętla + `world.speed` + spawner** palm i skał (akumulator, clamp delta, pauza na `visibilitychange`).
4. **Input + state machine + minigra + wolna jazda** (`F` / przycisk). Domknięcie P0 #3–#10.
5. **GUI data-driven** (lil-gui). Jedno źródło kolorów, bez klonowania materiałów.
6. **HUD/UI + loader + CRT** (stany CSS, rekord w `localStorage`, `prefers-reduced-motion`, meta tagi).
7. **Parity check** ze zrzutami i checklistą, a potem **deploy** (Vercel: build `vite build`, output `dist`; GH Pages: Action z `dist`).
8. **Dopiero potem wizual:** edges, toon, grid i sun shader, gradient nieba, 1 światło z cieniem, opcjonalny bloom. Osobne PR-y, żeby dało się odróżnić regresję od zamierzonej zmiany.

**Checklista po każdym kroku:** start, ENTER, odliczanie, kolizja, ESC w każdej fazie, szybki restart po game over, wolna jazda wejście/wyjście, przełączenie karty w trakcie gry, okno o nieparzystej szerokości, 144 Hz, wszystkie kontrolki GUI + Randomize, F10.
