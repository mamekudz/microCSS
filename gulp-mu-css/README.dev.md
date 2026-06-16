# µCSS (npm-Paket `gulp-mu-css`)

Node-Modul zur Kompilierung von µCSS-erweiterten Stylesheets — **Version 2** des 2013 eingeführten, ursprünglich Adobe-Photoshop-basierten µCSS. Da das µ-Zeichen in Paket- und Repository-Namen (npm, git) immer wieder Probleme bereitet, lautet der technische Name `gulp-mu-css`; µCSS ist der Anzeigename. Das Gesamtkonzept ist in `docs/CONCEPT.md` beschrieben.

## Warum µCSS?

Für fast jeden Teilaspekt von µCSS existiert ein etabliertes Einzelwerkzeug — **aber kein System, das alles bündelt**:

| Funktion | Nächstes existierendes Pendant | Was fehlt dort |
| :--- | :--- | :--- |
| Variablen & Farbfunktionen | Sass/LESS (`lighten()`, `mix()`), natives CSS (`color-mix()`, Custom Properties) | kein eingebettetes JavaScript |
| JavaScript in CSS-Werten | postcss-functions (registrierte JS-Funktionen als CSS-Funktionen) | nur benannte Funktionen — keine freien Ausdrücke wie `µ($.PanelZIndex + 10)`, keine Direktiven mit Regel-/Dokument-Zugriff |
| Stylesheets mit voller JS-Power | vanilla-extract (Stylesheets-in-TypeScript) | umgekehrter Ansatz: das normale CSS-Format geht verloren |
| Sprite-Atlas aus CSS-Referenzen | spritesmith-Familie, postcss-sprites | weitgehend eingefroren (letzte Releases 2020–2024), kein Retina-`image-set`-Workflow, kein gemeinsamer Cache |
| Bilderzeugung aus PSD-Entwürfen | — (nur Bausteine wie `ag-psd`, Asset-Export aus Figma/Sketch) | kein Serien-Rendering mit Ebenenstil-Übertragung, nicht mit dem CSS-Build gekoppelt |
| Cursor, Preload, Skin-Manifest, Medien-Cache | handgestrickte Build-Skripte | nirgends gebündelt |

µCSS vereint genau diese Punkte in **einer** Pipeline: beliebige JS-Ausdrücke im CSS (`µ(...)`) plus Direktiven mit AST-Zugriff (`-µ:`), Bitmap-Sprite-Atlas inklusive Retina, PSD-Rendering mit nachgebildeten Fülloptionen (via µPS/`gulp-mu-ps`), Cursor-/Preload-Verwaltung und ein inkrementeller Build-Cache — gesteuert über ein Manifest pro Skin. Die Quell-Stylesheets bleiben dabei **syntaktisch valides CSS** (Editoren, Linter und Diffs funktionieren unverändert), und da µCSS intern eine PostCSS-Pipeline ist, bleibt das gesamte PostCSS-Ökosystem (cssnano, Stylelint, …) andockbar.

## Status

In Entwicklung. Umgesetzt sind die Meilensteine **M1** (Core-Pipeline), **M2** (Sprites & Cursor), **M3** (Manifest & Build), **M4** (Hooks & Makros), **M5** (AiDPix-Migration) und **M6** (Handbuch):

- **`CompileMcss(source, options)`** — kompiliert `.µ.css`-Quelltext (PostCSS-basiert). Die Quell-Stylesheets verwenden das Doppelsuffix `*.µ.css` (alternativ `*.mu.css`), damit Editoren sie automatisch als CSS erkennen; für den Compiler ist die Endung irrelevant, da das Manifest die Quellen explizit referenziert:
  - `µ(expression)` bzw. ASCII-Alias `mu(expression)` in Property-Werten und At-Rule-Parametern wird als JavaScript-Ausdruck ausgewertet und durch das Ergebnis ersetzt.
  - `-µ: Direktive(...)` bzw. `-mu: ...` führt JavaScript mit Zugriff auf die umgebende Regel aus (`AddProperty`, `ChangeProperty`, `RemoveProperty`, `AddRule`, `rule`, `document`) und wird aus der Ausgabe entfernt.
  - Optionen: `vars` (Skin-Variablen, als `$.name` zugreifbar), `helpers` (eigene Funktionen), `from` (Dateiname für Fehlermeldungen), `context` (gemeinsamer `MuContext`).
  - Abschließend werden **Legacy-Gradient-Richtungen normalisiert** (ab 2.2.0): `linear-gradient(top|bottom|left|right, …)` (ohne Prefix ungültig) wird auf die Standard-`to …`-Form gehoben (`top→to bottom` usw.), auch in `repeating-linear-gradient`, kommaseparierten Layern und `border-image-source`. Winkel, bereits `to …`, Farb-Stop-zuerst und `radial-gradient` bleiben unberührt.
