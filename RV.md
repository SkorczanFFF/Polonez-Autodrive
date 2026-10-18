# RV — przegląd kodu Polonez Autodrive 2.0

> Stan: `main` @ `73db00a` (2026-10-18). Przeczytane w całości: `src/**` (39 plików, ~5,4 tys. linii JS + 1,2 tys. CSS), `tests/**` (23 pliki, 126 testów), `index.html`, konfiguracja builda i CI. Do tego dwa mechaniczne przeszukania (martwy kod, zduplikowane źródła prawdy), których każdy wynik został sprawdzony grepem.
> Zakres: przerost formy, nieużywany kod, zduplikowane źródła prawdy, przynależność funkcji do plików. Nie szukałem bugów funkcjonalnych.
> Priorytety: **P1** warto zrobić, **P2** poprawia utrzymanie, **P3** kosmetyka.

## TL;DR

Kod po przepisaniu jest w dobrym stanie: jedna pętla, jeden `config.js`, materiały z jednego miejsca, moduły małe i udokumentowane, 126 testów. Nie ma wielkich problemów architektonicznych. To, co zostało, to warstwa drobnych rzeczy w czterech grupach:

1. **Martwe dane i eksporty.** Dziewięć kolorów w `PALETTE` nikt nie czyta, kilka zwracanych właściwości i eksportów nie ma odbiorcy, a ok. 15 eksportów istnieje tylko dla testów.
2. **Ukryte sprzężenia między modułami.** Wykrycie dotyku podróżuje przez atrybut DOM, `bloom.js` zna sztuczkę `city.js`, `renderer.js` wyłącza globalnie ColorManagement przy imporcie, GUI sięga do wnętrza każdej części świata.
3. **Zduplikowana wiedza.** Ten sam blok GLSL w słońcu i księżycu, pięć pomocników losowania, dwa `smoothstep`, dwa breakpointy "telefon", dwa mechanizmy reduced-motion dla CRT, testy przepisujące stałe z config.
4. **Warstwa legacy v1.** Stałe "na klatkę 60 Hz" z `core/time.js`, 17 kolorów "Original 2024" bez presetu, `REVIEW.md` opisujący nieistniejący kod, komentarze z liczbami, które już odpłynęły.

Najwięcej za najmniej: usunąć martwe klucze PALETTE i martwe eksporty (§B), przenieść `regenerate` do `world.js` i detekcję dotyku do jednego miejsca (§D), scalić pomocniki losowania i `smoothstep` (§C.4), wyciągnąć wspólny blok GLSL (§C.4).

---

## A. Przerost formy / zbędna złożoność

| # | Gdzie | Co | Ocena |
|---|---|---|---|
| A1 **P2** | `src/ui/theme.js:34-49` `turnHue` + `UI_TINTS` | Bisekcja (24 iteracje, 2× `THREE.Color` na iterację) dobiera jasność tak, żeby po obrocie odcienia luminancja się zgadzała. Woła się ją przy każdej zmianie koloru sceny, a podczas "Randomize all" 60×/s dla każdego kontrolera koloru. | CSS już używa relative color syntax (`hsl(from var(--scene-sun-top) …)` w `style.css:374`) i `color-mix`, więc wsparcie przeglądarek jest założone. `oklch(from var(--scene-terrain-wire) L C calc(h + Δ))` trzyma jasność percepcyjnie, czyli robi to samo deklaratywnie. Znika `turnHue`, `UI_TINTS`, `theme.test.js`, a `color.js` chudnie. |
| A2 **P2** | `src/core/time.js`, `CAR.steer`, `CAR.handling`, `SPEED.wheelSpin` | Stałe w "jednostkach na klatkę 60 Hz" + `frames(dt)` / `perFrame(k, dt)`. Cała warstwa istnieje po to, żeby nie przeliczać liczb z v1. | Jednorazowe przeliczenie na jednostki/s i stałe czasowe (`k` per klatka → stała czasowa w s) usuwa moduł, test i mentalne mnożenie przez 60 w każdym czytaniu `car.js`. Feel zostaje identyczny. |
| A3 **P2** | `src/scene/environment/city.js:270-277` + `src/core/bloom.js:83-86` | Materiał okien dziedziczy `visible` i `userData.glow` z materiału linii przez `Object.defineProperty` z getterami; `addHaze` owija `onBeforeCompile`, a `bloom.js` ma specjalny przypadek `Object.hasOwn(material, "onBeforeCompile")`, żeby klon przyciemniony dostał mgiełkę miasta. | Sprytne, ale `bloom.js` wie o `city.js`, a nic na to nie wskazuje poza komentarzem. Prostsze: okna jako część tej samej siatki co linie (ten sam materiał), albo `city.js` sam trzyma oba materiały w zgodzie w `update()`. |
| A4 **P3** | `src/scene/lines.js:171-214` | `BasicLineMaterial` i `PhongLineMaterial` to dwie identyczne klasy różniące się bazą. | Fabryka `withLines(Base)` albo mixin; `wire.js:52` i `gui.js:121` nie musiałyby robić podwójnego `instanceof` (patrz C.4). |
| A5 **P3** | `src/scene/model.js:28-41` `localCenter` | Zapisuje i przywraca `position/quaternion/scale`, żeby policzyć środek w lokalnej przestrzeni. | `wheelCenter` potrzebuje tylko `x`. Box z geometrii dzieci (`geometry.boundingBox` + `matrix` dziecka) daje to bez mutowania modelu. |
| A6 **P3** | `src/scene/environment/sideHills.js:67,83,94` | `index: NaN` = "wymaga przebudowy", `growth: NaN` = "częściowy wzrost". `NaN` jako trzeci stan. | Czytelniejsze: `index: null` i `growth: "partial"`. Logika bez zmian. |
| A7 **P3** | `src/ui/gui.js:25-34` `showHash` | Monkeypatch `controller.updateDisplay` i odczyt prywatnych pól lil-gui (`_textFocused`, `$text`, `$input`). | Wersja lil-gui jest przypięta, więc działa; przy podbiciu to pierwsze miejsce do sprawdzenia. Zostawić, oznaczyć komentarzem "zależy od internals 0.21". |
| A8 **P3** | `src/scene/spawner.js:120-123` `prewarm` | Symuluje całą podróż (ok. 28 s krokami 0,25 s = 111 kroków × 2 spawnery) przy starcie, łącznie z faderem i materiałami. | Tanie, ale równie dobrze można rozstawić obiekty bezpośrednio na odcinku `[startZ, endZ]` z interwału. Nie naprawiać, dopóki nie boli. |
| A9 **P3** | `src/config.js` (733 linie) | "Jedno źródło prawdy" trzyma też dane modelu (profile Fiata i Škody, 60 linii współrzędnych, `:460-513`) i 50 etykiet GUI. | Profile aut to dane modelu, nie konfiguracja; pasują obok `traffic.js` (np. `scene/trafficModels.js`). Reszta może zostać. |

