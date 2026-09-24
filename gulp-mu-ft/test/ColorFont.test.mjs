import { expect } from "chai";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	FontGenerator,
	InspectFont,
	DetectColorFont,
	ConvertFontFormats,
	BuildWebfontCss,
	COLOR_TABLE_TAGS
} from "../src/index.mjs";
import { AttachColorTables } from "./helpers/AttachColorTables.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(here, "fixtures", "svg");
const FONT_NAME = "TestSymbol";

function _TempDir() {
	return fs.mkdtempSync(path.join(os.tmpdir(), "mu-ft-color-"));
}

async function _BuildMonoTtf() {
	const outputDir = _TempDir();
	await FontGenerator.Create({
		fontName: FONT_NAME,
		src: SRC_DIR,
		outputDir,
		formats: ["ttf"],
		css: false,
		json: false,
		html: false,
		log: false
	});
	const ttf = fs.readFileSync(path.join(outputDir, `${FONT_NAME}.ttf`));
	fs.rmSync(outputDir, { recursive: true, force: true });
	return ttf;
}

describe("InspectFont / DetectColorFont", () => {
	it("does not treat a monochrome icon TTF as a color font", async () => {
		const ttf = await _BuildMonoTtf();
		const info = InspectFont(ttf);
		expect(info.wrapper).to.equal("sfnt");
		expect(info.isColorFont).to.equal(false);
		expect(info.colorTables).to.deep.equal([]);
		expect(DetectColorFont(ttf)).to.equal(false);
	});

	it("detects COLRv0 + CPAL and reports the palette count", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), { colrVersion: 0, paletteCount: 2 });
		const info = InspectFont(color);
		expect(info.isColorFont).to.equal(true);
		expect(info.colorTables).to.include("COLR");
		expect(info.colorTables).to.include("CPAL");
		expect(info.colrVersion).to.equal(0);
		expect(info.colorFontFormats).to.include("COLRv0");
		expect(info.paletteCount).to.equal(2);
	});

	it("detects COLRv1", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), { colrVersion: 1 });
		const info = InspectFont(color);
		expect(info.colrVersion).to.equal(1);
		expect(info.colorFontFormats).to.include("COLRv1");
	});

	it("detects SVG-in-OpenType, CBDT/CBLC and sbix", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), {
			extraTables: ["SVG ", "CBDT", "CBLC", "sbix"]
		});
		const info = InspectFont(color);
		expect(info.colorTables).to.include.members(["SVG ", "CBDT", "CBLC", "sbix"]);
		expect(info.colorFontFormats).to.include.members(["SVG", "CBDT", "sbix"]);
		expect(COLOR_TABLE_TAGS).to.include("COLR");
	});
});

describe("ConvertFontFormats color preservation", () => {
	it("keeps COLR/CPAL when converting TTF to WOFF and WOFF2", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), { colrVersion: 1 });
		const { buffers, inspection, warnings, skippedFormats } = ConvertFontFormats(color, {
			formats: ["ttf", "woff", "woff2"]
		});
		expect(inspection.isColorFont).to.equal(true);
		expect(skippedFormats).to.deep.equal([]);
		expect(warnings.filter((_w) => _w.includes("drop"))).to.have.lengthOf(0);

		expect(InspectFont(buffers.ttf).colorFontFormats).to.include("COLRv1");
		expect(InspectFont(buffers.woff).colorTables).to.include.members(["COLR", "CPAL"]);
		expect(InspectFont(buffers.woff).colrVersion).to.equal(1);
		expect(InspectFont(buffers.woff2).colorTables).to.include.members(["COLR", "CPAL"]);
		expect(InspectFont(buffers.woff2).isColorFont).to.equal(true);
	});

	it("skips EOT and SVG for color fonts instead of emitting a silent monochrome file", async () => {
		const color = AttachColorTables(await _BuildMonoTtf());
		const { buffers, warnings, skippedFormats } = ConvertFontFormats(color, {
			formats: ["eot", "svg", "woff2"]
		});
		expect(buffers.eot).to.equal(undefined);
		expect(buffers.svg).to.equal(undefined);
		expect(buffers.woff2).to.be.instanceOf(Buffer);
		expect(skippedFormats).to.include.members(["eot", "svg"]);
		expect(warnings.some((_w) => _w.includes("EOT"))).to.equal(true);
		expect(warnings.some((_w) => _w.includes("SVG"))).to.equal(true);
	});

	it("does not decode WOFF2 to TTF; it copies WOFF2 and warns instead of stripping color", async () => {
		const color = AttachColorTables(await _BuildMonoTtf());
		const { buffers } = ConvertFontFormats(color, { formats: ["woff2"] });
		const again = ConvertFontFormats(buffers.woff2, { formats: ["ttf", "woff", "woff2"] });
		expect(again.buffers.ttf).to.equal(undefined);
		expect(again.buffers.woff).to.equal(undefined);
		expect(again.buffers.woff2).to.be.instanceOf(Buffer);
		expect(InspectFont(again.buffers.woff2).isColorFont).to.equal(true);
		expect(again.warnings.some((_w) => _w.includes("WOFF2 input"))).to.equal(true);
	});

	it("round-trips a color WOFF back to TTF without losing COLR", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), { extraTables: ["sbix"] });
		const { buffers } = ConvertFontFormats(color, { formats: ["woff"] });
		const back = ConvertFontFormats(buffers.woff, { formats: ["ttf"] });
		expect(InspectFont(back.buffers.ttf).colorTables).to.include.members(["COLR", "CPAL", "sbix"]);
	});
});

