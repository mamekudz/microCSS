// Tests for the M2 sprite/cursor layer: Sprite() directive with atlas
// creation (microPS), Cursor() directive and value form, preload rule.
// The expected output format follows the legacy compiled AiDPix std.css,
// minus the vendor-prefixed image-set lines (CONCEPT.md, D6).

import { mkdirSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { CompileMcss, SpriteManager, CursorManager, PreloadRegistry } from "../src/index.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-sprites");

async function _WritePng(_relPath, _width, _height, _color) {
	const file = join(tmpDir, _relPath);
	mkdirSync(dirname(file), { recursive: true });
	await sharp({ create: { width: _width, height: _height, channels: 4, background: _color } })
		.png().toFile(file);
}

const CURSOR_DEFS = [
	{ name: "zoom", fallback: "zoom-in", image: "imgs/cursors/zoom.png", hotspot: [10, 8] },
	{ name: "wait", fallback: "wait", image: "imgs/cursors/wait.png", hotspot: [12, 12] },
	{ name: "grab", fallback: "grab", image: "imgs/cursors/zoom.png" },
	{ name: "move", fallback: "move" },
	{ name: "forced", fallback: "help", image: "imgs/cursors/wait.png", hotspot: [1, 2], forceFallback: true }
];

describe("Sprites and cursors (M2)", function () {
	this.timeout(20000);

	before(async () => {
		rmSync(tmpDir, { recursive: true, force: true });
		const red = { r: 255, g: 0, b: 0, alpha: 1 };
		const blue = { r: 0, g: 0, b: 255, alpha: 1 };
		const green = { r: 0, g: 128, b: 0, alpha: 1 };
		await _WritePng("imgs/logos/logo.png", 134, 25, red);
		await _WritePng("imgs/logos/logo@2x.png", 268, 50, red);
		await _WritePng("imgs/icons/icon.png", 40, 40, blue);
		await _WritePng("imgs/icons/icon@2x.png", 80, 80, blue);
		await _WritePng("imgs/cursors/zoom.png", 24, 24, green);
		await _WritePng("imgs/cursors/zoom@2x.png", 48, 48, green);
		await _WritePng("imgs/cursors/wait.png", 24, 24, green);
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("Sprite directive", () => {
		it("rewrites rules to the manual's output format (atlas, image-set, position, size)", async () => {
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites.png", retina: true });
			const source = `div.companylogo {
				background-image: url(imgs/logos/logo.png);
				background-repeat: repeat;
				margin-left: auto;
				-µ: Sprite("imgs/logos/logo.png");
			}
			div.icon {
				-µ: Sprite("imgs/icons/icon.png");
			}`;
			const document = CompileMcss(source, { sprites });
			const atlas = await sprites.Resolve(document);
			const css = document.ToCss();

			// Atlas files written (1x and @2x).
			expect(existsSync(join(tmpDir, "imgs/sprites.png"))).to.equal(true);
			expect(existsSync(join(tmpDir, "imgs/sprites@2x.png"))).to.equal(true);

			// Old background properties are gone, directive removed.
			expect(css).to.not.include("logo.png");
			expect(css).to.not.include("background-repeat: repeat;");
			expect(css).to.not.include("-µ");

			// Manual example format (without vendor prefixes, see D6).
			const logo = atlas.sprites["imgs/logos/logo.png"];
			const logoRule = document.FindRule("div.companylogo");
			expect(logoRule.GetProperties().map((_p) => `${_p.prop}: ${_p.value}`)).to.deep.equal([
				"margin-left: auto",
				"background-image: url(imgs/sprites.png)",
				"background-image: image-set(url(imgs/sprites.png)1x, url(imgs/sprites@2x.png)2x)",
				"background-repeat: no-repeat",
				`background-position: ${-logo.x}px ${-logo.y}px`,
				"width: 134px",
				"height: 25px"
			]);

			const icon = atlas.sprites["imgs/icons/icon.png"];
			const iconRule = document.FindRule("div.icon");
			expect(iconRule.GetProperty("background-position")).to.equal(`${-icon.x}px ${-icon.y}px`);
			expect(iconRule.GetProperty("width")).to.equal("40px");
			expect(iconRule.GetProperty("height")).to.equal("40px");
		});

		it("applies offsets like the legacy Sprite parameters", async () => {
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites_offsets.png", retina: false });
			const source = `div.icon {
				-µ: Sprite("imgs/icons/icon.png", { offsetPosX: 2, offsetPosY: 3, offsetWidth: -1, offsetHeight: 5 });
			}`;
			const document = CompileMcss(source, { sprites });
			const atlas = await sprites.Resolve(document);
			const sprite = atlas.sprites["imgs/icons/icon.png"];
			const rule = document.FindRule("div.icon");
			expect(rule.GetProperty("background-position")).to.equal(`${-(sprite.x + 2)}px ${-(sprite.y + 3)}px`);
			expect(rule.GetProperty("width")).to.equal("39px");
			expect(rule.GetProperty("height")).to.equal("45px");
			// retina: false -> no image-set line.
			expect(document.ToCss()).to.not.include("image-set");
		});

		it("runs afterWork hooks with rule, sprite and atlas context", async () => {
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites_hook.png", retina: false });
			const helpers = {
				GlitteryHook: (_ctx) => {
					_ctx.rule.AddProperty("--sprite-size", `${_ctx.sprite.width}x${_ctx.sprite.height}`);
					_ctx.document.AddRule("div.hooked").AddProperty("background-size", `${_ctx.atlas.width}px ${_ctx.atlas.height}px`);
				}
			};
			const source = `div.glittery {
				-µ: Sprite("imgs/logos/logo.png", { afterWork: GlitteryHook });
			}`;
			const document = CompileMcss(source, { helpers, sprites });
			const atlas = await sprites.Resolve(document);
			expect(document.FindRule("div.glittery").GetProperty("--sprite-size")).to.equal("134x25");
			expect(document.FindRule("div.hooked").GetProperty("background-size"))
				.to.equal(`${atlas.width}px ${atlas.height}px`);
		});

		it("resolves a Sprite() source when the on-disk extension diverges (P2)", async () => {
			// CSS references ".png", but only the ".webp" variant exists on disk.
			const teal = { r: 0, g: 117, b: 112, alpha: 1 };
			await sharp({ create: { width: 30, height: 20, channels: 4, background: teal } })
				.webp({ lossless: true }).toFile(join(tmpDir, "imgs/divergent.webp"));
			await sharp({ create: { width: 60, height: 40, channels: 4, background: teal } })
				.webp({ lossless: true }).toFile(join(tmpDir, "imgs/divergent@2x.webp"));
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites_divergent.png", retina: true });
			const document = CompileMcss('div.d { -µ: Sprite("imgs/divergent.png"); }', { sprites });
			const atlas = await sprites.Resolve(document);
			const rule = document.FindRule("div.d");
			expect(rule.GetProperty("width")).to.equal("30px");
			expect(rule.GetProperty("height")).to.equal("20px");
			expect(atlas.sprites["imgs/divergent.png"]).to.not.equal(undefined);
		});

		it("fails without a configured sprite manager", () => {
			expect(() => CompileMcss("div { -µ: Sprite(\"imgs/icons/icon.png\"); }", {}))
				.to.throw(/no sprite manager/);
		});
	});

	describe("Cursor directive", () => {
		function _Compile(_source) {
			const cursors = new CursorManager(CURSOR_DEFS, { baseDir: tmpDir });
			return CompileMcss(_source, { cursors });
		}

		it("writes url() plus unprefixed image-set() when @2x exists", () => {
			const document = _Compile("*.cursor_zoom { cursor: pointer; -µ: Cursor(\"zoom\"); }");
			const values = document.FindRule("*.cursor_zoom").GetProperties()
				.filter((_p) => _p.prop === "cursor").map((_p) => _p.value);
			expect(values).to.deep.equal([
				"url(imgs/cursors/zoom.png) 10 8, zoom-in",
				"image-set(url(imgs/cursors/zoom.png)1x, url(imgs/cursors/zoom@2x.png)2x) 10 8, zoom-in"
			]);
		});

		it("writes only the url() form when no @2x source exists", () => {
			const document = _Compile("*.cursor_wait { -µ: Cursor(\"wait\"); }");
			const values = document.FindRule("*.cursor_wait").GetProperties()
				.filter((_p) => _p.prop === "cursor").map((_p) => _p.value);
			expect(values).to.deep.equal(["url(imgs/cursors/wait.png) 12 12, wait"]);
		});

		it("omits the hotspot when it is 0,0", () => {
			const document = _Compile("div.grab { -µ: Cursor(\"grab\"); }");
			expect(document.FindRule("div.grab").GetProperty("cursor"))
				.to.equal("url(imgs/cursors/zoom.png), grab");
		});

		it("falls back for definitions without image and for unknown names", () => {
			const document = _Compile(`div.move { cursor: crosshair; -µ: Cursor("move"); }
				div.unknown { -µ: Cursor("help"); }`);
			expect(document.FindRule("div.move").GetProperties().filter((_p) => _p.prop === "cursor"))
				.to.deep.equal([{ prop: "cursor", value: "move", important: false }]);
			expect(document.FindRule("div.unknown").GetProperty("cursor")).to.equal("help");
		});

		it("appends the forced fallback last", () => {
			const document = _Compile("div.forced { -µ: Cursor(\"forced\"); }");
			const values = document.FindRule("div.forced").GetProperties()
				.filter((_p) => _p.prop === "cursor").map((_p) => _p.value);
			expect(values[0]).to.equal("url(imgs/cursors/wait.png) 1 2, help");
			expect(values[values.length - 1]).to.equal("help");
		});

		it("supports the value form cursor: µ(Cursor(...))", () => {
			const document = _Compile("div.zoom { cursor: µ(Cursor(\"zoom\")); }");
			expect(document.FindRule("div.zoom").GetProperty("cursor"))
				.to.equal("url(imgs/cursors/zoom.png) 10 8, zoom-in");
		});
	});

	describe("Preload rule", () => {
		it("collects cursor images into div.csspreload on Resolve", async () => {
			const preload = new PreloadRegistry(tmpDir);
			const cursors = new CursorManager(CURSOR_DEFS, { baseDir: tmpDir, preload });
			preload.Add("imgs/missing/doesnotexist.png");
			const sprites = new SpriteManager({
				baseDir: tmpDir, atlasFile: "imgs/sprites_preload.png",
				retina: false, preloadRule: true, preload
			});
			const document = CompileMcss("div.a { -µ: Sprite(\"imgs/icons/icon.png\"); }", { sprites, cursors });
			await sprites.Resolve(document);

			const rule = document.FindRule("div.csspreload");
			expect(rule).to.not.equal(null);
			expect(rule.GetProperty("background-image"))
				.to.equal('url("imgs/cursors/zoom.png"),url("imgs/cursors/wait.png")');
			expect(rule.GetProperty("display")).to.equal("none");
		});

		it("pruneSources deletes packed source images after Resolve", async () => {
			const sprites = new SpriteManager({
				baseDir: tmpDir,
				atlasFile: "imgs/sprites_prune.png",
				retina: true,
				pruneSources: true
			});
			const document = CompileMcss("div.a { -µ: Sprite(\"imgs/logos/logo.png\"); }", { sprites });
			await sprites.Resolve(document);
			expect(existsSync(join(tmpDir, "imgs/sprites_prune.png"))).to.equal(true);
			expect(existsSync(join(tmpDir, "imgs/logos/logo.png"))).to.equal(false);
			expect(existsSync(join(tmpDir, "imgs/logos/logo@2x.png"))).to.equal(false);
			expect(sprites.lastPruned.deleted).to.include("imgs/logos/logo.png");
			// Restore sources for other tests.
			const red = { r: 255, g: 0, b: 0, alpha: 1 };
			await _WritePng("imgs/logos/logo.png", 134, 25, red);
			await _WritePng("imgs/logos/logo@2x.png", 268, 50, red);
		});
	});
});