- **`CssDocument` / `CssRule`** — Wrapper über den PostCSS-AST: `FindRule(...pfad)`, `FindRules(selectorOderRegex)`, `AddRule`, `GetProperty`/`AddProperty`/`ChangeProperty`/`RemoveProperty`, `ToCss()`, `ToFile()` sowie `ToJson()`/`FromJson()` als manipulierbare JSON-Repräsentation für Gulp-Pipelines.
- **Farb-API** — `Lighten(color, step, model = "hsl")`, `Alpha(color, alpha)`, `MixColors(c1, c2)`, `ParseColor`, `FormatColor`. Das `"hsl"`-Modell ist bitgenau zur alten µCSS-Implementierung (verifiziert gegen kompilierte AiDPix-Ausgaben), `"oklch"` steht als wahrnehmungsgleichmäßige Alternative bereit.
- **`SpriteManager`** — die Direktive `-µ: Sprite("imgs/….png", optionen?)` registriert Bildreferenzen; `await sprites.Resolve(document)` packt alle Bilder per microPS in einen Atlas (inkl. `@2x`) und schreibt die Regeln um zu `background-image` (`url(...)` + unprefixtes `image-set(...)`), `background-repeat`, `background-position`, `width`, `height` — Format wie die alte µCSS-Ausgabe, nur ohne Vendor-Prefixes. Optionen pro Sprite: `offsetWidth`, `offsetHeight`, `offsetPosX`, `offsetPosY`, `afterWork(ctx)` (Hook mit `rule`, `document`, `sprite`, `atlas`).
- **`CursorManager`** — Cursor-Definitionen (`{ name, fallback, image, hotspot, forceFallback }`); als Direktive `-µ: Cursor("zoom")` (schreibt `cursor: url(...) x y, fallback` plus `image-set`-Variante, wenn eine `@2x`-Quelle existiert) oder als Wertform `cursor: µ(Cursor("zoom"))`.
- **`PreloadRegistry`** — sammelt Bild-URLs (z. B. Cursor-Bilder) und erzeugt die `div.csspreload`-Regel (Option `preloadRule` des `SpriteManager`).
- **`DefineSkin` / `BuildSkin`** — pro Skin ein Manifest `skins/src/<skinname>.µcss.mjs` (ASCII-Alternative `.mucss.mjs`; das Doppelsuffix kennzeichnet die Datei als Skin-Manifest, der Skin-Name ergibt sich aus dem Teil davor) (Default-Export über `DefineSkin({ vars, helpers, cursors, media, sprites, files, imageFormat, … })`). `BuildSkin(manifestPfad, { force?, outputDir?, rootDir? })` führt erst die `media`-Steps aus (microPS-Bridge: `buttonsAndIcons` — mit `mode: "topLayerSets"` ein Bild pro Top-Untergruppe statt Icon×State-Matrix, für Logos/Animationsframes/Emoticons —, `appIcons`, `sequenceStrip`, `copy`, `copyFolder`; per `outputBase: "project"` schreibt ein Step in den Projektbaum statt in den Skin — für raw→final-Zwischenschritte, deren Ergebnis ein nachfolgender Copy-Step übernimmt), kompiliert dann alle `files`-Einträge, löst den Sprite-Atlas auf und schreibt alles nach `skins/<skinname>/`. Der globale Schalter `imageFormat: "webp"` stellt die bilderzeugenden Steps und (sofern `sprites.format` fehlt) den Atlas auf WebP um; `appIcons` ignoriert `imageFormat`. Mit `sprites: { format: "webp" }` lässt sich **allein der Atlas** auf WebP umstellen, ohne die Generator-Steps anzufassen (ab 2.1.0). `Sprite()`-Quellbildpfade werden formatunabhängig aufgelöst (literaler Pfad, dann `png`/`webp`), sodass divergierende Endungen den Build nicht brechen.
- **Inkrementeller Build (D7)** — `<outputDir>/.cache/build.json` mit mtime/Größen-Fingerprints: unveränderte Generator-Steps werden übersprungen, `copy`-Steps laufen als Make-artiger mtime-Vergleich, und der **Sprite-Atlas wird nur neu gepackt, wenn sich Bildmenge oder Quellbilder geändert haben** — sonst werden die gecachten Positionen direkt wiederverwendet. `{ force: true }` oder Löschen von `.cache/` erzwingt den Vollbuild.
- **Hooks & Makros** — Helper, die als `function` (nicht als Arrow-Function) deklariert sind, werden mit `this` = Auswertungs-Scope aufgerufen: `this.AddProperty(...)`, `this.InsertRule(...)`, `this.rule`, `this.document`, `this.$` ersetzen die alten µ-Globals. `InsertRule(selector)` fügt generierte Regeln direkt hinter der Regel mit der Direktive ein (Reihenfolge bleibt über mehrere Aufrufe erhalten — Ersatz für das alte `AddBlock(n, µ.elementNo)`). Sprite-`afterWork`-Hooks erhalten zusätzlich `url` und `baseDir` im Kontext und behalten die `this`-Bindung. Die alten AiDPix-Makros (`Borders`, `TableBackgrounds`, `GlitterySprite`, `FlyEx`, `FlyExUtils`) sind als Referenz-Implementierung unter `test/fixtures/aidpix-helpers.mjs` portiert; die alten RememberBlocks sind dort durch Pfad-Adressierung ersetzt (z. B. `this.document.FindRule("@keyframes glittery", "from")`).

