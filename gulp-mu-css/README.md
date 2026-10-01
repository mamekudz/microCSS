# µCSS™ V2.5.20 (microCSS)

## English

<p align="center">
  <img src="docs/manual/imgs/logo.png" alt="µCSS™ logo" width="180">
</p>

<p align="center">
  <a href="https://microgulp.dev/en/ready/">
    <img src="https://microgulp.dev/assets/media/microgulp-ready.png" alt="µGulp ready" width="110">
  </a>
</p>

*English (below) · [Deutsch](#deutsch)* · npm: [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) · [![npm version](https://img.shields.io/npm/v/gulp-mu-css.svg)](https://www.npmjs.com/package/gulp-mu-css)

**No manual steps? Skip the editor.**

**Headless CSS and image processing for automated build pipelines.** This Node module compiles **µCSS™**-enhanced stylesheets — sprites, cursors, color functions, embedded JavaScript, PSD-based image generation and (via µFT) icon fonts plus OpenType color/emoji webfonts — from a skin manifest and Gulp/Node.

If your image-processing workflow requires no human interaction between input and output, it probably doesn't require a desktop image editor either. µCSS™ is built for exactly these fully automated workflows.

| Question during processing | Use |
| :--- | :--- |
| Someone must judge, retouch or decide | Interactive editor or editor scripting |
| Input → output with no manual steps | µCSS™ |

Desktop editors ([Adobe Photoshop](https://www.adobe.com/products/photoshop.html), [Affinity](https://affinity.studio/download), [Photon Studio](https://tenzen.studio/photon/), [Photopea](https://www.photopea.com/)) remain the right tools when a person needs to interact with the artwork. The dividing line is not which editor you own. µCSS™ is not a replacement for those editors.

[Photon Studio](https://tenzen.studio/photon/) is a recent free desktop option for interactive work (macOS, Windows, Linux; PSD open/save). This package has **no Photon Studio integration**. A public scripting API is not documented or wired here. If one appears later, Photon Studio plus scripting would still be *editor-based* automation. µCSS™ remains the other class: fully automatic processing with no manual intermediate steps.

| Workflow | Interactive editor | Editor scripting | µCSS™ (headless) |
| :--- | :--- | :--- | :--- |
| Manual image editing | yes | limited / requires the editor | no |
| Fully automated processing | possible | yes, inside the editor | yes |
| Desktop application required | yes | usually yes | no |
| Manual intermediate steps | possible | optional | no |
| Build-pipeline integration | indirect | possible | native focus |
| Batch processing | possible | possible | primary use case |
| CI/CD | unsuitable / limited | depends on the editor | primary use case |

When the workflow is fully automatic, there is no need to start, initialize and drive a full desktop image editor. That missing application/UI overhead is a performance consequence of the architecture — potentially substantial for large automatic batches. This package has no comparative editor benchmarks.

The technical package name is `gulp-mu-css` (the µ character causes trouble in npm/git names); **µCSS™** is the display name. Bump the **H1** version when releasing (must match `package.json`). Version 2 is the Node successor of the 2013 Photoshop-script toolchain.

The detailed manual ships with this package as a PDF — **`docs/microCSS-en.pdf`** (English) and **`docs/microCSS-de.pdf`** (German); the Markdown sources live under `docs/manual/`. Sibling modules **µPS**, **µAU** and **µFT** are documented there too — chapters *microPS*, *microAU* and *microFT* (npm READMEs of those packages are brief overviews only).

**Authoring** layered PSD drafts stays in whichever editor you use — the build always goes through µPS the same way:

| Editor | Open with µPS | Configuration |
| :--- | :--- | :--- |
| **[Affinity](https://affinity.studio/download)** | `OpenDrafts(path, { app: "affinity" })` | `MU_DRAFT_APP=affinity`, optional `MU_AFFINITY_EXE` |
| **Adobe Photoshop** | `OpenDrafts(path, { app: "default" })` if `.psd` is associated, or `{ app: "<path/to/Photoshop.exe>" }` | CC license on your side; **not** required for the build |
| **[Photon Studio](https://tenzen.studio/photon/)** | `OpenDrafts(path, { app: "<path/to/Photon.exe>" })` or OS default if associated | Interactive authoring only; **no** dedicated `MU_DRAFT_APP` key |
| **[Photopea](https://www.photopea.com/)** (browser) | `await OpenPhotopeaDrafts(path)` | `--app photopea` / `MU_DRAFT_APP=photopea` (async API) |
| **OS default** | `OpenDrafts(path)` | `MU_DRAFT_APP=default` (default) |

Save as PSD; µPS reads the same layer structure regardless of editor. Compilation and rendering stay in Node.

## Project links

| | |
| :--- | :--- |
| **GitHub (monorepo)** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (this package)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS** | [npm](https://www.npmjs.com/package/gulp-mu-ps) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ps) |
| **µFT** | [npm](https://www.npmjs.com/package/gulp-mu-ft) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ft) |
| **µAU** | [npm](https://www.npmjs.com/package/gulp-mu-au) · [source](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-au) |
| **Affinity (PSD authoring)** | [affinity.studio/download](https://affinity.studio/download) — free desktop app |
| **Photon Studio (PSD authoring)** | [tenzen.studio/photon](https://tenzen.studio/photon/) — free desktop editor (macOS / Windows / Linux) |
| **Photopea (PSD authoring)** | [photopea.com](https://www.photopea.com/) — free online editor, full PSD |

## µGulp Ready

The badge covers the monorepo development workflow, not automatic integration in every consuming project. See the [self-certification and usage rules](https://microgulp.dev/en/ready/).

This package is **µGulp ready** — with a maintainer-declared integration for the [µGulp™](https://microgulp.dev) task dashboard (VS Code, Cursor and JetBrains IDEs). The monorepo root `gulpfile.mjs` exposes build, test, documentation and publish tasks with full µGulp metadata (`µDisplayName`, `µGroup`, progress reporting, `LogBuildDebugReport` on demo builds, …) and runs unchanged from the classic Gulp CLI when µGulp is not installed.

Open the µGulp dashboard on this repository to run tests, rebuild demos, regenerate manual PDFs or publish to npm from the Carbon/Neon UI. On **npm**, embed the badge with an absolute public URL from the µGulp website (npm rewrites relative paths to the GitHub monorepo root, where the PNG may be missing): `<p align="center"><a href="https://microgulp.dev/en/ready/"><img src="https://microgulp.dev/assets/media/microgulp-ready.png" alt="µGulp Ready" width="110"></a></p>`.

## Installation

```bash
npm install gulp-mu-css
```

Image generation (sprite atlas, PSD rendering) uses the sibling package [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps), which is installed automatically as a dependency.

## What µCSS™ does

- **JavaScript in CSS values** — `µ(expression)` (ASCII alias `mu(...)`) is evaluated and replaced by its result, e.g. `color: µ($.linkColor);` or `µ($.zIndex + 10)`.
- **Directives with AST access** — `-µ: Directive(...)` (ASCII alias `-mu:`) runs JavaScript with access to the surrounding rule and the document, and is removed from the output.
- **Sprite atlas** — `-µ: Sprite("imgs/logo.png")` registers images, packs them into one atlas (incl. `@2x`) and rewrites the rule to `background-image`/`image-set`/`background-position`/`width`/`height`.
- **Cursors & preload** — `-µ: Cursor("zoom")` emits `cursor: url(...) x y, fallback` (with `image-set` when an `@2x` source exists); cursor images can be collected automatically into a preload rule.
- **Color API** — `Lighten`, `Alpha`, `MixColors`, `ParseColor`, `FormatColor` (models `hsl` and `oklch`).
- **Data URI inlining** — `-µ: DataUri("imgs/icon.png")` or `background-image: µ(DataUri("imgs/icon.png"));` embeds the file as `url(data:…;base64,…)` in the compiled CSS (optional `{ retina: true }` for `image-set`). **Not** packed into the sprite atlas.
- **PSD image generation** — button/icon series, app icons and animation strips from layered drafts (via `gulp-mu-ps`), wired directly into the CSS build.
- **Skin manifest & incremental build** — one manifest per skin, mtime-based cache (atlas and PSD steps are only regenerated on change).
- **Version history API** — `RELEASES.json` in the package (i18x-ready info strings) plus `GetReleases`, `GetCurrentVersionString`, `GetVersionHistoryString` for formatted console output.

Source stylesheets stay **syntactically valid CSS** — editors, linters and diffs work unchanged. Internally µCSS™ is a PostCSS pipeline, so the PostCSS ecosystem (cssnano, Stylelint, …) remains attachable.

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
div.carbon {
	-µ: DataUri("imgs/general/gui/carbon.png");
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

The complete user manual ships as **`docs/microCSS-en.pdf`** (English) and **`docs/microCSS-de.pdf`** (German); Markdown sources: `docs/manual/microCSS-Manual-en.md` and `docs/manual/microCSS-Handbuch.md`. It covers the core ideas, all directives and manifest options, image/sound/font generation (chapters *microPS*, *microAU*, *microFT*), the incremental build and the migration from µCSS™ 1.

## License

MIT

---

<a name="deutsch"></a>

## Deutsch

# µCSS™ V2.5.20 (microCSS)

*[English](#english) · Deutsch (unten)* · npm: [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) · [![npm version](https://img.shields.io/npm/v/gulp-mu-css.svg)](https://www.npmjs.com/package/gulp-mu-css)

**Keine manuellen Schritte? Editor überspringen.**

**Headless CSS- und Bildverarbeitung für automatisierte Build-Pipelines.** Dieses Node-Modul kompiliert **µCSS™**-erweiterte Stylesheets — Sprites, Cursor, Farbfunktionen, eingebettetes JavaScript, PSD-basierte Bilderzeugung und (über µFT) Icon-Fonts sowie OpenType-Color-/Emoji-Webfonts — aus Skin-Manifest und Gulp/Node.

Wenn die Bildverarbeitung zwischen Eingabe und Ausgabe keine Benutzerinteraktion braucht, braucht sie wahrscheinlich auch keinen Desktop-Bildeditor. µCSS™ ist genau für diese vollautomatischen Abläufe gebaut.

| Frage während der Verarbeitung | Werkzeug |
| :--- | :--- |
| Jemand muss beurteilen, ändern oder entscheiden | Interaktiver Editor bzw. Editor-Scripting |
| Input → Output ohne manuelle Schritte | µCSS™ |

Desktop-Editoren ([Adobe Photoshop](https://www.adobe.com/products/photoshop.html), [Affinity](https://affinity.studio/download), [Photon Studio](https://tenzen.studio/photon/), [Photopea](https://www.photopea.com/)) bleiben richtig, wenn ein Mensch die Grafik bearbeiten muss. Die Trennlinie ist nicht, welchen Editor man besitzt. µCSS™ ersetzt diese Editoren nicht.

[Photon Studio](https://tenzen.studio/photon/) ist eine neue kostenlose Desktop-Option für interaktive Arbeit (macOS, Windows, Linux; PSD öffnen/speichern). Dieses Paket hat **keine Photon-Studio-Integration**. Eine öffentliche Scripting-API ist hier weder dokumentiert noch angebunden. Falls eine später erscheint, bleibt Photon Studio plus Scripting *editorbasierte* Automatisierung. µCSS™ bleibt die andere Klasse: vollautomatische Verarbeitung ohne manuelle Zwischenschritte.

| Ablauf | Interaktiver Editor | Editor-Scripting | µCSS™ (headless) |
| :--- | :--- | :--- | :--- |
| Manuelle Bildbearbeitung | ja | eingeschränkt / braucht den Editor | nein |
| Vollautomatische Verarbeitung | möglich | ja, innerhalb des Editors | ja |
| Desktop-Anwendung nötig | ja | meist ja | nein |
| Manuelle Zwischenschritte | möglich | optional | nein |
| Build-Pipeline | indirekt | möglich | nativer Schwerpunkt |
| Batch-Verarbeitung | möglich | möglich | primärer Einsatz |
| CI/CD | ungeeignet / eingeschränkt | hängt vom Editor ab | primärer Einsatz |

Wenn der Ablauf vollständig automatisch ist, muss kein vollständiger Desktop-Bildeditor gestartet, initialisiert und gesteuert werden. Der fehlende Anwendungs-/UI-Overhead ist ein Performance-Effekt der Architektur — bei großen automatischen Serien potentiell erheblich. Dieses Paket enthält keine Vergleichsbenchmarks gegen Editoren.

Der technische Paketname ist `gulp-mu-css` (das µ-Zeichen bereitet in npm-/git-Namen Probleme); **µCSS™** ist der Anzeigename. **H1**-Version beim Release anheben (muss `package.json` entsprechen). Version 2 ist der Node-Nachfolger der Photoshop-Script-Toolchain von 2013.

Das ausführliche Handbuch liegt diesem Paket als PDF bei: **`docs/microCSS-de.pdf`** (deutsch) und **`docs/microCSS-en.pdf`** (englisch); die Markdown-Quellen liegen unter `docs/manual/`. Die Schwester-Module **µPS**, **µAU** und **µFT** sind dort in eigenen Kapiteln (*microPS*, *microAU*, *microFT*) dokumentiert — die npm-READMEs dieser Pakete sind nur Kurzüberblicke.

**Authoring** geschichteter PSD-Entwürfe bleibt im gewählten Editor — der Build läuft immer gleich über µPS:

| Editor | Öffnen mit µPS | Konfiguration |
| :--- | :--- | :--- |
| **[Affinity](https://affinity.studio/download)** | `OpenDrafts(pfad, { app: "affinity" })` | `MU_DRAFT_APP=affinity`, optional `MU_AFFINITY_EXE` |
| **Adobe Photoshop** | `OpenDrafts(pfad, { app: "default" })` wenn `.psd` verknüpft, oder `{ app: "<Pfad/Photoshop.exe>" }` | CC-Lizenz bei Ihnen; für den **Build nicht** nötig |
| **[Photon Studio](https://tenzen.studio/photon/)** | `OpenDrafts(pfad, { app: "<Pfad/Photon.exe>" })` oder OS-Standard, wenn verknüpft | Nur interaktives Authoring; **kein** eigener `MU_DRAFT_APP`-Schlüssel |
| **[Photopea](https://www.photopea.com/)** (Browser) | `await OpenPhotopeaDrafts(pfad)` | `--app photopea` / `MU_DRAFT_APP=photopea` (async) |
| **OS-Standard** | `OpenDrafts(pfad)` | `MU_DRAFT_APP=default` (Default) |

Als PSD speichern; µPS liest dieselbe Ebenenstruktur unabhängig vom Editor. Kompilierung und Rendering bleiben in Node.

## Projekt-Links

| | |
| :--- | :--- |
| **GitHub (Monorepo)** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (dieses Paket)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS** | [npm](https://www.npmjs.com/package/gulp-mu-ps) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ps) |
| **µFT** | [npm](https://www.npmjs.com/package/gulp-mu-ft) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-ft) |
| **µAU** | [npm](https://www.npmjs.com/package/gulp-mu-au) · [Quellcode](https://github.com/mamekudz/microCSS/tree/master/gulp-mu-au) |
| **Affinity (PSD-Authoring)** | [affinity.studio/download](https://affinity.studio/download) — kostenlose Desktop-App |
| **Photon Studio (PSD-Authoring)** | [tenzen.studio/photon](https://tenzen.studio/photon/) — kostenloser Desktop-Editor (macOS / Windows / Linux) |
| **Photopea (PSD-Authoring)** | [photopea.com](https://www.photopea.com/) — kostenloser Online-Editor, volle PSD |

## µGulp Ready

Das Badge bezieht sich auf den Entwicklungsablauf im Monorepo, nicht auf automatische Integration in jedem Verbraucherprojekt. Siehe [Selbsterklärung und Nutzungsregeln](https://microgulp.dev/de/ready/).

Dieses Paket ist **µGulp ready** — mit einer vom Maintainer erklärten Integration in das [µGulp™](https://microgulp.dev)-Task-Dashboard (VS Code, Cursor und JetBrains-IDEs). Das Root-`gulpfile.mjs` des Monorepos stellt Build-, Test-, Doku- und Publish-Tasks mit vollständigen µGulp-Metadaten bereit (`µDisplayName`, `µGroup`, Fortschrittsmeldungen, `LogBuildDebugReport` bei Demo-Builds, …) und läuft ohne µGulp unverändert über die klassische Gulp-CLI.

µGulp-Dashboard auf dieses Repository öffnen, um Tests, Demo-Rebuilds, Handbuch-PDFs oder npm-Publish aus der Carbon/Neon-Oberfläche zu starten. Auf **npm** das Ready-Badge per absoluter öffentlicher URL von der µGulp-Website einbinden (siehe HTML-Beispiel oben); eine Kopie liegt zusätzlich unter `docs/manual/imgs/microgulp-ready.png` im Paket-Tarball.

## Installation

```bash
npm install gulp-mu-css
```

Die Bilderzeugung (Sprite-Atlas, PSD-Rendering) nutzt das Schwesterpaket [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps), das als Abhängigkeit automatisch mitinstalliert wird.

## Was µCSS™ macht

- **JavaScript im CSS-Wert** — `µ(ausdruck)` (ASCII-Alias `mu(...)`) wird ausgewertet und durch das Ergebnis ersetzt, z. B. `color: µ($.linkColor);` oder `µ($.zIndex + 10)`.
- **Direktiven mit AST-Zugriff** — `-µ: Direktive(...)` (ASCII-Alias `-mu:`) führt JavaScript mit Zugriff auf die umgebende Regel und das Dokument aus und wird aus der Ausgabe entfernt.
- **Sprite-Atlas** — `-µ: Sprite("imgs/logo.png")` registriert Bilder, packt sie in einen Atlas (inkl. `@2x`) und schreibt die Regel auf `background-image`/`image-set`/`background-position`/`width`/`height` um.
- **Cursor & Preload** — `-µ: Cursor("zoom")` erzeugt `cursor: url(...) x y, fallback` (mit `image-set` bei vorhandener `@2x`-Quelle); Cursor-Bilder können automatisch in eine Preload-Regel gesammelt werden.
- **Farb-API** — `Lighten`, `Alpha`, `MixColors`, `ParseColor`, `FormatColor` (Modelle `hsl` und `oklch`).
- **Data-URI-Inlining** — `-µ: DataUri("imgs/icon.png")` oder `background-image: µ(DataUri("imgs/icon.png"));` bettet die Datei als `url(data:…;base64,…)` in die kompilierte CSS ein (optional `{ retina: true }` für `image-set`). **Nicht** im Sprite-Atlas.
- **PSD-Bilderzeugung** — Button-/Icon-Serien, App-Icons und Animations-Strips aus geschichteten Entwürfen (über `gulp-mu-ps`), direkt an den CSS-Build gekoppelt.
- **Skin-Manifest & inkrementeller Build** — ein Manifest pro Skin, mtime-basierter Cache (Atlas und PSD-Schritte werden nur bei Änderungen neu erzeugt).
- **Versionshistorie-API** — `RELEASES.json` im Paket (i18x-fähige Info-Strings) plus `GetReleases`, `GetCurrentVersionString`, `GetVersionHistoryString` für formatierte Konsolenausgabe.

Die Quell-Stylesheets bleiben dabei **syntaktisch valides CSS** — Editoren, Linter und Diffs funktionieren unverändert. Intern ist µCSS™ eine PostCSS-Pipeline, das PostCSS-Ökosystem (cssnano, Stylelint, …) bleibt andockbar.

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
div.carbon {
	-µ: DataUri("imgs/general/gui/carbon.png");
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

Das vollständige Benutzerhandbuch liegt als **`docs/microCSS-de.pdf`** (deutsch) und **`docs/microCSS-en.pdf`** (englisch) bei (Markdown-Quellen: `docs/manual/microCSS-Handbuch.md` und `docs/manual/microCSS-Manual-en.md`). Es behandelt Grundideen, alle Direktiven und Manifest-Optionen, Bild-/Sound-/Font-Erzeugung (Kapitel *microPS*, *microAU*, *microFT*), den inkrementellen Build sowie die Migration von µCSS™ 1.

## Lizenz

MIT
