# µAU — Sound-Atlas & CSS-Sound-Konzept

Stand: Juni 2026 · Status: Entwurf zur Diskussion

Dieses Dokument zurrt fest, **wie Sounds in der µCSS/µPS-Familie definiert, gebündelt
und ausgelöst werden**. Es baut auf dem Build-Layer von µAU auf (`SoundAtlasMaker`,
siehe `README.md`) und beschreibt den Weg bis zur CSS-Anbindung. Anzeigename **µAU**,
technischer Paketname `gulp-mu-au`.

Der reine Build-Layer (Audiodateien → ein Blob + JSON-Timing-Map) ist umgesetzt.
Die hier beschriebene **CSS-Direktive** und das **Runtime-Wiring** sind die nächsten
Stufen; dieses Konzept legt deren Form vorab fest.

---

## 1. Leitprinzip: zwei Registrierungswege für jeden Atlas (Sprite · Sound · Font)

Das verbindende Konzept der Familie soll für **alle** atlas-artigen Assets gleich sein.
Jedes Element kann auf **zwei** Wegen in seinen Atlas bzw. Font aufgenommen werden — beide
speisen dieselbe Ausgabe:

1. **CSS-Klassen-Ebene** — ein einzelnes Element wird direkt in einer `.µ.css`-Regel
   referenziert (Direktive). Das registriert es in den Atlas/Font **und** verdrahtet die
   Regel. Co-Location: Das Asset steht da, wo es benutzt wird.
2. **Manifest-Ebene** — einzelne Dateien **und/oder ganze Verzeichnisse** werden im
   Skin-Manifest deklariert und unabhängig von der CSS-Nutzung registriert. Nötig für
   Assets, die nur aus JS verwendet werden (Sounds per Name, dynamisch eingefügte Glyphen)
   oder für Bulk/Preload.

| Asset | CSS-Klassen-Ebene (Direktive) | Manifest-Ebene (Einzeldatei/Verzeichnis) |
| :--- | :--- | :--- |
| Sprite-Atlas | `-µ: Sprite("imgs/logo.png")` *(vorhanden)* | `sprites.include: ["imgs/extra/…", "dev/…/icons/"]` *(neu)* |
| Sound-Atlas | `-µ: Sound("click", { … })` *(neu)* | `sounds.src` / `sounds.include` *(umgesetzt)* |
| Icon-Font | `-µ: Glyph("icons/edit.svg")` *(neu)* | `font.src` (Verzeichnis) *(in µFT vorhanden)* |

**Konsequenz:** Der Sprite-Atlas wird heute nur aus `Sprite()`-Referenzen gefüllt; das
Konzept ergänzt einen Manifest-Weg (Einzelbilder/Verzeichnisse in den Atlas, auch ohne
CSS-Referenz). µFT hat den Verzeichnis-Weg bereits; ihm fehlt die CSS-Einzelreferenz
(`Glyph()`). µAU braucht beide Wege von Anfang an.

---

## 2. Sounds: immer zwei Auslöse-Wege

Ein in den Atlas aufgenommener Sound muss **immer beides** unterstützen:

- **Aus JavaScript, ganz normal** — `Sounds.play("click")` (wie der Alt-Bestand mit
  `PlaySound`). Das funktioniert allein dadurch, dass der Sound im Atlas liegt und im
  Timing-JSON unter seinem Namen steht — unabhängig davon, ob ihn jemals eine CSS-Regel
  referenziert. Die Manifest-Ebene (1.2) genügt dafür. **Umgesetzt:** der `sounds`-Block
  im Skin-Manifest (`sounds: { src, include, dataFile, jsonFile, format, … }`, Objekt oder
  Array) baut über µAU (`SoundAtlasMaker`) den Atlas + JSON in den Skin-Output; Quellen sind
  projekt-relativ (wie `media`), eigener inkrementeller Cache unter `<outputDir>/.cache`.
- **Über CSS / Animation-Events, deklarativ** — siehe §3/§4. Der Build erzeugt dafür
  zusätzlich eine **Bindings-Map**, die das Runtime auf die richtigen DOM-Events legt.

Gemeinsame Basis beider Wege ist derselbe Atlas + dieselbe Name→Timing-Map. Die
CSS-Anbindung ist reine Zusatzschicht, kein Ersatz für den JS-Weg.

---

## 3. W3C-Wiederbelebung: aurale CSS-Properties

