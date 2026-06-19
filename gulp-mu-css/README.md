# µCSS V2.5.4 (microCSS)

<p align="center">
  <img src="docs/manual/imgs/logo.png" alt="µCSS logo" width="180">
</p>

*English (below) · [Deutsch](#µcss-npm-paket-gulp-mu-css-1)* · npm: [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) · [![npm version](https://img.shields.io/npm/v/gulp-mu-css.svg)](https://www.npmjs.com/package/gulp-mu-css)

Node module for compiling **µCSS**-enhanced stylesheets — sprites, cursors, color functions, embedded JavaScript and PSD-based image generation, driven by a skin manifest. µCSS 2 is the Adobe-independent Node reimplementation of µCSS, originally introduced in 2013 as a Photoshop script.

The technical package name is `gulp-mu-css` (the µ character causes trouble in npm/git names); **µCSS** is the display name. Bump the **H1** version when releasing (must match `package.json`).

The detailed manual ships with this package as a PDF — **`docs/microCSS-en.pdf`** (English) and **`docs/microCSS-de.pdf`** (German); the Markdown sources live under `docs/manual/`. Sibling modules **µPS**, **µAU** and **µFT** are documented there too — chapters *microPS*, *microAU* and *microFT* (npm READMEs of those packages are brief overviews only).

**No Adobe subscription for the build** — unlike µCSS 1, compilation and PSD rendering run in Node. Layered drafts are edited in **[Affinity](https://affinity.studio/download)** or **[Photopea](https://www.photopea.com/)** (browser, full PSD, local processing). Save as PSD for µPS.

## Project links

| | |
| :--- | :--- |
| **GitHub (monorepo)** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (this package)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS** | [npm](https://www.npmjs.com/package/gulp-mu-ps) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ps) |
| **µFT** | [npm](https://www.npmjs.com/package/gulp-mu-ft) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ft) |
| **µAU** | [npm](https://www.npmjs.com/package/gulp-mu-au) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-au) |
| **Affinity (PSD authoring)** | [affinity.studio/download](https://affinity.studio/download) — free desktop app |
| **Photopea (PSD authoring)** | [photopea.com](https://www.photopea.com/) — free online editor, full PSD |

## Installation

```bash
npm install gulp-mu-css
```

Image generation (sprite atlas, PSD rendering) uses the sibling package [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps), which is installed automatically as a dependency.

## What µCSS does

- **JavaScript in CSS values** — `µ(expression)` (ASCII alias `mu(...)`) is evaluated and replaced by its result, e.g. `color: µ($.linkColor);` or `µ($.zIndex + 10)`.
- **Directives with AST access** — `-µ: Directive(...)` (ASCII alias `-mu:`) runs JavaScript with access to the surrounding rule and the document, and is removed from the output.
- **Sprite atlas** — `-µ: Sprite("imgs/logo.png")` registers images, packs them into one atlas (incl. `@2x`) and rewrites the rule to `background-image`/`image-set`/`background-position`/`width`/`height`.
- **Cursors & preload** — `-µ: Cursor("zoom")` emits `cursor: url(...) x y, fallback` (with `image-set` when an `@2x` source exists); cursor images can be collected automatically into a preload rule.
- **Color API** — `Lighten`, `Alpha`, `MixColors`, `ParseColor`, `FormatColor` (models `hsl` and `oklch`).
- **PSD image generation** — button/icon series, app icons and animation strips from layered drafts (via `gulp-mu-ps`), wired directly into the CSS build.
- **Skin manifest & incremental build** — one manifest per skin, mtime-based cache (atlas and PSD steps are only regenerated on change).

Source stylesheets stay **syntactically valid CSS** — editors, linters and diffs work unchanged. Internally µCSS is a PostCSS pipeline, so the PostCSS ecosystem (cssnano, Stylelint, …) remains attachable.

## Source stylesheets (`*.µ.css`)

Source stylesheets use the double suffix `*.µ.css` (ASCII alternative `*.mu.css`) so editors recognize them as CSS automatically. The extension is irrelevant to the compiler — the manifest references the sources explicitly.

```css
a:link {
	color: µ($.linkColor);
	border-bottom: 1px dashed µ(Lighten($.selectBaseBrgdColor, 0.7));
}
div.companylogo {
	-µ: Sprite("imgs/logos/company_logo.png");
}
*.cursor_zoom {
	-µ: Cursor("zoom");
}
```

Custom macro helpers are declared as a `function` (not an arrow function) and called with `this` = the evaluation scope:

```js
// helpers.mjs — register in the manifest under helpers: { Borders }
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

## Component imports & Vue (co-location)

`@import` is resolved **at build time**: local targets are inlined into a single, static bundle (remote and media-query imports stay native). This is the bridge for component frameworks like Vue — keep each component's style next to its `.vue` file (use a private extension such as `*.π.css` so Vite/Vue ignores it) and pull them all in with one wildcard:

```css
/* main.µ.css */
@import "components/**/*.π.css";   /* ** = any depth, * = one segment, ? = one char */
@import "base/reset.µ.css";         /* a single file */
body { margin: 0; }
```

Imports are **recursive/iterative** (imported files may import again) and each file is inlined **once** (dedupe, cycle-safe). The three diagnostics are manifest-configurable via `imports` (per file via `files[].imports`), each `"error" | "warn" | "ignore"`: `onMissing` (default `"error"`), `onEmptyGlob` (default `"warn"`) and `onCircular` (default `"warn"`).

When many components share a selector, enable the opt-in three-stage **merge** (off by default, so existing stylesheets are untouched):

- **dedupe** — identical duplicate rules collapse into one;
- **partial merge** — non-conflicting properties of the same selector fold together;
- **collision brake** — the same property with a *different* value is a conflict. `merge.onConflict` is `"error"` (default — stops the build, naming selector, property, both values and both source files), `"warn"` (last wins) or `"keep"` (first wins).

Declare a deliberate override explicitly with `@µ-override` (ASCII `@mu-override`); it wins without raising a conflict:

```css
@µ-override .btn { background: green; }
```

To *avoid* collisions instead of resolving them, a component file can namespace its own classes with `@µ-namespace` (ASCII `@mu-namespace`). Only that file's class tokens are prefixed (ids/elements untouched); classes that must stay global (Vue/JS state classes, shared utilities) are exempted with `:global(...)`:

```css
@µ-namespace MyButton;
.card { ... }                    /* -> .MyButton-card */
.card:global(.is-active) { ... } /* -> .MyButton-card.is-active */
```

```js
// manifest: enable merging for a Vue-style bundle
export default DefineSkin({
	merge: { onConflict: "error" },            // skin-wide; per file via files[].merge
	files: [{ source: "main.µ.css", target: "app.css" }]
});
```

Because Vue then renders a "naked" template (no `<style scoped>`, no `data-v-…`) against one real CSS file, the browser DevTools stay fully usable for live CSS edits.

## Build-type / variant filtering

A single source tree can produce different builds (e.g. `Production` vs. `Test`, clients, versions, platforms, variants) via [`gulp-mu-build-filter`](https://www.npmjs.com/package/gulp-mu-build-filter). Blocks are guarded by command comments inside ordinary `/* */` comments, so the source stays valid CSS, and are filtered on the raw text of every file (host **and** imports) before parsing:

```css
.base { color: black; }
/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
.debug-overlay { outline: 1px solid red; }
---- @>BUILD_ONLY_AT_RELEASES --*/
/*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
.dev-banner { display: block; }
/*-- @>BUILD_NEVER_AT_RELEASES --*/
```

Commands (each `ONLY`/`NEVER`): `…AT_RELEASES`, `…AT_CLIENTS`, `…AT_VERSIONS` (`+`/`-` suffix, e.g. `2.3+`), `…AT_PLATFORMS`, `…AT_ANY_VARIANTS`/`…AT_ALL_VARIANTS`. The parameters come from the manifest (`buildFilter`) and/or the `BuildSkin()` option `buildFilter` (the latter wins, so the build type can come from CLI/env per run); `files[].buildFilter` overrides per file.

```js
await BuildSkin("skins/src/std.µcss.mjs", { buildFilter: { release: "Production" } });
```

`BuildSkin()` options also override the manifest per run: `vars` are merged over the manifest's (inject globals like a theme color or version from CLI/env), and the manifest's default export may be a **factory** `(<params>) => DefineSkin({...})` that receives all `BuildSkin()` options — so a single manifest can react to `release`, `variants`, etc.

```js
// factory manifest reacting to the release passed in per gulp run
export default ({ release = "Test" }) => DefineSkin({
	buildFilter: { release },
	files: [{ source: "main.µ.css", target: "app.css" }]
});
```

## Quick start via the skin manifest (recommended)

One manifest per skin: `skins/src/<skinname>.µcss.mjs` (ASCII alternative `.mucss.mjs`); the skin name is the part before the double suffix.

```js
// skins/src/std.µcss.mjs
import { DefineSkin } from "gulp-mu-css";

export default DefineSkin({
	vars: { linkColor: "#aabbcc", selectBaseBrgdColor: "#007570" },
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
// the project's gulpfile.mjs
import gulp from "gulp";
import { BuildSkin } from "gulp-mu-css";

export async function SkinStd() {
	await BuildSkin("skins/src/std.µcss.mjs");   // incremental, cache in skins/std/.cache/
}
export function SkinWatch() {
	gulp.watch(["skins/src/**", "dev/media/final/**"], SkinStd);
}
```

`BuildSkin(manifestPath, { force?, outputDir?, rootDir? })` first runs the `media` steps (`buttonsAndIcons`, `appIcons`, `sequenceStrip`, `copy`, `copyFolder`), then compiles every `files` entry, resolves the sprite atlas and writes everything to `skins/<skinname>/`. The global switch `imageFormat: "webp"` turns the image-generating steps (and, unless `sprites.format` overrides it, the atlas) to WebP; `sprites: { format: "webp" }` switches the atlas alone. See the manual (`docs/microCSS-en.pdf`) for details and all options.

**Deploy trim & minify (optional).** `sprites: { pruneSources: true }` deletes the source images packed into the atlas (their `@2x` too) and any **sequence-strip sidecar** `<strip>.json` next to a packed 1x source (compile-time map only); `sprites: { pruneKeep: ["imgs/general/glittery", "imgs/x/y.png"] }` protects directories or single files from that trim (matched against a sprite's 1x URL, keeps `1x` + `@2x` + sidecar JSON). `minify: true` minifies every emitted stylesheet with [`uglifycss`](https://www.npmjs.com/package/uglifycss) (defaults `{ maxLineLen: 1000, uglyComments: true }`; whitespace/comments only, no rule reordering) — pass an options object to tune it, or a function `(css) => css` to use a different engine.

## Programmatic use

```js
import { CompileMcss, SpriteManager, CursorManager } from "gulp-mu-css";

const sprites = new SpriteManager({ baseDir: "skins/std", atlasFile: "imgs/sprites.png", retina: true });
const cursors = new CursorManager([
	{ name: "zoom", fallback: "zoom-in", image: "imgs/general/gui/cursors/zoom.png", hotspot: [10, 8] }
], { baseDir: "skins/std" });

const document = CompileMcss(source, {
	vars: { linkColor: "#aabbcc", selectBaseBrgdColor: "#007570" },
	sprites,
	cursors
});
await sprites.Resolve(document);   // packs the atlas and rewrites the sprite rules
await document.ToFile("skins/std/std.css");
```

Main exports: `CompileMcss`, `CssDocument`/`CssRule` (PostCSS AST wrapper with `FindRule`, `AddRule`, `AddProperty`/`ChangeProperty`/`RemoveProperty`, `ToCss`/`ToFile`/`ToJson`/`FromJson`), the color API (`Lighten`, `Alpha`, `MixColors`, …), `SpriteManager`, `CursorManager`, `PreloadRegistry`, `DefineSkin`/`BuildSkin`.

## Error diagnostics

Build errors always name the culprit together with its source location:

- **Inline JavaScript**: reported as PostCSS errors with file, line, column and a source excerpt; the failing expression is named. JS syntax errors appear as `invalid JavaScript expression "..."`.
- **Missing sprite images**: checked before packing; *all* missing files are reported together — with URL, resolved path and the referencing rule.
- **`media` steps in `BuildSkin`**: errors name the step number and type; missing sources report the resolved path instead of a raw `ENOENT`.
- **Missing cursor images**: a warning only (once per cursor), since the CSS stays functional via the fallback.

## Manual

The complete user manual ships as **`docs/microCSS-en.pdf`** (English) and **`docs/microCSS-de.pdf`** (German); Markdown sources: `docs/manual/microCSS-Manual-en.md` and `docs/manual/microCSS-Handbuch.md`. It covers the core ideas, all directives and manifest options, image/sound/font generation (chapters *microPS*, *microAU*, *microFT*), the incremental build and the migration from µCSS 1.

## License

MIT

---

<a name="deutsch"></a>

# µCSS V2.5.4 (microCSS)

*[English](#µcss-npm-package-gulp-mu-css) · Deutsch (unten)* · npm: [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) · [![npm version](https://img.shields.io/npm/v/gulp-mu-css.svg)](https://www.npmjs.com/package/gulp-mu-css)

Node-Modul zur Kompilierung von **µCSS**-erweiterten Stylesheets — Sprites, Cursor, Farbfunktionen, eingebettetes JavaScript und PSD-basierte Bilderzeugung, gesteuert über ein Skin-Manifest. µCSS 2 ist die Adobe-unabhängige Node-Neuimplementierung des 2013 als Photoshop-Script eingeführten µCSS.

Der technische Paketname ist `gulp-mu-css` (das µ-Zeichen bereitet in npm-/git-Namen Probleme); **µCSS** ist der Anzeigename. **H1**-Version beim Release anheben (muss `package.json` entsprechen).

Das ausführliche Handbuch liegt diesem Paket als PDF bei: **`docs/microCSS-de.pdf`** (deutsch) und **`docs/microCSS-en.pdf`** (englisch); die Markdown-Quellen liegen unter `docs/manual/`. Die Schwester-Module **µPS**, **µAU** und **µFT** sind dort in eigenen Kapiteln (*microPS*, *microAU*, *microFT*) dokumentiert — die npm-READMEs dieser Pakete sind nur Kurzüberblicke.

**Kein Adobe-Abo für den Build** — anders als µCSS 1 laufen Kompilierung und PSD-Rendering in Node. Entwürfe bearbeitet man in **[Affinity](https://affinity.studio/download)** oder **[Photopea](https://www.photopea.com/)** (Browser, volle PSD, lokal). Als PSD speichern für µPS.

## Projekt-Links

| | |
| :--- | :--- |
| **GitHub (Monorepo)** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (dieses Paket)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS** | [npm](https://www.npmjs.com/package/gulp-mu-ps) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ps) |
| **µFT** | [npm](https://www.npmjs.com/package/gulp-mu-ft) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ft) |
| **µAU** | [npm](https://www.npmjs.com/package/gulp-mu-au) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-au) |
| **Affinity (PSD-Authoring)** | [affinity.studio/download](https://affinity.studio/download) — kostenlose Desktop-App |
| **Photopea (PSD-Authoring)** | [photopea.com](https://www.photopea.com/) — kostenloser Online-Editor, volle PSD |

## Installation

```bash
npm install gulp-mu-css
```

Die Bilderzeugung (Sprite-Atlas, PSD-Rendering) nutzt das Schwesterpaket [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps), das als Abhängigkeit automatisch mitinstalliert wird.

## Was µCSS macht

- **JavaScript im CSS-Wert** — `µ(ausdruck)` (ASCII-Alias `mu(...)`) wird ausgewertet und durch das Ergebnis ersetzt, z. B. `color: µ($.linkColor);` oder `µ($.zIndex + 10)`.
- **Direktiven mit AST-Zugriff** — `-µ: Direktive(...)` (ASCII-Alias `-mu:`) führt JavaScript mit Zugriff auf die umgebende Regel und das Dokument aus und wird aus der Ausgabe entfernt.
- **Sprite-Atlas** — `-µ: Sprite("imgs/logo.png")` registriert Bilder, packt sie in einen Atlas (inkl. `@2x`) und schreibt die Regel auf `background-image`/`image-set`/`background-position`/`width`/`height` um.
- **Cursor & Preload** — `-µ: Cursor("zoom")` erzeugt `cursor: url(...) x y, fallback` (mit `image-set` bei vorhandener `@2x`-Quelle); Cursor-Bilder können automatisch in eine Preload-Regel gesammelt werden.
- **Farb-API** — `Lighten`, `Alpha`, `MixColors`, `ParseColor`, `FormatColor` (Modelle `hsl` und `oklch`).
- **PSD-Bilderzeugung** — Button-/Icon-Serien, App-Icons und Animations-Strips aus geschichteten Entwürfen (über `gulp-mu-ps`), direkt an den CSS-Build gekoppelt.
- **Skin-Manifest & inkrementeller Build** — ein Manifest pro Skin, mtime-basierter Cache (Atlas und PSD-Schritte werden nur bei Änderungen neu erzeugt).

Die Quell-Stylesheets bleiben dabei **syntaktisch valides CSS** — Editoren, Linter und Diffs funktionieren unverändert. Intern ist µCSS eine PostCSS-Pipeline, das PostCSS-Ökosystem (cssnano, Stylelint, …) bleibt andockbar.

## Quell-Stylesheets (`*.µ.css`)

Quell-Stylesheets verwenden das Doppelsuffix `*.µ.css` (ASCII-Alternative `*.mu.css`), damit Editoren sie automatisch als CSS erkennen. Für den Compiler ist die Endung irrelevant — das Manifest referenziert die Quellen explizit.

```css
a:link {
	color: µ($.linkColor);
	border-bottom: 1px dashed µ(Lighten($.selectBaseBrgdColor, 0.7));
}
div.companylogo {
	-µ: Sprite("imgs/logos/company_logo.png");
}
*.cursor_zoom {
	-µ: Cursor("zoom");
}
```

Eigene Makro-Helper werden als `function` (keine Arrow-Function) deklariert und mit `this` = Auswertungs-Scope aufgerufen:

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

## Komponenten-Importe & Vue (Co-Location)

`@import` wird **zur Build-Zeit** aufgelöst: Lokale Ziele werden zu einem einzigen, statischen Bundle inline ersetzt (entfernte und Media-Query-Importe bleiben nativ). Das ist die Brücke für Komponenten-Frameworks wie Vue — der Stil jeder Komponente liegt neben ihrer `.vue`-Datei (eigene Endung wie `*.π.css`, damit Vite/Vue sie ignoriert) und wird per Wildcard eingesammelt:

```css
/* main.µ.css */
@import "components/**/*.π.css";   /* ** = beliebige Tiefe, * = ein Segment, ? = ein Zeichen */
@import "base/reset.µ.css";         /* Einzeldatei */
body { margin: 0; }
```

Importe sind **rekursiv/iterativ** (importierte Dateien dürfen selbst importieren) und jede Datei wird **einmal** inlined (Dedupe, zyklensicher). Die drei Diagnosen sind über `imports` im Manifest konfigurierbar (pro Datei via `files[].imports`), je `"error" | "warn" | "ignore"`: `onMissing` (Default `"error"`), `onEmptyGlob` (Default `"warn"`) und `onCircular` (Default `"warn"`).

Wenn sich viele Komponenten einen Selektor teilen, lässt sich der opt-in **Merge** in drei Stufen einschalten (Default aus, bestehende Stylesheets bleiben unverändert):

- **Dedupe** — identische Doppelregeln werden zu einer zusammengefasst;
- **Partial Merge** — nicht-kollidierende Properties desselben Selektors werden ergänzt;
- **Kollisions-Bremse** — dieselbe Property mit *anderem* Wert ist ein Konflikt. `merge.onConflict` ist `"error"` (Default — stoppt den Build mit Selektor, Property, beiden Werten und beiden Quelldateien), `"warn"` (last wins) oder `"keep"` (first wins).

Eine bewusste Überschreibung wird explizit mit `@µ-override` (ASCII `@mu-override`) deklariert; sie gewinnt ohne Konflikt:

```css
@µ-override .btn { background: green; }
```

Um Kollisionen zu *vermeiden* statt aufzulösen, kann eine Komponentendatei ihre eigenen Klassen mit `@µ-namespace` (ASCII `@mu-namespace`) präfixieren. Nur die Klassen-Tokens dieser Datei werden umbenannt (ids/Elemente bleiben unangetastet); bewusst globale Klassen (von Vue/JS gesetzte State-Klassen, geteilte Utilities) werden mit `:global(...)` ausgenommen:

```css
@µ-namespace MyButton;
.card { ... }                    /* -> .MyButton-card */
.card:global(.is-active) { ... } /* -> .MyButton-card.is-active */
```

```js
// Manifest: Merge für ein Vue-Bundle aktivieren
export default DefineSkin({
	merge: { onConflict: "error" },            // skinweit; pro Datei via files[].merge
	files: [{ source: "main.µ.css", target: "app.css" }]
});
```

Da Vue dann ein „nacktes" Template (kein `<style scoped>`, kein `data-v-…`) gegen eine echte CSS-Datei rendert, bleibt die Browser-Konsole für Live-CSS-Änderungen voll nutzbar.

## Build-Typ-/Varianten-Filter

Aus einem Quellbaum lassen sich verschiedene Builds erzeugen (z. B. `Production` vs. `Test`, Mandanten, Versionen, Plattformen, Varianten) — über [`gulp-mu-build-filter`](https://www.npmjs.com/package/gulp-mu-build-filter). Blöcke werden durch Kommando-Kommentare in normalen `/* */`-Kommentaren markiert (die Quelle bleibt gültiges CSS) und auf dem Rohtext jeder Datei (Hauptdatei **und** Importe) vor dem Parsen gefiltert:

```css
.base { color: black; }
/*-- @<BUILD_ONLY_AT_RELEASES:Production ----
.debug-overlay { outline: 1px solid red; }
---- @>BUILD_ONLY_AT_RELEASES --*/
/*-- @<BUILD_NEVER_AT_RELEASES:Production --*/
.dev-banner { display: block; }
/*-- @>BUILD_NEVER_AT_RELEASES --*/
```

Kommandos (je `ONLY`/`NEVER`): `…AT_RELEASES`, `…AT_CLIENTS`, `…AT_VERSIONS` (`+`/`-`-Suffix, z. B. `2.3+`), `…AT_PLATFORMS`, `…AT_ANY_VARIANTS`/`…AT_ALL_VARIANTS`. Die Parameter kommen aus dem Manifest (`buildFilter`) und/oder der `BuildSkin()`-Option `buildFilter` (letztere gewinnt, der Build-Typ kann so pro Lauf aus CLI/Env stammen); `files[].buildFilter` übersteuert pro Datei.

```js
await BuildSkin("skins/src/std.µcss.mjs", { buildFilter: { release: "Production" } });
```

Die `BuildSkin()`-Optionen überschreiben das Manifest auch pro Lauf: `vars` werden über die Manifest-Variablen gemerged (Globals wie Theme-Farbe oder Version aus CLI/Env einspeisen), und der Default-Export des Manifests darf eine **Factory** `(<params>) => DefineSkin({...})` sein, die alle `BuildSkin()`-Optionen erhält — ein Manifest kann so auf `release`, `variants` usw. reagieren.

```js
// Factory-Manifest, reagiert auf den pro Gulp-Lauf übergebenen Release
export default ({ release = "Test" }) => DefineSkin({
	buildFilter: { release },
	files: [{ source: "main.µ.css", target: "app.css" }]
});
```

## Schnellstart über das Skin-Manifest (empfohlen)

Pro Skin ein Manifest `skins/src/<skinname>.µcss.mjs` (ASCII-Alternative `.mucss.mjs`); der Skin-Name ergibt sich aus dem Teil vor dem Doppelsuffix.

```js
// skins/src/std.µcss.mjs
import { DefineSkin } from "gulp-mu-css";

export default DefineSkin({
	vars: { linkColor: "#aabbcc", selectBaseBrgdColor: "#007570" },
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

`BuildSkin(manifestPfad, { force?, outputDir?, rootDir? })` führt zuerst die `media`-Steps aus (`buttonsAndIcons`, `appIcons`, `sequenceStrip`, `copy`, `copyFolder`), kompiliert dann alle `files`-Einträge, löst den Sprite-Atlas auf und schreibt alles nach `skins/<skinname>/`. Der globale Schalter `imageFormat: "webp"` stellt die bilderzeugenden Steps (und, sofern `sprites.format` es nicht überschreibt, den Atlas) auf WebP um; `sprites: { format: "webp" }` stellt allein den Atlas um. Details und alle Optionen stehen im Handbuch (`docs/microCSS-de.pdf`).

**Deploy-Trim & Minify (optional).** `sprites: { pruneSources: true }` löscht die in den Atlas gepackten Quellbilder (inkl. `@2x`) sowie die **Sequence-Strip-Sidecar-**`<strip>.json` neben der gepackten 1x-Quelle (nur Compile-Zeit-Map); `sprites: { pruneKeep: ["imgs/general/glittery", "imgs/x/y.png"] }` nimmt Verzeichnisse oder einzelne Dateien davon aus (Match über die 1x-URL einer Sprite-Quelle, behält `1x` + `@2x` + Sidecar-JSON). `minify: true` minifiziert jede erzeugte CSS mit [`uglifycss`](https://www.npmjs.com/package/uglifycss) (Defaults `{ maxLineLen: 1000, uglyComments: true }`; nur Whitespace/Kommentare, keine Regel-Umsortierung) — ein Optionsobjekt feinjustiert, eine Funktion `(css) => css` nutzt einen anderen Engine.

## Programmatische Nutzung

```js
import { CompileMcss, SpriteManager, CursorManager } from "gulp-mu-css";

const sprites = new SpriteManager({ baseDir: "skins/std", atlasFile: "imgs/sprites.png", retina: true });
const cursors = new CursorManager([
	{ name: "zoom", fallback: "zoom-in", image: "imgs/general/gui/cursors/zoom.png", hotspot: [10, 8] }
], { baseDir: "skins/std" });

const document = CompileMcss(source, {
	vars: { linkColor: "#aabbcc", selectBaseBrgdColor: "#007570" },
	sprites,
	cursors
});
await sprites.Resolve(document);   // packt den Atlas und schreibt die Sprite-Regeln um
await document.ToFile("skins/std/std.css");
```

Wichtigste Exporte: `CompileMcss`, `CssDocument`/`CssRule` (PostCSS-AST-Wrapper mit `FindRule`, `AddRule`, `AddProperty`/`ChangeProperty`/`RemoveProperty`, `ToCss`/`ToFile`/`ToJson`/`FromJson`), die Farb-API (`Lighten`, `Alpha`, `MixColors`, …), `SpriteManager`, `CursorManager`, `PreloadRegistry`, `DefineSkin`/`BuildSkin`.

## Fehlerdiagnostik

Build-Fehler nennen immer den Verursacher samt Quellbezug:

- **Inline-JavaScript**: Fehler werden als PostCSS-Fehler mit Datei, Zeile, Spalte und Quelltext-Ausschnitt gemeldet; der fehlschlagende Ausdruck wird genannt. JS-Syntaxfehler erscheinen als `invalid JavaScript expression "..."`.
- **Fehlende Sprite-Bilder**: vor dem Packen geprüft; *alle* fehlenden Dateien werden gesammelt gemeldet — mit URL, aufgelöstem Pfad und referenzierender Regel.
- **`media`-Steps in `BuildSkin`**: Fehler nennen Step-Nummer und -Typ; fehlende Quellen melden den aufgelösten Pfad statt eines rohen `ENOENT`.
- **Fehlende Cursor-Bilder**: nur eine Warnung (einmal pro Cursor), da die CSS über den Fallback funktionsfähig bleibt.

## Handbuch

Das vollständige Benutzerhandbuch liegt als **`docs/microCSS-de.pdf`** (deutsch) und **`docs/microCSS-en.pdf`** (englisch) bei (Markdown-Quellen: `docs/manual/microCSS-Handbuch.md` und `docs/manual/microCSS-Manual-en.md`). Es behandelt Grundideen, alle Direktiven und Manifest-Optionen, Bild-/Sound-/Font-Erzeugung (Kapitel *microPS*, *microAU*, *microFT*), den inkrementellen Build sowie die Migration von µCSS 1.

## Lizenz

MIT