Rzeczy, które wyglądają na złożone, ale są uzasadnione i udokumentowane: selektywny bloom z przyciemnionymi klonami (`core/bloom.js`), pula materiałów w `fade.js` (komentarz tłumaczy 40-70 ms czkawki shadera), taśmociąg gór (`sideHills.js`), `FanFBXLoader` (`assets.js`). Nie ruszać.

---

## B. Nieużywany kod

### B1. Martwe (nikt nie czyta, ani src, ani testy) — **P1**

| Gdzie | Co | Dowód |
|---|---|---|
| `src/config.js:10,11,13,17,18,19,20,21,22` | `PALETTE.skyPink`, `violet`, `blue`, `tweety`, `laguna`, `palm`, `rock`, `rockLine`, `box` | brak `PALETTE.<nazwa>` w JS i brak `--<nazwa>` w CSS/HTML. CSS używa tylko `--aqua`, `--ui-deep`, `--yellow`, `--red`, `--pink`, `--white`, `--ui-loader-bg`; `crtLine` idzie przez `CRT`. Komentarz w `:8` mówi "kept for the planned Original preset" — preset nie istnieje. Albo zrobić preset, albo usunąć 9 kluczy. |
| `src/game/state.js:15` | `export` przy `TRANSITIONS` | jedyne użycie wewnętrzne `:29` |
| `src/scene/model.js:28` | `export` przy `localCenter` | jedyne użycie `:52` |
| `src/scene/car.js:146` | zwracane `body` | brak `.body` poza `document.body` |
| `src/scene/fade.js:88-90` | `get size()` | `fader.` używany tylko jako `set/release/clear` |
| `src/scene/environment/hills.js:34` | zwracane `range` | brak `.range` w repo |
| `src/scene/environment/city.js:291` | zwracane `city` (Group) | gui czyta tylko `params`, `haze`, `regenerate` |
| `src/ui/gui.js:366-367` | zwracane `gui`, `randomize` | tylko przez dev-owe `window.app.menu` |
| `src/core/loop.js:32-35` | `add()` zwraca funkcję usuwającą | 5 wywołań w `main.js`, żadne nie zachowuje wyniku |
| `src/config.js:451` | `TrafficModel.bumper` w typedef | żaden model go nie ustawia; `traffic.js:82` zawsze bierze `?? 0.32` |
| `index.html:46` | klasa `hud__toggle-label` | brak reguły CSS i odwołań w JS |
| `tests/sideHills.test.js:15` | `setup()` zwraca `scene` | żaden test tego nie destrukturyzuje |
| `tests/game.test.js:13,42` | licznik `calls.menuHide` | inkrementowany, nigdy nie asertowany |
| `.gitignore:4` | `docs/reference/_cmp-*` | katalog `docs/` nie istnieje |

