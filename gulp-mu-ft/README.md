# µFT (npm package `gulp-mu-ft`)

*English (below) · [Deutsch](#deutsch)*

The technical package name is `gulp-mu-ft` (the µ character causes trouble in npm/git names); **µFT** is the display name.

**Version:** **0.1.3** · [![npm version](https://img.shields.io/npm/v/gulp-mu-ft.svg)](https://www.npmjs.com/package/gulp-mu-ft)

Node module that builds an **icon font** from a directory of SVG glyphs — automated like IcoMoon, without Adobe or IcoMoon. Output: font files, CSS classes, IcoMoon-compatible JSON, HTML overview.

> **Documentation policy:** Glyph naming, all `FontGenerator` options, incremental cache and µCSS™ integration are documented **centrally in the µCSS™ manual** (chapter *microFT*). This README is a quick npm overview only.

## Documentation (canonical)

| | |
| :--- | :--- |
| **µCSS™ manual (chapter *microFT*)** | [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) · [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) |
| **Manual sources** | [microCSS-Manual-en.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Manual-en.md) · [microCSS-Handbuch.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Handbuch.md) |

## Project links

| | |
| :--- | :--- |
| **µCSS™ (npm)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **Monorepo** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (this package)** | [gulp-mu-ft](https://www.npmjs.com/package/gulp-mu-ft) |

## Overview

| Export | Purpose |
| :--- | :--- |
| `FontGenerator` | Scan SVG tree → build fonts + CSS/JSON/HTML (cached) |
| `ScanGlyphs` | Derive name/codepoint, group by directory |
| `BuildFontFormats`, `BuildFontCss`, `BuildIcoMoonJson`, `BuildOverviewHtml` | Individual build steps |

Codepoints from file names: `<name>-U0x<HEX>.svg` (e.g. `general-control-edit-U0xE900.svg`).

## Quick start

```js
import { FontGenerator } from "gulp-mu-ft";

await FontGenerator.Create({
	fontName: "AppSymbol",
	src: "svg",
	outputDir: "fonts"
});
```

Into µCSS™ skins typically via `copyFolder` in the manifest — see the µCSS™ manual.

Requires Node ≥ 20.11. Built on `svgicons2svgfont`, `svg2ttf`, `ttf2woff(2)`, `ttf2eot`.

<!-- publish:exclude:start -->
## Tests

```
npm test          # in the gulp-mu-ft directory
npx gulp test     # in the project root
```
<!-- publish:exclude:end -->

---

<a name="deutsch"></a>

# µFT (npm-Paket `gulp-mu-ft`)

*[English](#µft-npm-package-gulp-mu-ft) · Deutsch (unten)*

Der technische Paketname ist `gulp-mu-ft`; **µFT** ist der Anzeigename.

**Version:** **0.1.3** · [![npm version](https://img.shields.io/npm/v/gulp-mu-ft.svg)](https://www.npmjs.com/package/gulp-mu-ft)

Node-Modul für **Icon-Fonts** aus SVG-Glyphen — automatisiert wie IcoMoon, ohne Adobe/IcoMoon. Ausgabe: Font-Dateien, CSS-Klassen, IcoMoon-JSON, HTML-Übersicht.

> **Doku-Richtlinie:** Glyphen-Benennung, alle `FontGenerator`-Optionen, Cache und µCSS™-Anbindung stehen **zentral im µCSS™-Handbuch** (Kapitel *microFT*). Diese README ist nur ein npm-Kurzüberblick.

## Dokumentation (kanonisch)

| | |
| :--- | :--- |
| **µCSS™-Handbuch (Kapitel *microFT*)** | [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) · [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) |
| **Handbuch-Quellen** | [microCSS-Handbuch.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Handbuch.md) · [microCSS-Manual-en.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Manual-en.md) |

## Projekt-Links

| | |
| :--- | :--- |
| **µCSS™ (npm)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **Monorepo** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (dieses Paket)** | [gulp-mu-ft](https://www.npmjs.com/package/gulp-mu-ft) |

## Überblick

| Export | Zweck |
| :--- | :--- |
| `FontGenerator` | SVG-Baum scannen → Fonts + CSS/JSON/HTML (gecacht) |
| `ScanGlyphs` | Name/Codepoint ableiten, nach Verzeichnis gruppieren |
| `BuildFontFormats`, `BuildFontCss`, `BuildIcoMoonJson`, `BuildOverviewHtml` | Einzelne Build-Schritte |

Codepoints aus Dateinamen: `<name>-U0x<HEX>.svg` (z. B. `general-control-edit-U0xE900.svg`).

## Schnellstart

```js
import { FontGenerator } from "gulp-mu-ft";

await FontGenerator.Create({
	fontName: "AppSymbol",
	src: "svg",
	outputDir: "fonts"
});
```

In µCSS™-Skins typischerweise per `copyFolder` im Manifest — siehe µCSS™-Handbuch.

Node ≥ 20.11. Aufgesetzt auf `svgicons2svgfont`, `svg2ttf`, `ttf2woff(2)`, `ttf2eot`.

<!-- publish:exclude:start -->
## Tests

```
npm test          # im Verzeichnis gulp-mu-ft
npx gulp test     # im Projektstamm
```
<!-- publish:exclude:end -->
