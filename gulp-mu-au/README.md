# µAU (npm package `gulp-mu-au`)

*English (below) · [Deutsch](#deutsch)*

The technical package name is `gulp-mu-au` (the µ character causes trouble in npm/git names); **µAU** is the display name.

Node module that builds a **sound atlas** for the µCSS family: many short audio files → one combined WAV/MP3 blob plus a JSON timing map for the browser runtime. Audio counterpart of sprite atlases.

> **Documentation policy:** Loop points, conversion options, incremental cache, JSON format and µCSS manifest integration are documented **centrally in the µCSS manual** (chapter *microAU*). This README is a quick npm overview only.

## Documentation (canonical)

| | |
| :--- | :--- |
| **µCSS manual (chapter *microAU*)** | [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) · [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) |
| **Manual sources** | [microCSS-Manual-en.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Manual-en.md) · [microCSS-Handbuch.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Handbuch.md) |
| **Sound/CSS concept (draft)** | [docs/CONCEPT.md](docs/CONCEPT.md) — CSS bindings, `soundTriggers` manifest module |

## Project links

| | |
| :--- | :--- |
| **µCSS (npm)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **Monorepo** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (this package)** | [gulp-mu-au](https://www.npmjs.com/package/gulp-mu-au) |

## Status

**Build layer only** — referencing sounds from CSS (µCSS sound directive) and browser runtime/speech are later steps.

## Overview

| Export | Purpose |
| :--- | :--- |
| `SoundAtlasMaker` | Collect sources → build atlas + JSON (cached) |
| `ListAudioFiles` | Recursively list `*.wav`/`*.mp3` |
| `CONVERT` | Sample-rate / channel / stereo constants |

Loop points in file names: `engine.ls.100.le.400.wav` → sound `engine`, loop samples 100–400.

## Quick start

```js
import { SoundAtlasMaker } from "gulp-mu-au";

await SoundAtlasMaker.Create({
	src: "dev/media/final/sounds",
	dataFile: "skins/std/snds/app.sounds.wav",
	jsonFile: "skins/std/snds/app.sounds.json"
});
```

µCSS integration: optional `sounds` block in the skin manifest — see the µCSS manual.

Built on [`gulp-mu-sound-atlas`](https://www.npmjs.com/package/gulp-mu-sound-atlas) **^1.1.2** (configurable `log`: default quiet engine, one-line summary; `log: true` for per-file progress; `log: false` silent). Requires Node ≥ 18.

<!-- publish:exclude:start -->
## Tests

```
npm test          # in the gulp-mu-au directory
npx gulp test     # in the project root
```
<!-- publish:exclude:end -->

---

<a name="deutsch"></a>

# µAU (npm-Paket `gulp-mu-au`)

*[English](#µau-npm-package-gulp-mu-au) · Deutsch (unten)*

Der technische Paketname ist `gulp-mu-au`; **µAU** ist der Anzeigename.

Node-Modul für einen **Sound-Atlas** in der µCSS-Familie: viele kurze Audiodateien → kombinierter WAV/MP3-Blob plus JSON-Timing-Map für die Browser-Runtime. Audio-Gegenstück zu Sprite-Atlanten.

> **Doku-Richtlinie:** Loop-Punkte, Konvertierungsoptionen, Cache, JSON-Format und µCSS-Manifest-Anbindung stehen **zentral im µCSS-Handbuch** (Kapitel *microAU*). Diese README ist nur ein npm-Kurzüberblick.

## Dokumentation (kanonisch)

| | |
| :--- | :--- |
| **µCSS-Handbuch (Kapitel *microAU*)** | [microCSS-de.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-de.pdf) · [microCSS-en.pdf](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/microCSS-en.pdf) |
| **Handbuch-Quellen** | [microCSS-Handbuch.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Handbuch.md) · [microCSS-Manual-en.md](https://github.com/mamekudz/microCSS/blob/master/gulp-mu-css/docs/manual/microCSS-Manual-en.md) |
| **Sound/CSS-Konzept (Entwurf)** | [docs/CONCEPT.md](docs/CONCEPT.md) — CSS-Bindings, Manifest-Modul `soundTriggers` |

## Projekt-Links

| | |
| :--- | :--- |
| **µCSS (npm)** | [gulp-mu-css](https://www.npmjs.com/package/gulp-mu-css) |
| **Monorepo** | [github.com/mamekudz/microCSS](https://github.com/mamekudz/microCSS) |
| **npm (dieses Paket)** | [gulp-mu-au](https://www.npmjs.com/package/gulp-mu-au) |

## Status

**Nur Build-Layer** — Sound-Direktive in µCSS und Browser-Runtime/Sprachausgabe folgen später.

## Überblick

| Export | Zweck |
| :--- | :--- |
| `SoundAtlasMaker` | Quellen sammeln → Atlas + JSON (gecacht) |
| `ListAudioFiles` | Rekursiv `*.wav`/`*.mp3` auflisten |
| `CONVERT` | Konstanten für Samplerate, Kanäle, Stereo |

Loop-Punkte im Dateinamen: `engine.ls.100.le.400.wav` → Sound `engine`, Loop Sample 100–400.

## Schnellstart

```js
import { SoundAtlasMaker } from "gulp-mu-au";

await SoundAtlasMaker.Create({
	src: "dev/media/final/sounds",
	dataFile: "skins/std/snds/app.sounds.wav",
	jsonFile: "skins/std/snds/app.sounds.json"
});
```

µCSS-Anbindung: optionaler `sounds`-Block im Skin-Manifest — siehe µCSS-Handbuch.

Aufgesetzt auf [`gulp-mu-sound-atlas`](https://www.npmjs.com/package/gulp-mu-sound-atlas) **^1.1.2** (konfigurierbares `log`: Standard = stille Engine, einzeilige Zusammenfassung; `log: true` für Datei-für-Datei-Fortschritt; `log: false` = stumm). Node ≥ 18.

<!-- publish:exclude:start -->
## Tests

```
npm test          # im Verzeichnis gulp-mu-au
npx gulp test     # im Projektstamm
```
<!-- publish:exclude:end -->
