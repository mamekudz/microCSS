# µAU (npm package `gulp-mu-au`)

*English (below) · [Deutsch](#deutsch)*

The technical package name is `gulp-mu-au` (the µ character causes trouble in npm/git names); **µAU** is the display name.

Node module that builds a **sound atlas** for the µCSS/µPS family: from many short audio files it produces one combined audio blob plus a JSON timing map that tells the browser runtime where each sound starts, how long it is and where it loops. The idea is the audio counterpart of sprite atlases — later, sounds will be referenced from µCSS (triggered by animation events) and played from the atlas.

µAU is the µPS-style wrapper around the audio engine `gulp-mu-sound-atlas`: the same family API (one async `Create`) and an incremental build cache.

## Status

- **SoundAtlasMaker**: collects audio sources, builds the atlas (WAV or MP3) plus the JSON timing map, guarded by the engine's incremental cache.
- Loop points can be encoded in the file name, e.g. `engine.ls.100.le.400.wav` → loop from sample 100 to 400. The sound name is the file base name without that suffix.
- The JSON format `{ sounds: { name: [start, duration, loopStart, loopEnd] }, ... }` (seconds) is what the browser runtime (e.g. µLib `Sounds`) consumes directly.

**Scope of this version: build layer only.** Referencing sounds *from CSS* (a µCSS sound directive) and the browser-side runtime/speech are deliberately later steps.

Built on `gulp-mu-sound-atlas` (engine: decode → resample → optional MP3 encode). For **MP3 input files**, that engine needs a `patch-package` patch in the consuming project (see its README); WAV input and MP3 *output* are unaffected.

## Usage

```js
import { SoundAtlasMaker } from "gulp-mu-au";

const result = await SoundAtlasMaker.Create({
	src: "dev/media/final/sounds",   // scanned recursively for *.wav/*.mp3
	dataFile: "skins/std/snds/app.sounds.wav",
	jsonFile: "skins/std/snds/app.sounds.json"
});
// result => { skipped, sounds, dataFile, jsonFile }
```

| Option | Default | Effect |
| :--- | :--- | :--- |
| `dataFile` | — (required) | Output audio blob path (`.wav`, or `.mp3` when `format` is `"mp3"`). |
| `jsonFile` | — (required) | Output JSON timing map path. |
| `sounds` | — | Explicit list of audio source files (merged with `src`). |
| `src` | — | Source directory scanned recursively for `*.wav`/`*.mp3`. |
| `format` | from `dataFile` ext | `"wav"` or `"mp3"`. |
| `mp3KBitRate` | `128` | MP3 bit rate when `format` is `"mp3"`. |
| `sampleRate` | `CONVERT.SAMPLERATE_HIGHEST` | Target sample rate, or `…_HIGHEST`/`…_LOWEST` to derive it from the inputs. |
| `sampleSize` | `CONVERT.SAMPLESIZE_HIGHEST` | Target sample size, or `…_HIGHEST`/`…_LOWEST`. |
| `channels` | `CONVERT.NOOFCHANNELS_HIGHEST` | Target channel count, or `…_HIGHEST`/`…_LOWEST`. |
| `stereo` | `CONVERT.STEREO_KEEP` | `CONVERT.STEREO_KEEP`/`…_SPLIT`/`…_MONO`. |
| `cacheFile` | `<dataFile>.cache.json` | Cache marker path, or `false` to disable caching. |
| `force` | `false` | Force a rebuild even if the cache is up to date. |
| `log` | `console.log` | Logger; `false` silences this wrapper's output. |

At least one of `sounds`/`src` is required. `CONVERT` is exported for the `*_HIGHEST`/`*_LOWEST`/`STEREO_*` constants.

## Incremental build

The engine stores a signature (its version + the relevant options + a content hash of every input) next to the atlas. When `dataFile`, `jsonFile` and the cache marker all exist and the signature still matches, the rebuild is skipped; any change triggers a full rebuild. `force: true` drops the marker to rebuild.

## API building blocks

| Export | Description |
| :--- | :--- |
| `SoundAtlasMaker` | High-level maker (collect → build blob + JSON, cached) |
| `ListAudioFiles` | Recursively list `*.wav`/`*.mp3` sources, sorted |
| `CONVERT` | Conversion constants (`SAMPLERATE_*`, `SAMPLESIZE_*`, `NOOFCHANNELS_*`, `STEREO_*`) |

<!-- publish:exclude:start -->
## Tests

```
npm test          # in the gulp-mu-au directory
npx gulp test     # in the project root (all modules)
```

The tests synthesize small 8-bit/8 kHz mono WAVs, build the atlas, and assert that the audio blob and the JSON timing map (including loop points) are produced and that the cache skips/forces correctly.
<!-- publish:exclude:end -->

---

<a name="deutsch"></a>

# µAU (npm-Paket `gulp-mu-au`)

*[English](#µau-npm-package-gulp-mu-au) · Deutsch (unten)*

Der technische Paketname ist `gulp-mu-au` (das µ-Zeichen bereitet in npm-/git-Namen Probleme); **µAU** ist der Anzeigename.

Node-Modul, das einen **Sound-Atlas** für die µCSS/µPS-Familie baut: Aus vielen kurzen Audiodateien entstehen ein kombinierter Audio-Blob plus eine JSON-Timing-Map, die dem Browser-Runtime sagt, wo jeder Sound beginnt, wie lang er ist und wo er loopt. Die Idee ist das Audio-Gegenstück zu Sprite-Atlanten — später werden Sounds aus der µCSS heraus referenziert (getriggert über Animation-Events) und aus dem Atlas abgespielt.

µAU ist der µPS-artige Wrapper um die Audio-Engine `gulp-mu-sound-atlas`: gleiche Familien-API (ein async `Create`) und ein inkrementeller Build-Cache.

## Status

- **SoundAtlasMaker**: sammelt Audioquellen, baut den Atlas (WAV oder MP3) plus die JSON-Timing-Map — abgesichert durch den inkrementellen Cache der Engine.
- Loop-Punkte lassen sich im Dateinamen kodieren, z. B. `engine.ls.100.le.400.wav` → Loop von Sample 100 bis 400. Der Sound-Name ist der Dateibasisname ohne diesen Suffix.
- Das JSON-Format `{ sounds: { name: [start, duration, loopStart, loopEnd] }, ... }` (Sekunden) konsumiert das Browser-Runtime (z. B. µLib `Sounds`) direkt.

**Umfang dieser Version: nur Build-Layer.** Das Referenzieren von Sounds *aus der CSS* (eine µCSS-Sound-Direktive) sowie der Browser-seitige Runtime-/Sprachausgabe-Teil sind bewusst spätere Schritte.

Aufgesetzt auf `gulp-mu-sound-atlas` (Engine: Dekodieren → Resampling → optional MP3-Encode). Für **MP3-Eingabedateien** benötigt diese Engine im Konsumentenprojekt einen `patch-package`-Patch (siehe deren README); WAV-Eingaben und MP3-*Ausgabe* sind nicht betroffen.

## Verwendung

```js
import { SoundAtlasMaker } from "gulp-mu-au";

const result = await SoundAtlasMaker.Create({
	src: "dev/media/final/sounds",   // rekursiv nach *.wav/*.mp3 durchsucht
	dataFile: "skins/std/snds/app.sounds.wav",
	jsonFile: "skins/std/snds/app.sounds.json"
});
// result => { skipped, sounds, dataFile, jsonFile }
```

| Option | Default | Wirkung |
| :--- | :--- | :--- |
| `dataFile` | — (Pflicht) | Ausgabepfad des Audio-Blobs (`.wav`, oder `.mp3` bei `format: "mp3"`). |
| `jsonFile` | — (Pflicht) | Ausgabepfad der JSON-Timing-Map. |
| `sounds` | — | Explizite Liste von Audioquellen (mit `src` zusammengeführt). |
| `src` | — | Quellverzeichnis, rekursiv nach `*.wav`/`*.mp3` durchsucht. |
| `format` | aus `dataFile`-Endung | `"wav"` oder `"mp3"`. |
| `mp3KBitRate` | `128` | MP3-Bitrate bei `format: "mp3"`. |
| `sampleRate` | `CONVERT.SAMPLERATE_HIGHEST` | Ziel-Samplerate, oder `…_HIGHEST`/`…_LOWEST` (aus den Eingaben abgeleitet). |
| `sampleSize` | `CONVERT.SAMPLESIZE_HIGHEST` | Ziel-Samplegröße, oder `…_HIGHEST`/`…_LOWEST`. |
| `channels` | `CONVERT.NOOFCHANNELS_HIGHEST` | Ziel-Kanalzahl, oder `…_HIGHEST`/`…_LOWEST`. |
| `stereo` | `CONVERT.STEREO_KEEP` | `CONVERT.STEREO_KEEP`/`…_SPLIT`/`…_MONO`. |
| `cacheFile` | `<dataFile>.cache.json` | Cache-Marker, oder `false` zum Deaktivieren. |
| `force` | `false` | Erzwingt einen Neubau trotz aktuellem Cache. |
| `log` | `console.log` | Logger; `false` schaltet die Ausgabe dieses Wrappers stumm. |

Mindestens eines von `sounds`/`src` ist erforderlich. `CONVERT` wird für die Konstanten (`SAMPLERATE_*`, `SAMPLESIZE_*`, `NOOFCHANNELS_*`, `STEREO_*`) exportiert.

## Inkrementeller Build

Die Engine legt eine Signatur (ihre Version + relevante Optionen + Inhalts-Hash jeder Eingabe) neben dem Atlas ab. Wenn `dataFile`, `jsonFile` und der Cache-Marker existieren und die Signatur passt, wird der Neubau übersprungen; jede Änderung löst einen Vollbau aus. `force: true` verwirft den Marker und baut neu.

## Bausteine der API

| Export | Beschreibung |
| :--- | :--- |
| `SoundAtlasMaker` | High-Level-Maker (Sammeln → Blob + JSON bauen, gecacht) |
| `ListAudioFiles` | `*.wav`/`*.mp3`-Quellen rekursiv auflisten (sortiert) |
| `CONVERT` | Konvertierungskonstanten (`SAMPLERATE_*`, `SAMPLESIZE_*`, `NOOFCHANNELS_*`, `STEREO_*`) |

<!-- publish:exclude:start -->
## Tests

```
npm test          # im Verzeichnis gulp-mu-au
npx gulp test     # im Projektstamm (alle Module)
```

Die Tests synthetisieren kleine 8-bit/8-kHz-Mono-WAVs, bauen den Atlas und prüfen, dass Audio-Blob und JSON-Timing-Map (inklusive Loop-Punkte) entstehen und der Cache korrekt überspringt bzw. neu baut.
<!-- publish:exclude:end -->