### B2. Eksporty i właściwości istniejące tylko dla testów — **P2** (zapach, nie martwy kod)

Każdy z nich jest używany wewnętrznie w swoim module, a importowany wyłącznie z `tests/`:

- `core/noise.js:42` `createSimplex`; `core/renderer.js:71` `fitFov`; `core/tween.js:4` `easeInOutCubic`
- `game/minigame.js:19` `createLanePicker`; `game/state.js:28` `nextState`; `state.js:48` boolean z `send()` (3 wywołania w `game.js` ignorują wynik)
- `scene/environment/city.js:35` `layoutCity`; `lights.js:14` `sunDirections`; `sideHills.js:124` `meshes` (komentarz wprost: "For tests and debugging")
- `scene/traffic.js:178,209,284` `withArches`, `prism`, `monotoneChains`; `scene/wire.js:11,44` `applyMaterial`, `addWireframe`
- `scene/car.js:145,147` `chassis`, `frontWheels`; `scene/spawner.js:66` `currentInterval`
- `ui/loader.js:11` `formatProgress`; `ui/randomPalette.js:20` `MIN_LINE_CONTRAST`, `:70` `mood`; `ui/theme.js:15,34` `UI_TINTS`, `turnHue`
- `config.js:468,490` `TRAFFIC.models.*.label` czytane tylko w komunikatach asercji `tests/traffic.test.js:45-46`

Decyzja do podjęcia raz: czy to API publiczne modułu (wtedy OK, ale dokumentować jako takie), czy testy mają sprawdzać zachowanie przez `create*()`. Dla geometrii (`prism`, `withArches`, `layoutCity`, `sunDirections`) eksport czystych funkcji jest sensowny. Dla `car.chassis/frontWheels`, `sideHills.meshes`, `spawner.currentInterval` testy wchodzą w implementację.

### B3. Czyste pod tym względem

Importy (wszystkie 39 plików src i 23 testy używają każdej zaimportowanej nazwy), klucze config poza PALETTE (każdy ma czytelnika), selektory CSS (każdy ma producenta), `public/`, zależności w `package.json`, skrypty npm. Jedyny przypadek graniczny: `tests/heightField.test.js:1` importuje `THREE` tylko do rzutowań w JSDoc.

---

## C. Zduplikowane źródła prawdy

### C1. Stan i wykrywanie środowiska — **P1**

| # | Gdzie | Problem | Źródło |
|---|---|---|---|
| C1.1 | `src/ui/hud.js:45-46` → `src/ui/gui.js:47-48` | Dotyk wykrywany w `hud.js`, zapisany w `documentElement.dataset.input`, odczytany z DOM przez `gui.js`. Działa tylko dlatego, że `main.js` tworzy HUD przed GUI (komentarz w `gui.js:47` to przyznaje). | Jedna wartość `touch` wykryta w `main.js` (lub `core/device.js`) i przekazana obu; `data-input` zostaje jako widok dla CSS. |
| C1.2 | `src/main.js:61` i `src/style.css:238` | Reguła "menu tylko w idle" jest w JS (`game.state === "idle"`) i w CSS (`[data-state="idle"] .hud__menu`). | Zostawić CSS jako widok, ale regułę z `main.js` przenieść do `game.js`, gdzie żyje reszta bramkowania stanem (patrz D2). |
| C1.3 | `src/ui/crt.js:10-12` i `src/style.css:1213-1221` | Reduced motion dla CRT obsługiwane dwa razy: JS ustawia `flicker=false` → `data-flicker="off"` (`:926`), a CSS i tak zabija animację `.crt` przez `!important`. Użytkownik, który w GUI włączy migotanie, nie zobaczy efektu, bo CSS go nadpisze. | JS (GUI edytuje stan). Usunąć `.crt` z bloku reduced-motion w CSS. |
| C1.4 | `src/ui/gui.js:85-88,133` | Parametry lil-gui powtarzają domyślne wartości żywych obiektów: `showSolid: true` / `showWire: true` (≡ `material.visible`), `density: 1` (≡ `spawner.density`, `spawner.js:61`), `effect: true` (≡ `uEffect: 1`, `sunMaterial.js:79`). Foldery nocy i miasta już robią to dobrze (`gui.js:241-254`: `add(night.reach, "value")`). | Żywe obiekty: `folder.add(solid, "visible")`, `folder.add(spawner, "density")`, `folder.add(materials.sun, "effect")`. |
| C1.5 | `src/core/renderer.js:7` | `THREE.ColorManagement.enabled = false` jako efekt uboczny importu modułu. `color.js` i trzy testy muszą o tym wiedzieć (`tests/theme.test.js:7`, `randomPalette.test.js:8`, `color.test.js:5-12`). | Jawne wywołanie w `main.js` przed `createView()`; w testach jeden `setup` w `vitest.setup`. |

### C2. Config vs CSS vs testy — **P2**