describe("FontGenerator.Create from a color font file", () => {
	it("packages a color TTF as WOFF2 and writes standard @font-face CSS", async () => {
		const color = AttachColorTables(await _BuildMonoTtf(), { colrVersion: 0 });
		const inputDir = _TempDir();
		const outputDir = _TempDir();
		const inputFile = path.join(inputDir, "emoji.ttf");
		fs.writeFileSync(inputFile, color);

		const result = await FontGenerator.Create({
			fontName: "ChatEmoji",
			src: inputFile,
			outputDir,
			log: false
		});

		expect(result.sourceKind).to.equal("font");
		expect(result.skipped).to.equal(false);
		expect(result.glyphs).to.deep.equal([]);
		expect(result.colorFont.isColorFont).to.equal(true);
		expect(result.colorFont.colorFontFormats).to.include("COLRv0");
		expect(fs.existsSync(path.join(outputDir, "ChatEmoji.woff2"))).to.equal(true);
		expect(fs.existsSync(path.join(outputDir, "ChatEmoji.eot"))).to.equal(false);

		const css = fs.readFileSync(path.join(outputDir, "ChatEmoji.css"), "utf8");
		expect(css).to.include("@font-face");
		expect(css).to.include("font-family: 'ChatEmoji'");
		expect(css).to.include("font-display: swap");
		expect(css).to.include("Color font");
		expect(css).to.include("font-palette");
		expect(css).not.to.include(".icon-");

		const html = fs.readFileSync(path.join(outputDir, "ChatEmoji.html"), "utf8");
		expect(html).to.include("does not generate emoji animation");

		fs.rmSync(inputDir, { recursive: true, force: true });
		fs.rmSync(outputDir, { recursive: true, force: true });
	});

	it("leaves the SVG icon pipeline monochrome and unchanged", async () => {
		const outputDir = _TempDir();
		const result = await FontGenerator.Create({
			fontName: FONT_NAME,
			src: SRC_DIR,
			outputDir,
			log: false
		});
		expect(result.sourceKind).to.equal("svg");
		expect(result.glyphs).to.have.lengthOf(3);
		expect(result.colorFont.isColorFont).to.equal(false);
		expect(fs.existsSync(path.join(outputDir, `${FONT_NAME}.eot`))).to.equal(true);
		const css = fs.readFileSync(path.join(outputDir, `${FONT_NAME}.css`), "utf8");
		expect(css).to.include(".icon-general-control-edit:before");
		fs.rmSync(outputDir, { recursive: true, force: true });
	});
});

describe("BuildWebfontCss", () => {
	it("emits a standard @font-face without icon classes", () => {
		const css = BuildWebfontCss({
			fontName: "ChatEmoji",
			formats: ["woff2", "woff"],
			colorFont: { isColorFont: true, colorFontFormats: ["COLRv1"] }
		});
		expect(css).to.include("@font-face");
		expect(css).to.include("COLRv1");
		expect(css).not.to.include(":before");
	});
});
