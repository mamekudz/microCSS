# µCSS (microCSS)

*English (below) · [Deutsch](#µcss-microcss-1)*

Monorepo for **µCSS 2** and the related **µPS**, **µFT** and **µAU** Node modules — the Adobe-independent successor to the original 2013 Photoshop-script µCSS. The historical ExtendScript version (µCSS 1) is preserved in [`µCSS 1.0 (Photoshop)/`](µCSS%201.0%20(Photoshop)/).

µCSS extends ordinary CSS with JavaScript in property values (`µ(...)`), build-time directives (`-µ:`), sprite atlases, cursors, a color API and PSD-based image generation — driven by a skin manifest and a Gulp build. The technical npm names use `gulp-mu-*` because the µ character is awkward in package names; **µCSS**, **µPS**, **µFT** and **µAU** are the display names.

**No Adobe subscription for the build.** µCSS 1 required a licensed copy of Photoshop for CSS compilation *and* bitmap generation. Version 2 runs headless in Node — sprites, cursors and PSD rendering via µPS need no Creative Cloud. For layered PSD drafts (buttons, icons, …), **[Affinity](https://affinity.studio/download)** is recommended: professional editing, **free** (Canva account for download and activation), with PSD import/export.

## Releases (npm)

[![gulp-mu-css](https://img.shields.io/npm/v/gulp-mu-css.svg?label=gulp-mu-css)](https://www.npmjs.com/package/gulp-mu-css)
[![gulp-mu-ps](https://img.shields.io/npm/v/gulp-mu-ps.svg?label=gulp-mu-ps)](https://www.npmjs.com/package/gulp-mu-ps)
[![gulp-mu-ft](https://img.shields.io/npm/v/gulp-mu-ft.svg?label=gulp-mu-ft)](https://www.npmjs.com/package/gulp-mu-ft)
[![gulp-mu-au](https://img.shields.io/npm/v/gulp-mu-au.svg?label=gulp-mu-au)](https://www.npmjs.com/package/gulp-mu-au)

| Display name | npm package | Version in repo (`package.json`) |
| :--- | :--- | :--- |
| **µCSS** | [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) | **2.5.3** |
| **µPS** | [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps) | **1.3.0** |
| **µFT** | [`gulp-mu-ft`](https://www.npmjs.com/package/gulp-mu-ft) | **0.1.3** |
| **µAU** | [`gulp-mu-au`](https://www.npmjs.com/package/gulp-mu-au) | **0.1.4** |

Badges show the latest version on npm; bump the table when releasing (must match each module’s `package.json`).

## Interactive demos

Live on **GitHub Pages** (no install): **[mamekudz.github.io/microCSS](https://mamekudz.github.io/microCSS/)**

| Demo | URL | Shows |
| :--- | :--- | :--- |
| **Buttons** | […/buttons/](https://mamekudz.github.io/microCSS/buttons/) | Legacy `buttons.psd` → two themes → sprite atlas → CSS |
| **Glittery** | […/glittery/](https://mamekudz.github.io/microCSS/glittery/) | Sprite strip + `GlitterySprite` hook |
| **FlyEx** | […/flyex/](https://mamekudz.github.io/microCSS/flyex/) | DSD macros + µAU sound atlas |

Sources and build: [`demos/`](demos/) · `npx gulp demos:build`

## Documentation & npm

| Resource | Link |
| :--- | :--- |
| **µCSS manual (English)** | [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) |
| **µCSS manual (German)** | [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) |
| **Concept & migration** | [gulp-mu-css/docs/CONCEPT.md](gulp-mu-css/docs/CONCEPT.md) |
| **Interactive demos** | [GitHub Pages](https://mamekudz.github.io/microCSS/) · [Buttons](https://mamekudz.github.io/microCSS/buttons/) · [Glittery](https://mamekudz.github.io/microCSS/glittery/) · [FlyEx](https://mamekudz.github.io/microCSS/flyex/) · [source](demos/) |
| **µCSS on npm** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS on npm** | [gulp-mu-ps](https://www.npmjs.com/package/gulp-mu-ps) |
| **µFT on npm** | [gulp-mu-ft](https://www.npmjs.com/package/gulp-mu-ft) |
| **µAU on npm** | [gulp-mu-au](https://www.npmjs.com/package/gulp-mu-au) |
| **Affinity (PSD authoring)** | [affinity.studio/download](https://affinity.studio/download) — free; recommended Photoshop alternative |

## npm packages

| Display name | npm package | Version in repo | Role |
| :--- | :--- | :--- | :--- |
| **µCSS** | [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) | **2.5.3** | Compiles `*.µ.css` stylesheets (sprites, cursors, color API, manifest-driven build) |
| **µPS** | [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps) | **1.3.0** | Renders PNG series, sprite atlases, app icons and animation strips from layered PSD drafts |
| **µFT** | [`gulp-mu-ft`](https://www.npmjs.com/package/gulp-mu-ft) | **0.1.3** | Builds icon fonts from SVG directories (TTF/EOT/WOFF/WOFF2 + CSS classes + HTML overview) |
| **µAU** | [`gulp-mu-au`](https://www.npmjs.com/package/gulp-mu-au) | **0.1.4** | Builds sound atlases (combined WAV/MP3 + JSON timing map) for the µCSS family |

Install the compiler in your project:

```bash
npm install gulp-mu-css
```

`gulp-mu-ps` is pulled in automatically as a dependency when image generation is used. See each package's [README](gulp-mu-css/README.md) for API details and the [µCSS manual (EN)](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) / [(DE)](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf).

## Repository layout

```
microCSS/                          Repository root (this monorepo)
├── gulp-mu-css/                   µCSS 2 — stylesheet compiler
├── gulp-mu-ps/                    µPS — PSD / image rendering
├── gulp-mu-ft/                    µFT — icon font generation
├── gulp-mu-au/                    µAU — sound atlas generation
├── demos/                         Interactive marketing demos (GitHub Pages)
├── tools/                         Root build helpers (publish, manual, …)
├── gulpfile.mjs                   Gulp tasks for tests, docs and npm publish
├── package.json                   Private root workspace (dev dependencies only)
└── µCSS 1.0 (Photoshop)/          Archived µCSS 1 (ExtendScript + jsxlibs submodule)
    ├── µCSS/                      Runnable Photoshop script folder
    ├── jsxlibs/                   Git submodule → mamekudz/JSXLIBS
    └── README.md                  Legacy documentation
```

Concept and migration notes: `gulp-mu-css/docs/CONCEPT.md`.

## Development

Requirements: **Node ≥ 18** (µFT: **Node ≥ 20.11**), npm, Gulp 5.

```bash
git clone --recurse-submodules https://github.com/mamekudz/microCSS.git
cd microCSS
npm install
npx gulp test              # all module tests
npx gulp docs:manual       # rebuild manual PDFs (LibreOffice + GulpHelper macro)
npx gulp build:publish     # populate build/ with publish-ready bundles
```

Useful Gulp tasks: `test:microcss`, `test:microps`, `test:microft`, `test:microau`, `test:legacy-migration` (local legacy extract only), `convert:less`, `convert:vue`, `demos:build`, `publish` (npm upload; see `tools/publish.mjs`).

## µCSS 1 (legacy)

The 2005–2014 Photoshop-script implementation lives under [`µCSS 1.0 (Photoshop)/`](µCSS%201.0%20(Photoshop)/). For new projects, use the npm packages above. Clone with `--recurse-submodules` so `jsxlibs/` is available for the legacy script.

## License

The µCSS 2 modules and this monorepo tooling are published under the **MIT License**. The legacy Photoshop version retains its own license in `µCSS 1.0 (Photoshop)/LICENSE`; bundled jsxlibs follow the licenses noted in their respective subfolders.

---

<a id="µcss-microcss-1"></a>

# µCSS (microCSS)

Monorepo für **µCSS 2** und die zugehörigen Node-Module **µPS**, **µFT** und **µAU** — der Adobe-unabhängige Nachfolger des ursprünglichen Photoshop-Skripts µCSS von 2013. Die historische ExtendScript-Version (µCSS 1) liegt unter [`µCSS 1.0 (Photoshop)/`](µCSS%201.0%20(Photoshop)/).

µCSS erweitert normales CSS um JavaScript in Eigenschaftswerten (`µ(...)`), Build-Time-Direktiven (`-µ:`), Sprite-Atlanten, Cursor, eine Farb-API und PSD-basierte Bilderzeugung — gesteuert über ein Skin-Manifest und einen Gulp-Build. Die technischen npm-Namen lauten `gulp-mu-*`, weil das µ-Zeichen in Paketnamen unhandlich ist; **µCSS**, **µPS**, **µFT** und **µAU** sind die Anzeigenamen.

**Kein Adobe-Abo für den Build.** µCSS 1 brauchte eine lizenzierte Photoshop-Installation für CSS-Kompilierung *und* Bitmap-Erzeugung. Version 2 läuft headless in Node — Sprites, Cursor und PSD-Rendering via µPS ohne Creative Cloud. Für geschichtete PSD-Entwürfe (Buttons, Icons, …) ist **[Affinity](https://affinity.studio/download)** empfohlen: professionelle Bearbeitung, **kostenlos** (Canva-Konto zum Download und zur Aktivierung), mit PSD-Import/-Export.

## Veröffentlichte Versionen (npm)

[![gulp-mu-css](https://img.shields.io/npm/v/gulp-mu-css.svg?label=gulp-mu-css)](https://www.npmjs.com/package/gulp-mu-css)
[![gulp-mu-ps](https://img.shields.io/npm/v/gulp-mu-ps.svg?label=gulp-mu-ps)](https://www.npmjs.com/package/gulp-mu-ps)
[![gulp-mu-ft](https://img.shields.io/npm/v/gulp-mu-ft.svg?label=gulp-mu-ft)](https://www.npmjs.com/package/gulp-mu-ft)
[![gulp-mu-au](https://img.shields.io/npm/v/gulp-mu-au.svg?label=gulp-mu-au)](https://www.npmjs.com/package/gulp-mu-au)

| Anzeigename | npm-Paket | Version im Repo (`package.json`) |
| :--- | :--- | :--- |
| **µCSS** | [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) | **2.5.3** |
| **µPS** | [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps) | **1.3.0** |
| **µFT** | [`gulp-mu-ft`](https://www.npmjs.com/package/gulp-mu-ft) | **0.1.3** |
| **µAU** | [`gulp-mu-au`](https://www.npmjs.com/package/gulp-mu-au) | **0.1.4** |

Badges = aktuelle npm-Version; Tabelle beim Release mit `package.json` je Modul abgleichen.

## Interaktive Demos

Live auf **GitHub Pages** (ohne Installation): **[mamekudz.github.io/microCSS](https://mamekudz.github.io/microCSS/)**

| Demo | URL | Inhalt |
| :--- | :--- | :--- |
| **Buttons** | […/buttons/](https://mamekudz.github.io/microCSS/buttons/) | Legacy-`buttons.psd` → zwei Themes → Sprite-Atlas → CSS |
| **Glittery** | […/glittery/](https://mamekudz.github.io/microCSS/glittery/) | Sprite-Strip + `GlitterySprite`-Hook |
| **FlyEx** | […/flyex/](https://mamekudz.github.io/microCSS/flyex/) | DSD-Makros + µAU-Sound-Atlas |

Quellen und Build: [`demos/`](demos/) · `npx gulp demos:build`

## Dokumentation & npm

| Ressource | Link |
| :--- | :--- |
| **µCSS-Handbuch (Englisch)** | [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) |
| **µCSS-Handbuch (Deutsch)** | [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) |
| **Konzept & Migration** | [gulp-mu-css/docs/CONCEPT.md](gulp-mu-css/docs/CONCEPT.md) |
| **Interaktive Demos** | [GitHub Pages](https://mamekudz.github.io/microCSS/) · [Buttons](https://mamekudz.github.io/microCSS/buttons/) · [Glittery](https://mamekudz.github.io/microCSS/glittery/) · [FlyEx](https://mamekudz.github.io/microCSS/flyex/) · [Quellen](demos/) |
| **µCSS auf npm** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **µPS auf npm** | [gulp-mu-ps](https://www.npmjs.com/package/gulp-mu-ps) |
| **µFT auf npm** | [gulp-mu-ft](https://www.npmjs.com/package/gulp-mu-ft) |
| **µAU auf npm** | [gulp-mu-au](https://www.npmjs.com/package/gulp-mu-au) |
| **Affinity (PSD-Authoring)** | [affinity.studio/download](https://affinity.studio/download) — kostenlos; empfohlene Photoshop-Alternative |

## npm-Pakete

| Anzeigename | npm-Paket | Version im Repo | Aufgabe |
| :--- | :--- | :--- | :--- |
| **µCSS** | [`gulp-mu-css`](https://www.npmjs.com/package/gulp-mu-css) | **2.5.3** | Kompiliert `*.µ.css`-Stylesheets (Sprites, Cursor, Farb-API, manifestgesteuerter Build) |
| **µPS** | [`gulp-mu-ps`](https://www.npmjs.com/package/gulp-mu-ps) | **1.3.0** | Rendert PNG-Serien, Sprite-Atlanten, App-Icons und Animations-Strips aus geschichteten PSD-Entwürfen |
| **µFT** | [`gulp-mu-ft`](https://www.npmjs.com/package/gulp-mu-ft) | **0.1.3** | Erzeugt Icon-Fonts aus SVG-Verzeichnissen (TTF/EOT/WOFF/WOFF2 + CSS-Klassen + HTML-Übersicht) |
| **µAU** | [`gulp-mu-au`](https://www.npmjs.com/package/gulp-mu-au) | **0.1.4** | Erzeugt Sound-Atlanten (kombiniertes WAV/MP3 + JSON-Timing-Map) für die µCSS-Familie |

Installation des Compilers im eigenen Projekt:

```bash
npm install gulp-mu-css
```

`gulp-mu-ps` wird bei Bilderzeugung automatisch als Abhängigkeit mitinstalliert. Details stehen in den [READMEs der Pakete](gulp-mu-css/README.md); das Handbuch liegt als [PDF (EN)](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) bzw. [(DE)](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) bei.

## Verzeichnisstruktur

```
microCSS/                          Repository-Wurzel (dieses Monorepo)
├── gulp-mu-css/                   µCSS 2 — Stylesheet-Compiler
├── gulp-mu-ps/                    µPS — PSD- / Bild-Rendering
├── gulp-mu-ft/                    µFT — Icon-Font-Erzeugung
├── gulp-mu-au/                    µAU — Sound-Atlas-Erzeugung
├── demos/                         Interaktive Marketing-Demos (GitHub Pages)
├── tools/                         Root-Build-Helfer (Publish, Handbuch, …)
├── gulpfile.mjs                   Gulp-Tasks für Tests, Doku und npm-Publish
├── package.json                   Privates Root-Workspace (nur Dev-Dependencies)
└── µCSS 1.0 (Photoshop)/          Archiviertes µCSS 1 (ExtendScript + jsxlibs-Submodul)
    ├── µCSS/                      Lauffähiger Photoshop-Skriptordner
    ├── jsxlibs/                   Git-Submodul → mamekudz/JSXLIBS
    └── README.md                  Legacy-Dokumentation
```

Konzept und Migrationshinweise: `gulp-mu-css/docs/CONCEPT.md`.

## Entwicklung

Voraussetzungen: **Node ≥ 18** (µFT: **Node ≥ 20.11**), npm, Gulp 5.

```bash
git clone --recurse-submodules https://github.com/mamekudz/microCSS.git
cd microCSS
npm install
npx gulp test              # alle Modul-Tests
npx gulp docs:manual       # Handbuch-PDFs neu bauen (LibreOffice + GulpHelper-Makro)
npx gulp build:publish     # build/ mit veröffentlichungsfertigen Bundles füllen
```

Nützliche Gulp-Tasks: `test:microcss`, `test:microps`, `test:microft`, `test:microau`, `test:legacy-migration` (nur mit lokalem Legacy-Extract), `convert:less`, `convert:vue`, `demos:build`, `publish` (npm-Upload; siehe `tools/publish.mjs`).

## µCSS 1 (Legacy)

Die Photoshop-Script-Implementation von 2005–2014 liegt unter [`µCSS 1.0 (Photoshop)/`](µCSS%201.0%20(Photoshop)/). Für neue Projekte die npm-Pakete oben verwenden. Beim Klonen `--recurse-submodules` setzen, damit `jsxlibs/` für das Legacy-Skript vorhanden ist.

## Lizenz

Die µCSS-2-Module und das Monorepo-Tooling stehen unter der **MIT-Lizenz**. Die Legacy-Photoshop-Version behält ihre eigene Lizenz in `µCSS 1.0 (Photoshop)/LICENSE`; die eingebundenen jsxlibs folgen den in ihren Unterordnern genannten Lizenzen.
