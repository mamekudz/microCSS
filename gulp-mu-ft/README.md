# µFT (npm package `gulp-mu-ft`)

*English (below) · [Deutsch](#deutsch)*

The technical package name is `gulp-mu-ft` (the µ character causes trouble in npm/git names); **µFT** is the display name.

**Version:** **0.2.0** · [![npm version](https://img.shields.io/npm/v/gulp-mu-ft.svg)](https://www.npmjs.com/package/gulp-mu-ft)

<p align="center">
  <a href="https://microgulp.dev/en/ready/">
    <img src="https://microgulp.dev/assets/media/microgulp-ready.png" alt="µGulp ready" width="110">
  </a>
</p>

The badge refers to this package's development tasks in the µCSS monorepo, not automatic µGulp integration in consumer projects. [Meaning and usage rules](https://microgulp.dev/en/ready/).

Node module that builds an **icon font** from a directory of SVG glyphs — automated like IcoMoon, without Adobe or IcoMoon — and packages **existing webfonts**, including modern OpenType color fonts and emoji fonts. Output: font files, CSS (`@font-face` / icon classes), IcoMoon-compatible JSON (icons), HTML overview.

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
| `FontGenerator` | Scan SVG tree **or** package a TTF/OTF/WOFF/WOFF2 file → fonts + CSS/HTML (cached) |
| `ScanGlyphs` | Derive name/codepoint, group by directory |
| `InspectFont`, `DetectColorFont` | OpenType color-table detection (COLR/CPAL, SVG, CBDT, sbix) |
| `BuildFontFormats`, `ConvertFontFormats`, `BuildFontCss`, `BuildWebfontCss` | Individual build steps |

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

Color / emoji font file (same API, `src` is the font instead of an SVG tree):

```js
await FontGenerator.Create({
	fontName: "ChatEmoji",
	src: "vendor/NotoColorEmoji-Regular.ttf",
	outputDir: "fonts"
});
```

The browser then uses the generated `ChatEmoji.woff2` via `@font-face`. µFT does **not** animate emoji.

Into µCSS™ skins typically via `copyFolder` in the manifest — see the µCSS™ manual.

Requires Node ≥ 20.11. Built on `svgicons2svgfont`, `svg2ttf`, `ttf2woff(2)`, `ttf2eot`.

## Color Fonts

µFT **detects** and **preserves** OpenType color tables when you pass an existing font file as `src`. The SVG icon pipeline stays monochrome (`svg2ttf` has no color tables).

| Technology | Detected | Preserved in TTF/WOFF | TTF→WOFF2 | Subset |
| :--- | :--- | :--- | :--- | :--- |
| COLR/CPAL v0 | yes | yes | yes (tables kept) | no — full font |
| COLR/CPAL v1 (gradients, paint graphs, palettes) | yes | yes | yes (tables kept; version on WOFF2 is tag-only until decoded) | no — full font |
| SVG-in-OpenType | yes | yes | yes | no — full font |
| CBDT/CBLC | yes | yes | yes | no — full font |
| sbix | yes | yes | yes | no — full font |

`ttf2woff` and `ttf2woff2` wrap every SFNT table; they do not strip COLR/CPAL/SVG/CBDT/sbix. After each conversion µFT re-inspects the output. If color tables would disappear, the lossy file is discarded, a warning is logged, and the original font is kept.

**Not converted (warning, no silent monochrome file):**

- **EOT** and **legacy SVG fonts** — cannot carry OpenType color tables
- **WOFF2 → TTF/WOFF** — no WOFF2 decompressor is bundled; WOFF2 is copied as-is
- **TTC/OTC collections** — supply a single-font file
- **Subsetting** — not implemented; color fonts are never subsetted (COLR layers reference other glyphs)

Color display depends on the **font**, the **browser** and the **OS**. Palette tweaks use CSS `font-palette` / `@font-palette-values` (µFT does not rewrite CPAL). Animation is a separate topic and is not generated here.

Worked example: [`examples/color-font/`](examples/color-font/).

<!-- publish:exclude:start -->
## Tests

```
npm test          # in the gulp-mu-ft directory
npx gulp test     # in the project root
```
<!-- publish:exclude:end -->

---

## Deutsch

# µFT (npm-Paket `gulp-mu-ft`)

*[English](#µft-npm-package-gulp-mu-ft) · Deutsch (unten)*

Der technische Paketname ist `gulp-mu-ft`; **µFT** ist der Anzeigename.

**Version:** **0.2.0** · [![npm version](https://img.shields.io/npm/v/gulp-mu-ft.svg)](https://www.npmjs.com/package/gulp-mu-ft)

Node-Modul für **Icon-Fonts** aus SVG-Glyphen — automatisiert wie IcoMoon, ohne Adobe/IcoMoon — und für das Verpacken vorhandener **Webfonts**, einschließlich moderner OpenType-Color-Fonts und Emoji-Fonts. Ausgabe: Font-Dateien, CSS (`@font-face` / Icon-Klassen), IcoMoon-JSON (Icons), HTML-Übersicht.

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
| `FontGenerator` | SVG-Baum **oder** TTF/OTF/WOFF/WOFF2-Datei → Fonts + CSS/HTML (gecacht) |
| `ScanGlyphs` | Name/Codepoint ableiten, nach Verzeichnis gruppieren |
| `InspectFont`, `DetectColorFont` | OpenType-Color-Tables erkennen (COLR/CPAL, SVG, CBDT, sbix) |
| `BuildFontFormats`, `ConvertFontFormats`, `BuildFontCss`, `BuildWebfontCss` | Einzelne Build-Schritte |

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

Color-/Emoji-Fontdatei (dieselbe API, `src` ist die Font-Datei statt des SVG-Baums):

```js
await FontGenerator.Create({
	fontName: "ChatEmoji",
	src: "vendor/NotoColorEmoji-Regular.ttf",
	outputDir: "fonts"
});
```

Der Browser lädt das erzeugte `ChatEmoji.woff2` per `@font-face`. µFT **animiert** Emoji nicht.

In µCSS™-Skins typischerweise per `copyFolder` im Manifest — siehe µCSS™-Handbuch.

Node ≥ 20.11. Aufgesetzt auf `svgicons2svgfont`, `svg2ttf`, `ttf2woff(2)`, `ttf2eot`.

## Color Fonts

µFT **erkennt** und **erhält** OpenType-Color-Tables, wenn `src` eine vorhandene Fontdatei ist. Die SVG-Icon-Pipeline bleibt monochrom (`svg2ttf` erzeugt keine Color-Tables).

| Technik | erkannt | in TTF/WOFF erhalten | TTF→WOFF2 | Subset |
| :--- | :--- | :--- | :--- | :--- |
| COLR/CPAL v0 | ja | ja | ja (Tables bleiben) | nein — ganzer Font |
| COLR/CPAL v1 (Gradients, Paint Graphs, Paletten) | ja | ja | ja (Tables bleiben; COLR-Version in WOFF2 nur über Tags, bis dekodiert) | nein — ganzer Font |
| SVG-in-OpenType | ja | ja | ja | nein — ganzer Font |
| CBDT/CBLC | ja | ja | ja | nein — ganzer Font |
| sbix | ja | ja | ja | nein — ganzer Font |

`ttf2woff` und `ttf2woff2` packen jede SFNT-Table; COLR/CPAL/SVG/CBDT/sbix werden nicht entfernt. Nach jeder Konvertierung prüft µFT das Ergebnis. Würden Color-Tables verloren gehen, wird die Verlustdatei verworfen, eine Warnung geloggt und der Originalfont behalten.

**Nicht konvertiert (Warnung, kein stilles Monochrom-File):**

- **EOT** und **Legacy-SVG-Fonts** — können OpenType-Color-Tables nicht tragen
- **WOFF2 → TTF/WOFF** — kein WOFF2-Dekompressor im Paket; WOFF2 wird durchgereicht
- **TTC/OTC-Collections** — einzelne Fontdatei verwenden
- **Subsetting** — nicht implementiert; Color Fonts werden nie verkleinert (COLR-Layer verweisen auf andere Glyphen)

Die Farbdarstellung hängt von **Font**, **Browser** und **Betriebssystem** ab. Paletten per CSS `font-palette` / `@font-palette-values` (µFT schreibt CPAL nicht um). Animation ist ein anderes Thema und wird hier nicht erzeugt.

Beispiel: [`examples/color-font/`](examples/color-font/).

<!-- publish:exclude:start -->
## Tests

```
npm test          # im Verzeichnis gulp-mu-ft
npx gulp test     # im Projektstamm
```
<!-- publish:exclude:end -->