- **Migrations-Werkzeuge (M5)** — `tools/convert-mucss.mjs` übersetzt einen alten µCSS-Skin mechanisch in das neue Format: `µ.std.css` wird zu Manifest (`std.µcss.mjs`) plus `helpers.mjs`, alle `src*.css` zu `*.µ.css` (`-µcss:`-Direktiven → `-µ:` bzw. Property-Werte mit `µ(...)`, `«»¡` → `{};`, Setter wie `µ.SetBackgroundColor` werden mit ihren Platzhalter-Deklarationen zusammengeführt, kaputte Zeilen und Encoding-Schäden werden repariert). `tools/compare-aidpix.mjs` ist der Abnahmetest: Er baut den konvertierten Skin nach `skins/std-new` und vergleicht regel- und property-weise gegen die alte kompilierte Ausgabe — normalisiert um Vendor-Prefixes, Cursor-`image-set`-Zeilen, Atlas-Positionen und transparente Platzhalterwerte. Ergebnis für den AiDPix-Bestand: **2 951 Regeln, 0 unerwartete Differenzen** (53 dokumentierte Legacy-Drift-Fälle, z. B. im Extract fehlende Quellbilder). Aufruf über die Gulp-Tasks `aidpix:convert`, `aidpix:compare` bzw. `test:aidpix` im Projektstamm.

- **Handbuch (M6)** — Benutzerhandbuch nach dem Vorbild des alten µCSS-Manuals, zweisprachig: Quellen `docs/manual/microCSS-Handbuch.md` (deutsch) und `docs/manual/microCSS-Manual-en.md` (englisch). `tools/build-manual.mjs` ist sprachfähig (`--lang=de|en`, Default `de`) und erzeugt `docs/microCSS-de.docx` bzw. `docs/microCSS-en.docx` (Gulp-Tasks `docs:manual:docx` / `docs:manual:en:docx`); `tools/export-pdf.mjs` exportiert via LibreOffice headless + GulpHelper-Makro die zugehörigen `docs/microCSS-de.pdf` / `docs/microCSS-en.pdf` mit aktualisiertem Inhaltsverzeichnis (`docs:manual:pdf` / `docs:manual:en:pdf`); `docs:manual` baut beide Sprachen (DE + EN, docx → PDF). Beide PDFs werden mit `docs/manual/` ins npm-Paket gebündelt — vor `build:publish` ausführen. Die schlanke, nutzerorientierte README für npm ist `README.md` (zweisprachig, Englisch zuerst); dieses Dokument (`README.dev.md`) ist die Entwickler-Referenz und wird **nicht** veröffentlicht.

Noch offen: Output-Optionen (`minify`) können bei Bedarf ergänzt werden.

## Beispiel

```css
a:link {
	color: µ($.linkColor);
	border-bottom: 1px dashed µ(Lighten($.selectBaseBrgdColor, 0.7));
}
div.box {
	-µ: AddProperty("border-top", "1px solid " + Lighten($.baseBrgdColor, 0.2));
}
```

```css
div.companylogo {
	-µ: Sprite("imgs/logos/dosing_logo.png");
	margin-left: auto;
}
*.cursor_zoom {
	-µ: Cursor("zoom");
}
```

Makro-Helper im Legacy-Stil (`this` = Auswertungs-Scope):

```js
// helpers.mjs — im Manifest unter helpers: { Borders } registrieren
export function Borders(_baseColor, _pixelWidth, _topLighten, _rightLighten, _bottomLighten, _leftLighten) {
	this.AddProperty("border-top", `${_pixelWidth}px solid ${Lighten(_baseColor, _topLighten)}`);
	this.AddProperty("border-right", `${_pixelWidth}px solid ${Lighten(_baseColor, _rightLighten)}`);
	this.AddProperty("border-bottom", `${_pixelWidth}px solid ${Lighten(_baseColor, _bottomLighten)}`);
	this.AddProperty("border-left", `${_pixelWidth}px solid ${Lighten(_baseColor, _leftLighten)}`);
}
```

