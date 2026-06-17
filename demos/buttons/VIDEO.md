# Buttons demo — video script (English)

**Audience:** developers and designers (not µCSS 1 migrators).  
**Length:** ~4 minutes.  
**Demo URL (after deploy):** https://mamekudz.github.io/microCSS/buttons/

---

## Shot list

| # | Time | Visual | Notes |
| :--- | :--- | :--- | :--- |
| 1 | 0:00–0:25 | Browser: `demos/buttons/` — hover icons, toggle **Aqua** / **Alu** | Hook: same HTML, two skins |
| 2 | 0:25–1:05 | Affinity (or PSD viewer): `buttons.psd` layer tree | Expand `layouts` → `aqua` / `alu` → state → `icon` placeholder |
| 3 | 1:05–1:25 | Split or cut: sample PNGs under `dist/imgs/aqua/` vs `alu/` | Same glyph names, different renders |
| 4 | 1:25–1:55 | Editor: `buttons.µcss.mjs` + snippet of `demo.µ.css` (`-µ: Sprite(...)`) | Manifest drives render + compile |
| 5 | 1:55–2:25 | Terminal: `npx gulp demos:build` | Show log ending with `buttons` / `dist/demo.css` |
| 6 | 2:25–2:50 | Zoom `dist/imgs/sprites.png` | One atlas, all themes + `@2x` |
| 7 | **2:50–3:35** | **Split editor: source ← → output** (see below) | **Mandatory beat after build** |
| 8 | 3:35–3:55 | Browser again + end card | Links: npm `gulp-mu-css`, GitHub repo |

---

## Shot 7 — source vs compiled CSS (split screen)

**Layout:** one frame, **50 / 50** (or 45 / 55).

| Left | Right |
| :--- | :--- |
| **`demos/buttons/demo.µ.css`** (source) | **`demos/buttons/dist/demo.css`** (build output) |
| Label: **Source** or **`.µ.css`** | Label: **Compiled** or **`demo.css`** |

**Arrow:** draw or overlay a horizontal arrow **left → right** between the panes (→ “compile”). In VS Code: open both files → **View → Editor Layout → Two Columns** → drag tabs side by side; optional on-screen arrow in post.

**Scroll both panes in sync** to the same rule pair — use **login button, aqua, normal + hover**:

**Left (source) — highlight:**

```css
.theme-aqua div.loginbutton {
	-µ: Sprite("imgs/aqua/but_login_normal.png");
}

.theme-aqua div.loginbutton:hover {
	-µ: Sprite("imgs/aqua/but_login_hover.png");
}
```

**Right (output) — highlight matching block:**

```css
.theme-aqua div.loginbutton {
	background-image: url(imgs/sprites.png);
	background-image: image-set(url(imgs/sprites.png)1x, url(imgs/sprites@2x.png)2x);
	background-repeat: no-repeat;
	background-position: 0px 0px;
	width: 55px;
	height: 55px;
}

.theme-aqua div.loginbutton:hover {
	…
	background-position: -55px 0px;
	…
}
```

**Point on screen (cursor or callout):**

1. Left: path to a **single PNG** + `-µ: Sprite(...)` — **gone** on the right.  
2. Right: **one atlas URL** + `image-set()` for retina.  
3. Right: **`background-position`** and **`width` / `height`** — computed by the build, not typed by hand.

Optional second beat: show that **layout CSS** (`.demo-toolbar { … }`) is **identical** on both sides — only Sprite rules transform.

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

One build step renders the PSD, packs every referenced image into a sprite atlas — including the `@2x` set — and writes the compiled stylesheet next to it.

**[Atlas zoom]**

Everything lands here: one PNG for 1x, one for 2x. The browser picks the right density. You do not maintain this grid by hand.

**[Split screen — source left, compiled right, arrow →]**

Here is what the build actually changes. On the left, the source: a Sprite directive and a path to one PNG. On the right, the compiled CSS: standard properties only — a single atlas URL, `image-set` for retina, and the background position and size filled in for you.

You never author those coordinates. Change the PSD or add a Sprite reference, run the build again, and the output file updates. Your layout rules stay on the left; the sprite wiring moves to the right.

**[Browser — end]**

µCSS 2: design in a layered draft, ship as CSS and a sprite atlas. Built on Node, documented on npm as *gulp-mu-css*. Link in the description.

---

## Voiceover — split-screen only (isolated clip)

Use this if you record the CSS comparison as a separate take:

> On the left: what you write — `-µ: Sprite` and a file path. On the right: what the browser gets — one sprite atlas, retina via `image-set`, plus position and size. The directive disappears; the atlas math does not land in your source file. Rebuild, and the right side refreshes. That is the compile step in one glance.

---

## Recording tips

- **Resolution:** 1920×1080, 100% browser zoom, no DevTools unless showing CSS on purpose.
- **Affinity:** large layer panel font; collapse unrelated groups before recording.
- **Terminal:** increase font size; run from repo root: `npx gulp demos:build`.
- **Split CSS (shot 7):** VS Code — `demo.µ.css` | `dist/demo.css`, same scroll position; labels “Source” / “Compiled” in post if needed. Sync-scroll to `.theme-aqua div.loginbutton`.
- **Arrow:** editor extension, OBS overlay, or simple post-production arrow **→** centered between panes.
- **Audio:** FlyEx/Glittery demos are separate videos — do not mix sound atlas into this one.
- **Legacy tie-in (one line max):** “Same `buttons.psd` as the old µCSS 1 sample” — no migration story.

---

## Commands (copy-paste)

```bash
npx gulp demos:build
npx --yes serve demos -p 5173
# http://localhost:5173/buttons/
```

**Files for split-screen:**

- Source: `demos/buttons/demo.µ.css`
- Output: `demos/buttons/dist/demo.css`
