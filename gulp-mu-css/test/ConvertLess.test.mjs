// Tests for the LESS -> microCSS migration aid (tools/convert-less.mjs):
// variables, nesting, color-function mapping, and the TODO/warning handling for
// constructs that are deliberately left for manual review.

import { expect } from "chai";
import { ConvertLess } from "../tools/convert-less.mjs";

describe("LESS converter (tools/convert-less.mjs)", () => {
	it("hoists @variables into the manifest and rewrites usage to µ($.x)", () => {
		const { css, vars } = ConvertLess("@blue: #3366ff;\n.x { color: @blue; border: 1px solid @blue; }");
		expect(vars).to.deep.equal([{ name: "blue", literal: '"#3366ff"' }]);
		expect(css).to.not.include("@blue:");
		expect(css).to.include("color: µ($.blue)");
		expect(css).to.include("border: 1px solid µ($.blue)");
	});

	it("keeps numeric variable values numeric in the manifest", () => {
		const { vars } = ConvertLess("@base: 10;\n@gap: 8px;\n.x { width: @base; }");
		expect(vars).to.deep.include({ name: "base", literal: "10" });
		expect(vars).to.deep.include({ name: "gap", literal: '"8px"' });
	});

	it("uses bracket access for hyphenated variable names", () => {
		const { css, vars } = ConvertLess("@my-color: red;\n.x { color: @my-color; }");
		expect(vars).to.deep.equal([{ name: "my-color", literal: '"red"' }]);
		expect(css).to.include('color: µ($["my-color"])');
	});

	it("flattens nesting including & and &-suffix", () => {
		const { css } = ConvertLess(".card { color: red; &:hover { color: blue; } &-title { font-weight: bold; } }");
		expect(css).to.include(".card:hover");
		expect(css).to.include(".card-title");
		expect(css).to.not.match(/&/);
	});

	it("maps lighten/darken/fade to the µ() Color API (approximated)", () => {
		const { css, notes } = ConvertLess(
			"@c: #336699;\n.x { a: lighten(@c, 10%); b: darken(@c, 20%); c: fade(@c, 50%); }"
		);
		expect(css).to.include("a: µ(Lighten($.c, 0.1))");
		expect(css).to.include("b: µ(Lighten($.c, -(0.2)))");
		expect(css).to.include("c: µ(Alpha($.c, 0.5))");
		expect(notes.length).to.be.greaterThan(0);
	});

	it("maps a 50/50 mix() to MixColors but leaves weighted mixes", () => {
		const ok = ConvertLess("@a: red;\n@b: blue;\n.x { color: mix(@a, @b); }");
		expect(ok.css).to.include("color: µ(MixColors($.a, $.b))");

		const weighted = ConvertLess("@a: red;\n@b: blue;\n.x { color: mix(@a, @b, 25%); }");
		expect(weighted.css).to.include("mix(@a, @b, 25%)");
		expect(weighted.warnings.join("\n")).to.match(/mix\(\) weight/);
	});

	it("leaves unmapped color functions untouched and warns", () => {
		const { css, warnings } = ConvertLess("@c: red;\n.x { color: saturate(@c, 10%); }");
		expect(css).to.include("saturate(@c, 10%)");
		expect(warnings.join("\n")).to.match(/saturate\(\) not converted/);
	});

	it("leaves unit arithmetic for manual review", () => {
		const { css, warnings } = ConvertLess("@base: 10;\n.x { width: (@base * 2px); }");
		expect(css).to.include("(@base * 2px)");
		expect(warnings.join("\n")).to.match(/arithmetic not converted/);
	});

	it("rewrites @import targets to .µ.css and drops LESS options", () => {
		const { css, warnings } = ConvertLess('@import "theme.less";\n@import (reference) "mixins.less";\n@import "vars";');
		expect(css).to.include('@import "theme.µ.css"');
		expect(css).to.include('@import "mixins.µ.css"');
		expect(css).to.include('@import "vars.µ.css"');
		expect(warnings.join("\n")).to.match(/options "\(reference\)" dropped/);
	});

	it("keeps mixins as TODO comments and warns", () => {
		const { css, warnings } = ConvertLess(".clearfix() { display: block; }\n.btn { .clearfix(); color: red; }");
		expect(css).to.include("TODO(convert): LESS mixin definition");
		expect(css).to.include("TODO(convert): LESS mixin call");
		expect(css).to.not.include("display: block");
		expect(warnings.join("\n")).to.match(/mixin definition/);
		expect(warnings.join("\n")).to.match(/mixin call/);
	});

	it("turns // line comments into block comments", () => {
		const { css } = ConvertLess("// a note\n.x { color: red; }");
		expect(css).to.not.include("//");
		expect(css).to.include("/*");
		expect(css).to.include("a note");
	});

	it("reports variables used but not defined in the file", () => {
		const { undefinedVars } = ConvertLess(".x { color: @fromTheme; }");
		expect(undefinedVars).to.include("fromTheme");
	});
});
