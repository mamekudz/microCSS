// Renders the cursors draft PSD (icon glyphs partly organized as layer
// groups) and compares the result against the reference images produced by
// the legacy Adobe-based µCSS toolchain.

import { rmSync, existsSync, readdirSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { ButtonAndIconCreator } from "../src/index.mjs";
import { CompareImages } from "../tools/compare-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples");
const draftPsd = join(examplesDir, "drafts/cursors.psd");
const referenceDir = join(examplesDir, "imgs/cursors");
const tmpDir = join(here, ".tmp-cursors");

// Glyphs that are groups of multiple layers in the draft document.
const GROUP_GLYPHS = ["zoomplus", "zoomminus", "pointerplus", "pointerminus", "magicwandplus", "magicwandminus"];

// Maximum tolerated mean absolute error (0..255) against the legacy renders.
// The 1x variants differ more because the legacy toolchain downsampled with
// a sharpening bicubic kernel.
const MAE_TOLERANCE_2X = 5;
const MAE_TOLERANCE_1X = 20;

describe("ButtonAndIconCreator (cursors)", function () {
	this.timeout(240000);

	let generated;

	before(async function () {
		if (!existsSync(draftPsd) || !existsSync(referenceDir)) this.skip();
		rmSync(tmpDir, { recursive: true, force: true });
		generated = await ButtonAndIconCreator.Create(draftPsd, {
			layout: "std",
			outputDir: tmpDir,
			retina: true
		});
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("generates a 1x and @2x image for every reference cursor", function () {
		const generatedNames = new Set(generated.map((f) => basename(f)));
		for (const reference of readdirSync(referenceDir)) {
			expect(generatedNames.has(reference), `missing ${reference}`).to.equal(true);
		}
	});

	it("renders multi-layer glyph groups", function () {
		const generatedNames = new Set(generated.map((f) => basename(f)));
		for (const name of GROUP_GLYPHS) {
			expect(generatedNames.has(`${name}.png`)).to.equal(true);
			expect(generatedNames.has(`${name}@2x.png`)).to.equal(true);
		}
	});

	it("matches the legacy reference images within tolerance", async function () {
		for (const file of generated) {
			const fileName = basename(file);
			const reference = join(referenceDir, fileName);
			if (!existsSync(reference)) continue;
			const tolerance = fileName.includes("@2x") ? MAE_TOLERANCE_2X : MAE_TOLERANCE_1X;
			const result = await CompareImages(file, reference);
			expect(result.sizeMismatch, `${fileName}: size mismatch`).to.equal(false);
			expect(result.mae, `${fileName}: MAE ${result.mae?.toFixed(2)} exceeds tolerance`).to.be.below(tolerance);
		}
	});
});
