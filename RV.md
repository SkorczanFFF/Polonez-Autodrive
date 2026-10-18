# RV — po refaktorze: regresje i budżet klatki

> Stan: `main` @ `35094d0` (2026-10-18), 33 commity od `73db00a` (cztery fazy refaktoru z `docs/history/RV-refactor-2026-10.md`, klawisz R, fixup). Dwa tematy: **(A)** czy po refaktorze coś się zepsuło, czyli niezależny przegląd całego diffu plus własna lista podejrzanych miejsc; **(B–D)** wydajność: pomiar klatki na żywo (`renderer.info` per pass, trójkąty per warstwa, przez headless Chrome i protokół DevTools) i przegląd kodu pętli pod kątem kosztów na klatkę.
> Priorytety: **P1** warto zrobić, **P2** poprawia, **P3** kosmetyka.

## TL;DR

- **Po refaktorze nie ma regresji logiki.** Testy, typecheck (strict) i build zielone; niezależny przegląd diffu potwierdził zgodność jednostek sterowania, mixinu materiałów, getterów config, bramkowania klawiszy i okien miasta. Zostały trzy rzeczy "na styku": wsparcie `oklch(from …)` (naprawione fixupem przez `@supports`), próg telefonu 560 → 600 px (do decyzji) i o jeden znak inna kolumna nazw w panelu (bez znaczenia).
- **"Prawie 400 k trójkątów" to 3 × 128 k.** Scena ma 136 k unikalnych trójkątów; klatka rysuje 128 k w passie bazowym, 69 k w pięciu mapach cieni i całą scenę raz jeszcze (197 k) w passie glow. Razem 394 k i 594 draw calle. Dla GPU to mało; liczą się draw calle i fill rate cieni, nie trójkąty.
- **Największy jednorazowy zysk, już zrobiony: miasto.** Było w całości za plecami kamery, a i tak rysowało się w każdej klatce (52 k trójkątów × 2 passy = 27 % klatki), bo jeden mesh okien i jeden wież miał sferę otaczającą sięgającą przed kamerę. Po pocięciu na 8 pasm (`CITY.bands`) klatka w menu spadła z 394 k do 280 k trójkątów i z 594 do 546 draw calli; z widokiem do tyłu miasto rysuje się jak dawniej.
- **Przerzedzanie gór bocznych nie jest tym miejscem.** To 22 % geometrii, ale najtańszej (duże trójkąty, 32 draw calle, bez cieni); przerzedzenie o połowę dałoby ok. 11 % trójkątów klatki kosztem sylwetki. Palmy (36 × 500 trójkątów, ok. 40 % draw calli) i pięć świateł z cieniem to realne koszty.

---

## A. Po refaktorze

| # | Gdzie | Co | Stan |
|---|---|---|---|
| A1 **P1** | `src/style.css` tokeny UI | `--aqua`, `--ui-deep`, `--ui-loader-bg`, `--red`, `--pink`, `--yellow` liczone przez `oklch(from …)`: przeglądarka bez relative color syntax (Firefox < 128, Safari < 16.4, Chrome < 119) traktowała cały token jako nieprawidłowy, czyli tekst, ramki i tła paneli traciły kolor. Wcześniej `hsl(from …)` dotyczyło tylko dekoracyjnego połysku logo. | **Naprawione** w `35094d0` (`fixup!` do `dd10b31`): tokeny dostają najpierw zwykłe `var(--palette-*)`, a wersje oklch są w `@supports (color: oklch(from red l c h))`. Składnia sama w sobie jest poprawna (`h` to liczba, `--scene-*-turn` też). |
| A2 **P2** | `config.js SCREEN.phone`, `core/device.js`, `style.css` `[data-screen="narrow"]` | Próg układu "telefon" dla HUD był 560 px (media query), a dla zwijania panelu 600 px; po ujednoliceniu oba to 600. Ekrany 561–600 px szerokości dostają teraz przyciski w kolumnie i logo niżej. Specyficzność i reguły dotykowe bez zmian. | **Do decyzji:** zostawić 600 (jedna liczba, prostsza), wrócić do 560 dla obu, albo dwa klucze w `SCREEN`. Jeśli 600 zostaje, wpis w CHANGELOG. |
| A3 **P3** | `ui/gui.js` `--name-chars`, `style.css` `--name-width` | Kolumna nazw panelu liczona z najdłuższej etykiety: 18 znaków z klawiaturą ("Wireframe glow (G)"), 17 na dotyku, wcześniej stałe 19ch. Lista etykiet zawiera też tytuł i ikonę, które nie są nazwami wierszy (krótsze, nieszkodliwe). | Bez działania, chyba że kolumna widocznie się przesunęła. |