| # | Gdzie | Problem | Źródło |
|---|---|---|---|
| C2.1 | `src/style.css:1138` `max-width: 560px` vs `src/config.js:593` `GUI.compactBelow: 600` (`gui.js:350`) | Dwa różne progi "telefon". Trzecie pojęcie wąskiego ekranu: `game.js` `camera.aspect < 1` (to akurat inna rzecz: portret). | Jeden próg w config, wystawiony jako `--breakpoint-*` lub media query budowana z niego. |
| C2.2 | `src/style.css:766` `crash-flash 0.5s` vs `config.js:531` `MINIGAME.crash.shake: 0.45` | Błysk i wstrząs to ten sam moment, zsynchronizowane ręcznie. `lock` jest już zmostkowany (`hud.js:54` → `--crash-lock`). | Ten sam most co dla `lock`. |
| C2.3 | `src/style.css:834` `score-pulse … 1.08s` | Ręcznie policzone z `:833` `0.18s × 6`. | `calc()` lub jeden token. |
| C2.4 | `src/style.css:1080-1082` `--name-width: calc(19ch …)` | Wyprowadzone z najdłuższej etykiety `TEXT.gui` (17 znaków). Zmiana etykiety rozjedzie kolumnę bez ostrzeżenia. | Policzyć w `gui.js` z `TEXT.gui` i ustawić zmienną. |
| C2.5 | `src/style.css:59-60` komentarz "~14.5em" | Wyprowadzone z `LOADER.barLength: 20`. | Komentarz odsyłający do `LOADER.barLength`, nie liczba. |
| C2.6 | `src/style.css:71` `rgb(0 0 0 / 25%)` | Skanlinie loadera mają własną, zahardkodowaną nieprzezroczystość, gdy CRT bierze ją z `CRT.lineOpacity`. Plik zaczyna się od "Do not hardcode palette colors here". | `CRT` lub osobny token. |
| C2.7 | `src/style.css:254,316` oraz `:83-85,256-258` oraz `:592-593,637-638,1198` | Ten sam przepis tła panelu (`color-mix(... 84% ...)`), ten sam `box-shadow` (loader i `.panel`), ten sam offset narożnika 15 px ×3 (i `30px` = 2×15 w `:1205`). | `.loader__terminal` może nosić `.panel`; offset jako `--corner-gap`. |
| C2.8 | `src/style.css:504-509` vs `:1213-1221` | Dwa bloki `prefers-reduced-motion`; drugi (`.hud *`) obejmuje już `.logo__script` i `.logo__caps` z pierwszego. | Usunąć pierwszy. |
| C2.9 | testy | Testy przepisują stałe zamiast je importować: `tests/game.test.js:87,96` `[0, 3, 7]` (= `SCENE.camera.position`), `:97,117` `x = 6` (= `CAR.steer.maxOffset`); `tests/traffic.test.js:72,74` `2 * 6` i `0.3 * 1.15` (= `ARCH_SEGMENTS`, `ARCH_CLEARANCE`, nieeksportowane); `tests/lines.test.js:40,52`, `heightField.test.js:56,60` `> 1000` (= `HIDDEN = 1e4`); `tests/sideHills.test.js:8`, `city.test.js:11` `chunkRows * cell` (= `length` w `sideHills.js:40`); `tests/lights.test.js:21` centroid półdysku; `tests/input.test.js` surowe kody klawiszy (= `KEYS`); `tests/loader.test.js` `"LOADING: ["` (= `TEXT.loading`); `tests/time.test.js:7` `60 / 144` (= `REFERENCE_FPS`); `tests/theme.test.js:20` `"#2de2e6"` (= `LAYERS.terrain.wire`); `tests/color.test.js:16,23` `"#004671"` (= `PALETTE.uiDeep`). `tests/state.test.js:5-33` to kopia tabeli `TRANSITIONS` (test-specyfikacja, OK, ale każda zmiana tabeli to dwa miejsca). | Importować; wyeksportować stałe prywatne, których testy potrzebują (`ARCH_*`, `HIDDEN`, `REFERENCE_FPS`, długość chunka). |

### C3. Wewnątrz config — wartości zapisane, choć wyprowadzalne — **P2**

