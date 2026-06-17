// Test fixture: reference implementation of legacy µCSS macro helpers (M4).
// These are the new-style ports of the legacy µ.$.* functions defined in
// µ.std.css. They are demo/test fixtures (not part of the public microCSS API)
// and live here only for test/Macros.test.mjs and the demos. They demonstrate
// the helper conventions of microCSS:
//
//   - Helpers must be declared with "function" (not arrow functions): the
//     compiler binds "this" to the evaluation scope, so this.AddProperty(...),
//     this.InsertRule(...), this.rule, this.document and this.$ (manifest
//     vars) are available - the replacement for the legacy µ globals.
//   - Sprite afterWork hooks keep that binding even when passed as values,
//     e.g.  -µ: Sprite("imgs/.../flyex.png", { afterWork: FlyEx });
//   - Legacy RememberBlocks are replaced by path addressing:
//     this.document.FindRule("@keyframes glittery", "from").
//
// Wire them up in the skin manifest:  helpers: { Borders, TableBackgrounds,
// GlitterySprite, FlyEx, FlyExUtils }.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Lighten, Alpha } from "../../src/index.mjs";

// Reads the SequenceStrip map JSON ("<strip>.json" next to the strip image).
// The map dimensions are measured on the @2x master, hence the /2 in all
// consumers below.
function _SpriteMap(_ctx) {
	const mapFile = _ctx.url.replace(/\.[a-z0-9]+$/i, ".json");
	return JSON.parse(readFileSync(join(_ctx.baseDir, mapFile), "utf8"));
}

// Legacy µ.$.Borders: four solid borders derived from one base color.
export function Borders(_baseColor, _pixelWidth, _topLighten, _rightLighten, _bottomLighten, _leftLighten) {
	this.AddProperty("border-top", `${_pixelWidth}px solid ${Lighten(_baseColor, _topLighten)}`);
	this.AddProperty("border-right", `${_pixelWidth}px solid ${Lighten(_baseColor, _rightLighten)}`);
	this.AddProperty("border-bottom", `${_pixelWidth}px solid ${Lighten(_baseColor, _bottomLighten)}`);
	this.AddProperty("border-left", `${_pixelWidth}px solid ${Lighten(_baseColor, _leftLighten)}`);
}

// Legacy µ.$.TableBackgrounds: zebra striping + hover/selection backgrounds
// for one table row variant. Ported faithfully, including two legacy quirks
// that are part of the shipped std.css (kept for M5 output equivalence):
// the duplicate :nth-child(even) rule and the ">tr:" (instead of ">tr.")
// selector typo.
export function TableBackgrounds(_variantClass, _baseClass, _baseColor, _columnHover) {
	const selectColor = Alpha(this.$.selectBaseBrgdColor, 0.3);
	const selectHoverColor = Alpha(this.$.selectBaseBrgdColor, 0.1);
	const insert = (_selector, _color) => this.InsertRule(_selector).AddProperty("background-color", _color);

	insert(`${_baseClass}>tr.${_variantClass}:nth-child(even)`, Alpha(_baseColor, 0.3));
	insert(`${_baseClass}>tr.${_variantClass}.selected:nth-child(even)`, selectColor);
	insert(`${_baseClass}>tr.${_variantClass}:nth-child(even):hover`, selectColor);
	insert(`${_baseClass}>tr.${_variantClass}:nth-child(odd)`, Alpha(_baseColor, 0.2));
	insert(`${_baseClass}>tr.${_variantClass}.selected:nth-child(odd)`, selectColor);
	insert(`${_baseClass}>tr.${_variantClass}:nth-child(odd):hover`, selectColor);
	insert(`${_baseClass}>tr.${_variantClass}:nth-child(even)`, Alpha(_baseColor, 0.3));
	insert(`${_baseClass}>tr:${_variantClass}>td:nth-child(even)`, Alpha(_baseColor, 0.1));
	if (_columnHover) {
		insert(`${_baseClass}>tr.${_variantClass}>td:nth-child(odd):hover`, selectHoverColor);
		insert(`${_baseClass}>tr.${_variantClass}.selected>td:nth-child(odd):hover`, selectHoverColor);
	}
	insert(`${_baseClass}>tr.${_variantClass}>td:nth-child(odd)`, Alpha(_baseColor, 0.1));
	if (_columnHover) {
		insert(`${_baseClass}>tr.${_variantClass}>td:nth-child(even):hover`, selectHoverColor);
		insert(`${_baseClass}>tr.${_variantClass}.selected>td:nth-child(even):hover`, selectHoverColor);
	}
	insert(`${_baseClass}>tr.${_variantClass}>td:nth-child(even)`, Alpha(_baseColor, 0.1));
}

// Legacy µ.$.GlitterySpriteAfterWorkDivBlock: sizes the glitter div to one
// animation cell and patches the @keyframes glittery from/to positions so the
// steps() animation runs across the strip inside the atlas.
export function GlitterySprite(_ctx) {
	const map = _SpriteMap(_ctx);
	const frameCount = map.sprites.length;
	const rule = _ctx.rule;
	rule.AddProperty("margin", `-${map.info.offY / 2}px 0px 0px -${map.info.offX / 2}px`);
	rule.AddProperty("animation-timing-function", `steps(${frameCount})`);
	rule.RemoveProperty("width");
	rule.RemoveProperty("height");
	rule.AddProperty("width", `${map.info.maxWidth / 2}px`);
	rule.AddProperty("height", `${map.info.maxHeight / 2}px`);
	_ctx.document.FindRule("@keyframes glittery", "from")
		.ChangeProperty("background-position-x", `-${_ctx.sprite.x}px`);
	_ctx.document.FindRule("@keyframes glittery", "to")
		.ChangeProperty("background-position-x", `-${_ctx.sprite.x + (map.info.maxWidth / 2) * frameCount}px`);
}