```css
div.menu {
	-µ: Borders($.menuBaseBrgdColor, 1, 0.3, -0.3, -0.3, 0.3);
}
```

```js
const sprites = new SpriteManager({ baseDir: "skins/std", atlasFile: "imgs/sprites.png", retina: true });
const cursors = new CursorManager([
	{ name: "zoom", fallback: "zoom-in", image: "imgs/general/gui/cursors/zoom.png", hotspot: [10, 8] }
], { baseDir: "skins/std" });

const document = CompileMcss(source, {
	vars: { linkColor: "#aabbcc", selectBaseBrgdColor: "#007570", baseBrgdColor: "#202020" },
	sprites,
	cursors
});
await sprites.Resolve(document);   // packt den Atlas und schreibt die Sprite-Regeln um
await document.ToFile("skins/std/std.css");
```

Oder komplett über das Skin-Manifest (empfohlen):

```js
// skins/src/std.µcss.mjs
import { DefineSkin } from "gulp-mu-css";

export default DefineSkin({
	vars: { mainColor: "#007570" },
	cursors: [{ name: "zoom", fallback: "zoom-in", image: "imgs/cursors/zoom.png", hotspot: [10, 8] }],
	media: [
		{ buttonsAndIcons: "dev/media/final/panelbuttons.psd", layout: "std", outputDir: "imgs/panelbuttons" },
		{ copyFolder: "dev/media/final/fonts", to: "fonts" }
	],
	sprites: { file: "imgs/sprites.png", retina: true },
	files: [{ source: "src.µ.css", target: "std.css" }]
});
```

```js
// gulpfile.mjs des Projekts
import gulp from "gulp";
import { BuildSkin } from "gulp-mu-css";

export async function SkinStd() {
	await BuildSkin("skins/src/std.µcss.mjs");   // inkrementell, Cache in skins/std/.cache/
}
export function SkinWatch() {
	gulp.watch(["skins/src/**", "dev/media/final/**"], SkinStd);
}
```

## Fehlerdiagnostik

Build-Fehler nennen immer den Verursacher samt Quellbezug:

- **Inline-JavaScript** (`µ(...)`-Interpolationen und `-µ:`-Direktiven): Fehler werden als PostCSS-Fehler mit Datei, Zeile, Spalte und Quelltext-Ausschnitt gemeldet. Bei mehreren `µ(...)` in einem Wert wird der fehlschlagende Ausdruck genannt, z. B. `µ(boom()): boom is not defined`. JS-Syntaxfehler erscheinen als `invalid JavaScript expression "<Quelltext>" (...)`.
- **Fehlende Sprite-Bilder**: Vor dem Packen des Atlas wird die Existenz aller Quellbilder (inkl. `@2x` bei `retina: true`) geprüft. *Alle* fehlenden Dateien werden gesammelt in einem Fehler gemeldet — jeweils mit URL, aufgelöstem Pfad und der referenzierenden Regel (`selector "div.x" (datei.µ.css:Zeile)`).
- **`afterWork`-Hooks**: Fehler im Hook werden mit Sprite-URL und Regel-Quellposition ummantelt (Original-Fehler als `cause` erhalten).
- **Fehlende Cursor-Bilder**: nur eine Warnung (einmal pro Cursor), da die CSS über den Fallback-Cursor funktionsfähig bleibt.
- **`media`-Steps in `BuildSkin`**: Fehler nennen Step-Nummer und -Typ, z. B. `media step 3 of 7 (buttonsAndIcons: "dev/media/buttons.afdesign") failed: ...`. Fehlende Quellen werden vor der Ausführung geprüft: `copy`/`copyFolder` und Generator-Steps melden den aufgelösten Pfad statt eines rohen `ENOENT` (z. B. `copyFolder: source folder not found: ... (was the generation step that produces this folder run?)`).
- **`files`-Einträge**: fehlende Quelldateien werden mit Eintrag und aufgelöstem Pfad gemeldet, bevor kompiliert wird.

<!-- publish:exclude:start -->
## Tests

```
npm test
```

Die Tests prüfen u. a. die Farbfunktionen gegen Werte, die die alte µCSS-Toolchain in der kompilierten AiDPix-`std.css` erzeugt hat (Bitgenauigkeit des `hsl`-Modells).
<!-- publish:exclude:end -->
