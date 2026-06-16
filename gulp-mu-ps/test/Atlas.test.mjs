// Tests for the sprite atlas and tile sheet generation, based on the same
// source images the legacy toolchain used to build examples/imgs/sprites.png.

import { rmSync, existsSync, readFileSync, copyFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { SpriteAtlas, TileSheet, PackRects } from "../src/index.mjs";

// Keep files closable on Windows (sharp's file cache would block tmp cleanup).
sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const examplesDir = join(here, "../../oldsrcs/old_adobe_scripts/µCSS/examples");
const tmpDir = join(here, ".tmp-atlas");

// The sprites used by examples/sprites.css (all 55x55).
const SPRITE_SOURCES = [
	"aqua/but_login_normal.png",
	"aqua/but_login_hover.png",
	"aqua/but_help_normal.png",
	"aqua/but_help_hover.png",
	"aqua/but_settings_normal.png",
	"aqua/but_settings_hover.png"
].map((f) => join(examplesDir, "imgs", f));

function _Overlaps(_a, _b) {
	return _a.x < _b.x + _b.width && _b.x < _a.x + _a.width &&
		_a.y < _b.y + _b.height && _b.y < _a.y + _a.height;
}

describe("SpriteAtlas", function () {
	this.timeout(60000);
	const outputFile = join(tmpDir, "sprites.png");
	let atlas;

	before(async function () {
		if (!existsSync(SPRITE_SOURCES[0])) this.skip();
		rmSync(tmpDir, { recursive: true, force: true });
		atlas = await SpriteAtlas.Create({ images: SPRITE_SOURCES, outputFile, retina: true });
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("maps every source image to a 55x55 sprite inside the atlas", function () {
		expect(Object.keys(atlas.sprites)).to.have.length(SPRITE_SOURCES.length);
		for (const sprite of Object.values(atlas.sprites)) {
			expect(sprite.width).to.equal(55);
			expect(sprite.height).to.equal(55);
			expect(sprite.x).to.be.at.least(0);
			expect(sprite.y).to.be.at.least(0);
			expect(sprite.x + sprite.width).to.be.at.most(atlas.width);
			expect(sprite.y + sprite.height).to.be.at.most(atlas.height);
		}
	});

	it("packs without overlaps and without wasted area", function () {
		const sprites = Object.values(atlas.sprites);
		for (let i = 0; i < sprites.length; i++) {
			for (let j = i + 1; j < sprites.length; j++) {
				expect(_Overlaps(sprites[i], sprites[j]), `sprites ${i}/${j} overlap`).to.equal(false);
			}
		}
		// Six equal 55x55 squares pack into exactly 6 * 55 * 55 pixels (like the legacy 165x110 atlas).
		expect(atlas.width * atlas.height).to.equal(6 * 55 * 55);
	});

	it("writes the 1x and @2x atlas images plus the JSON map", async function () {
		const meta1x = await sharp(outputFile).metadata();
		expect(meta1x.width).to.equal(atlas.width);
		expect(meta1x.height).to.equal(atlas.height);
		const meta2x = await sharp(join(tmpDir, "sprites@2x.png")).metadata();
		expect(meta2x.width).to.equal(atlas.width * 2);
		expect(meta2x.height).to.equal(atlas.height * 2);
		const map = JSON.parse(readFileSync(`${outputFile}.json`, "utf8"));
		expect(map.sprites).to.deep.equal(atlas.sprites);
	});

	it("reuses one atlas position for identical images", async function () {
		const duplicated = await SpriteAtlas.Create({
			images: [SPRITE_SOURCES[0], SPRITE_SOURCES[0], SPRITE_SOURCES[1]],
			outputFile: join(tmpDir, "dedupe.png"),
			retina: false,
			writeMapFile: false
		});
		expect(duplicated.width * duplicated.height).to.equal(2 * 55 * 55);
	});

	it("writes a lossless WebP atlas when the output file ends in .webp", async function () {
		const webpFile = join(tmpDir, "sprites.webp");
		const webpAtlas = await SpriteAtlas.Create({
			images: SPRITE_SOURCES,
			outputFile: webpFile,
			retina: false,
			writeMapFile: false
		});
		const meta = await sharp(webpFile).metadata();
		expect(meta.format).to.equal("webp");
		expect(meta.width).to.equal(webpAtlas.width);
		// Lossless: visible pixels must match the PNG atlas bit-exactly.
		// (WebP may normalize the RGB of fully transparent pixels, so only
		// pixels with alpha > 0 are compared.)
		const png = await sharp(outputFile).ensureAlpha().raw().toBuffer();
		const webp = await sharp(webpFile).ensureAlpha().raw().toBuffer();
		expect(webp.length).to.equal(png.length);
		for (let i = 0; i < png.length; i += 4) {
			expect(webp[i + 3], `alpha mismatch at pixel ${i / 4}`).to.equal(png[i + 3]);
			if (png[i + 3] === 0) continue;
			expect(webp[i], `red mismatch at pixel ${i / 4}`).to.equal(png[i]);
			expect(webp[i + 1], `green mismatch at pixel ${i / 4}`).to.equal(png[i + 1]);
			expect(webp[i + 2], `blue mismatch at pixel ${i / 4}`).to.equal(png[i + 2]);
		}
	});
});

describe("TileSheet", function () {
	this.timeout(60000);
	const outputFile = join(tmpDir, "tiles.png");

	before(function () {
		if (!existsSync(SPRITE_SOURCES[0])) this.skip();
		mkdirSync(tmpDir, { recursive: true });
	});

	after(function () {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("splits sources into tiles, packs them into an allowed square texture", async function () {
		const sheet = await TileSheet.Create({
			images: SPRITE_SOURCES,
			outputFile,
			tileSize: 55,
			writeMapFile: false
		});
		expect(sheet.tileCount).to.equal(6);
		expect(sheet.textureSize).to.equal(256);
		const meta = await sharp(outputFile).metadata();
		expect(meta.width).to.equal(256);
		expect(meta.height).to.equal(256);
		for (const source of Object.values(sheet.sources)) {
			expect(source.tiles).to.have.length(1);
		}
	});

	it("deduplicates identical tiles across sources", async function () {
		const copyFile = join(tmpDir, "copy-of-first-sprite.png");
		copyFileSync(SPRITE_SOURCES[0], copyFile);
		const sheet = await TileSheet.Create({
			images: [SPRITE_SOURCES[0], copyFile],
			outputFile: join(tmpDir, "tiles-dedupe.png"),
			tileSize: 55,
			writeMapFile: false
		});
		expect(sheet.tileCount).to.equal(1);
		const indices = Object.values(sheet.sources).map((_s) => _s.tiles[0]);
		expect(indices).to.deep.equal([0, 0]);
	});

	it("maps fully transparent tiles to index -1", async function () {
		const emptyFile = join(tmpDir, "empty-tile.png");
		await sharp({
			create: { width: 110, height: 55, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } }
		})
			.composite([{ input: SPRITE_SOURCES[0], left: 0, top: 0 }])
			.png().toFile(emptyFile);
		const sheet = await TileSheet.Create({
			images: [emptyFile],
			outputFile: join(tmpDir, "tiles-empty.png"),
			tileSize: 55,
			writeMapFile: false
		});
		expect(sheet.sources[emptyFile].tiles).to.deep.equal([0, -1]);
	});
});

describe("PackRects", function () {
	it("packs mixed rectangle sizes without overlap", function () {
		const rects = [
			{ w: 64, h: 64 }, { w: 32, h: 64 }, { w: 64, h: 32 },
			{ w: 16, h: 16 }, { w: 128, h: 32 }, { w: 32, h: 32 }
		];
		const [width, height] = PackRects(rects);
		expect(width).to.be.above(0);
		expect(height).to.be.above(0);
		for (const rect of rects) {
			expect(rect.x).to.be.at.least(0);
			expect(rect.y).to.be.at.least(0);
			expect(rect.x + rect.w).to.be.at.most(width);
			expect(rect.y + rect.h).to.be.at.most(height);
		}
		for (let i = 0; i < rects.length; i++) {
			for (let j = i + 1; j < rects.length; j++) {
				const a = rects[i], b = rects[j];
				const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
				expect(overlap, `rects ${i}/${j} overlap`).to.equal(false);
			}
		}
	});
});