Die (nie real implementierte) **CSS Aural/Speech**-Idee kannte passende Properties.
µCSS™ macht sie „echt" — das ist die eleganteste, standardnahe Schreibweise:

| W3C-Property | Wiederbelebte Bedeutung in µCSS™ | Typ |
| :--- | :--- | :--- |
| `cue-before` | Ton, wenn der Regelzustand **aktiv** wird (Element erscheint / `:hover` betreten / Klasse gesetzt) | One-Shot |
| `cue-after` | Ton, wenn der Regelzustand **inaktiv** wird (verlässt/verschwindet) | One-Shot |
| `play-during` | Ton **während** der Regelzustand aktiv ist; bei animierten Elementen: Start@`animationstart`, Stop@`animationend` | Loop |
| `cue` | Kurzform für `cue-before`/`cue-after` | — |

Die Properties tragen einen `µ(Sound(...))`-Wert; sie haben nativ keine Wirkung, der Build
liest sie aus, registriert den Sound und erzeugt das Binding:

```css
.btn.save:hover {
	cue-before: µ(Sound("click"));            /* One-Shot beim Betreten */
}
.dialog.error {
	cue-before: µ(Sound("alert"));            /* beim Erscheinen */
	cue-after:  µ(Sound("whoosh"));           /* beim Schließen */
}
.spinner {
	animation: spin 2s linear infinite;
	play-during: µ(Sound("engine"), repeat);  /* Loop, an die Animation gekoppelt */
}
```

So bleibt die Quelle valides (wenn auch dormantes) CSS, und Editoren zeigen sie als
Properties. Der Build entfernt sie aus der Ziel-CSS (kein toter Standard im Output) und
überführt sie in die Bindings-Map.

---

## 4. Direktive für explizite Kontrolle

Wo die auralen Properties nicht genau passen (spezielle Events, mehrere Sounds an einer
Regel, Lautstärke), greift die Direktiv-Form — konsistent zu `-µ: Sprite(...)`/`Cursor(...)`:

```css
.toggle {
	-µ: Sound("switch", { on: "down" });      /* on: down|up|click|enter|leave
	                                              |animationstart|animationend|animationiteration */
}
.spinner {
	animation: spin 2s linear infinite;
	-µ: Sound("engine", { while: "animation" });  /* Start/Stop an Animation gekoppelt */
}
```

Optionen: `on` (Trigger; Default `click`), `while` (`animation` = Start@`animationstart`,
Stop@`animationend`; kein separates Loop-Flag), `stop` (expliziter Stop-Trigger),
`vol` (0–100), `once` (nur einmal pro Element). Der erste Parameter ist der **Sound-Name**
= Dateibasisname ohne Endung (und ohne `.ls.x.le.y`-Loop-Suffix).

**Kein `loop`-Parameter in der Direktive:** Ob ein Sample loopt, steht bereits in der
Timing-Map (`sounds[name]` → `loopStart`/`loopEnd`, siehe §5). Die Direktive legt nur fest,
**wann** abgespielt und ggf. gestoppt wird — nicht **wie** geloopt wird.

Aurale Property und Direktive sind austauschbar; intern erzeugen beide denselben
Bindings-Eintrag.

---

## 5. Loop-Handling — Daten im Atlas, Events in den Bindings

**Trennung:**

| Was | Wo definiert |
| :--- | :--- |
| Sample-Segment, Dauer, **Loop-Punkte** | Atlas-Build: Dateiname (`engine.ls.100.le.400.wav`) → `sounds.engine` = `[start, dur, loopStart, loopEnd]` |
| **Wann** abspielen / stoppen | Bindings: CSS, Direktive oder `soundTriggers.mjs` |
| Verhalten One-Shot vs. Sustain | Binding-Typ (`cue-*` = One-Shot; `play-during` / `while: animation` = Sustain) |

**Runtime (µLib `Sounds.play`):** Liest `loopStart`/`loopEnd` aus der Timing-Map. Sind beide
≥ 0 und `loopEnd > loopStart`, wird mit `AudioBufferSourceNode.loop` geloopt — unabhängig
davon, ob der Aufruf aus einem Binding oder aus App-JS kommt (wie heute schon in
`SoundAtlasPlayer` der FlyEx-Demo).

- **One-Shot-Binding** (`cue-before`/`cue-after`, `on: click`, …): ein Aufruf
  `Sounds.play("name")` — spielt das Segment **einmal** (Loop-Flag der Quelle wird für
  diesen Modus ignoriert bzw. nur bis Segmentende).