| Gdzie | Problem | Źródło |
|---|---|---|
| `config.js:462` `TRAFFIC.y: 0.04 // as CAR.lift` | Literał z komentarzem "jak CAR.lift" (`:364`). | `get y() { return CAR.lift; }` |
| `config.js:165` `MOUNTAINS.cell: 8 // 2 ground cells` | Musi być `2 * WORLD.cellSize` (`:144`); `tests/sideHills.test.js:104` na tym polega. | getter |
| `config.js:186` `horizon.halfWidth: 336 // past the outer side ridge` | Musi przekraczać `outer: 320` (`:167`). | `outer + 16` |
| `config.js:276` `camera.far: 2400 // past the sun … city` | Musi przekraczać `SUN.disc` (700+400) i `CITY.near + bend + depth` (1760; komentarz `:226` to liczy). | getter `max(...) * 1.1` |
| `config.js:163-164` `minStart: 88`, `start: 88` | Dwa literały, `start ≥ minStart`. | `start: MOUNTAINS.minStart` lub jeden klucz |
| `config.js:141-143` `WORLD.groundSize` | Wymiar świata wyprowadzony z zakresu suwaka GUI (`GUI.fogFar`). Warstwa świata zależy od warstwy GUI. | Odwrócić: `GUI.fogFar` z `WORLD`. |
| `config.js:573` `Math.max(400, …)` | Literał 400 = `WORLD.length`. | `WORLD.length` |
| `config.js:415,427` `roadGap: 3.025 / 8.025` | Dobrane tak, by `ROAD.width/2 + gap` = 11 / 16; zamierzone wartości żyją tylko w komentarzach `:416,429`. To samo: `:383` "(6 …)", `:279` "(0, 3.9, 6.68)", `:306` "~70", `scenery.js:61` "~14 s", `:216` "~1.3 * WORLD.length" (naprawdę 1,56×: koniec taśmociągu to 624, liczony tylko w `sideHills.js:43-46`; `tests/city.test.js:11` przybliża go inaczej, 528). | Podawać wartość docelową (`palmX: 11`), a `gap` liczyć; koniec taśmociągu wyeksportować. |
| `config.js:401` `SPEED.traffic: 200 / 6` | 200 to `WORLD.length` sprzed podwojenia; celowo zamrożone, ale czyta się jak fakt o świecie. | komentarz lub literał `33.3` |
| `config.js:645,650` | `menuFree: "FREE RIDE"` i `freeRide: "FREE RIDE"`. | jeden klucz |
| `config.js:552-561`, `:658-666`, `ui/icons.js:22-26` | Trzy równoległe tabele per akcja: `KEYS`, `TEXT.keys`, `KEY_ICONS`; `TEXT.keys` nie jest typowane względem `Action`. | `Record<Action, …>` albo jedna tabela `{ codes, label, icon }`. |
| `lines.js:173,196`, `materials.js:75-77`, `bloom.js:129`, `traffic.js:82`, `config.js:62-63,451` | Domyślne `fade = WIRE.fade`, `min = 0`, `glow = 1`, `bumper = 0.32` zapisane w 2-4 miejscach każde. | jeden obiekt `DEFAULTS` w config |

### C4. Zduplikowane pomocniki i wzorce — **P2**

| # | Gdzie | Co |
|---|---|---|
| C4.1 | `scene/environment/sky.js:76-88` vs `scene/sunMaterial.js:40-51` | Identyczny 11-liniowy blok GLSL rysujący poziome cięcia (słońce i księżyc). Uniformy są wspólne (`SUN.stripes`), kod nie. Do tego halo księżyca ma zahardkodowane `0.35`/`0.45` (`sky.js:89`), a słońce bierze `SUN.glow`. Wyciągnąć `stripeCut(...)` do wspólnego fragmentu GLSL (string eksportowany z `sunMaterial.js`). |
| C4.2 | `ui/loader.js:22`, `scene/environment/scenery.js:8` (`randomIn`); `ui/randomPalette.js:51`, `scene/environment/city.js:37` (`between`, seedowane); `game/minigame.js:10` (`randomInt`); `scenery.js:11`, `randomPalette.js:62`, `minigame.js:68`, `city.js:71` (losowy element) | Pięć wariantów losowania w pięciu plikach. Jeden `core/random.js` (`between(min, max, rng)`, `pick(list, rng)`, `randomInt`) obok `noise.js`, gdzie już jest `mulberry32`. |
| C4.3 | `scene/fade.js:8` vs `scene/mountains.js:24-27` | Dwa `smoothstep` o różnych sygnaturach (jeden nieobcinający); wywołujący obcinają ręcznie (`spawner.js:55`, `mountains.js:25`), podczas gdy `car.js:90` i `traffic.js:181` używają `THREE.MathUtils.clamp`. `THREE.MathUtils.smoothstep(x, min, max)` istnieje; `fade.js` i `mountains.js` mogą go użyć. |
| C4.4 | `scene/wire.js:52`, `ui/gui.js:121` | `material instanceof BasicLineMaterial \|\| material instanceof PhongLineMaterial` ×2. Jeden `isLineMaterial()` w `lines.js` (znika z A4). |
| C4.5 | `hills.js:18-21`, `sideHills.js:60-63`, `city.js:284-287` | Trzykrotnie ten sam `traverse` wyłączający cienie. Opcja `dress(root, solid, wire, { shadows: false })`. |
| C4.6 | `wire.js:23-33`, `lines.js:23,39-47` | Ten sam wzorzec memoizacji po geometrii w `WeakMap`. Drobne; jeden `memoByGeometry(fn)`. |
| C4.7 | `tests/traffic.test.js:13`, `sideHills.test.js:12`, `materials.test.js:7` | Identyczny fixture `createMaterials({ [LAYERS.road.wireMap]: new THREE.Texture() }, 1)`; `hsl()` z `ui/color.js` reimplementowane w `tests/theme.test.js:10` i `randomPalette.test.js:44,69`. Jeden `tests/helpers.js`. |
| C4.8 | `ui/hud.js:107`, `ui/gui.js:299` | Sufiks "Etykieta (KLAWISZ)" budowany w dwóch modułach; przycisk menu pokazuje klawisz dodatkowo jako keycap. |
| C4.9 | `index.html:41-45` vs `ui/icons.js:8` | Ikona oka inline w HTML, każda inna ikona przez `icons.js` z identycznym wrapperem `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">`. |
| C4.10 | `index.html:38,109` | `aria-label="Menu"` i `aria-label="Game over"` po angielsku w HTML, gdy `TEXT.menu` i `TEXT.gameOver` istnieją (`data-text` obsługuje `textContent`, nie atrybuty). |
| C4.11 | `ui/devstats.js:29-34` vs `index.html` | Devstats buduje DOM w JS (`innerHTML`), HUD i loader są deklaratywne w HTML + `data-text`. Dwie konwencje. |

