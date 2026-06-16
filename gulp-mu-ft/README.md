# µFT (npm package `gulp-mu-ft`)

*English (below) · [Deutsch](#deutsch)*

The technical package name is `gulp-mu-ft` (the µ character causes trouble in npm/git names); **µFT** is the display name.

Node module that builds an **icon font** from a directory of SVG glyphs — the way the IcoMoon web app does, but automated and without an Adobe or IcoMoon dependency. From one folder of SVGs it produces the font files (SVG/TTF/EOT/WOFF/WOFF2), ready-to-use CSS classes, an IcoMoon-compatible JSON and a self-contained HTML overview of the whole character set.

It belongs to the µCSS/µPS family: like µPS for images, µFT is the font engine that µCSS will later use for icon fonts.

## Status

- **FontGenerator**: scans a directory of SVG glyphs, builds all font formats, and writes CSS, JSON and the HTML overview, guarded by an incremental content cache.
- Codepoints are taken from the file name (`-U0x<HEX>` suffix) — nothing has to be assigned manually in IcoMoon.
- Group labels/descriptions and per-glyph descriptions are driven by the manifest; all descriptions are **English only** (i18n is added later via i18x).

Built directly on `svgicons2svgfont` + `svg2ttf` + `ttf2woff`/`ttf2woff2`/`ttf2eot` (no gulp pipeline required). Requires Node ≥ 20.11.

## Glyph naming

The Unicode codepoint of every glyph is encoded in the file name:

```
<glyph-name>-U0x<HEX>.svg
e.g.  general-control-edit-U0xE900.svg  ->  name "general-control-edit", code U+E900
```

- The **directory** a glyph sits in becomes its group id (relative path under `src`, e.g. `general` or `medical/diagnosis`).
- Files without a valid `-U0x<HEX>` suffix are skipped with a warning (drafts).
- Duplicate codepoints are skipped with a warning (the conflicting files are named).

## Usage

```js
import { FontGenerator } from "gulp-mu-ft";

const result = await FontGenerator.Create({
	fontName: "DosingSymbol",
	src: "svg",            // scanned recursively
	outputDir: "fonts",
	groups: {
		general: { label: "General", description: "General UI controls.", order: 1 },
		"medical/diagnosis": { label: "Diagnosis", order: 2 }
	},
	glyphs: {
		"general-control-edit": { description: "Button/icon to start editing an item." }
	}
});
// result => { skipped, glyphs, warnings, files }
```

Produced in `fonts/`:

- `DosingSymbol.svg` / `.ttf` / `.eot` / `.woff` / `.woff2` — the font files
- `DosingSymbol.css` — `@font-face` plus one `.icon-<name>` class per glyph
- `DosingSymbol.json` — IcoMoon-compatible selection file
- `DosingSymbol.html` — overview page, rendered at build time, grouped by directory

| Option | Default | Effect |
| :--- | :--- | :--- |
| `fontName` | — (required) | Font family name; also the base name of every output file. |
| `src` | — (required) | Source directory of the SVG glyphs (scanned recursively). |
| `outputDir` | — (required) | Target directory; created if needed. |
| `formats` | `["svg","ttf","eot","woff","woff2"]` | Font formats to emit. |
| `fontHeight` | `1024` | Em height used when building the font. |
| `normalize` | `true` | Normalize glyph heights (passed to `svgicons2svgfont`). |
| `centerHorizontally` | `true` | Center glyphs horizontally. |
| `classPrefix` | `"icon"` | Prefix of the generated CSS classes (`.icon-<name>`). |
| `fontUrlBase` | `""` | Path prefix in front of the font urls in CSS/HTML (e.g. `"fonts/"`). |
| `css` | `"<fontName>.css"` | CSS file name, or `false` to skip. |
| `json` | `"<fontName>.json"` | IcoMoon JSON file name, or `false` to skip. |
| `html` | enabled | HTML options `{ file, title, intro, glyphFontSize }`, or `false` to skip. |
| `groups` | `{}` | `groupId -> { label, description, order }` for the HTML overview. |
| `glyphs` | `{}` | `glyphName -> { description }` for the HTML overview. |
| `timestamp` | `1577836800` | Fixed creation timestamp (seconds) for reproducible fonts. |
| `cacheFile` | `<outputDir>/.build-cache.json` | Cache file path, or `false` to disable caching. |
| `force` | `false` | Force a rebuild even if the cache is up to date. |
| `log` | `console.log` | Logger; `false` silences output. |

## Incremental build

Before building, `FontGenerator` computes a content signature (SHA-1 over every SVG plus the relevant options and the cache schema) and stores it next to the output. On the next run the build is skipped when the signature still matches and all outputs exist; any change to a glyph, the options or the schema triggers a full rebuild. The check is timestamp independent, so it stays reliable across a git checkout. Force a rebuild with `force: true` (or by deleting the cache file).

## API building blocks

| Export | Description |
| :--- | :--- |
| `FontGenerator` | High-level generator (scan → build → write CSS/JSON/HTML, cached) |
| `ScanGlyphs` | Scan a directory: derive name/codepoint, group by directory, report skips |
| `BuildFontFormats` | Build SVG/TTF/EOT/WOFF/WOFF2 buffers from a set of glyphs |
| `BuildFontCss` | Build the `@font-face` + per-glyph class CSS |
| `BuildIcoMoonJson` | Build an IcoMoon-compatible selection object |
| `BuildOverviewHtml` | Build the grouped HTML overview page |
| `ListSvgFiles` / `ReadGlyphSvg` | Low-level helpers (recursive listing, encoding-repaired read) |

<!-- publish:exclude:start -->
## Tests

```
npm test          # in the gulp-mu-ft directory
npx gulp test     # in the project root (all modules)
```

The tests generate a font from `test/fixtures/svg` and assert that all formats plus CSS, JSON and HTML are produced, and that the incremental cache skips/forces correctly.
<!-- publish:exclude:end -->

---

<a name="deutsch"></a>

# µFT (npm-Paket `gulp-mu-ft`)

*[English](#µft-npm-package-gulp-mu-ft) · Deutsch (unten)*

Der technische Paketname ist `gulp-mu-ft` (das µ-Zeichen bereitet in npm-/git-Namen Probleme); **µFT** ist der Anzeigename.

Node-Modul, das aus einem Verzeichnis von SVG-Zeichen einen **Icon-Font** erzeugt — so wie die Web-App IcoMoon, aber automatisiert und ohne Adobe- oder IcoMoon-Abhängigkeit. Aus einem SVG-Ordner entstehen die Font-Dateien (SVG/TTF/EOT/WOFF/WOFF2), fertige CSS-Klassen, eine IcoMoon-kompatible JSON und ein eigenständiges HTML-Dokument, das den gesamten Zeichenvorrat anzeigt.

µFT gehört zur µCSS/µPS-Familie: Wie µPS für Bilder ist µFT die Font-Engine, die µCSS später für Icon-Fonts nutzt.

## Status

- **FontGenerator**: scannt ein SVG-Verzeichnis, baut alle Font-Formate und schreibt CSS, JSON und die HTML-Übersicht — abgesichert durch einen inkrementellen Inhalts-Cache.
- Codepoints stammen aus dem Dateinamen (`-U0x<HEX>`-Suffix) — nichts muss mehr manuell in IcoMoon zugewiesen werden.
- Gruppen-Bezeichnungen/-Beschreibungen und die Beschreibungen einzelner Zeichen steuert das Manifest; alle Beschreibungen sind **nur in Englisch** (Internationalisierung folgt später über i18x).

Direkt auf `svgicons2svgfont` + `svg2ttf` + `ttf2woff`/`ttf2woff2`/`ttf2eot` aufgesetzt (keine Gulp-Pipeline nötig). Erfordert Node ≥ 20.11.

## Benennung der Zeichen

Der Unicode-Codepoint jedes Zeichens steckt im Dateinamen:

```
<zeichen-name>-U0x<HEX>.svg
z. B.  general-control-edit-U0xE900.svg  ->  Name "general-control-edit", Code U+E900
```

- Das **Verzeichnis** eines Zeichens wird zu seiner Gruppen-ID (relativer Pfad unter `src`, z. B. `general` oder `medical/diagnosis`).
- Dateien ohne gültiges `-U0x<HEX>`-Suffix werden mit Warnung übersprungen (Entwürfe).
- Doppelt vergebene Codepoints werden mit Warnung übersprungen (die betroffenen Dateien werden genannt).

## Verwendung

```js
import { FontGenerator } from "gulp-mu-ft";

const result = await FontGenerator.Create({
	fontName: "DosingSymbol",
	src: "svg",            // rekursiv durchsucht
	outputDir: "fonts",
	groups: {
		general: { label: "General", description: "General UI controls.", order: 1 },
		"medical/diagnosis": { label: "Diagnosis", order: 2 }
	},
	glyphs: {
		"general-control-edit": { description: "Button/icon to start editing an item." }
	}
});
// result => { skipped, glyphs, warnings, files }
```

Erzeugt in `fonts/`:

- `DosingSymbol.svg` / `.ttf` / `.eot` / `.woff` / `.woff2` — die Font-Dateien
- `DosingSymbol.css` — `@font-face` plus eine `.icon-<name>`-Klasse pro Zeichen
- `DosingSymbol.json` — IcoMoon-kompatible Auswahl-Datei
- `DosingSymbol.html` — Übersichtsseite, zur Build-Zeit gerendert, nach Verzeichnis gruppiert

| Option | Default | Wirkung |
| :--- | :--- | :--- |
| `fontName` | — (Pflicht) | Font-Familienname; zugleich Basisname aller Ausgabedateien. |
| `src` | — (Pflicht) | Quellverzeichnis der SVG-Zeichen (rekursiv durchsucht). |
| `outputDir` | — (Pflicht) | Zielverzeichnis; wird bei Bedarf angelegt. |
| `formats` | `["svg","ttf","eot","woff","woff2"]` | Zu erzeugende Font-Formate. |
| `fontHeight` | `1024` | Em-Höhe beim Font-Bau. |
| `normalize` | `true` | Glyphenhöhen normalisieren (an `svgicons2svgfont` weitergereicht). |
| `centerHorizontally` | `true` | Glyphen horizontal zentrieren. |
| `classPrefix` | `"icon"` | Präfix der erzeugten CSS-Klassen (`.icon-<name>`). |
| `fontUrlBase` | `""` | Pfad-Präfix vor den Font-URLs in CSS/HTML (z. B. `"fonts/"`). |
| `css` | `"<fontName>.css"` | CSS-Dateiname, oder `false` zum Überspringen. |
| `json` | `"<fontName>.json"` | IcoMoon-JSON-Dateiname, oder `false` zum Überspringen. |
| `html` | aktiv | HTML-Optionen `{ file, title, intro, glyphFontSize }`, oder `false` zum Überspringen. |
| `groups` | `{}` | `groupId -> { label, description, order }` für die HTML-Übersicht. |
| `glyphs` | `{}` | `glyphName -> { description }` für die HTML-Übersicht. |
| `timestamp` | `1577836800` | Fester Erstellungszeitstempel (Sekunden) für reproduzierbare Fonts. |
| `cacheFile` | `<outputDir>/.build-cache.json` | Cache-Datei, oder `false` zum Deaktivieren. |
| `force` | `false` | Erzwingt einen Neubau trotz aktuellem Cache. |
| `log` | `console.log` | Logger; `false` schaltet die Ausgabe stumm. |

## Inkrementeller Build

Vor dem Bau berechnet `FontGenerator` eine Inhalts-Signatur (SHA-1 über alle SVGs plus die relevanten Optionen und das Cache-Schema) und legt sie neben der Ausgabe ab. Beim nächsten Lauf wird übersprungen, wenn die Signatur passt und alle Ausgaben existieren; jede Änderung an einem Zeichen, den Optionen oder dem Schema löst einen Vollbau aus. Die Prüfung ist zeitstempel-unabhängig (zuverlässig auch nach `git checkout`). Erzwingen mit `force: true` (oder durch Löschen der Cache-Datei).

## Bausteine der API

| Export | Beschreibung |
| :--- | :--- |
| `FontGenerator` | High-Level-Generator (Scan → Bau → CSS/JSON/HTML schreiben, gecacht) |
| `ScanGlyphs` | Verzeichnis scannen: Name/Codepoint ableiten, nach Verzeichnis gruppieren, Übersprungenes melden |
| `BuildFontFormats` | SVG/TTF/EOT/WOFF/WOFF2-Puffer aus einer Zeichenmenge bauen |
| `BuildFontCss` | CSS mit `@font-face` + Klasse je Zeichen bauen |
| `BuildIcoMoonJson` | IcoMoon-kompatibles Auswahl-Objekt bauen |
| `BuildOverviewHtml` | Gruppierte HTML-Übersichtsseite bauen |
| `ListSvgFiles` / `ReadGlyphSvg` | Low-Level-Helfer (rekursive Auflistung, Encoding-reparierter Lesezugriff) |

<!-- publish:exclude:start -->
## Tests

```
npm test          # im Verzeichnis gulp-mu-ft
npx gulp test     # im Projektstamm (alle Module)
```

Die Tests erzeugen einen Font aus `test/fixtures/svg` und prüfen, dass alle Formate plus CSS, JSON und HTML entstehen und dass der inkrementelle Cache korrekt überspringt bzw. neu baut.
<!-- publish:exclude:end -->