- **Sustain-Binding** (`play-during`, `while: animation`): Start-Event → `Sounds.play`;
  Stop-Event → `Sounds.stop(src)`. Loop-Punkte kommen **ausschließlich** aus `sounds[name]`.
- **Sonderfall `animation: … infinite`:** `animationend` feuert nie → Stop bei Entfernen der
  auslösenden Klasse/des Elements (MutationObserver) oder per `Sounds.stop` aus App-JS.
- **`animationiteration`:** One-Shot pro Durchlauf (kurzer Tick), kein Dauer-Loop.

`play-during` **ohne** `animation-name` in derselben Regel ist **nicht** der Default — optional
später als `while: presence` (Ton solange Selektor/Element aktiv); Loop-Punkte weiterhin nur
aus dem Atlas.

---

## 6. Build-Ausgabe: Bindings-Transport

**Entscheidung (revidierbar): JSON-Sidecar.** Die Bindings landen im vorhandenen
`*.sounds.json` unter einem neuen Schlüssel `bindings` (neben `sounds`). Vorteile: voll
datengetrieben, ein einziger globaler Listener für Animationen, delegierte Listener für
Klassen-Trigger, keine toten Standard-Properties im CSS-Output. (Alternative
CSS-Custom-Properties wurde verworfen: erfordert Auslesen pro Event und für Animationen
ohnehin eine name→sound-Map.)

```jsonc
{
  "sampleRate": 44100,
  "sounds":   { "click": [0, 0.08, -1, -1], "engine": [0.18, 1.2, 0.22, 1.0] },
  "bindings": [
    { "selector": ".btn.save:hover", "on": "pointerover", "sound": "click", "mode": "oneshot" },
    { "animation": "spin", "sound": "engine", "mode": "sustain",
      "start": "animationstart", "stop": "animationend" }
  ]
}
```

`mode`: `oneshot` (Default bei `cue-*`) oder `sustain` (Default bei `play-during`). **Kein**
`loop`-Feld — Loop-Punkte liegen in `sounds[sound]`.

- **Animation-Bindings** referenzieren die `animation-name` (der Build liest sie aus der
  Regel). Das Runtime lauscht global auf `animationstart`/`animationend`/`animationiteration`
  und schlägt `event.animationName` in der Map nach — kein Selector-Matching nötig.
- **Selector-Bindings** (Klassen-Trigger) verdrahtet das Runtime über wenige delegierte
  Listener (`event.target.closest(selector)`).

**Drei Quellen, eine Map:** Eintrag in `bindings[]` kann aus (1) aurale CSS-Properties,
(2) der Direktive `-µ: Sound(...)` oder (3) dem Manifest-Modul **`soundTriggers`** stammen
(§7). Der Build merged alle Quellen in dieselbe JSON-Datei; Duplikate (gleicher Schlüssel)
sind ein Fehler.

**Vollautomatisch:** Enthält das JSON `bindings`, installiert die Runtime (§8) **ohne**
weiteres App-JS alle nötigen Listener — ein Aufruf `Sounds.installBindings(json)` (Arbeitstitel)
nach `Sounds.load(...)`.

---

## 7. Manifest: `soundTriggers` (Build) und `soundHandlers` (Runtime)

Nicht jeder Sound-Auslöser lässt sich sauber in CSS formulieren — z. B. Bindings, die von
**Helper-generierten Selektoren** abhängen (`FlyEx` erzeugt hunderte `div.fly.n*.d*`-Regeln),
mehrere Sounds pro Regel mit Bedingungen, oder Animation-Namen, die erst beim Kompilieren
feststehen. Dafür ist **`helpers.mjs` nicht der richtige Ort**: Helpers laufen in der
**CSS-Kompilierung** (Regeln patchen, Properties setzen) und haben keinen Kanal in die
Runtime-Bindings-Map.

Der **`sounds`-Block** kann optional **zwei** Modul-Pfade tragen — Build vs. Runtime:

```js
// skins/src/std.µcss.mjs
import { DefineSkin } from "gulp-mu-css";

export default DefineSkin({
	sounds: {
		src: "dev/media/final/sounds",
		dataFile: "snds/app.sounds.wav",
		jsonFile: "snds/app.sounds.json",
		triggers: "./soundTriggers.mjs",   // Build-Zeit: bindings[] ergänzen
		handlers: "./soundHandlers.mjs"      // Runtime: Standard-Handler überschreiben/erweitern
	},
	helpers: { FlyEx, FlyExUtils, … },
	files: [ … ]
});
```