// Legacy µ.$.FlyEx: generates the rule matrix for the fly easter egg -
// div.fly.n<frame>.d<direction> plus the dead/dirt states. Frames 0-9 are the
// horizontal poses, 10-19 the diagonal ones, 20 dead, 21/22 dirt.
export function FlyEx(_ctx) {
	const map = _SpriteMap(_ctx);
	const rule = _ctx.rule;
	const doc = _ctx.document;
	const cell = map.info.maxWidth / 2;
	const ox = map.info.offX / 2;
	const oy = map.info.offY / 2;

	rule.AddProperty("z-index", this.$.FlyGoingZIndex);
	rule.AddProperty("position", "fixed");
	rule.ChangeProperty("width", `${cell}px`);
	rule.ChangeProperty("height", `${map.info.maxHeight / 2}px`);

	for (let d = 0; d < 8; d++) {
		for (let s = 0; s < 10; s++) {
			const r = doc.AddRule(`div.fly.n${s}.d${d}`);
			r.AddProperty("pointer-events", "none");
			// Even directions use the straight poses (frames 0-9), odd ones
			// the diagonal poses (frames 10-19), both rotated in 90° steps.
			if (d > 1) {
				r.AddProperty("transform", `rotate(${Math.floor(d / 2) * 90}deg)`);
				r.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
				const frame = (d % 2) === 0 ? s : s + 10;
				r.AddProperty("background-position-x", `${-(_ctx.sprite.x + frame * cell)}px`);
			} else {
				r.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
				const frame = d === 0 ? s : s + 10;
				r.AddProperty("background-position-x", `${-(_ctx.sprite.x + frame * cell)}px`);
			}
			if (s > 0 && s < 4) r.AddProperty("z-index", this.$.FlyFlyingZIndex);
		}
	}

	const dead = doc.AddRule("div.fly.dead");
	dead.AddProperty("z-index", this.$.FlyDeadZIndex);
	dead.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
	dead.AddProperty("background-position-x", `${-(_ctx.sprite.x + 20 * cell)}px`);

	for (const [name, frame] of [["dirt1", 21], ["dirt2", 22]]) {
		const dirt = doc.AddRule(`div.fly.${name}`);
		dirt.AddProperty("z-index", this.$.FlyDirtZIndex);
		dirt.AddProperty("opacity", "1");
		dirt.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
		dirt.AddProperty("background-position-x", `${-(_ctx.sprite.x + frame * cell)}px`);
		doc.AddRule(`div.fly.${name}.run`).AddProperty("animation", "flyDirt 30s linear");
	}
}

// Legacy µ.$.FlyExUtils: fly swatter sprite + clap animation keyframes.
// Frame 0 = raised, 1 = clap end pose, 2 = down. The legacy RememberBlocks
// flySwatterClapStart/Down map to the from/50% keyframes.
export function FlyExUtils(_ctx) {
	const map = _SpriteMap(_ctx);
	const rule = _ctx.rule;
	const doc = _ctx.document;
	const cell = map.info.maxWidth / 2;
	const ox = map.info.offX / 2;
	const oy = map.info.offY / 2;

	rule.AddProperty("z-index", this.$.FlySwatterZIndex);
	rule.AddProperty("pointer-events", "none");
	rule.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
	rule.AddProperty("position", "fixed");
	rule.ChangeProperty("width", `${cell}px`);
	rule.ChangeProperty("height", `${map.info.maxHeight / 2}px`);
	rule.ChangeProperty("background-position-x", `${-_ctx.sprite.x}px`);

	const clap = doc.AddRule("div.flySwatter.clap");
	clap.AddProperty("pointer-events", "none");
	clap.AddProperty("animation", "flySwatterClap 0.5s linear");
	clap.AddProperty("animation-timing-function", "steps(1)");

	const clapEnd = doc.AddRule("div.flySwatter.clapend");
	clapEnd.AddProperty("pointer-events", "none");
	clapEnd.AddProperty("background-position-x", `${-(_ctx.sprite.x + 1 * cell)}px`);

	const start = doc.FindRule("@keyframes flySwatterClap", "from");
	start.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
	start.ChangeProperty("width", `${cell}px`);
	start.ChangeProperty("height", `${map.info.maxHeight / 2}px`);
	start.AddProperty("background-position-x", `${-_ctx.sprite.x}px`);

	const down = doc.FindRule("@keyframes flySwatterClap", "50%");
	down.AddProperty("margin", `-${oy}px 0px 0px -${ox}px`);
	down.ChangeProperty("width", `${cell}px`);
	down.ChangeProperty("height", `${map.info.maxHeight / 2}px`);
	down.AddProperty("background-position-x", `${-(_ctx.sprite.x + 2 * cell)}px`);
}
