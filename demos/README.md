# µCSS marketing demos

Interactive demos for videos and GitHub Pages — ported from the **AiDPix / Oxyd** glittery sparkle and fly easter egg.

| Demo | Effect | µCSS / µAU features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Click → sparkle burst | `sequenceStrip`, sprite atlas, **GlitterySprite** `afterWork` hook |
| [flyex/](flyex/) | Fly crosses screen, click to swat | **FlyEx** / **FlyExUtils** macros, DSD strips, **µAU sound atlas** (`fly1`, `swatter`, `crush`) |

### FlyEx — Atari heritage

**FlyEx** is a modern remake of a classic **Atari ST fly-swatting gimmick** — the kind of tiny desktop accessory that magazine PD disks and “gimmick” cover disks used to ship (TSR utilities, ACC files, joke programs). The demo reuses the **original hand-pixelated sprites** from that lineage (preserved via the AiDPix / Oxyd projects), now rendered through µPS sequence strips and µCSS helper macros instead of GEM.

If you want to browse the original magazine context (listings, cover disks, PD collections):

- [Computer-Magazin-Archiv (stcarchiv.de)](https://www.stcarchiv.de/) — German ST magazines incl. *ATARImagazin*, *TOS*, *Atari Inside*
- [Atari Magazines on AtariMania](https://www.atarimania.com/mag/atari_magazine.html) — scanned PDF issues with listings and disk contents
- [AtariUpToDate](https://www.ataruptodate.de/) — PD / cover-disk software databases (search *Accessory*, *Desktop*, gimmick categories)
- [AtariMagazines.com](https://www.atarimagazines.com/) — Antic, ST Log and other US magazines + associated disk archives

Search tips on PD sites: *TSR*, *Accessory* / ACC, *Desktop*, or the German magazine disk series (e.g. *Atari Inside* diskette lists on AtariUpToDate).

## Build

Assets live under each demo's `dev/media/` (copied once from `oldsrcs/AiDPix Extract`).

```bash
npx gulp demos:build
```

Output lands in `demos/*/dist/` (CSS, sprites, sounds).

## Live (GitHub Pages)

After enabling **Pages → Build and deployment → Source: GitHub Actions** (top of the Pages settings — not the Jekyll/Static HTML starter workflows), pushes to `master` rebuild and deploy automatically. Then open **Actions → Demo pages** to confirm the run succeeded.

| Page | URL |
| :--- | :--- |
| Index | https://mamekudz.github.io/microCSS/ |
| Glittery | https://mamekudz.github.io/microCSS/glittery/ |
| FlyEx | https://mamekudz.github.io/microCSS/flyex/ |

## View locally

ES modules + `fetch()` for the sound atlas require a static server (not `file://`):

```bash
npx --yes serve demos -p 5173
# http://localhost:5173/
# http://localhost:5173/glittery/
# http://localhost:5173/flyex/
```

**FlyEx:** first click resumes audio (browser policy), then spawns the fly. Click the fly to swat.

## YouTube / marketing angles

- *One PNG folder → sparkle animation* (Glittery pipeline in ~30 s)
- *One DSD image → 80 CSS rules* (FlyEx macro, DevTools scroll)
- *Atari ST gimmick in the browser* (hand-pixelled sprites, 2026 build pipeline)
- *Sound atlas from the manifest* (four WAVs → one blob + JSON, fly buzz + swat)
- *µCSS 1 Photoshop vs µCSS 2 Node* (same assets, modern build)

## Asset provenance

- Glittery frames, FlyEx DSD sheets and fly sounds from the AiDPix project (Oxyd lineage).
- FlyEx sprites: original hand-pixelated graphics from the Atari fly-swatting gimmick tradition (see **FlyEx — Atari heritage** above).
- Helpers: `demos/shared/effect-helpers.mjs` → `gulp-mu-css/test/fixtures/aidpix-helpers.mjs`.

---

# µCSS Marketing-Demos

Interaktive Demos für Videos und GitHub Pages — portiert vom **AiDPix-/Oxyd-**Glittery-Effekt und dem Fliegen-Osterei.

| Demo | Effekt | µCSS-/µAU-Features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Klick → Funkeln | `sequenceStrip`, Sprite-Atlas, **GlitterySprite**-Hook |
| [flyex/](flyex/) | Fliege fliegt, Klick = Klatsch | **FlyEx**-/ **FlyExUtils**-Makros, DSD-Strips, **µAU-Sound-Atlas** |

### FlyEx — Atari-Hintergrund

**FlyEx** ist ein moderner Nachbau eines klassischen **Atari-ST-Fliegen-Gimmicks** — kleine Desktop-Spielereien, die früher über PD-Disketten der Magazine (TSR-Utilities, ACC-Dateien, Scherzprogramme) verbreitet wurden. Die Demo nutzt die **original handgepixelten Sprites** aus dieser Tradition (via AiDPix/Oxyd erhalten), heute über µPS-Strips und µCSS-Makros statt über GEM.

Archiv-Tipps zum Original-Kontext (Hefte, Listings, Disk-Inhalte):

- [Computer-Magazin-Archiv (stcarchiv.de)](https://www.stcarchiv.de/) — deutsche ST-Magazine u. a. *ATARImagazin*, *TOS*, *Atari Inside*
- [Atari Magazines auf AtariMania](https://www.atarimania.com/mag/atari_magazine.html) — eingescannte PDF-Ausgaben
- [AtariUpToDate](https://www.ataruptodate.de/) — PD-/Coverdisk-Datenbanken (*Accessory*, *Desktop*, Gimmicks)
- [AtariMagazines.com](https://www.atarimagazines.com/) — Antic, ST Log u. a. inkl. Disk-Archive

Suchbegriffe auf PD-Seiten: *TSR*, *Accessory* / ACC, *Desktop*, oder die Disketten-Listen der *Atari Inside*-Serie.

## Bauen

```bash
npx gulp demos:build
```

## Live (GitHub Pages)

Nach **Pages → Build and deployment → Source: GitHub Actions** (oben auf der Pages-Seite — nicht die Jekyll-/Static-HTML-Starter) baut und deployt jeder Push auf `master` automatisch. Erfolg unter **Actions → Demo pages** prüfen.

| Seite | URL |
| :--- | :--- |
| Index | https://mamekudz.github.io/microCSS/ |
| Glittery | https://mamekudz.github.io/microCSS/glittery/ |
| FlyEx | https://mamekudz.github.io/microCSS/flyex/ |

## Ansehen

Statischen Server starten (kein `file://` wegen ES-Modulen und Sound-`fetch`):

```bash
npx --yes serve demos -p 5173
# http://localhost:5173/
# http://localhost:5173/glittery/
# http://localhost:5173/flyex/
```

**FlyEx:** erster Klick aktiviert Audio, dann erscheint die Fliege.