| Modul | Phase | Aufgabe |
| :--- | :--- | :--- |
| `triggers` | **Build** (`SkinBuilder`) | Imperativ `bindings[]` füllen — ergänzt CSS-Parser |
| `handlers` | **Runtime** (Browser, nach `installBindings`) | Standard-Event-Funktionen **wrappen oder ersetzen** |

Bei **mehreren Atlanten** (`sounds: [ { … }, … ]`) gehören `triggers`/`handlers` jeweils
zum passenden Atlas-Eintrag. Der Pfad zu `handlers` wird im JSON vermerkt (z. B.
`handlersModule`) oder die App lädt das Modul explizit neben dem Skin.

### Pipeline: Build liefert Daten, Runtime liefert Verhalten

Die Sound-Anbindung folgt einer **strikten Zweiteilung** — bewusst **keine** Doppelrolle
für `handlers`:

```
Build (Node)                          Runtime (Browser)
────────────                          ─────────────────
Atlas + sounds[name]     ──JSON──►    Sounds.load(...)
CSS  ──► bindings[]                   Sounds.installBindings(json)
triggers.mjs ──► bindings[]           → Listener + Default-Handler
                                      handlers.mjs? → Handler patchen (optional)
                                      App-JS? → Sounds.play direkt (optional)
```

| Phase | Was passiert | Was **nicht** passiert |
| :--- | :--- | :--- |
| **Build** | Timing-Map, `bindings[]` (aus CSS + `triggers`) in `*.sounds.json` schreiben | Kein Browser-Code erzeugen; `handlers.mjs` wird **nicht** ausgeführt |
| **Runtime** | JSON einlesen, Listener installieren, optional Handler wrappen | `bindings[]` **nicht** nachträglich ändern; `triggers.mjs` **nicht** erneut laufen |

**`triggers` = nur Build-Zeit.** Läuft in Node beim `BuildSkin`, kennt kein DOM. Ergebnis
sind **Daten** — zusätzliche oder explizite Einträge in `bindings[]`. Das JSON ist
einsehbar, diffbar und ohne Browser testbar.

**`handlers` = nur Runtime.** Läuft im Browser **nach** `installBindings`, wenn die
automatischen Default-Handler nicht reichen. Es **generiert keinen Code** beim Build und
**ändert das JSON nicht** — es patcht nur die bereits installierten Methoden (Wrap mit
Super-Aufruf oder vollständiger Ersatz).

**Wo gehört was hin?**

| Anforderung | Richtiger Ort |
| :--- | :--- |
| Weitere Events/Selektoren deklarieren | CSS oder `soundTriggers.mjs` |
| Loop-Punkte / Sample-Länge | Quelldateiname / Atlas (`sounds[name]`) |
| Standard-Verhalten für ein Binding anpassen | `soundHandlers.mjs` (Wrap/Ersatz) |
| Komplett freie Logik (Spiel, Zufall, API) | App-JS mit `Sounds.play` / `Sounds.stop` |

`handlers` **ersetzt nicht** `triggers`: Wer zur Build-Zeit weiß, *welcher* Sound bei
*welchem* Event laufen soll, gehört in CSS oder `triggers`. `handlers` ist nur für Fälle,
in denen die **gleiche Binding-Liste** reicht, aber die **Reaktion** abweichen muss — oder
für Logik ohne Binding (dann direkt App-JS).

Manifest-Feld `handlers` ist **optional**. Fehlen CSS, `triggers` **und** `handlers`, genügt
`installBindings` allein — null manuelles Event-JS.

### `soundTriggers.mjs` — Build-Zeit

Die Datei exportiert **eine Default-Funktion**; Argument ist ein **`Register`-Objekt**
(`SoundTriggerRegistry`) — dieselbe Bindings-Form wie §6:

```js
// skins/src/soundTriggers.mjs
export default function RegisterSoundTriggers(_register) {
	_register.Animation({
		name: "flyGo",
		sound: "fly1",
		mode: "sustain",
		start: "animationstart",
		stop: "animationend"
	});

	_register.Selector({
		selector: "div.panel button.save:hover",
		on: "pointerover",
		sound: "click",
		mode: "oneshot"
	});
}
```