### C5. Dokumentacja i komentarze powtarzające liczby z config — **P3**

Liczby w prozie, które już odpłynęły lub odpłyną przy następnej zmianie config: `CHANGELOG.md:17` "co 20 punktów … 15%" (`SPEED`), `:46` "5°", `:76` "4 cm", `:83` "#c70050", `:84-85` i `README.md:81` "200 m / 400 m", `:89` "0,6 s", `:102` "3:1", `:51` "pięć świateł", `:52` "trzy pasma", `:94` "~300 px". `CHANGELOG.md:23` wymienia warstwy "hills, side hills" (już przemianowane na "Horizon range", "Side mountains", `CHANGELOG:98` to nawet odnotowuje) i pomija "City"; `README.md:60-61` lista `environment/` pomija `city.js`. `README.md:20-27` powtarza `KEYS`. Opis aplikacji ×3 (`index.html:11`, `README.md:5`, `CHANGELOG.md:9-11`). `config.js:603-604` komentuje kolory FPS ("aqua … yellow … red"), które naprawdę żyją w `style.css:1031-1044`.

Osobno: `REVIEW.md` w korzeniu opisuje kod v1 (`js/core`, `Application.js`, `MinigameManager.js`), który już nie istnieje. Jako historia decyzji ma wartość, jako plik obok `README.md` wprowadza w błąd. Przenieść do `docs/history/` albo skrócić do sekcji "Decyzje" w CHANGELOG.

---

## D. Przynależność funkcji do plików

| # | Gdzie | Co jest nie na miejscu | Propozycja |
|---|---|---|---|
| D1 **P1** | `src/ui/gui.js:259-264` `regenerate` | GUI wie, że nowy krajobraz to `sideHills.regenerate()` + `hills.regenerate()` + `city.regenerate()`. `world.js` jest właścicielem `mountains` (`:62`) i powinien wiedzieć, kto od nich zależy. | `world.regenerate()` w `world.js`; GUI woła jedno. Przy okazji `world.parts` przestaje być potrzebne GUI do przebudowy. |
| D2 **P2** | `src/main.js:59-63` | Bramkowanie "menu tylko w idle" i przełączanie `bloom.enabled` siedzą w bootstrapie, podczas gdy resztę akcji bramkuje `game.js:224-230`. | Przenieść do `game.js` (lub `hud`/`view` dostają `input` i same się podpinają). `main.js` zostaje czystym składaniem. |
| D3 **P2** | `src/ui/hud.js:45-46` | HUD wykrywa dotyk i ustawia atrybut na `<html>` dla innych modułów (patrz C1.1). | `main.js` / `core/device.js`. |
| D4 **P2** | `src/core/renderer.js:7` | Globalny przełącznik three.js ustawiany jako efekt uboczny importu (patrz C1.5). | `main.js`. |
| D5 **P2** | `src/ui/gui.js:94-113` | GUI sięga do `world.parts.scenery[layer.density]`, `world.parts.city.params/haze`, `world.parts.sky.night`, `world.parts.hills/sideHills.regenerate`. README obiecuje, że części "można podmienić bez dotykania reszty", ale GUI zna wewnętrzne API każdej. | Części wystawiają `settings` w jednolitym kształcie (np. `{ density, night, haze }`), `world` je zbiera; GUI buduje foldery z tej listy. Wariant minimalny: tylko D1. |
| D6 **P3** | `src/ui/theme.js:87-95` | Tworzenie `<meta name="theme-color">` w JS, gdy `color-scheme` jest w `index.html:16`. | Pusty `<meta name="theme-color">` w HTML, JS tylko ustawia `content`. |
| D7 **P3** | `src/config.js:460-513` | Profile aut ruchu to dane modelu (patrz A9). | `scene/trafficModels.js` |
| D8 **P3** | `src/scene/mountains.js:24` `smoothstep`, `src/scene/fade.js:8` `smoothstep` | Pomocniki matematyczne eksportowane z modułów domenowych (`sideHills.js` importuje `smoothstep` z `mountains.js`). | `THREE.MathUtils.smoothstep` lub `core/math.js`. |
| D9 **P3** | `src/scene/spawner.js:32-35` | Domyślne `startZ/endZ` z `SPAWN`, ale `fadeIn/fadeOut` domyślnie 0, więc oba wywołujące (`scenery.js:45-46,55-56`, `minigame.js:65-66`) i tak podają `SPAWN.fadeIn/fadeOut`. | Domyślnie wszystko z `SPAWN` albo nic. |
| D10 **P3** | `src/game/game.js:185-217` | `car.steering` ustawiane w pięciu gałęziach `enter()`; to czysta funkcja stanu (`free` lub `playing`). | `car.steering = next === "free" \|\| next === "playing"` przed `switch`. |

