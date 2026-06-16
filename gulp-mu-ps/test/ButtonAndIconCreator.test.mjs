// Renders the example draft PSD and compares the result against the
// reference images produced by the legacy Adobe-based µCSS toolchain.
// The renderer approximates layer effects, so a mean absolute error
// tolerance is used instead of bit-exact comparison.

import { rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { ButtonAndIconCreator } from "../src/index.mjs";
import { CompareImages } from "../tools/compare-images.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples");
const draftPsd = join(examplesDir, "drafts/buttons.psd");
const tmpDir = join(here, ".tmp");

const EXPECTED_NAMES = ["but_events_", "but_help_", "but_login_", "but_settings_", "but_world_"];
const STATES = ["normal", "hover"];

// Maximum tolerated mean absolute error (0..255) against the legacy reference renders.
const MAE_TOLERANCE = { alu: 12, aqua: 13 };

describe("ButtonAndIconCreator", function () {
	this.timeout(120000);

	before(function () {
		if (!existsSync(draftPsd)) this.skip();
		rmSync(tmpDir, { recursive: true, force: true });
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe(`format "webp"`, function () {
		it("generates lossless WebP files instead of PNG", async function () {
			const sharp = (await import("sharp")).default;
			const generated = await ButtonAndIconCreator.Create(draftPsd, {
				layout: "alu",
				outputDir: join(tmpDir, "webp"),
				retina: false,
				format: "webp"
			});
			expect(generated).to.have.length(EXPECTED_NAMES.length * STATES.length);
			for (const file of generated) {
				expect(file.endsWith(".webp")).to.equal(true);
				const meta = await sharp(file).metadata();
				expect(meta.format).to.equal("webp");
			}
		});
	});

	describe("CreateByTopLayerSets", function () {
		it("renders one image per top child group (1x and @2x)", async function () {
			const generated = await ButtonAndIconCreator.CreateByTopLayerSets(draftPsd, {
				layout: "layouts",
				outputDir: join(tmpDir, "tls"),
				retina: true
			});
			// "layouts" holds the "alu" and "aqua" child groups.
			expect(generated).to.have.length(2 * 2);
			for (const name of ["alu", "aqua"]) {
				expect(generated.some((f) => f.endsWith(`${name}.png`)), `${name}.png missing`).to.equal(true);
				expect(generated.some((f) => f.endsWith(`${name}@2x.png`)), `${name}@2x.png missing`).to.equal(true);
			}
			for (const file of generated) expect(existsSync(file)).to.equal(true);
		});

		it("honors the set name pattern", async function () {
			const generated = await ButtonAndIconCreator.CreateByTopLayerSets(draftPsd, {
				layout: "layouts",
				outputDir: join(tmpDir, "tls-filtered"),
				retina: false,
				setPattern: /^alu$/
			});
			expect(generated).to.have.length(1);
			expect(generated[0].endsWith("alu.png")).to.equal(true);
		});
	});

	for (const layout of ["alu", "aqua"]) {
		describe(`layout "${layout}"`, function () {
			let generated;

			before(async function () {
				generated = await ButtonAndIconCreator.Create(draftPsd, {
					layout,
					outputDir: join(tmpDir, layout),
					retina: true
				});
			});

			it("generates all icon/state combinations in 1x and @2x", function () {
				expect(generated).to.have.length(EXPECTED_NAMES.length * STATES.length * 2);
				for (const name of EXPECTED_NAMES) {
					for (const state of STATES) {
						expect(generated.some((f) => f.endsWith(`${name}${state}.png`))).to.equal(true);
						expect(generated.some((f) => f.endsWith(`${name}${state}@2x.png`))).to.equal(true);
					}
				}
			});

			it("matches the legacy reference images within tolerance", async function () {
				for (const file of generated) {
					const fileName = file.replace(/\\/g, "/").split("/").pop();
					const reference = join(examplesDir, "imgs", layout, fileName);
					const result = await CompareImages(file, reference);
					expect(result.sizeMismatch, `${fileName}: size mismatch`).to.equal(false);
					expect(result.mae, `${fileName}: MAE ${result.mae?.toFixed(2)} exceeds tolerance`).to.be.below(MAE_TOLERANCE[layout]);
				}
			});
		});
	}
});