Sprawdzone przez przegląd i w porządku (szczegóły w historii sesji): przeliczenie jednostek `CAR`/`SPEED` (0,08·60 = 4,8; 0,4·60 = 24; `holdAccel` 0,04·60 = 2,4 z jednym czynnikiem 60, bo `holdTime` był już w sekundach; `decel` 0,04·3600 = 144; `wheelSpin` −0,22·60 = −13,2; `yaw.perSpeed` 0,75/60 = 0,0125; stałe czasowe τ = −1/(60·ln(1−k))); mixin `withLines` (pole klasy po `super()`, `clone()` przez `new this.constructor()` ze spreadem `undefined`, `lineUniforms` współdzielone w `copy()`, klucz programu bez zmian); `bloom.js` z `onBeforeCompile` kopiowanym zawsze (ta sama funkcja, `customProgramCacheKey` identyczny); `city.update()` wołane przed każdym renderem (pętla: update, potem render; świat tworzony synchronicznie po `await`); bramkowanie klawiszy (menu tylko w idle, glow i R wszędzie, F10 w devstats) bez dubli i ubytków; gettery config bez TDZ (eager użycia `GUI.fogFar`, `GUI.mountainStart`, `MOUNTAINS.grow.from`, `SPAWN.startZ` odwołują się do wcześniejszych stałych; `{ ...SCENE.fog }` w GUI robi zrzut `far = 400` zgodnie z intencją); `sideHills` (`null`/`"partial"` ≡ dawne NaN, `CHUNK_LENGTH` 128 i `CONVEYOR_END` 624 jak dawniej, `1 − smoothstep` dla odwróconych krawędzi); `localCenter` (root loadera bez rodzica: macierz świata = transformacja modelu); okablowanie CSS ↔ theme (wszystkie `--palette-*` i `--scene-*-turn` istnieją, brak odwołań do starych `--night`, `--crt-line`); ikona oka i kreska; ColorManagement w `main.js` przed pierwszym `THREE.Color`; devstats, fade'y spawnerów, `BUMPER.y`, listy klawiszy w README/CHANGELOG; żadnych odwołań do `KEYS`, `TEXT.keys`, `KEY_ICONS`, `UI_TINTS`, `turnHue`, `time.js`, `menuFree`, `compactBelow`, `TRAFFIC.models`, `world.mountains`, `world.parts` w GUI, `car.body`.

---

## B. Pomiar klatki

Metoda: aplikacja uruchomiona z `npm run dev`, headless Chrome przez protokół DevTools, w scenie startowej (menu, domyślna gęstość palm i skał, kamera w pozycji domowej patrzy na słońce). Odczyt `renderer.info` po jednej klatce, potem to samo z wyłączonym bloomem i z wyłączonymi mapami cieni. Canvas 632 × 324 px (okno 1280 × 800, `renderScale` 0,5). Liczby trójkątów nie zależą od GPU, więc pomiar w swiftshaderze jest miarodajny; FPS nie jest (patrz pytania).

### B1. Geometria sceny (unikalne trójkąty, przed passami)