Validierung: Sound-Name muss im Atlas vorkommen. Loop-Punkte **nicht** hier setzen — nur in
den Quelldateien / Timing-Map.

### `soundHandlers.mjs` — Runtime-Override

Wenn die automatischen Listener nicht reichen (Spiel-Logik, Sonderfälle, Filter), exportiert
diese Datei eine Funktion, die ein **`Handlers`-Objekt** mit den **Standard-Methoden** der
Runtime erhält und einzelne Methoden **überschreibt oder wrappt** (Super-Aufruf auf die
vorherige Implementierung):

```js
// skins/src/soundHandlers.mjs
export default function ExtendSoundHandlers(_handlers) {
	const _onAnimationStart = _handlers.OnAnimationStart.bind(_handlers);

	_handlers.OnAnimationStart = (_event, _binding) => {
		// Beispiel: bestimmten Sound selbst behandeln, sonst Default
		if (_binding.sound === "fly1" && _event.target.closest(".flyex-demo")) {
			// … eigene Logik, ggf. Sounds.play mit extra Optionen …
			return;
		}
		_onAnimationStart(_event, _binding);
	};

	// Weitere Hooks (Arbeitstitel): OnSelectorEvent, OnBindingStop, …
}
```

**Ablauf:** (1) Atlas + JSON laden, (2) `installBindings(json)` — legt Default-Handler an,
(3) optional `ExtendSoundHandlers(handlers)` aus `soundHandlers.mjs` — patcht das
Handler-Objekt, (4) Listener feuern die (ggf. gewrappte) Methode. Ohne Schritt (3): rein
deklarativ, null manuelles JS.

`handlers` läuft **ausschließlich** in Schritt (3) — siehe Abschnitt „Pipeline“ oben.

### Abgrenzung: vier Ebenen

| Ebene | Mechanismus | Wann |
| :--- | :--- | :--- |
| **CSS deklarativ** | `cue-before` / `cue-after` / `play-during`, `-µ: Sound(...)` | Ton an **Regel** gebunden; Auto-Wiring |
| **Manifest `triggers`** | `soundTriggers.mjs` → `bindings[]` | Build-Zeit-Ergänzung (Helper-Selektoren, …) |
| **Manifest `handlers`** | `soundHandlers.mjs` → wrap/override | Runtime-Eingriff **auf** Standard-Methoden |
| **App-JavaScript** | `Sounds.play` / `Sounds.stop` direkt | Volle Freiheit, kein Binding nötig (FlyEx-Klick) |

Die FlyEx-Demo zeigt heute **Atlas per Manifest** + **alles in `demo.js`**. Zielbild:
Animations-Loops über `triggers` + Auto-Wiring; Klick-/Spawner-Logik in `handlers` **oder**
freiem App-JS.

### Optionale Verknüpfung mit Helpers

Helpers und Trigger-Modul **teilen keine Ausführung**, dürfen aber **dieselbe Konstanten-
Datei** importieren (Sound-Namen, Animationsnamen).

---

## 8. Runtime (µLib) — Auto-Wiring und Handler-API

Eine schlanke Schicht lädt den Atlas + JSON über `Sounds.load(...)`, liest `bindings` und
ruft **`Sounds.installBindings(_json)`** auf. Das legt **vollautomatisch** an:

- **einen** globalen Animation-Listener (`animationstart`/`-end`/`-iteration`),
- pro benötigtem DOM-Event-Typ **einen** delegierten Listener am `document`.

Intern ein **`Handlers`-Objekt** mit Default-Implementierungen, z. B.:

| Methode (Arbeitstitel) | Aufgabe |
| :--- | :--- |
| `OnSelectorEvent(event, binding)` | `closest(selector)` → bei Treffer `play`/`stop` je nach `mode` |
| `OnAnimationStart(event, binding)` | `animationName` match → `Sounds.play` (Loop aus Timing-Map) |
| `OnAnimationEnd(event, binding)` | passendes Sustain-Binding → `Sounds.stop` |
| `OnAnimationIteration(event, binding)` | One-Shot-Tick |

**Standard-Mapping `cue-before` / `cue-after`** (Build leitet DOM-Events aus dem Selektor ab,
Runtime führt nur aus):

