// Tests for the M4 macro layer: this-bound helpers, InsertRule ordering and
// the AiDPix reference helpers (Borders, TableBackgrounds, GlitterySprite,
// FlyEx, FlyExUtils) ported from the legacy µ.std.css.

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { CompileMcss, SpriteManager, Lighten, Alpha } from "../src/index.mjs";
import { Borders, TableBackgrounds, GlitterySprite, FlyEx, FlyExUtils } from "./fixtures/aidpix-helpers.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-macros");

const VARS = {
	selectBaseBrgdColor: "#007570",
	tableBaseColor: "#404040",
	FlyGoingZIndex: 9000,
	FlyFlyingZIndex: 9100,
	FlyDeadZIndex: 50,
	FlyDirtZIndex: 40,
	FlySwatterZIndex: 9999
};

const HELPERS = { Borders, TableBackgrounds, GlitterySprite, FlyEx, FlyExUtils };

async function _WriteStrip(_relPath, _frames, _cellW, _cellH, _mapInfo) {
	const file = join(tmpDir, _relPath);
	mkdirSync(dirname(file), { recursive: true });
	await sharp({ create: { width: _frames * _cellW, height: _cellH, channels: 4, background: { r: 200, g: 100, b: 0, alpha: 1 } } })
		.png().toFile(file);
	const map = {
		info: _mapInfo,
		series: { standard: 0 },
		sprites: Array.from({ length: _frames }, (_v, _i) => [0, _i * _cellW * 2, _cellW * 2, _cellH * 2, 0, 0])
	};
	writeFileSync(file.replace(/\.png$/, ".json"), JSON.stringify(map), "utf8");
}

async function _CompileWithSprites(_source, _atlasFile) {
	const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: _atlasFile, retina: false });
	const document = CompileMcss(_source, { vars: VARS, helpers: HELPERS, sprites });
	const atlas = await sprites.Resolve(document);
	return { document, atlas };
}

