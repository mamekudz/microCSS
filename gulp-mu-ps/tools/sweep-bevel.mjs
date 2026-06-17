// Sweeps pillow bevel shadeScale against fx/bevelInner reference.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { PsDocument } from "../src/psd/PsDocument.mjs";
import { SaveRasterAsImage } from "../src/io/SaveImage.mjs";
import { CompareImages } from "./compare-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const effectsPath = join(here, "../src/render/Effects.mjs");
const base = readFileSync(effectsPath, "utf8");
const ref = join(here, "../examples/reference/out/fx/bevelInner.png");
const psd = join(here, "../examples/drafts/mups-reference.psd");

async function _RenderWithScale(_scale) {
	const code = base.replace(
		/const shadeScale = _PillowStyle\(_effect\.style\) \? [0-9.]+ : 4;/,
		`const shadeScale = _PillowStyle(_effect.style) ? ${_scale} : 4;`
	);
	writeFileSync(effectsPath, code);
	await import(`../src/render/Effects.mjs?s=${_scale}&t=${Date.now()}`);

	const doc = PsDocument.Load(psd);
	const state = doc.FindByPath(["layouts", "fx", "bevelInner", "normal"]);
	const ph = doc.FindByPath(["layouts", "fx", "bevelInner", "normal", "icon"]);
	const glyph = doc.FindByPath(["icons", "glyph_disc"]);
	glyph.effects = ph.effects;
	doc.SetAllHidden(true);
	const parents = new Map();
	doc.Walk((_n, _p) => parents.set(_n, _p));
	const visible = [];
	const collect = (_n) => {
		if (_n === ph) return;
		if (_n.children) { for (const c of _n.children) collect(c); return; }
		visible.push(_n);
	};
	collect(state);
	visible.push(glyph);
	for (const node of visible) {
		let c = node;
		while (c) { c.hidden = false; c = parents.get(c) ?? null; }
	}
	const out = join(here, "../test/.tmp-sweep.png");
	const { RenderDocument: Render } = await import(`../src/render/Compositor.mjs?s=${_scale}&t=${Date.now()}`);
	await SaveRasterAsImage(Render(doc), out);
	return (await CompareImages(ref, out)).mae;
}

let best = { scale: 2.75, mae: Infinity };
for (const scale of [2, 2.5, 2.75, 3, 3.5, 4, 5, 6, 8, 10]) {
	const mae = await _RenderWithScale(scale);
	console.log("shadeScale", scale, "MAE", mae.toFixed(2));
	if (mae < best.mae) best = { scale, mae };
}

writeFileSync(effectsPath, base.replace(
	/const shadeScale = _PillowStyle\(_effect\.style\) \? [0-9.]+ : 4;/,
	`const shadeScale = _PillowStyle(_effect.style) ? ${best.scale} : 4;`
));
console.log("BEST", best);
