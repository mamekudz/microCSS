# µCSS Demos

Interactive demos for videos and GitHub Pages — classic **Oxyd**-style glittery sparkle and fly easter egg.

| Demo | Effect | µCSS / µAU features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Mouse move → random-offset sparkles | `sequenceStrip`, sprite atlas, **GlitterySprite** `afterWork` hook |
| [flyex/](flyex/) | Fly swarm, click to swat, **Space** = 19 more | **FlyEx** / **FlyExUtils** macros, DSD strips, **µAU sound atlas** (`fly1`, `swatter`, `crush`) |
| [buttons/](buttons/) | Theme toggle **aqua** / **alu**, hover states | **ButtonAndIconCreator**, legacy **`buttons.psd`**, `-µ: Sprite(...)`, combined atlas |

### FlyEx — Atari heritage

**FlyEx** is a modern remake of a classic **Atari ST fly-swatting gimmick** — the kind of tiny desktop accessory that magazine PD disks and “gimmick” cover disks used to ship (TSR utilities, ACC files, joke programs). The demo reuses **original hand-pixelated sprites** from that lineage, now rendered through µPS sequence strips and µCSS helper macros instead of GEM.

If you want to browse the original magazine context (listings, cover disks, PD collections):

- [Computer-Magazin-Archiv (stcarchiv.de)](https://www.stcarchiv.de/) — German ST magazines incl. *ATARImagazin*, *TOS*, *Atari Inside*
- [Atari Magazines on AtariMania](https://www.atarimania.com/mag/atari_magazine.html) — scanned PDF issues with listings and disk contents
- [AtariUpToDate](https://www.ataruptodate.de/) — PD / cover-disk software databases (search *Accessory*, *Desktop*, gimmick categories)
- [AtariMagazines.com](https://www.atarimagazines.com/) — Antic, ST Log and other US magazines + associated disk archives

Search tips on PD sites: *TSR*, *Accessory* / ACC, *Desktop*, or the German magazine disk series (e.g. *Atari Inside* diskette lists on AtariUpToDate).

## Build

Assets live under each demo's `dev/media/` (see `npx gulp demos:build`; raw frames are not shipped in the public repo).

```bash
npx gulp demos:build
```

Output lands in `demos/*/dist/` (CSS, sprites, sounds). The `dist/` folders are **tracked in git** so GitHub Pages can deploy even when CI rebuild fails; run `npx gulp demos:build` after changing a demo and commit the updated `dist/`.

## Live (GitHub Pages)

After enabling **Pages → Build and deployment → Source: GitHub Actions** (top of the Pages settings — not the Jekyll/Static HTML starter workflows), pushes to `master` rebuild and deploy automatically. Then open **Actions → Demo pages** to confirm the run succeeded.

| Page | URL |
| :--- | :--- |
| Index | https://mamekudz.github.io/microCSS/ |
| Glittery | https://mamekudz.github.io/microCSS/glittery/ |
| FlyEx | https://mamekudz.github.io/microCSS/flyex/ |
| Buttons | https://mamekudz.github.io/microCSS/buttons/ |

## View locally

ES modules + `fetch()` for the sound atlas require a static server (not `file://`):

```bash
npx --yes serve demos -p 5173
# http://localhost:5173/
# http://localhost:5173/glittery/
# http://localhost:5173/flyex/
# http://localhost:5173/buttons/
```

**FlyEx:** click play area for audio; **Space** releases 19 flies (Ctrl+F6 optional). Click a fly to swat.

## YouTube / marketing angles

- *One PSD, two themes, one atlas* (buttons.psd → aqua/alu → `sprites.png`)
- *One PNG folder → sparkle animation* (Glittery pipeline in ~30 s)
- *One DSD image → 80 CSS rules* (FlyEx macro, DevTools scroll)
- *Atari ST gimmick in the browser* (hand-pixelled sprites, 2026 build pipeline)
- *Sound atlas from the manifest* (four WAVs → one blob + JSON, fly buzz + swat)
- *µCSS 1 Photoshop vs µCSS 2 Node* (same assets, modern build)
- *No Adobe subscription* — build in Node; layered PSDs in free [Affinity](https://affinity.studio/download) (vs. paid Creative Cloud for the old stack)

## Asset provenance

- Glittery frames, FlyEx DSD sheets and fly sounds from the legacy Oxyd demo lineage.
- FlyEx sprites: original hand-pixelated graphics from the Atari fly-swatting gimmick tradition (see **FlyEx — Atari heritage** above).
- Helpers: `demos/shared/effect-helpers.mjs` → `gulp-mu-css/test/fixtures/reference-macros.mjs`.

---

# µCSS-Demos

Interaktive Demos für Videos und GitHub Pages — **Oxyd-**Glittery-Effekt und Fliegen-Osterei.

| Demo | Effekt | µCSS-/µAU-Features |
| :--- | :--- | :--- |
| [glittery/](glittery/) | Mausbewegung → Funkeln mit Zufallsoffset | `sequenceStrip`, Sprite-Atlas, **GlitterySprite**-Hook |
| [flyex/](flyex/) | Fliegenschwarm, Klick = Klatsch, **Leertaste** = 19 weitere | **FlyEx**-/ **FlyExUtils**-Makros, DSD-Strips, **µAU-Sound-Atlas** |
| [buttons/](buttons/) | Theme **aqua** / **alu**, Hover-States | **ButtonAndIconCreator**, Legacy-**`buttons.psd`**, `-µ: Sprite(...)`, gemeinsamer Atlas |

### FlyEx — Atari-Hintergrund

**FlyEx** ist ein moderner Nachbau eines klassischen **Atari-ST-Fliegen-Gimmicks** — kleine Desktop-Spielereien, die früher über PD-Disketten der Magazine (TSR-Utilities, ACC-Dateien, Scherzprogramme) verbreitet wurden. Die Demo nutzt **original handgepixelte Sprites** aus dieser Tradition, heute über µPS-Strips und µCSS-Makros statt über GEM.

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

Output in `demos/*/dist/` (CSS, Sprites, Sounds). Die `dist/`-Ordner liegen **im Git**, damit GitHub Pages auch deployen kann, wenn der CI-Neubau scheitert; nach Demo-Änderungen `npx gulp demos:build` und aktualisierte `dist/` committen.

## Live (GitHub Pages)

Nach **Pages → Build and deployment → Source: GitHub Actions** (oben auf der Pages-Seite — nicht die Jekyll-/Static-HTML-Starter) baut und deployt jeder Push auf `master` automatisch. Erfolg unter **Actions → Demo pages** prüfen.

| Seite | URL |
| :--- | :--- |
| Index | https://mamekudz.github.io/microCSS/ |
| Glittery | https://mamekudz.github.io/microCSS/glittery/ |
| FlyEx | https://mamekudz.github.io/microCSS/flyex/ |
| Buttons | https://mamekudz.github.io/microCSS/buttons/ |

## Ansehen

Statischen Server starten (kein `file://` wegen ES-Modulen und Sound-`fetch`):

```bash
npx --yes serve demos -p 5173
# http://localhost:5173/
# http://localhost:5173/glittery/
# http://localhost:5173/flyex/
# http://localhost:5173/buttons/
```

**FlyEx:** Klick in die Play-Area für Audio; **Leertaste** setzt 19 Fliegen frei (Strg+F6 optional). Auf Fliege klicken zum Klatsch.
