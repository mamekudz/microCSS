// Renders mups-reference.psd and compares against Adobe reference PNGs
// (examples/reference/out/). Tune Effects.mjs / BlendModes.mjs until MAE drops.

import { existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { ReferenceRenderer } from "../src/creators/ReferenceRenderer.mjs";
import { CompareImages } from "../tools/compare-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const psdFile = join(here, "../examples/drafts/mups-reference.psd");
const referenceRoot = join(here, "../examples/reference/out");
const renderedRoot = join(here, ".tmp-mups-reference");

// Mean absolute error tolerances (0..255, alpha-weighted). Baseline measured 2026-06 against
// examples/reference/out/ Adobe PNGs; tighten when compositing chart refs are re-exported.
const MAE_TOLERANCE = {
	"bc/aqua": 31,
	"bc/alu": 15,
	"fx": 24,
	"flat/fx": 42,
	"stacks": 24,
	"blend": 26,
	"topsets": 15,
	"links": 50,
	"text": 20,
	"compositing/chart": 15,
	"compositing/fillOpacity": 18,
	"compositing/layerOpacity": 12,
	"compositing/layerAlpha": 15
};

async function _CompareSection(_relDir, _tolerance) {
	const refDir = join(referenceRoot, _relDir);
	const outDir = join(renderedRoot, _relDir);
	if (!existsSync(refDir)) return;
	const names = readdirSync(refDir).filter((f) => f.endsWith(".png")).sort();
	expect(names.length, `${_relDir}: no reference PNGs`).to.be.above(0);
	for (const name of names) {
		const refFile = join(refDir, name);
		const outFile = join(outDir, name);
		expect(existsSync(outFile), `${_relDir}/${name}: µPS output missing (run render-reference.mjs)`).to.equal(true);
		const result = await CompareImages(refFile, outFile);
		expect(result.sizeMismatch, `${_relDir}/${name}: size ${result.a} vs ${result.b}`).to.equal(false);
		expect(
			result.mae,
			`${_relDir}/${name}: MAE ${result.mae?.toFixed(2)} > ${_tolerance}`
		).to.be.below(_tolerance);
	}
}

describe("ReferenceRenderer (mups-reference.psd vs Adobe PNGs)", function () {
	this.timeout(300000);

	before(function () {
		if (!existsSync(psdFile) || !existsSync(referenceRoot)) this.skip();
	});

	before(async function () {
		rmSync(renderedRoot, { recursive: true, force: true });
		await ReferenceRenderer.RenderAll(psdFile, renderedRoot, { retina: false });
	});

	after(function () {
		rmSync(renderedRoot, { recursive: true, force: true });
	});

	for (const [section, tolerance] of Object.entries(MAE_TOLERANCE)) {
		it(`matches reference ${section} within MAE ${tolerance}`, async function () {
			if (!existsSync(join(referenceRoot, section))) this.skip();
			await _CompareSection(section, tolerance);
		});
	}
});
