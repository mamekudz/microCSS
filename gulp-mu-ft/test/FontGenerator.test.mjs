import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { FontGenerator, ScanGlyphs, BuildFontCss, BuildIcoMoonJson } from "../src/index.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(here, "fixtures", "svg");
const FONT_NAME = "TestSymbol";

function _MakeOutputDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "mu-ft-"));
}

describe("ScanGlyphs", () => {
	it("derives name/code from the file name, groups by directory and skips invalid files", () => {
		const { glyphs, warnings } = ScanGlyphs(SRC_DIR);
		expect(glyphs).to.have.lengthOf(3);
		expect(glyphs.map((_g) => _g.name)).to.deep.equal([
			"general-control-edit",
			"general-control-delete",
			"shape-circle"
		]);
		expect(glyphs[0].code).to.equal(0xe900);
		expect(glyphs[0].groupId).to.equal("general");
		expect(glyphs[2].groupId).to.equal("shapes");
		expect(warnings.some((_w) => _w.includes("draft-without-codepoint"))).to.equal(true);
	});
});

describe("BuildFontCss", () => {
	it("emits a @font-face block and one class per glyph", () => {
		const { glyphs } = ScanGlyphs(SRC_DIR);
		const css = BuildFontCss(glyphs, { fontName: FONT_NAME, classPrefix: "icon" });
		expect(css).to.include("@font-face");
		expect(css).to.include(`font-family: '${FONT_NAME}'`);
		expect(css).to.include(".icon-general-control-edit:before");
		expect(css).to.include('content: "\\e900"');
	});
});

describe("BuildIcoMoonJson", () => {
	it("produces an IcoMoon selection object", () => {
		const { glyphs } = ScanGlyphs(SRC_DIR);
		const json = BuildIcoMoonJson(glyphs, { fontName: FONT_NAME });
		expect(json.IcoMoonType).to.equal("selection");
		expect(json.icons).to.have.lengthOf(3);
		expect(json.icons[0].properties.code).to.equal(0xe900);
	});
});

describe("FontGenerator.Create", () => {
	it("builds all font formats plus css, json and html", async () => {
		const outputDir = _MakeOutputDir();
		const result = await FontGenerator.Create({
			fontName: FONT_NAME,
			src: SRC_DIR,
			outputDir,
			log: false,
			groups: {
				general: { label: "General", description: "General controls." },
				shapes: { label: "Shapes" }
			},
			glyphs: {
				"general-control-edit": { description: "Start editing an item." }
			}
		});

		expect(result.skipped).to.equal(false);
		expect(result.glyphs).to.have.lengthOf(3);

		for (const ext of ["svg", "ttf", "eot", "woff", "woff2"]) {
			const file = path.join(outputDir, `${FONT_NAME}.${ext}`);
			expect(fs.existsSync(file), `${ext} font exists`).to.equal(true);
			expect(fs.statSync(file).size, `${ext} font not empty`).to.be.greaterThan(0);
		}

		const html = fs.readFileSync(path.join(outputDir, `${FONT_NAME}.html`), "utf8");
		expect(html).to.include("General");
		expect(html).to.include("Start editing an item.");
		expect(html).to.include("icon-general-control-edit");

		const json = JSON.parse(fs.readFileSync(path.join(outputDir, `${FONT_NAME}.json`), "utf8"));
		expect(json.icons).to.have.lengthOf(3);

		fs.rmSync(outputDir, { recursive: true, force: true });
	});

	it("skips the rebuild when nothing changed and rebuilds with force", async () => {
		const outputDir = _MakeOutputDir();
		const base = { fontName: FONT_NAME, src: SRC_DIR, outputDir, log: false };

		const first = await FontGenerator.Create(base);
		expect(first.skipped).to.equal(false);

		const second = await FontGenerator.Create(base);
		expect(second.skipped).to.equal(true);

		const forced = await FontGenerator.Create({ ...base, force: true });
		expect(forced.skipped).to.equal(false);

		fs.rmSync(outputDir, { recursive: true, force: true });
	});
});