| Warstwa | Meshe | Trójkąty | Uwagi |
|---|---|---|---|
| Okna miasta | 1 | 47 164 | jeden mesh `MeshBasicMaterial`, 175 wież |
| Palmy (bryła + linie) | 36 + 36 | 18 000 + 18 000 | 500 na palmę; cienie rzuca bryła |
| Góry boczne (bryła + linie) | 16 + 16 | 14 848 + 14 848 | 928 na chunk, 8 chunków na stronę |
| Polonez + koła (bryła + linie) | 5 + 5 | 6 452 + 6 452 | |
| Wieże miasta (bryła + linie) | 1 + 1 | 1 750 + 1 750 | |
| Skały (bryła + linie) | 35 + 35 | 2 062 + 2 062 | ok. 59 na skałę |
| Pasmo horyzontu (bryła + linie) | 1 + 1 | 672 + 672 | |
| Kopuła nieba | 1 | 960 | |
| Reszta (teren, droga, słońce, światła aut) | 8 | 112 | |
| **Razem** | **199** | **135 868** | |

### B2. Co z tego rysuje jedna klatka

| Pass | Draw calle | Trójkąty | Różnica |
|---|---|---|---|
| Sama scena (bez cieni, bez bloomu) | 157 | 128 025 | 136 k minus to, co frustum odcina (ok. 8 k palm i skał za kamerą) |
| + mapy cieni (5 świateł × 1024²) | 290 | 196 860 | +133 calli, +69 k trójkątów |
| + pass glow (bloom) | **594** | **393 734** | +304 calli, +197 k: cała scena drugi raz |

Wnioski:

- **Prawie 400 k to 3 × 128 k.** Pass glow rysuje scenę ponownie (bryły na czarno, linie przyciemnione), a pięć świateł rzucających cień dodaje pięć renderów casterów. Z 394 k tylko 128 k to trójkąty "widoczne".
- **Czy to dużo?** (Liczby sprzed C1.) Dla GPU, także zintegrowanego, 400 k trójkątów przy 632 × 324 px to mało: liczy się raczej 594 draw calli (narzut CPU w sterowniku, ok. 10–20 µs każdy na słabym sprzęcie = 6–12 ms) i fill rate: pięć map cieni 1024² co klatkę plus pass glow z blurem. Pomiar FPS na docelowym sprzęcie rozstrzygnie, czy w ogóle coś boli (F10).
- **Miasto jest rysowane, choć go nie widać (B-P1).** Przy kamerze patrzącej na słońce miasto jest w całości za plecami, a mimo to jedna klatka rysuje jego 52 414 trójkątów (pomiar z `city.visible = false`: 127 011 → 74 597). Powód: okna i wieże to po jednym meshu, a ich sfera otaczająca (środek z ≈ 1287, promień ≈ 1399) sięga do z ≈ −111, czyli przed kamerę, więc frustum culling nigdy nie odcina miasta. W passie glow drugi raz. **To 27 % trójkątów klatki za nic**, do odzyskania bez żadnej zmiany wyglądu.
- **Góry boczne (pytanie o przerzedzenie):** 29,7 k unikalnych trójkątów (22 % geometrii), ale w 32 draw callach, dużymi trójkątami i bez cieni: to najtańszy rodzaj geometrii. Przerzedzenie (cell 8 → 16) odjęłoby ok. 22 k × 2 passy = 44 k z 394 k (11 %) kosztem sylwetki i zgodności linii z siatką terenu (cell = 2 komórki gruntu). Nie warto, dopóki F10 nie pokaże problemu na GPU; wcześniej są tańsze zyski.
- **Palmy to koszt draw calli, nie trójkątów:** 72 calle w passie bazowym, 72 w glow, ok. 90 w cieniach = ok. 40 % wszystkich. Przy suwaku gęstości na 2 wszystko to ×2.

## C. Wydajność w kodzie

