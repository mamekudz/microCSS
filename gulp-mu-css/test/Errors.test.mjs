// Tests for the diagnostic quality of error messages: inline JavaScript
// failures must point to the .µ.css source (file, line, expression) and
// missing sprite images must name every missing file together with the rule
// that referenced it.

import { mkdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import sharp from "sharp";
import { CompileMcss, SpriteManager } from "../src/index.mjs";

sharp.cache(false);

const here = dirname(fileURLToPath(import.meta.url));
const tmpDir = join(here, ".tmp-errors");

async function _WritePng(_relPath, _width, _height) {
	const file = join(tmpDir, _relPath);
	mkdirSync(dirname(file), { recursive: true });
	await sharp({ create: { width: _width, height: _height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
		.png().toFile(file);
}

function _CompileError(_source, _options = {}) {
	try {
		CompileMcss(_source, _options);
	} catch (error) {
		return error;
	}
	throw new Error("expected CompileMcss to throw");
}

describe("Error reporting", function () {
	this.timeout(20000);

	before(() => rmSync(tmpDir, { recursive: true, force: true }));
	after(() => rmSync(tmpDir, { recursive: true, force: true }));

	describe("inline JavaScript", () => {
		it("reports runtime errors with the failing µ() expression, file and line", () => {
			const source = "div.a { color: red; }\ndiv.b {\n\tborder: 1px solid µ(NopeFn(1));\n}";
			const error = _CompileError(source, { from: "broken.µ.css" });
			expect(error.name).to.equal("CssSyntaxError");
			expect(error.message).to.include("µ(NopeFn(1))");
			expect(error.message).to.include("NopeFn is not defined");
			expect(error.message).to.include("broken.µ.css");
			expect(error.line).to.equal(3);
			// The printable form contains the offending source line.
			expect(error.toString()).to.include("border: 1px solid");
		});

		it("names the failing expression when a value contains several µ()", () => {
			const error = _CompileError("div { padding: µ(1 + 1)px µ(boom())px; }");
			expect(error.message).to.include("µ(boom())");
			expect(error.message).to.not.include("µ(1 + 1):");
		});

		it("reports JavaScript syntax errors with the expression source", () => {
			const error = _CompileError("div { width: µ(1 +)px; }", { from: "broken.µ.css" });
			expect(error.message).to.include('invalid JavaScript expression "1 +"');
			expect(error.line).to.equal(1);
		});

		it("reports directive errors with file and line", () => {
			const error = _CompileError("div.x {\n\t-µ: UnknownMacro(1, 2);\n}", { from: "skin.µ.css" });
			expect(error.message).to.include("UnknownMacro is not defined");
			expect(error.message).to.include("skin.µ.css");
			expect(error.line).to.equal(2);
		});

		it("rejects µ() results that are null or undefined", () => {
			const error = _CompileError("div { color: µ($.missingVar); }", { vars: {} });
			expect(error.message).to.include("µ($.missingVar) returned undefined");
		});
	});

	describe("missing sprite images", () => {
		it("lists every missing image with the referencing rule and source line", async () => {
			await _WritePng("imgs/ok.png", 10, 10);
			await _WritePng("imgs/ok@2x.png", 20, 20);
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites.png", retina: true });
			const source = `div.good { -µ: Sprite("imgs/ok.png"); }
div.bad1 { -µ: Sprite("imgs/nope.png"); }
div.bad2 { -µ: Sprite("imgs/alsonope.png"); }`;
			const document = CompileMcss(source, { sprites, from: "skin.µ.css" });

			let error = null;
			try { await sprites.Resolve(document); } catch (caught) { error = caught; }
			expect(error, "Resolve should fail").to.not.equal(null);
			expect(error.message).to.include("2 sprite image(s) not found");
			expect(error.message).to.include('"imgs/nope.png"');
			expect(error.message).to.include('selector "div.bad1"');
			expect(error.message).to.match(/skin\.µ\.css:2/);
			expect(error.message).to.include('"imgs/alsonope.png"');
			expect(error.message).to.include('selector "div.bad2"');
			expect(error.message).to.match(/skin\.µ\.css:3/);
		});

		it("reports a missing @2x variant when retina is enabled", async () => {
			await _WritePng("imgs/single.png", 10, 10);   // no @2x on purpose
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites.png", retina: true });
			const document = CompileMcss('div.s { -µ: Sprite("imgs/single.png"); }', { sprites, from: "skin.µ.css" });

			let error = null;
			try { await sprites.Resolve(document); } catch (caught) { error = caught; }
			expect(error, "Resolve should fail").to.not.equal(null);
			expect(error.message).to.include('"imgs/single@2x.png" (@2x variant of "imgs/single.png")');
			expect(error.message).to.include('selector "div.s"');
		});
	});

	describe("afterWork hooks", () => {
		it("wraps hook errors with the sprite URL and rule", async () => {
			await _WritePng("imgs/hooked.png", 10, 10);
			await _WritePng("imgs/hooked@2x.png", 20, 20);
			const sprites = new SpriteManager({ baseDir: tmpDir, atlasFile: "imgs/sprites.png", retina: true });
			const helpers = {
				Broken: function (_ctx) { throw new Error("kaput"); }
			};
			const document = CompileMcss(
				'div.h { -µ: Sprite("imgs/hooked.png", { afterWork: Broken }); }',
				{ sprites, helpers, from: "skin.µ.css" }
			);

			let error = null;
			try { await sprites.Resolve(document); } catch (caught) { error = caught; }
			expect(error, "Resolve should fail").to.not.equal(null);
			expect(error.message).to.include('afterWork hook for sprite "imgs/hooked.png" failed');
			expect(error.message).to.include('selector "div.h"');
			expect(error.message).to.match(/skin\.µ\.css:1/);
			expect(error.message).to.include("kaput");
			expect(error.cause?.message).to.equal("kaput");
		});
	});
});