| Selektor-Muster | `cue-before` (aktiv) | `cue-after` (inaktiv) |
| :--- | :--- | :--- |
| `:hover` | `pointerover` | `pointerout` |
| `:focus`, `:focus-visible` | `focusin` | `focusout` |
| `:active` | `pointerdown` | `pointerup` / `pointerleave` |
| `:checked` (+ Checkbox/Radio) | `change` (→ checked) | `change` (→ unchecked) |
| Klasse gesetzt (`.open`, `.visible`) | `transitionrun` / Klassen-Observer | Klassen-Observer |
| Element neu im DOM | optional `IntersectionObserver` | Element entfernt / IO |

Spezialfälle: im **`triggers`-Modul** explizites `on`/`stop` setzen oder in **`handlers`**
die Default-Methode ersetzen — kein stilles Raten in der Runtime nötig.

Gespielt wird über µLib `Sounds.play/stop` (konsumiert exakt die Timing-Map). **Sprachausgabe**
(`Speech.speak`) bleibt reine Runtime ohne Build-Artefakt.

---

## 9. Symmetrie zu Sprite & Font (konkret)

Damit das Leitprinzip (§1) real wird, sind über µAU hinaus zwei kleine Ergänzungen
vorgesehen (separat, nicht Teil des µAU-Build-Layers):

- **Sprite-Atlas (umgesetzt):** Manifest-Feld `sprites.include` nimmt Einzelbilder
  **und/oder ganze Verzeichnisse** (relativ zum Skin-Output, rekursiv; `@2x` und die
  Atlas-Datei werden übersprungen) zusätzlich zu den `Sprite()`-CSS-Referenzen in den
  Atlas auf — ohne CSS-Regel, für nur aus JS gesetzte Hintergründe / Preload. Die
  Positionen stehen im `Resolve`-Ergebnis (`atlas.sprites[url]`). Implementiert in
  `gulp-mu-css` (`SpriteManager.RegisterImage` + `SkinBuilder`); getestet.
- **Icon-Font (µFT):** CSS-Direktive `-µ: Glyph("icons/edit.svg")` registriert ein
  einzelnes SVG in den Font (Codepoint automatisch vergeben) und schreibt die Regel mit
  `content`/`font-family` um — das Gegenstück zum vorhandenen Verzeichnis-Weg (`font.src`).

---

## 10. Entscheidungen & offene Punkte

**Festgelegt (revidierbar):**
- D-AU1 — Doppelter Registrierungsweg (CSS-Klasse + Manifest, Einzeldatei/Verzeichnis) für
  Sprite/Sound/Font einheitlich (§1).
- D-AU2 — Sounds immer per JS **und** per CSS/Animation auslösbar; gemeinsame Atlas/Name-Basis (§2).
- D-AU3 — Aurale W3C-Properties (`cue-before`/`cue-after`/`play-during`) als bevorzugte
  Schreibweise, Direktive `-µ: Sound(...)` für Spezialfälle (§3/§4).
- D-AU4 — **Loop-Punkte nur im Atlas** (`sounds[name]`); Bindings nur Events + `mode`
  (`oneshot`|`sustain`); Sustain Stop@`animationend` bzw. Klassen-/Element-Entfernung bei
  `infinite` (§5).
- D-AU5 — Bindings als JSON-Sidecar in `*.sounds.json` (§6).
- D-AU6 — Build-Ergänzung `sounds.triggers` (`RegisterSoundTriggers`); getrennt von `helpers` (§7).
- D-AU7 — **Vollautomatisches Wiring** via `Sounds.installBindings`; optional Runtime-Modul
  `sounds.handlers` zum **Wrappen/Ersetzen** der Standard-Handler-Methoden (§7/§8).
- D-AU8 — Default-Tabelle Selektor → DOM-Events für `cue-before`/`cue-after` (§8); Override
  per explizitem `on` in Direktive/`triggers` oder per `handlers`.
- D-AU9 — **Strikte Phasentrennung:** `triggers` nur Build (schreibt `bindings[]` ins JSON);
  `handlers` nur Runtime (patcht Handler, **ohne** JSON-Änderung und **ohne** Build-Ausführung).
  Build = Daten, Runtime = optionales Verhalten (§7, „Pipeline“).

**Offen (Implementierung):**
- `SkinBuilder`: CSS-Parser, `triggers`-Import, Merge in JSON; Pfad `handlers` ins JSON oder
  Skin-Bootstrap dokumentieren.
- Feinheiten Klassen-Observer (`.open`) und `while: presence` — nach erstem Runtime-Prototyp.
