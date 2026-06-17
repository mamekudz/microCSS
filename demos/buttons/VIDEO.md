# Buttons demo — video script (English)

**Audience:** developers and designers (not µCSS 1 migrators).  
**Length:** ~3–4 minutes.  
**Demo URL (after deploy):** https://mamekudz.github.io/microCSS/buttons/

---

## Shot list

| # | Time | Visual | Notes |
| :--- | :--- | :--- | :--- |
| 1 | 0:00–0:25 | Browser: `demos/buttons/` — hover icons, toggle **Aqua** / **Alu** | Hook: same HTML, two skins |
| 2 | 0:25–1:05 | Affinity (or PSD viewer): `buttons.psd` layer tree | Expand `layouts` → `aqua` / `alu` → state → `icon` placeholder |
| 3 | 1:05–1:25 | Split or cut: sample PNGs under `dist/imgs/aqua/` vs `alu/` | Same glyph names, different renders |
| 4 | 1:25–1:55 | Editor: `buttons.µcss.mjs` + snippet of `demo.µ.css` (`-µ: Sprite(...)`) | Manifest drives render + compile |
| 5 | 1:55–2:35 | Terminal: `npx gulp demos:build` (or `demos:build` only for buttons) | Show log; optional quick `dir dist/imgs` |
| 6 | 2:35–3:05 | Zoom `dist/imgs/sprites.png` (sidebar lightbox or image viewer) | One atlas, all themes + `@2x` |
| 7 | 3:05–3:30 | Scroll compiled `dist/demo.css` — `background-position`, `image-set()` | No hand-maintained coordinates |
| 8 | 3:30–3:45 | Browser again + end card | Links: npm `gulp-mu-css`, GitHub repo |

---

## Voiceover (full text)

**[0:00 — Browser, Aqua theme, hover buttons]**

This toolbar is not a React component library and not a Figma export. It was compiled from a single layered PSD — the same draft that shipped with µCSS 1 as a sample.

**[Toggle to Alu, hover again]**

Same five icons. Same HTML. Two completely different looks — because the draft file holds two layout groups, *aqua* and *alu*, each with normal and hover states.

**[Affinity — layer panel]**

In Affinity Photo — or any PSD editor — the structure is intentional. Under *layouts*, each theme is a group. Under each state, an *icon* placeholder carries the layer effects. The actual glyphs live in a separate *icons* group. µPS does not redraw your icons by hand: it copies the placeholder’s layer style onto each glyph, then renders PNGs.

**[Optional: quick flash of `but_login_normal.png` in two folders]**

That gives you forty PNGs for this demo — five glyphs, two states, two themes, plus retina — from one source file.

**[Manifest on screen]**

The skin manifest is a small JavaScript module. Two lines call *ButtonAndIconCreator* — one per layout — writing into `imgs/aqua` and `imgs/alu`. No Photoshop. No subscription plugin. Node and µPS.

**[CSS source — `demo.µ.css`]**

In CSS you reference those images with the Sprite directive. One rule per button and state. You stay in normal CSS syntax; the compiler registers every path.

**[Terminal — build]**

One build step renders the PSD, packs every referenced image into a sprite atlas — including the `@2x` set — and rewrites the rules to use `background-position` and unprefixed `image-set()`.

**[Atlas zoom]**

Everything lands here: one PNG for 1x, one for 2x. The browser picks the right density. You do not maintain this grid by hand.

**[Compiled CSS scroll]**

If you change the PSD — tweak a bevel, add a glyph — rebuild. Positions in the atlas update automatically.

**[Browser — end]**

µCSS 2: design in a layered draft, ship as CSS and a sprite atlas. Built on Node, documented on npm as *gulp-mu-css*. Link in the description.

---

## Recording tips

- **Resolution:** 1920×1080, 100% browser zoom, no DevTools unless showing CSS on purpose.
- **Affinity:** large layer panel font; collapse unrelated groups before recording.
- **Terminal:** increase font size; run from repo root: `npx gulp demos:build`.
- **Audio:** FlyEx/Glittery demos are separate videos — do not mix sound atlas into this one.
- **Legacy tie-in (one line max):** “Same `buttons.psd` as the old µCSS 1 sample” — no migration story.

---

## Commands (copy-paste)

```bash
npx gulp demos:build
npx --yes serve demos -p 5173
# http://localhost:5173/buttons/
```