describe("Macros and hooks (M4)", function () {
	this.timeout(20000);

	before(async () => {
		rmSync(tmpDir, { recursive: true, force: true });
		// Map dimensions are @2x values (legacy convention), strips are 1x.
		await _WriteStrip("imgs/glittery/glittery.png", 4, 32, 32,
			{ maxWidth: 64, maxHeight: 64, offX: 10, offY: 6 });
		await _WriteStrip("imgs/flyex/flyex.png", 23, 25, 25,
			{ maxWidth: 50, maxHeight: 50, offX: 8, offY: 4 });
		await _WriteStrip("imgs/flyex/flyexutils.png", 3, 30, 30,
			{ maxWidth: 60, maxHeight: 60, offX: 12, offY: 10 });
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	describe("Borders", () => {
		it("writes the four lightened borders like the legacy µ.$.Borders", () => {
			const source = "div.box { -µ: Borders(\"#808080\", 2, 0.3, -0.3, -0.3, 0.3); }";
			const rule = CompileMcss(source, { vars: VARS, helpers: HELPERS }).FindRule("div.box");
			const lighter = Lighten("#808080", 0.3);
			const darker = Lighten("#808080", -0.3);
			expect(rule.GetProperty("border-top")).to.equal(`2px solid ${lighter}`);
			expect(rule.GetProperty("border-right")).to.equal(`2px solid ${darker}`);
			expect(rule.GetProperty("border-bottom")).to.equal(`2px solid ${darker}`);
			expect(rule.GetProperty("border-left")).to.equal(`2px solid ${lighter}`);
		});
	});

	describe("TableBackgrounds", () => {
		it("inserts the zebra/hover/selection rules behind the host rule", () => {
			const source = `table.list>tbody { color: black; -µ: TableBackgrounds("variant1", "table.list>tbody", $.tableBaseColor, true); }
			div.after { color: white; }`;
			const document = CompileMcss(source, { vars: VARS, helpers: HELPERS });
			const css = document.ToCss();

			const even = document.FindRule("table.list>tbody>tr.variant1:nth-child(even)");
			expect(even.GetProperty("background-color")).to.equal(Alpha(VARS.tableBaseColor, 0.3));
			const odd = document.FindRule("table.list>tbody>tr.variant1:nth-child(odd)");
			expect(odd.GetProperty("background-color")).to.equal(Alpha(VARS.tableBaseColor, 0.2));
			const selected = document.FindRule("table.list>tbody>tr.variant1.selected:nth-child(even)");
			expect(selected.GetProperty("background-color")).to.equal(Alpha(VARS.selectBaseBrgdColor, 0.3));
			const tdHover = document.FindRule("table.list>tbody>tr.variant1>td:nth-child(odd):hover");
			expect(tdHover.GetProperty("background-color")).to.equal(Alpha(VARS.selectBaseBrgdColor, 0.1));
			// Legacy quirk selector (">tr:" typo) is reproduced for M5 parity.
			expect(css).to.include("table.list>tbody>tr:variant1>td:nth-child(even)");

			// 14 generated rules sit between the host rule and div.after.
			const hostPos = css.indexOf("table.list>tbody {");
			const firstPos = css.indexOf("table.list>tbody>tr.variant1:nth-child(even)");
			const afterPos = css.indexOf("div.after");
			expect(hostPos).to.be.below(firstPos);
			expect(firstPos).to.be.below(afterPos);
			expect(css.match(/table\.list>tbody>tr/g)).to.have.length(14);
		});
	});

	describe("GlitterySprite", () => {
		it("sizes the cell and patches the glittery keyframes", async () => {
			const source = `@keyframes glittery {
				from { background-position-x: 0px; }
				to { background-position-x: 0px; }
			}
			div.glittery {
				-µ: Sprite("imgs/glittery/glittery.png", { afterWork: GlitterySprite });
			}`;
			const { document, atlas } = await _CompileWithSprites(source, "imgs/atlas_glittery.png");
			const x = atlas.sprites["imgs/glittery/glittery.png"].x;

			const rule = document.FindRule("div.glittery");
			expect(rule.GetProperty("margin")).to.equal("-3px 0px 0px -5px");
			expect(rule.GetProperty("animation-timing-function")).to.equal("steps(4)");
			expect(rule.GetProperty("width")).to.equal("32px");
			expect(rule.GetProperty("height")).to.equal("32px");

			expect(document.FindRule("@keyframes glittery", "from").GetProperty("background-position-x"))
				.to.equal(`-${x}px`);
			expect(document.FindRule("@keyframes glittery", "to").GetProperty("background-position-x"))
				.to.equal(`-${x + 32 * 4}px`);
		});
	});

	describe("FlyEx", () => {
		it("generates the full fly rule matrix incl. dead/dirt states", async () => {
			const source = `div.fly {
				-µ: Sprite("imgs/flyex/flyex.png", { afterWork: FlyEx });
			}`;
			const { document, atlas } = await _CompileWithSprites(source, "imgs/atlas_flyex.png");
			const x = atlas.sprites["imgs/flyex/flyex.png"].x;
			const cell = 25;

			const fly = document.FindRule("div.fly");
			expect(fly.GetProperty("z-index")).to.equal("9000");
			expect(fly.GetProperty("position")).to.equal("fixed");
			expect(fly.GetProperty("width")).to.equal("25px");
			expect(fly.GetProperty("height")).to.equal("25px");

			// d=4 (even, >1): straight pose s, rotated 180 degrees.
			const n2d4 = document.FindRule("div.fly.n2.d4");
			expect(n2d4.GetProperty("transform")).to.equal("rotate(180deg)");
			expect(n2d4.GetProperty("background-position-x")).to.equal(`${-(x + 2 * cell)}px`);
			expect(n2d4.GetProperty("margin")).to.equal("-2px 0px 0px -4px");

			// d=3 (odd, >1): diagonal pose s+10, rotated 90 degrees; s=3 flies.
			const n3d3 = document.FindRule("div.fly.n3.d3");
			expect(n3d3.GetProperty("transform")).to.equal("rotate(90deg)");
			expect(n3d3.GetProperty("background-position-x")).to.equal(`${-(x + 13 * cell)}px`);
			expect(n3d3.GetProperty("z-index")).to.equal("9100");

			// d=1: diagonal pose without transform; s=0 does not fly.
			const n0d1 = document.FindRule("div.fly.n0.d1");
			expect(n0d1.GetProperty("transform")).to.equal(null);
			expect(n0d1.GetProperty("background-position-x")).to.equal(`${-(x + 10 * cell)}px`);
			expect(n0d1.GetProperty("z-index")).to.equal(null);

			const dead = document.FindRule("div.fly.dead");
			expect(dead.GetProperty("z-index")).to.equal("50");
			expect(dead.GetProperty("background-position-x")).to.equal(`${-(x + 20 * cell)}px`);

			const dirt2 = document.FindRule("div.fly.dirt2");
			expect(dirt2.GetProperty("z-index")).to.equal("40");
			expect(dirt2.GetProperty("background-position-x")).to.equal(`${-(x + 22 * cell)}px`);
			expect(document.FindRule("div.fly.dirt2.run").GetProperty("animation"))
				.to.equal("flyDirt 30s linear");

			expect(document.FindRules(/^div\.fly\.n\d\.d\d$/)).to.have.length(80);
		});
	});

	describe("FlyExUtils", () => {
		it("sets up the swatter sprite and patches the clap keyframes", async () => {
			const source = `@keyframes flySwatterClap {
				from { width: 1px; height: 1px; }
				50% { width: 1px; height: 1px; }
				to { opacity: 0; }
			}
			div.flySwatter {
				-µ: Sprite("imgs/flyex/flyexutils.png", { afterWork: FlyExUtils });
			}`;
			const { document, atlas } = await _CompileWithSprites(source, "imgs/atlas_flyexutils.png");
			const x = atlas.sprites["imgs/flyex/flyexutils.png"].x;
			const cell = 30;

			const rule = document.FindRule("div.flySwatter");
			expect(rule.GetProperty("z-index")).to.equal("9999");
			expect(rule.GetProperty("pointer-events")).to.equal("none");
			expect(rule.GetProperty("margin")).to.equal("-5px 0px 0px -6px");
			expect(rule.GetProperty("width")).to.equal("30px");
			expect(rule.GetProperty("background-position-x")).to.equal(`${-x}px`);

			expect(document.FindRule("div.flySwatter.clap").GetProperty("animation"))
				.to.equal("flySwatterClap 0.5s linear");
			expect(document.FindRule("div.flySwatter.clapend").GetProperty("background-position-x"))
				.to.equal(`${-(x + cell)}px`);

			const start = document.FindRule("@keyframes flySwatterClap", "from");
			expect(start.GetProperty("width")).to.equal("30px");
			expect(start.GetProperty("background-position-x")).to.equal(`${-x}px`);
			const down = document.FindRule("@keyframes flySwatterClap", "50%");
			expect(down.GetProperty("height")).to.equal("30px");
			expect(down.GetProperty("background-position-x")).to.equal(`${-(x + 2 * cell)}px`);
		});
	});
});
