// End-to-end tests for the M3 build layer: manifest loading (DefineSkin),
// media steps, sprite atlas with position cache and incremental rebuilds
// (CONCEPT.md, D3 and D7).

import { mkdirSync, rmSync, existsSync, writeFileSync, statSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { BuildSkin } from "../src/index.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const projectDir = join(here, ".tmp-skin");
const srcDir = join(projectDir, "skins", "src");
const outDir = join(projectDir, "skins", "std");
const mediaDir = join(projectDir, "dev", "media", "final");
const manifestFile = join(srcDir, "std.µcss.mjs");
const indexUrl = pathToFileURL(join(here, "../src/index.mjs")).href;

async function _WritePng(_file, _width, _height, _color) {
	mkdirSync(dirname(_file), { recursive: true });
	await sharp({ create: { width: _width, height: _height, channels: 4, background: _color } })
		.png().toFile(_file);
}

// 8-bit/8 kHz mono PCM WAV (identical format avoids the engine's async resample
// path) used to exercise the microAU sounds bridge.
const SND_RATE = 8000;
function _WriteWav(_file, _samples) {
	mkdirSync(dirname(_file), { recursive: true });
	const dataLen = _samples.length;
	const buffer = Buffer.alloc(44 + dataLen);
	buffer.write("RIFF", 0, "ascii");
	buffer.writeUInt32LE(36 + dataLen, 4);
	buffer.write("WAVE", 8, "ascii");
	buffer.write("fmt ", 12, "ascii");
	buffer.writeUInt32LE(16, 16);
	buffer.writeUInt16LE(1, 20);
	buffer.writeUInt16LE(1, 22);
	buffer.writeUInt32LE(SND_RATE, 24);
	buffer.writeUInt32LE(SND_RATE, 28);
	buffer.writeUInt16LE(1, 32);
	buffer.writeUInt16LE(8, 34);
	buffer.write("data", 36, "ascii");
	buffer.writeUInt32LE(dataLen, 40);
	for (let i = 0; i < dataLen; i++) buffer[44 + i] = _samples[i] & 0xff;
	writeFileSync(_file, buffer);
}
function _Wave(_length, _step, _amp) {
	const out = new Uint8Array(_length);
	for (let i = 0; i < _length; i++) out[i] = 0x80 + Math.round(_amp * Math.sin((i * _step) / 10));
	return out;
}

const MANIFEST = `import { DefineSkin } from "${indexUrl}";

export default DefineSkin({
	vars: { mainColor: "#007570" },
	cursors: [
		{ name: "zoom", fallback: "zoom-in", image: "imgs/zoom.png", hotspot: [10, 8] }
	],
	media: [
		{ copy: "dev/media/final/logo.png", to: "imgs" },
		{ copy: "dev/media/final/logo@2x.png", to: "imgs" },
		{ copy: "dev/media/final/icon.png", to: "imgs" },
		{ copy: "dev/media/final/icon@2x.png", to: "imgs" },
		{ copy: "dev/media/final/zoom.png", to: "imgs" },
		{ copyFolder: "dev/media/final/fonts", to: "fonts" },
		// raw -> final -> skin chain: generate into the project tree first,
		// then copy the generated strip into the skin like any final asset.
		{ sequenceStrip: "dev/media/raw/frames", outputFile: "dev/media/final/strips/banner.png", outputBase: "project", retina: false, writeMapFile: false },
		{ copy: "dev/media/final/strips/banner.png", to: "imgs" },
		{ sequenceStrip: "dev/media/raw/frames", outputFile: "imgs/anim.png", retina: false, writeMapFile: false }
	],
	sprites: { file: "imgs/sprites.png", retina: true },
	files: [
		{ source: "src.µ.css", target: "std.css" }
	]
});
`;

const SOURCE_MCSS = `div.logo {
	background-image: url(imgs/logo.png);
	-µ: Sprite("imgs/logo.png");
	border-color: µ(Lighten($.mainColor, 0.7));
}
div.icon {
	-µ: Sprite("imgs/icon.png");
}
div.zoom {
	-µ: Cursor("zoom");
}
`;

describe("BuildSkin (M3)", function () {
	this.timeout(30000);

	before(async () => {
		rmSync(projectDir, { recursive: true, force: true });
		mkdirSync(srcDir, { recursive: true });
		const red = { r: 255, g: 0, b: 0, alpha: 1 };
		const blue = { r: 0, g: 0, b: 255, alpha: 1 };
		const green = { r: 0, g: 128, b: 0, alpha: 1 };
		await _WritePng(join(mediaDir, "logo.png"), 134, 25, red);
		await _WritePng(join(mediaDir, "logo@2x.png"), 268, 50, red);
		await _WritePng(join(mediaDir, "icon.png"), 40, 40, blue);
		await _WritePng(join(mediaDir, "icon@2x.png"), 80, 80, blue);
		await _WritePng(join(mediaDir, "zoom.png"), 24, 24, green);
		mkdirSync(join(mediaDir, "fonts"), { recursive: true });
		writeFileSync(join(mediaDir, "fonts", "font.txt"), "font data", "utf8");
		await _WritePng(join(projectDir, "dev", "media", "raw", "frames", "frame.0000.png"), 8, 8, red);
		await _WritePng(join(projectDir, "dev", "media", "raw", "frames", "frame.0001.png"), 8, 8, blue);
		writeFileSync(manifestFile, MANIFEST);
		writeFileSync(join(srcDir, "src.µ.css"), SOURCE_MCSS);
	});

	after(() => {
		rmSync(projectDir, { recursive: true, force: true });
	});

	it("builds the skin end-to-end into skins/<skinname>/", async () => {
		const report = await BuildSkin(manifestFile);

		expect(report.skin).to.equal("std");
		expect(report.outputDir.toLowerCase()).to.equal(outDir.toLowerCase());
		expect(report.atlasSkipped).to.equal(false);

		// Media outputs.
		expect(existsSync(join(outDir, "imgs/logo.png"))).to.equal(true);
		expect(existsSync(join(outDir, "fonts/font.txt"))).to.equal(true);
		expect(existsSync(join(outDir, "imgs/anim.png"))).to.equal(true);

		// raw -> final -> skin: outputBase "project" generated into the
		// project tree, the follow-up copy step brought it into the skin.
		expect(existsSync(join(projectDir, "dev/media/final/strips/banner.png"))).to.equal(true);
		expect(existsSync(join(outDir, "imgs/banner.png"))).to.equal(true);

		// Atlas written (1x + @2x), cache file created.
		expect(existsSync(join(outDir, "imgs/sprites.png"))).to.equal(true);
		expect(existsSync(join(outDir, "imgs/sprites@2x.png"))).to.equal(true);
		expect(existsSync(join(outDir, ".cache/build.json"))).to.equal(true);

		// Compiled CSS.
		const css = readFileSync(join(outDir, "std.css"), "utf8");
		expect(css).to.include("border-color: #00c7be;");
		expect(css).to.include("background-image: url(imgs/sprites.png);");
		expect(css).to.include("image-set(url(imgs/sprites.png)1x, url(imgs/sprites@2x.png)2x)");
		expect(css).to.include("cursor: url(imgs/zoom.png) 10 8, zoom-in;");
		expect(css).to.not.include("-µ");
		expect(css).to.not.include("logo.png);"); // original background replaced

		const logo = report.atlas.sprites["imgs/logo.png"];
		expect(css).to.include(`background-position: ${-logo.x}px ${-logo.y}px;`);
		expect(css).to.include("width: 134px;");
	});

	it("skips atlas packing and media generation on an unchanged rebuild", async () => {
		const atlasBefore = statSync(join(outDir, "imgs/sprites.png")).mtimeMs;
		const stripBefore = statSync(join(outDir, "imgs/anim.png")).mtimeMs;

		const report = await BuildSkin(manifestFile);

		expect(report.atlasSkipped).to.equal(true);
		expect(statSync(join(outDir, "imgs/sprites.png")).mtimeMs).to.equal(atlasBefore);
		// Sequence strip step (last media entry) was skipped.
		expect(report.media[report.media.length - 1].skipped).to.equal(true);
		expect(statSync(join(outDir, "imgs/anim.png")).mtimeMs).to.equal(stripBefore);
		// Copy steps skipped (targets up to date).
		expect(report.media[0].skipped).to.equal(true);
		// The CSS is still rewritten correctly from cached positions.
		const css = readFileSync(join(outDir, "std.css"), "utf8");
		const logo = report.atlas.sprites["imgs/logo.png"];
		expect(css).to.include(`background-position: ${-logo.x}px ${-logo.y}px;`);
	});

	it("rebuilds the atlas when a sprite source image changes", async () => {
		// New content -> new mtime in dev/media, copy step refreshes the skin
		// image, atlas fingerprint no longer matches.
		await _WritePng(join(mediaDir, "icon.png"), 40, 40, { r: 9, g: 9, b: 9, alpha: 1 });
		await _WritePng(join(mediaDir, "icon@2x.png"), 80, 80, { r: 9, g: 9, b: 9, alpha: 1 });

		const report = await BuildSkin(manifestFile);

		expect(report.media[2].skipped).to.equal(false); // icon.png copied again
		expect(report.atlasSkipped).to.equal(false);
	});

	it("forces a full rebuild with { force: true }", async () => {
		const report = await BuildSkin(manifestFile, { force: true });
		expect(report.atlasSkipped).to.equal(false);
		expect(report.media[report.media.length - 1].skipped).to.equal(false);
	});

	it("switches only the atlas to webp via sprites.format (P1)", async () => {
		const webpManifest = join(srcDir, "webp.µcss.mjs");
		writeFileSync(webpManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	media: [
		{ copy: "dev/media/final/logo.png", to: "imgs" },
		{ copy: "dev/media/final/logo@2x.png", to: "imgs" },
		{ copy: "dev/media/final/icon.png", to: "imgs" },
		{ copy: "dev/media/final/icon@2x.png", to: "imgs" }
	],
	sprites: { file: "imgs/sprites.png", format: "webp", retina: true },
	files: [{ source: "src-sprites.µ.css", target: "webp.css" }]
});
`);
		writeFileSync(join(srcDir, "src-sprites.µ.css"),
			'div.logo { -µ: Sprite("imgs/logo.png"); }\ndiv.icon { -µ: Sprite("imgs/icon.png"); }\n');
		const webpOut = join(projectDir, "skins", "webp");
		const report = await BuildSkin(webpManifest, { outputDir: webpOut });

		// The atlas alone switched to webp; the png sources stayed untouched.
		expect(existsSync(join(webpOut, "imgs/sprites.webp"))).to.equal(true);
		expect(existsSync(join(webpOut, "imgs/sprites@2x.webp"))).to.equal(true);
		expect(existsSync(join(webpOut, "imgs/sprites.png"))).to.equal(false);
		expect(existsSync(join(webpOut, "imgs/logo.png"))).to.equal(true);

		const css = readFileSync(join(webpOut, "webp.css"), "utf8");
		expect(css).to.include("background-image: url(imgs/sprites.webp);");
		expect(css).to.include("image-set(url(imgs/sprites.webp)1x, url(imgs/sprites@2x.webp)2x)");
		expect(report.atlas).to.not.equal(null);
	});

	it("adds manifest-level sprites (sprites.include: file and directory) to the atlas without a CSS rule", async () => {
		const inclManifest = join(srcDir, "incl.µcss.mjs");
		writeFileSync(inclManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	media: [
		{ copy: "dev/media/final/logo.png", to: "imgs" },
		{ copy: "dev/media/final/logo@2x.png", to: "imgs" },
		{ copy: "dev/media/final/icon.png", to: "imgs/badges" },
		{ copy: "dev/media/final/icon@2x.png", to: "imgs/badges" }
	],
	sprites: { file: "imgs/sprites.png", retina: true, include: ["imgs/logo.png", "imgs/badges"] },
	files: [{ source: "src-incl.µ.css", target: "incl.css" }]
});
`);
		writeFileSync(join(srcDir, "src-incl.µ.css"), "div.x { color: red; }\n");
		const inclOut = join(projectDir, "skins", "incl");
		const report = await BuildSkin(inclManifest, { outputDir: inclOut });

		// Both the single file and the directory entry landed in the atlas...
		expect(report.atlas).to.not.equal(null);
		expect(report.atlas.sprites).to.have.property("imgs/logo.png");
		expect(report.atlas.sprites).to.have.property("imgs/badges/icon.png");
		expect(existsSync(join(inclOut, "imgs/sprites.png"))).to.equal(true);
		expect(existsSync(join(inclOut, "imgs/sprites@2x.png"))).to.equal(true);

		// ...but no rule was rewritten (there is no Sprite() reference).
		const css = readFileSync(join(inclOut, "incl.css"), "utf8");
		expect(css).to.include("color: red;");
		expect(css).to.not.include("background-image");
	});

	it("builds a sound atlas from a manifest sounds block (microAU bridge)", async () => {
		const sndSrc = join(mediaDir, "sounds");
		_WriteWav(join(sndSrc, "click.wav"), _Wave(800, 3, 60));
		_WriteWav(join(sndSrc, "beep.wav"), _Wave(1200, 7, 90));
		_WriteWav(join(sndSrc, "engine.ls.100.le.400.wav"), _Wave(1600, 2, 50));

		const sndManifest = join(srcDir, "snd.µcss.mjs");
		writeFileSync(sndManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	sounds: { src: "dev/media/final/sounds", dataFile: "snds/app.sounds.wav", jsonFile: "snds/app.sounds.json" },
	files: [{ source: "src-sound.µ.css", target: "snd.css" }]
});
`);
		writeFileSync(join(srcDir, "src-sound.µ.css"), "div.x { color: red; }\n");
		const sndOut = join(projectDir, "skins", "snd");
		const report = await BuildSkin(sndManifest, { outputDir: sndOut });

		expect(report.sounds).to.have.lengthOf(1);
		expect(report.sounds[0].skipped).to.equal(false);
		expect(report.sounds[0].sounds).to.include.members(["click", "beep", "engine"]);
		expect(existsSync(join(sndOut, "snds/app.sounds.wav"))).to.equal(true);

		const json = JSON.parse(readFileSync(join(sndOut, "snds/app.sounds.json"), "utf8"));
		expect(json.sounds).to.have.all.keys("click", "beep", "engine");
		// Loop points from the file name (engine.ls.100.le.400) -> loopStart >= 0.
		expect(json.sounds.engine[2]).to.be.greaterThan(-1);

		// A second unchanged build skips the rebuild (microAU cache under .cache).
		const second = await BuildSkin(sndManifest, { outputDir: sndOut });
		expect(second.sounds[0].skipped).to.equal(true);
	});

	it("inlines co-located component imports and merges duplicate rules (Vue bridge)", async () => {
		mkdirSync(join(srcDir, "components"), { recursive: true });
		writeFileSync(join(srcDir, "components", "button.\u00b5.css"),
			".btn { padding: 10px; background: blue; }\n");
		writeFileSync(join(srcDir, "components", "icon-button.\u00b5.css"),
			".btn { display: flex; gap: 5px; }\n");
		const vueManifest = join(srcDir, "vue.\u00b5css.mjs");
		writeFileSync(vueManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	merge: { onConflict: "error" },
	files: [{ source: "src-vue.\u00b5.css", target: "vue.css" }]
});
`);
		writeFileSync(join(srcDir, "src-vue.\u00b5.css"),
			'@import "components/**/*.\u00b5.css";\nbody { margin: 0; }\n');
		const vueOut = join(projectDir, "skins", "vue");
		await BuildSkin(vueManifest, { outputDir: vueOut });

		const css = readFileSync(join(vueOut, "vue.css"), "utf8");
		// The two .btn blocks were folded into one (partial merge), no @import left.
		expect(css).to.not.include("@import");
		expect((css.match(/\.btn/g) ?? []).length).to.equal(1);
		expect(css).to.include("padding: 10px");
		expect(css).to.include("display: flex");
		expect(css).to.include("body { margin: 0; }");
	});

	it("applies gulp-mu-build-filter (manifest default, BuildSkin option override)", async () => {
		writeFileSync(join(srcDir, "src-bf.\u00b5.css"), [
			".base { color: black; }",
			"/*-- @<BUILD_ONLY_AT_RELEASES:Production ----",
			".debug { color: red; }",
			"---- @>BUILD_ONLY_AT_RELEASES --*/"
		].join("\n") + "\n");
		const bfManifest = join(srcDir, "bf.\u00b5css.mjs");
		writeFileSync(bfManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	buildFilter: { release: "Test" },
	files: [{ source: "src-bf.\u00b5.css", target: "bf.css" }]
});
`);
		const bfOut = join(projectDir, "skins", "bf");

		// Manifest default (Test) drops the Production-only block.
		await BuildSkin(bfManifest, { outputDir: bfOut });
		expect(readFileSync(join(bfOut, "bf.css"), "utf8")).to.not.include(".debug");

		// BuildSkin() option overrides the release to Production -> block kept.
		await BuildSkin(bfManifest, { outputDir: bfOut, buildFilter: { release: "Production" } });
		expect(readFileSync(join(bfOut, "bf.css"), "utf8")).to.include(".debug");
	});

	it("overrides manifest vars from the BuildSkin() call (global variables)", async () => {
		writeFileSync(join(srcDir, "src-vars.\u00b5.css"), "div.x { color: \u00b5($.brand); }\n");
		const varsManifest = join(srcDir, "vars.\u00b5css.mjs");
		writeFileSync(varsManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	vars: { brand: "#111111" },
	files: [{ source: "src-vars.\u00b5.css", target: "vars.css" }]
});
`);
		const varsOut = join(projectDir, "skins", "vars");
		await BuildSkin(varsManifest, { outputDir: varsOut, vars: { brand: "#00ff00" } });
		expect(readFileSync(join(varsOut, "vars.css"), "utf8")).to.include("color: #00ff00;");
	});

	it("supports a factory manifest reacting to BuildSkin() params (release)", async () => {
		writeFileSync(join(srcDir, "src-factory.\u00b5.css"), [
			"/*-- @<BUILD_ONLY_AT_RELEASES:Production ----",
			".debug { color: red; }",
			"---- @>BUILD_ONLY_AT_RELEASES --*/",
			"div.x { color: black; }"
		].join("\n") + "\n");
		const factoryManifest = join(srcDir, "factory.\u00b5css.mjs");
		writeFileSync(factoryManifest, `import { DefineSkin } from "${indexUrl}";
export default ({ release = "Test" }) => DefineSkin({
	buildFilter: { release },
	files: [{ source: "src-factory.\u00b5.css", target: "factory.css" }]
});
`);
		const factoryOut = join(projectDir, "skins", "factory");

		await BuildSkin(factoryManifest, { outputDir: factoryOut });
		expect(readFileSync(join(factoryOut, "factory.css"), "utf8")).to.not.include(".debug");

		await BuildSkin(factoryManifest, { outputDir: factoryOut, release: "Production" });
		expect(readFileSync(join(factoryOut, "factory.css"), "utf8")).to.include(".debug");
	});

	it("warns when a copyFolder filter excludes the active image format (P3)", async () => {
		const p3Dir = join(projectDir, "dev", "media", "final", "p3strips");
		mkdirSync(p3Dir, { recursive: true });
		await _WritePng(join(p3Dir, "strip.webp"), 8, 8, { r: 1, g: 2, b: 3, alpha: 1 });
		writeFileSync(join(p3Dir, "strip.json"), "{}", "utf8");
		const p3Manifest = join(srcDir, "p3.µcss.mjs");
		writeFileSync(p3Manifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	imageFormat: "webp",
	media: [{ copyFolder: "dev/media/final/p3strips", to: "imgs/p3", filter: "\\\\.(png|json)$" }],
	files: [{ source: "src-empty.µ.css", target: "p3.css" }]
});
`);
		writeFileSync(join(srcDir, "src-empty.µ.css"), "div.x { color: red; }\n");

		const warnings = [];
		const originalWarn = console.warn;
		console.warn = (..._args) => warnings.push(_args.join(" "));
		try {
			await BuildSkin(p3Manifest, { outputDir: join(projectDir, "skins", "p3") });
		} finally {
			console.warn = originalWarn;
		}
		const joined = warnings.join("\n");
		expect(joined).to.match(/excludes 1 file\(s\) in the active image format "\.webp"/);
		expect(joined).to.include("strip.webp");
	});

	it("reports missing media sources with step context", async () => {
		const brokenManifest = join(srcDir, "broken.µcss.mjs");
		writeFileSync(brokenManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	media: [{ copyFolder: "dev/media/final/missing-strips", to: "imgs/strips" }],
	files: [{ source: "src.µ.css", target: "broken.css" }]
});
`);
		let error = null;
		try {
			await BuildSkin(brokenManifest);
		} catch (caught) {
			error = caught;
		}
		expect(error).to.not.equal(null);
		expect(error.message).to.include("media step 1 of 1");
		expect(error.message).to.include("copyFolder: source folder not found");
		expect(error.message).to.include("missing-strips");
	});

	it("minifies CSS via the manifest minify option (uglifycss default + custom function)", async () => {
		writeFileSync(join(srcDir, "src-min.µ.css"),
			"div.a {\n\tcolor: red;\n\t/* a comment */\n}\ndiv.b {\n\tcolor: blue;\n}\n");

		// minify: true -> uglifycss defaults: comments stripped, whitespace collapsed.
		const minManifest = join(srcDir, "min.µcss.mjs");
		writeFileSync(minManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	minify: true,
	files: [{ source: "src-min.µ.css", target: "min.css" }]
});
`);
		const minOut = join(projectDir, "skins", "min");
		const report = await BuildSkin(minManifest, { outputDir: minOut });
		const css = readFileSync(join(minOut, "min.css"), "utf8");
		expect(report.minified).to.equal(true);
		expect(css).to.not.include("/* a comment */");
		expect(css).to.not.include("\n");
		expect(css).to.not.include("\t");
		expect(css).to.include("div.a");
		expect(css).to.include("div.b");
		expect(css).to.include("red");

		// minify: function -> used verbatim as a custom minifier (any engine).
		const fnManifest = join(srcDir, "minfn.µcss.mjs");
		writeFileSync(fnManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	minify: (css) => "/*X*/" + css,
	files: [{ source: "src-min.µ.css", target: "minfn.css" }]
});
`);
		const fnOut = join(projectDir, "skins", "minfn");
		await BuildSkin(fnManifest, { outputDir: fnOut });
		const fnCss = readFileSync(join(fnOut, "minfn.css"), "utf8");
		expect(fnCss.startsWith("/*X*/")).to.equal(true);

		// minify omitted -> output keeps its original formatting (newlines present).
		const rawManifest = join(srcDir, "minraw.µcss.mjs");
		writeFileSync(rawManifest, `import { DefineSkin } from "${indexUrl}";
export default DefineSkin({
	files: [{ source: "src-min.µ.css", target: "minraw.css" }]
});
`);
		const rawOut = join(projectDir, "skins", "minraw");
		const rawReport = await BuildSkin(rawManifest, { outputDir: rawOut });
		expect(rawReport.minified).to.equal(false);
		expect(readFileSync(join(rawOut, "minraw.css"), "utf8")).to.include("\n");
	});
});
