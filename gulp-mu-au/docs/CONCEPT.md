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
µCSS macht sie „echt" — das ist die eleganteste, standardnahe Schreibweise:

| W3C-Property | Wiederbelebte Bedeutung in µCSS | Typ |
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
	-µ: Sound("engine", { loop: true });       /* loop: start@animationstart, stop@animationend */
}
```

Optionen: `on` (Trigger; Default `click`), `loop` (bool oder `[startSec, endSec]`),
`stop` (expliziter Stop-Trigger, überschreibt den Loop-Default), `vol` (0–100),
`once` (nur einmal pro Element). Der erste Parameter ist der **Sound-Name** = Dateibasisname
ohne Endung (und ohne `.ls.x.le.y`-Loop-Suffix). Aurale Property und Direktive sind
austauschbar; intern erzeugen beide denselben Bindings-Eintrag.

---

## 5. Loop-Handling

- **Default:** Loop-Sounds starten bei `animationstart`, stoppen bei `animationend`. Die
  Loop-Punkte stammen aus dem Dateinamen (`engine.ls.100.le.400.wav`) oder aus
  `loop: [start, end]`. Passt zu `Sounds.play()` (liefert die Source) + `Sounds.stop(src)`
  (respektiert den Loop-Auslauf).
- **Sonderfall `infinite`:** Bei `animation: … infinite` feuert `animationend` nie. Dann
  endet der Loop, wenn die auslösende Klasse/das Element entfernt wird (Runtime via
  MutationObserver) oder per expliziter Runtime-API. Wird dokumentiert; kein stiller
  Dauerton.
- **`iteration`:** `on: "animationiteration"` spielt einen kurzen One-Shot pro Durchlauf
  statt eines Dauer-Loops.

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
    { "selector": ".btn.save:hover", "on": "pointerover", "sound": "click" },
    { "animation": "spin", "sound": "engine", "loop": true,
      "start": "animationstart", "stop": "animationend" }
  ]
}
```

- **Animation-Bindings** referenzieren die `animation-name` (der Build liest sie aus der
  Regel). Das Runtime lauscht global auf `animationstart`/`animationend`/`animationiteration`
  und schlägt `event.animationName` in der Map nach — kein Selector-Matching nötig.
- **Selector-Bindings** (Klassen-Trigger) verdrahtet das Runtime über wenige delegierte
  Listener (`event.target.closest(selector)`).

---

## 7. Runtime (spätere Stufe, auf µLib)

Eine schlanke Schicht (≈ ein Modul) lädt den Atlas + JSON über µLib `Sounds.load(...)`,
liest `bindings` und installiert:

- **einen** globalen Animation-Listener (`animationstart`/`-end`/`-iteration`),
- pro benötigtem DOM-Event-Typ **einen** delegierten Listener am `document`.

Gespielt wird über µLib `Sounds.play/stop` (vorhanden, konsumiert exakt dieses
JSON-Format). **Sprachausgabe** (`Speech.speak`) ist reine Runtime ohne Build-Artefakt;
eine analoge Direktive `-µ: Speak("i18n-key", { on })` (Text via i18x) ist denkbar, wird
aber **nach** den Sound-Bindings angegangen.

---

## 8. Symmetrie zu Sprite & Font (konkret)

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

## 9. Entscheidungen & offene Punkte

**Festgelegt (revidierbar):**
- D-AU1 — Doppelter Registrierungsweg (CSS-Klasse + Manifest, Einzeldatei/Verzeichnis) für
  Sprite/Sound/Font einheitlich (§1).
- D-AU2 — Sounds immer per JS **und** per CSS/Animation auslösbar; gemeinsame Atlas/Name-Basis (§2).
- D-AU3 — Aurale W3C-Properties (`cue-before`/`cue-after`/`play-during`) als bevorzugte
  Schreibweise, Direktive `-µ: Sound(...)` für Spezialfälle (§3/§4).
- D-AU4 — Loop-Default Start@`animationstart`/Stop@`animationend`; `infinite` über
  Klassen-/Element-Entfernung; `iteration`-Option (§5).
- D-AU5 — Bindings als JSON-Sidecar in `*.sounds.json` (§6).

**Offen:**
- Genaue Event-Namen-Zuordnung für `cue-before`/`cue-after` außerhalb von `:hover`
  (Erscheinen/Verschwinden = IntersectionObserver vs. Mount/Unmount) — beim Runtime-Entwurf
  zu klären.
- Ob `play-during` auch ohne CSS-Animation (reine Präsenz des Elements) loopt oder nur in
  Verbindung mit einer Animation — Default: an Animation gekoppelt; Präsenz-Loop optional.