---

## E. Testy

- 126 testów, czyste moduły dobrze pokryte (noise, heightField, traffic, spawner, state, input, color). Dobry stan.
- Główne zastrzeżenie: C2.9 (przepisane stałe) i B2 (eksporty tylko dla testów). Jedno pociąga drugie: test, który chce sprawdzić `ARCH_SEGMENTS`, powinien go importować, a nie wpisywać `6`.
- `tests/game.test.js` stubuje `controls` i HUD przez `Proxy`; działa, ale `game.js` ma 297 linii i jest najbardziej "orkiestrującym" modułem, więc to jedyne miejsce, gdzie testy są kruche na zmianę kształtu zależności.
- Brak testu dla `ui/hud.js` i `ui/gui.js` (DOM) — zrozumiałe, ale to tam żyje najwięcej ukrytych sprzężeń (C1.1, C1.4, D5).

---

## F. Higiena repo

- `dist/` i zrzuty ekranu są ignorowane, `public/` zawiera tylko to, co `ASSETS` wymienia, zależności wszystkie używane. OK.
- Dwa cele deployu (`vercel.json` + `.github/workflows/pages.yml`) są zamierzone (README podaje oba adresy). OK.
- `.gitignore:4` martwy wpis (B1). `REVIEW.md` nieaktualny (C5).
- `jsconfig.json` `strict: false` przy `checkJs` — typy JSDoc są wszędzie, więc `strict: true` prawdopodobnie przejdzie po kilku poprawkach `any`; warto spróbować.

---

## G. Plan refactoru

Cztery fazy, każda to osobny zestaw tematycznych commitów na `main` (bez pusha do czasu przeglądu). Po każdej fazie zielone `npm test` + `npm run typecheck` + `npm run build`; fazy 2–3 dodatkowo ręczny przegląd w `npm run dev` (menu, free ride, minigra, panel, telefon w DevTools). Pozycje odsyłają do §A–F.

### Faza 1 — Sprzątanie bez ryzyka

Zakres: B1 (martwy kod), C2.8 (podwójny reduced-motion), C1.3 (reduced-motion CRT tylko w JS). Jedyna zmiana zachowania: użytkownik z reduced-motion może świadomie włączyć migotanie CRT w panelu (wpis w CHANGELOG).

- [x] B1 martwe klucze `PALETTE` (9), `TrafficModel.bumper`
- [x] B1 martwe eksporty: `TRANSITIONS`, `localCenter`
- [x] B1 martwe właściwości zwracane: `car.body`, `fader.size`, `hills.range`, `city.city`, `menu.gui`/`menu.randomize`, wynik `loop.add()`
- [x] B1 klasa `hud__toggle-label`, `scene` z `setup()` w `sideHills.test.js`, licznik `menuHide` w `game.test.js`, wpis w `.gitignore`
- [x] C2.8 jeden blok `prefers-reduced-motion` w CSS
- [x] C1.3 reduced-motion CRT tylko w `crt.js`

Done: zielone testy/typecheck/build, wszystkie pozycje odhaczone.

**Zrobione 2026-10-18**, commity `df65144`, `a207725`, `196f32e`, `929e2c3` (126 testów, typecheck i build zielone).

### Faza 2 — Sprzężenia i duplikaty