| # | Gdzie | Co | Koszt | Propozycja | Wygląd |
|---|---|---|---|---|---|
| C1 **P1** | `scene/environment/city.js` `bandCity`, `CITY.bands` | **Zrobione** (`perf: city drawn in bands…`): budynki w 8 pasmach wzdłuż x, każde z własnymi meshami wież, linii i okien; test pilnuje, że sfera otaczająca każdego pasma kończy się za kamerą. Pomiar po zmianie, widok domyślny: pass bazowy 128 025 → 74 843 trójkątów (miasto 0), cała klatka 393 734 → 279 990 trójkątów i 594 → 546 draw calli. Widok do tyłu: 129 k trójkątów w passie bazowym (miasto w kadrze, pół sceny przed kamerą odcięte). | −29 % trójkątów klatki | — | bez zmian |
| C2 **P1** | `config.js SCENE.lights.sun.samples: 5`, `shadow.mapSize: 1024`, `scene/environment/lights.js` | Pięć świateł kierunkowych z cieniem = pięć map 1024² renderowanych co klatkę + pięć próbek PCF na każdy piksel każdej powierzchni odbierającej cień (teren na pół ekranu, linie też: `wire.receiveShadow = true`). | 133 draw calli, 69 k trójkątów, 5 M texeli głębi, ×5 próbek cienia w shaderze toon/phong. | Do pomiaru na sprzęcie: 3 próbki zamiast 5 (−40 % kosztu cieni), albo 1 światło z `PCFSoftShadowMap` i większym `radius` (miękkość z filtra zamiast z pięciu świateł; −80 %). `mapSize` 512 dla próbek poza środkową. | miękkość cienia inna; do oceny na oko |
| C3 **P2** | `scene/environment/scenery.js`, `scene/spawner.js`, `scene/fade.js` | Każda palma i skała to osobny mesh + bliźniak linii: 142 draw calli w passie bazowym, tyle samo w glow, ok. 90 w cieniach. | ok. 370 z 594 draw calli; ×2 przy gęstości 2. | `InstancedMesh` per model (palma, dwie skały) i per materiał: ~12 draw calli zamiast ~370. Haczyk: fade-in/out jest zrobiony podmianą materiałów (fader), per instancja trzeba by atrybutu `instanceOpacity` i wstawki w shaderze (jak `wireEdge`), albo rezygnacji z fade'u (mgła maskuje spawn przy 200 jednostkach). Największa zmiana z listy. | bez zmian (z instancyjnym fade) |
| C4 **P2** | `scene/environment/city.js` `windowsGeometry` | 47 k trójkątów okien: każde okno to osobny quad, także w stylu "floors", gdzie pas okien jest jednym quadem, ale "windows" (2/3 wież) daje do kilkuset quadów na wieżę. | 47 k × 2 passy; po C1 tylko gdy kamera patrzy w tył. | Okna jako tekstura/wzór w shaderze ściany (uv × siatka, `fract`, próg z hasha) zamiast geometrii: 0 dodatkowych trójkątów, ten sam wygląd z dowolnej odległości. Albo tylko scalać sąsiednie zapalone okna w pasy. Po C1 priorytet spada. | bez zmian / minimalne |
| C5 **P2** | `scene/environment/sideHills.js` `grow()` | Chunki w strefach wzrostu i zanikania (zwykle 8–10 z 16) dostają co klatkę przepisane y wszystkich 2 784 wierzchołków (`growthAt` = 2 smoothstepy na wierzchołek) i pełny upload bufora (33 KB każdy). | ok. 25 k wierzchołków JS + ~300 KB uploadu na klatkę; na telefonie zauważalne. | Wzrost w vertex shaderze: `onBeforeCompile` materiałów "side" ze skalowaniem y po `modelMatrix * position` i uniformami `growFrom/To`, `shrinkFrom/To` (z `pełnej` wysokości w atrybucie). Wtedy `grow()` znika, a bufor rusza tylko przy `reshape`. Alternatywa tańsza: aktualizować tylko chunki, których `growth` zmienił się o > 1/255. | bez zmian |
| C6 **P3** | `core/bloom.js` `blackFor`, `darken` | Na każdy nieświecący obiekt co klatkę: `[…].join()` klucza (alokacja stringa) i `Map.set`; dwa `traverse` sceny na klatkę (darken + przywrócenie przez Map). | ok. 100 stringów + 200 operacji Map na klatkę; śmieci dla GC. | Czarny materiał per materiał źródłowy w `WeakMap` (jak `dimmed`), klucz liczony raz przy pierwszym spotkaniu; `swapped` jako tablica par zamiast Map. | bez zmian |
| C7 **P3** | `scene/wire.js` `addWireframe`: `wire.receiveShadow = true` | Bliźniaki linii (Phong) odbierają cienie: pięć próbek PCF na piksel linii, których cienia i tak nie widać na jednopikselowej kresce. | fragment shader linii ×5 lookupów. | `receiveShadow = false` dla bliźniaków (bryła pod spodem ma cień). | do sprawdzenia: linie w cieniu są dziś ciemniejsze? |
| C8 **P3** | `scene/lines.js` (`LINE_PARAMETERS`: `transparent`, `DoubleSide`, `depthWrite: false`) | Linie są rysowane jako pełne trójkąty z `discard` poza kreską: palma (500 trójkątów, gęsta korona) to kilkadziesiąt warstw overdraw na piksel w passie bazowym i glow. | fill rate na palmach z bliska; `uLineFade` tnie tylko daleko. | Nic taniego: to cena wireframe'u szerokości w jednostkach świata. Ewentualnie `uLineMin` i `fade` dla palm wyżej (już 0,6). Odnotowane, nie do roboty. | — |
| C9 **P3** | `scene/spawner.js` `update` → `fader.set` | Każdy obiekt co klatkę woła `fader.set(object, opacityOf(object))`, a dla nieprzezroczystych to `release()` z `Map.get` na pusto. | ~75 wywołań/klatkę, pomijalne. | Liczyć `opacityOf` tylko dla obiektów w strefach fade (`age < fadeIn || z > endZ − fadeOutDistance`). | bez zmian |
| C10 **P3** | `renderer.info.programs: 40` | 40 programów shaderów; kompilacja przy pierwszym użyciu (pierwszy spawn ruchu, pierwsze fade'y) to znane 40–70 ms czkawki (komentarz w `fade.js`). | jednorazowe przycięcia w pierwszych sekundach gry. | `renderer.compileAsync(scene, camera)` po załadowaniu, z jednym samochodem ruchu i jednym fade'ującym klonem w scenie na czas kompilacji (prewarm shaderów). | bez zmian |

Rzeczy sprawdzone i w porządku: teren i droga to 2 trójkąty (plane bez segmentów), `renderScale` 0,5 i `setPixelRatio(1)`, `info.autoReset = false` z resetem per klatka, `followCar` i `shake` bez alokacji, HUD dotyka DOM tylko przy zmianie, `fillHeightField` tylko przy przewinięciu chunka (co ~9 s na stronę), `prewarm` jednorazowy, tweeny i lil-gui `.listen()` pomijalne, 24 geometrie i 26 tekstur w pamięci (w tym 5 map cieni i mipy bloomu).

## D. Kolejność i pytania

1. **C1 (miasto)**: zrobione, −29 % trójkątów klatki, bez zmian wizualnych.
2. **Pomiar na sprzęcie**: F10 na docelowych maszynach (desktop i telefon) przed i po C1; dopiero wtedy decyzje o C2 (cienie) i C3 (instancing), bo oba zmieniają wygląd lub architekturę.
3. **C5–C7, C9**: godzina, bez zmian wizualnych; warto przy okazji.
4. **C4, C8, C10**: po pomiarze, jeśli coś boli.

Pytania do autora:

- Jaki sprzęt jest celem? Desktop z osobnym GPU nie zauważy niczego poza C1; telefony i laptopy ze zintegrowaną grafiką zauważą draw calle (C3) i cienie (C2).
- Ile FPS i draw calli pokazuje F10 u Ciebie (menu, free ride, minigra) i czy są przycięcia przy pierwszym ruchu (C10)?
- Cienie: czy pięć próbek (szerokie, miękkie źródło) jest nienaruszalne, czy trzy / jedno z `PCFSoft` wchodzi w grę?
- Palmy i skały: czy fade-in/out przy spawnie jest ważny (mgła i tak je kryje)? Bez niego instancing jest prosty; z nim to dzień roboty.
- Suwak gęstości do 2: zostaje? Przy 2 draw calle rosną do ~900.
