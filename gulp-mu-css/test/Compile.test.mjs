// Tests for the .µ.css compiler core: µ() interpolation and -µ: directives.

import { expect } from "chai";
import { CompileMcss, ReplaceInterpolations, MuContext } from "../src/index.mjs";
import { NormalizeLegacyGradients } from "../src/compile/Compiler.mjs";

const VARS = {
	linkColor: "#aabbcc",
	selectBaseBrgdColor: "#007570",
	lightenSelectStep2: 0.7,
	baseBrgdColor: "#202020",
	breakpoint: 600
};

describe("CompileMcss", () => {
	it("resolves simple variable interpolations", () => {
		const css = CompileMcss("a:link { color: µ($.linkColor); }", { vars: VARS }).ToCss();
		expect(css).to.equal("a:link { color: #aabbcc; }");
	});

	it("resolves expressions with the color API", () => {
		const source = "a:link { border-bottom: 1px dashed µ(Lighten($.selectBaseBrgdColor, $.lightenSelectStep2)); }";
		const css = CompileMcss(source, { vars: VARS }).ToCss();
		// Identical to the legacy std.css output.
		expect(css).to.include("border-bottom: 1px dashed #00c7be;");
	});

	it("supports the ASCII alias mu()", () => {
		const css = CompileMcss("div { width: mu($.breakpoint / 2)px; }", { vars: VARS }).ToCss();
		expect(css).to.include("width: 300px;");
	});

	it("does not treat words ending in mu( as interpolations", () => {
		const css = CompileMcss("div { transform: translatemu(3); }", { vars: VARS }).ToCss();
		expect(css).to.include("translatemu(3)");
	});

	it("resolves multiple interpolations in one value", () => {
		const css = CompileMcss("div { margin: µ(1 + 1)px µ(2 * 2)px; }", { vars: VARS }).ToCss();
		expect(css).to.include("margin: 2px 4px;");
	});

	it("executes -µ: directives and removes them from the output", () => {
		const source = `div.box {
			-µ: AddProperty("border-top", "1px solid " + Lighten($.baseBrgdColor, 0.2));
			width: 10px;
		}`;
		const css = CompileMcss(source, { vars: VARS }).ToCss();
		expect(css).to.include("border-top: 1px solid #262626;");
		expect(css).to.include("width: 10px;");
		expect(css).to.not.include("-µ");
	});

	it("supports the ASCII alias -mu:", () => {
		const source = `div.box {
			width: 10px;
			-mu: ChangeProperty("width", "20px");
		}`;
		const css = CompileMcss(source, { vars: VARS }).ToCss();
		expect(css).to.include("width: 20px;");
		expect(css).to.not.include("10px");
	});

	it("gives directives access to rule and document", () => {
		const source = `div.box {
			-µ: AddRule(rule.selector + ":hover").AddProperty("color", "red");
			color: blue;
		}`;
		const css = CompileMcss(source, { vars: VARS }).ToCss();
		expect(css).to.include("div.box:hover");
		expect(css).to.match(/div\.box:hover\s*{\s*color: red/);
	});

	it("calls user helpers", () => {
		const helpers = {
			Double: (_v) => _v * 2
		};
		const css = CompileMcss("div { width: µ(Double(21))px; }", { vars: VARS, helpers }).ToCss();
		expect(css).to.include("width: 42px;");
	});

	it("helpers can manipulate the rule via directives", () => {
		const helpers = {
			// Helper mimicking the legacy Borders(): receives the rule scope
			// implicitly through the returned closure call.
			SolidBorders: function (_rule, _color) {
				_rule.AddProperty("border", `1px solid ${_color}`);
			}
		};
		const css = CompileMcss("div { -µ: SolidBorders(rule, '#112233'); }", { vars: VARS, helpers }).ToCss();
		expect(css).to.include("border: 1px solid #112233;");
	});

	it("binds this to the evaluation scope for function helpers (M4)", () => {
		const helpers = {
			// Legacy-style macro: uses the µ globals via "this" instead of
			// explicit parameters.
			Pad: function (_pixels) {
				this.AddProperty("padding", `${_pixels}px`);
				this.AddRule(`${this.rule.selector} > span`).AddProperty("padding", `${_pixels / 2}px`);
			}
		};
		const css = CompileMcss("div.box { -µ: Pad(8); }", { vars: VARS, helpers }).ToCss();
		expect(css).to.include("padding: 8px;");
		expect(css).to.match(/div\.box > span\s*{\s*padding: 4px/);
	});

	it("InsertRule places generated rules behind the current rule, in call order (M4)", () => {
		const source = `div.first { color: red; -µ: InsertRule("div.gen1").AddProperty("color", "green"); -µ: InsertRule("div.gen2").AddProperty("color", "blue"); }
		div.last { color: black; }`;
		const css = CompileMcss(source, { vars: VARS }).ToCss();
		const order = ["div.first", "div.gen1", "div.gen2", "div.last"].map((_s) => css.indexOf(_s));
		expect(order[0]).to.be.below(order[1]);
		expect(order[1]).to.be.below(order[2]);
		expect(order[2]).to.be.below(order[3]);
	});

	it("interpolates at-rule params", () => {
		const css = CompileMcss("@media (min-width: µ($.breakpoint)px) { div { color: red; } }", { vars: VARS }).ToCss();
		expect(css).to.include("@media (min-width: 600px)");
	});

	it("reports evaluation errors with the source position", () => {
		const source = "div {\n\tcolor: µ(NoSuchFunction());\n}";
		expect(() => CompileMcss(source, { vars: VARS, from: "sample.µ.css" }))
			.to.throw(/NoSuchFunction/)
			.with.property("line", 2);
	});

	it("rejects interpolations evaluating to null/undefined", () => {
		expect(() => CompileMcss("div { color: µ($.missing); }", { vars: VARS }))
			.to.throw(/returned undefined/);
	});

	it("reuses a shared MuContext", () => {
		const context = new MuContext({ vars: { x: 7 } });
		const css = CompileMcss("div { z-index: µ($.x); }", { context }).ToCss();
		expect(css).to.include("z-index: 7;");
	});

	it("leaves plain CSS untouched (comments included)", () => {
		const source = "/* note */\ndiv { background: url(imgs/test.png); }";
		expect(CompileMcss(source, { vars: VARS }).ToCss()).to.equal(source);
	});
});

describe("ReplaceInterpolations", () => {
	it("handles nested parentheses and strings", () => {
		const result = ReplaceInterpolations("x µ((1 + 2) * 3 + \")\".length) y", (_expr) => {
			// eslint-disable-next-line no-eval
			return eval(_expr);
		});
		expect(result).to.equal("x 10 y");
	});

	it("throws on unbalanced parentheses", () => {
		expect(() => ReplaceInterpolations("µ(1 + (2", () => 0)).to.throw(/unbalanced/);
	});
});

describe("NormalizeLegacyGradients", () => {
	it("rewrites the four edge keywords to the modern 'to ...' form", () => {
		expect(NormalizeLegacyGradients("linear-gradient(top, #000, #fff)"))
			.to.equal("linear-gradient(to bottom, #000, #fff)");
		expect(NormalizeLegacyGradients("linear-gradient(bottom, #000, #fff)"))
			.to.equal("linear-gradient(to top, #000, #fff)");
		expect(NormalizeLegacyGradients("linear-gradient(left,#000,#fff)"))
			.to.equal("linear-gradient(to right,#000,#fff)");
		expect(NormalizeLegacyGradients("linear-gradient(right, #000, #fff)"))
			.to.equal("linear-gradient(to left, #000, #fff)");
	});

	it("rewrites corner keywords to the opposite corner", () => {
		expect(NormalizeLegacyGradients("linear-gradient(top left, #000, #fff)"))
			.to.equal("linear-gradient(to bottom right, #000, #fff)");
		expect(NormalizeLegacyGradients("linear-gradient(bottom right, #000, #fff)"))
			.to.equal("linear-gradient(to top left, #000, #fff)");
	});

	it("keeps nested rgba() stops intact", () => {
		expect(NormalizeLegacyGradients(
			"linear-gradient(top, rgba(0, 0, 0, 0.1) 0%, rgba(50, 50, 50, 0.1) 80%, rgba(0, 0, 0, 0.1) 100%)"))
			.to.equal(
				"linear-gradient(to bottom, rgba(0, 0, 0, 0.1) 0%, rgba(50, 50, 50, 0.1) 80%, rgba(0, 0, 0, 0.1) 100%)");
	});

	it("handles repeating-linear-gradient and multiple layers", () => {
		expect(NormalizeLegacyGradients("repeating-linear-gradient(left, #000 0, #fff 10px)"))
			.to.equal("repeating-linear-gradient(to right, #000 0, #fff 10px)");
		expect(NormalizeLegacyGradients("linear-gradient(top, #000, #fff), url('imgs/carbon.png')"))
			.to.equal("linear-gradient(to bottom, #000, #fff), url('imgs/carbon.png')");
	});

	it("leaves angles, 'to ...', color-first and radial gradients untouched", () => {
		const angle = "linear-gradient(-75deg, #000 0%, #fff 100%)";
		expect(NormalizeLegacyGradients(angle)).to.equal(angle);
		const already = "linear-gradient(to bottom, #000, #fff)";
		expect(NormalizeLegacyGradients(already)).to.equal(already);
		const colorFirst = "linear-gradient(rgba(0,0,0,0.2) 0%, rgba(255,255,255,0.1) 100%)";
		expect(NormalizeLegacyGradients(colorFirst)).to.equal(colorFirst);
		const radial = "radial-gradient(circle at top, #000, #fff)";
		expect(NormalizeLegacyGradients(radial)).to.equal(radial);
	});

	it("does not touch vendor-prefixed gradients", () => {
		const prefixed = "-webkit-linear-gradient(top, #000, #fff)";
		expect(NormalizeLegacyGradients(prefixed)).to.equal(prefixed);
	});

	it("normalizes gradients end-to-end through CompileMcss (plain + injected)", () => {
		const helpers = {
			Header: function () { this.AddProperty("background", "linear-gradient(left, #730000 0%, #260000 100%)"); }
		};
		const source = "div.input { background: linear-gradient(top, rgba(0,0,0,0.5) 0%, rgba(50,50,50,0.5) 100%); }\n"
			+ "div.header { -µ: Header(); }";
		const css = CompileMcss(source, { helpers }).ToCss();
		expect(css).to.include("background: linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, rgba(50,50,50,0.5) 100%);");
		expect(css).to.include("background: linear-gradient(to right, #730000 0%, #260000 100%)");
		expect(css).to.not.match(/linear-gradient\(\s*(top|bottom|left|right)\b/);
	});
});