- [x] D1 `world.regenerate()`; GUI woła jedno
- [x] C1.1 + D3 dotyk wykryty raz (`core/device.js`), przekazany do `createHud` i `createSceneGui`; `data-input` zostaje jako widok dla CSS
- [x] C1.5 + D4 `ColorManagement.enabled = false` jawnie w `main.js`; w testach jeden `vitest.setup.js`
- [x] D2 bramkowanie `menu`/`glow` z `main.js` do `game.js`; D10 `car.steering` raz przed `switch`
- [x] C4.1 wspólny GLSL `stripeCut`; C4.2 `core/random.js`; C4.3 + D8 `MathUtils.smoothstep`; C4.4 `isLineMaterial()`; C4.5 `dress(..., { shadows: false })`; C4.6 `memoByGeometry`
- [x] C1.4 GUI na żywych obiektach
- [x] C3 gettery i wyprowadzenia w config (`TRAFFIC.y`, `MOUNTAINS.cell`, `horizon.halfWidth`, `camera.far`, `start/minStart`, `groundSize` ↔ `GUI.fogFar`, `Math.max(400…)`, `menuFree/freeRide`, jedna tabela akcji `{ codes, label, icon }`, `DEFAULTS`)
- [x] C2.1 jeden próg telefon; C2.2 `crash-flash` z `MINIGAME.crash.shake`; D9 domyślne `SPAWN` w spawnerze

Done: jak wyżej + ręczny przegląd; testy kolorów bez własnego ustawiania ColorManagement.

**Zrobione 2026-10-18**, dziewięć commitów od `d62060e` do `41d949b` (126 testów, typecheck, build zielone; strona w headless Chrome bez błędów shaderów i wyjątków). Decyzje po drodze:

- Próg "telefon" to jedna liczba `SCREEN.phone = 600` (CSS miało 560): `core/device.js` ustawia `data-screen="narrow"` na `<html>`, CSS nie ma już własnej media query; GUI dostaje `device.small` (szerokość lub wysokość).
- `core/device.js` ustawia też `data-input`; `hud.js` i `gui.js` nic już nie wykrywają.
- F10 obsługuje `devstats.js` sam (dostaje `input`), menu/glow bramkuje `game.js`; `main.js` to czyste składanie.
- Jedna tabela `ACTIONS` (`keys`, `label`, `icon`) zastąpiła `KEYS`, `TEXT.keys` i `KEY_ICONS`; typ `Action` jest teraz w `config.js`.
- `SCENE.camera.far` liczy się z dalszego rogu miasta (1,1 × 2249 ≈ 2474 zamiast 2400); kopuła nieba podąża (0,75 × far).
- Błysk zderzenia trwa tyle co wstrząs (`--crash-shake` = 0,45 s zamiast 0,5 s w CSS).
- Przy C1.4 wyszedł błąd: `Object.assign` w `sunMaterial.js` wykonywał getter `effect` i gubił setter, więc "Show effect" nic nie robiło; teraz `defineProperty` (wpis w CHANGELOG).
- `WIRE.min` i `WIRE.glow` to domyślne wartości warstw (zamiast literałów w `lines.js`, `materials.js`, `bloom.js`); `TRAFFIC.y`, `MOUNTAINS.cell/start`, `horizon.halfWidth`, `WORLD.groundSize ← fogReach` to gettery.
- Pominięte z §C3 (zostaje na później): `roadGap` jako wartość docelowa, `SPEED.traffic` (komentarz już mówi, że 200 to świat v1).
- Do ręcznego sprawdzenia przez autora: telefon (próg 600 px, panel zwinięty), przełączniki "Show model/wireframe", gęstość palm i skał, "Show effect" słońca, "New landscape".

### Faza 3 — Decyzje architektoniczne (każda pozycja osobno do akceptacji)

- [ ] B2 + C2.9 + C4.7 polityka eksportów dla testów (czyste funkcje geometrii zostają publiczne; `car.chassis/frontWheels`, `sideHills.meshes`, `spawner.currentInterval` testowane przez zachowanie), testy importują stałe (`ARCH_*`, `HIDDEN`, `REFERENCE_FPS`, długość chunka), `tests/helpers.js`
- [ ] A1 tinty UI przez `oklch(from …)` w CSS; znika `turnHue`, `UI_TINTS`, `theme.test.js`
- [ ] A2 jednostki na sekundę; znika `core/time.js`
- [ ] D5 jednolite `settings` części świata; GUI buduje foldery z listy
- [ ] A9 + D7 profile aut do `scene/trafficModels.js`
- [ ] A3 okna miasta bez `defineProperty` i bez przypadku specjalnego w `bloom.js`; A4 `withLines(Base)`

### Faza 4 — Dokumentacja, CSS, higiena

- [ ] C5 `REVIEW.md` → `docs/history/`, liczby w prozie → odesłania do config, README `environment/` + `city.js`
- [ ] C2.3–C2.7 tokeny CSS (`--corner-gap`, `.loader__terminal.panel`, `calc()` dla `score-pulse`, `--name-width` z `TEXT.gui`, `CRT.lineOpacity` dla loadera)
- [ ] C4.8–C4.11 sufiks klawisza w jednym miejscu, ikona oka przez `icons.js`, `aria-label` z `TEXT`, devstats deklaratywnie
- [ ] A5–A8 kosmetyka; D6 `<meta theme-color>` w HTML; F `strict: true`
