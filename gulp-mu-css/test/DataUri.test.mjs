// Tests for DataUri(): inline image files as data: URIs in compiled CSS.

import { mkdirSync, rmSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { CompileMcss, CreateDataUriCSSValue } from "../src/index.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-datauri");

async function _WritePng(_relPath, _width, _height, _color) {
	const file = join(tmpDir, _relPath);
	mkdirSync(dirname(file), { recursive: true });
	await sharp({ create: { width: _width, height: _height, channels: 4, background: _color } })
		.png().toFile(file);
}

describe("DataUri", function () {
	this.timeout(10000);

	before(async () => {
		rmSync(tmpDir, { recursive: true, force: true });
		const red = { r: 200, g: 10, b: 10, alpha: 1 };
		await _WritePng("imgs/dot.png", 2, 2, red);
		await _WritePng("imgs/dot@2x.png", 4, 4, red);
	});

	after(() => {
		rmSync(tmpDir, { recursive: true, force: true });
	});

	it("returns a wrapped url(data:...) value", () => {
		const value = CreateDataUriCSSValue(tmpDir, "imgs/dot.png");
		expect(value).to.match(/^url\(data:image\/png;base64,/);
		const encoded = readFileSync(join(tmpDir, "imgs/dot.png")).toString("base64");
		expect(value).to.include(encoded);
	});

	it("supports bare data: form without url() wrapper", () => {
		const value = CreateDataUriCSSValue(tmpDir, "imgs/dot.png", { wrap: false });
		expect(value).to.match(/^data:image\/png;base64,/);
		expect(value).to.not.include("url(");
	});

	it("supports retina via image-set", () => {
		const value = CreateDataUriCSSValue(tmpDir, "imgs/dot.png", { retina: true });
		expect(value).to.match(/^image-set\(url\(data:image\/png;base64,/);
		expect(value).to.include(")1x, url(data:image/png;base64,");
		expect(value).to.include(")2x)");
	});

	it("inlines via -µ: DataUri directive", () => {
		const source = `div.badge {
			background-image: url(imgs/dot.png);
			-µ: DataUri("imgs/dot.png");
		}`;
		const css = CompileMcss(source, { baseDir: tmpDir }).ToCss();
		expect(css).to.match(/background-image: url\(data:image\/png;base64,/);
		expect(css).to.not.include("imgs/dot.png");
		expect(css).to.not.include("-µ");
	});

	it("inlines via µ(DataUri(...)) interpolation", () => {
		const source = "div.badge { background-image: µ(DataUri(\"imgs/dot.png\")); }";
		const css = CompileMcss(source, { baseDir: tmpDir }).ToCss();
		expect(css).to.match(/background-image: url\(data:image\/png;base64,/);
	});

	it("reports a clear error when the source file is missing", () => {
		expect(() => CreateDataUriCSSValue(tmpDir, "imgs/missing.png"))
			.to.throw(/image not found/);
	});
});
