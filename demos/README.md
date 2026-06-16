# µCSS marketing demos

Interactive demos for videos and GitHub Pages — ported from the **AiDPix / Oxyd** glittery sparkle and fly easter egg.

| Demo | Effect | µCSS / µAU features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Click → sparkle burst | `sequenceStrip`, sprite atlas, **GlitterySprite** `afterWork` hook |
| [flyex/](flyex/) | Fly crosses screen, click to swat | **FlyEx** / **FlyExUtils** macros, DSD strips, **µAU sound atlas** (`fly1`, `swatter`, `crush`) |

## Build

Assets live under each demo's `dev/media/` (copied once from `oldsrcs/AiDPix Extract`).

```bash
npx gulp demos:build
```

Output lands in `demos/*/dist/` (CSS, sprites, sounds).

## View locally

ES modules + `fetch()` for the sound atlas require a static server (not `file://`):

```bash
npx --yes serve demos -p 5173
# http://localhost:5173/glittery/
# http://localhost:5173/flyex/
```

**FlyEx:** first click resumes audio (browser policy), then spawns the fly. Click the fly to swat.

## YouTube / marketing angles

- *One PNG folder → sparkle animation* (Glittery pipeline in ~30 s)
- *One DSD image → 80 CSS rules* (FlyEx macro, DevTools scroll)
- *Sound atlas from the manifest* (four WAVs → one blob + JSON, fly buzz + swat)
- *µCSS 1 Photoshop vs µCSS 2 Node* (same assets, modern build)

## Asset provenance

- Glittery frames, FlyEx DSD sheets and fly sounds from the AiDPix project (Oxyd lineage).
- Helpers: `demos/shared/effect-helpers.mjs` → `gulp-mu-css/test/fixtures/aidpix-helpers.mjs`.

---

# µCSS Marketing-Demos

Interaktive Demos für Videos und GitHub Pages — portiert vom **AiDPix-/Oxyd-**Glittery-Effekt und dem Fliegen-Osterei.

| Demo | Effekt | µCSS-/µAU-Features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Klick → Funkeln | `sequenceStrip`, Sprite-Atlas, **GlitterySprite**-Hook |
| [flyex/](flyex/) | Fliege fliegt, Klick = Klatsch | **FlyEx**-/ **FlyExUtils**-Makros, DSD-Strips, **µAU-Sound-Atlas** |

## Bauen

```bash
npx gulp demos:build
```

## Ansehen

Statischen Server starten (kein `file://` wegen ES-Modulen und Sound-`fetch`):

```bash
npx --yes serve demos -p 5173
```

**FlyEx:** erster Klick aktiviert Audio, dann erscheint die Fliege.
