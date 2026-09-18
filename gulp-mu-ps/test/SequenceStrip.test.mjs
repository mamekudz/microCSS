// Tests for the sprite strip generation, compared against the reference
// outputs of the legacy SpriteTools.js functions (examples/specialimgs):
// "glittery", "smoke" and "sparks" are file sequences, "flyex" and
// "flyexutils" are DSD format images.

import { rmSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { SequenceStrip } from "../src/index.mjs";
import { CompareImages } from "../tools/compare-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const specialDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples/specialimgs");
const tmpDir = join(here, ".tmp-strips");

// The 1x strips tolerate small downscaling differences (the legacy canvas
// used bilinear smoothing, microPS uses Lanczos); @2x strips are plain
// pixel copies and only differ by the legacy premultiplied-alpha rounding.
const MAE_TOLERANCE_1X = 2;
const MAE_TOLERANCE_2X = 0.2;

async function _CheckAgainstReference(_name, _result, _referenceDir) {
	const referenceMap = JSON.parse(readFileSync(join(_referenceDir, `${_name}.json`), "utf8"));
	expect(_result.map, `${_name}: map data mismatch`).to.deep.equal(referenceMap);
	const result1x = await CompareImages(join(tmpDir, `${_name}.png`), join(_referenceDir, `${_name}.png`));
	expect(result1x.sizeMismatch, `${_name}.png: size mismatch`).to.equal(false);
	expect(result1x.mae, `${_name}.png: MAE ${result1x.mae?.toFixed(3)}`).to.be.below(MAE_TOLERANCE_1X);
	const result2x = await CompareImages(join(tmpDir, `${_name}@2x.png`), join(_referenceDir, `${_name}@2x.png`));
	expect(result2x.sizeMismatch, `${_name}@2x.png: size mismatch`).to.equal(false);
	expect(result2x.mae, `${_name}@2x.png: MAE ${result2x.mae?.toFixed(3)}`).to.be.below(MAE_TOLERANCE_2X);
}

describe("SequenceStrip", function () {
	this.timeout(120000);

	before(function () {
		if (!existsSync(specialDir)) this.skip();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	for (const name of ["glittery", "smoke", "sparks"]) {
		it(`renders the "${name}" file sequence like the legacy toolchain`, async function () {
			const sourceDir = join(specialDir, "source_images", name, "imgs");
			const images = readdirSync(sourceDir)
				.filter((f) => f.endsWith(".png"))
				.map((f) => join(sourceDir, f));
			const result = await SequenceStrip.Create({
				images,
				outputFile: join(tmpDir, `${name}.png`)
			});
			await _CheckAgainstReference(name, result, join(specialDir, "result_images", name));
		});
	}

	for (const name of ["flyex", "flyexutils"]) {
		it(`renders the "${name}" DSD format image like the legacy toolchain`, async function () {
			const result = await SequenceStrip.Create({
				dsdImage: join(specialDir, "source_images/flyex/imgs", `${name}.png`),
				outputFile: join(tmpDir, `${name}.png`)
			});
			await _CheckAgainstReference(name, result, join(specialDir, "result_images/flyex"));
		});
	}

	it("derives the series name from the legacy file naming", async function () {
		const sourceDir = join(specialDir, "source_images/sparks/imgs");
		const images = readdirSync(sourceDir).map((f) => join(sourceDir, f));
		const result = await SequenceStrip.Create({
			images,
			outputFile: join(tmpDir, "renamed.png"),
			writeMapFile: false
		});
		// "O_EFX_00_sparks.0000.png" => series "sparks", EFX layer infobit (32).
		expect(result.map.series).to.deep.equal({ sparks: 0 });
		expect(result.map.sprites[0][0]).to.equal(32);
	});
});

describe("SequenceStrip (synthetic frames)", function () {
	this.timeout(20000);

	const synthDir = join(here, ".tmp-strips-synth");

	before(async function () {
		rmSync(synthDir, { recursive: true, force: true });
		const { default: sharp } = await import("sharp");
		const red = { r: 255, g: 0, b: 0, alpha: 1 };
		const blue = { r: 0, g: 0, b: 255, alpha: 1 };
		const { mkdirSync: mkdir, writeFileSync: write } = await import("node:fs");
		mkdir(synthDir, { recursive: true });
		await sharp({ create: { width: 8, height: 8, channels: 4, background: red } }).png().toFile(join(synthDir, "frame.0000.png"));
		await sharp({ create: { width: 8, height: 8, channels: 4, background: blue } }).png().toFile(join(synthDir, "frame.0001.png"));
		write(join(synthDir, "readme.txt"), "not an image", "utf8");
	});

	after(function () {
		rmSync(synthDir, { recursive: true, force: true });
	});

	it("ignores non-image files next to the frame sequence", async function () {
		const images = readdirSync(synthDir).map((f) => join(synthDir, f));
		expect(images.some((f) => f.endsWith(".txt"))).to.equal(true);
		const result = await SequenceStrip.Create({
			images,
			outputFile: join(synthDir, "out.png"),
			retina: false,
			writeMapFile: false
		});
		expect(result.frameCount).to.equal(2);
		expect(existsSync(join(synthDir, "out.png"))).to.equal(true);
	});
});
