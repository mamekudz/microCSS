// Tests for build-time @import inlining (glob, recursive, dedupe, passthrough)
// and the opt-in three-stage rule merging (dedupe / partial merge / collision).

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { expect } from "chai";
import { CompileMcss, ResolveImports, MergeRules, ApplyNamespaces, FilterSource } from "../src/index.mjs";
import { CssDocument } from "../src/css/CssDocument.mjs";

// A stylesheet carrying both build-filter forms: a Production-only block and a
// block removed in Production (active everywhere else).
const FILTERED_CSS = [
	".base { color: black; }",
	"/*-- @<BUILD_ONLY_AT_RELEASES:Production ----",
	".debug { color: red; }",
	"---- @>BUILD_ONLY_AT_RELEASES --*/",
	"/*-- @<BUILD_NEVER_AT_RELEASES:Production --*/",
	".devonly { color: blue; }",
	"/*-- @>BUILD_NEVER_AT_RELEASES --*/"
].join("\n");

const here = dirname(fileURLToPath(import.meta.url));
const tmp = join(here, ".tmp-imports");

function _Write(_rel, _css) {
	const file = join(tmp, _rel);
	mkdirSync(dirname(file), { recursive: true });
	writeFileSync(file, _css, "utf8");
	return file;
}

describe("@import inlining", () => {
	beforeEach(() => rmSync(tmp, { recursive: true, force: true }));
	after(() => rmSync(tmp, { recursive: true, force: true }));

	it("inlines a single local import relative to the importing file", () => {
		_Write("components/button.\u00b5.css", ".btn { color: red; }\n");
		const main = _Write("main.\u00b5.css", `@import "components/button.\u00b5.css";\nbody { margin: 0; }\n`);
		const css = CompileMcss('@import "components/button.\u00b5.css";\nbody { margin: 0; }\n', { from: main }).ToCss();
		expect(css).to.include(".btn { color: red; }");
		expect(css).to.include("body { margin: 0; }");
		expect(css).to.not.include("@import");
	});

	it("expands a ** glob, sorted and deterministic", () => {
		_Write("components/a/one.\u00b5.css", ".one { top: 1px; }\n");
		_Write("components/b/two.\u00b5.css", ".two { top: 2px; }\n");
		const main = _Write("main.\u00b5.css", "");
		const css = CompileMcss('@import "components/**/*.\u00b5.css";\n', { from: main }).ToCss();
		expect(css).to.include(".one");
		expect(css).to.include(".two");
		// "a/one" sorts before "b/two".
		expect(css.indexOf(".one")).to.be.lessThan(css.indexOf(".two"));
	});

	it("resolves imports iteratively (import chains)", () => {
		_Write("c.\u00b5.css", ".c { z-index: 3; }\n");
		_Write("b.\u00b5.css", `@import "c.\u00b5.css";\n.b { z-index: 2; }\n`);
		const main = _Write("a.\u00b5.css", "");
		const css = CompileMcss('@import "b.\u00b5.css";\n.a { z-index: 1; }\n', { from: main }).ToCss();
		expect(css).to.include(".c");
		expect(css).to.include(".b");
		expect(css).to.include(".a");
	});

	it("includes each file only once (dedupe) and survives cycles", () => {
		_Write("loop-b.\u00b5.css", `@import "loop-a.\u00b5.css";\n.b { left: 0; }\n`);
		_Write("loop-a.\u00b5.css", `@import "loop-b.\u00b5.css";\n.a { left: 1px; }\n`);
		const main = _Write("main.\u00b5.css", "");
		const warnings = [];
		const css = CompileMcss('@import "loop-a.\u00b5.css";\n', { from: main, onWarning: (_m) => warnings.push(_m) }).ToCss();
		expect((css.match(/\.a \{/g) ?? []).length).to.equal(1);
		expect((css.match(/\.b \{/g) ?? []).length).to.equal(1);
		expect(warnings.join("\n")).to.match(/circular/i);
	});

	it("leaves remote and conditional imports as native @import", () => {
		const main = _Write("main.\u00b5.css", "");
		const css = CompileMcss(
			`@import "https://fonts.example/x.css";\n@import "theme.css" screen;\n`,
			{ from: main }
		).ToCss();
		expect(css).to.include('@import "https://fonts.example/x.css"');
		expect(css).to.include('@import "theme.css" screen');
	});

	it("throws for a missing single file but only warns for an empty glob", () => {
		const main = _Write("main.\u00b5.css", "");
		expect(() => CompileMcss('@import "nope.\u00b5.css";\n', { from: main })).to.throw(/not found/);

		const warnings = [];
		const css = CompileMcss('@import "empty/**/*.\u00b5.css";\n', { from: main, onWarning: (_m) => warnings.push(_m) }).ToCss();
		expect(css).to.not.include("@import");
		expect(warnings.join("\n")).to.match(/matched no files/i);
	});

	it("does nothing without a from path", () => {
		const result = ResolveImports(CssDocument.FromString('@import "x.css";'), {});
		expect(result.resolved).to.have.lengthOf(0);
	});

	it("honors manifest-configurable diagnostic modes (onMissing/onEmptyGlob)", () => {
		const main = _Write("main.\u00b5.css", "");

		// onMissing: "warn" downgrades the missing-file error to a warning.
		const warnings = [];
		const css = CompileMcss('@import "nope.\u00b5.css";\nbody{margin:0}\n', {
			from: main,
			imports: { onMissing: "warn" },
			onWarning: (_m) => warnings.push(_m)
		}).ToCss();
		expect(css).to.include("body");
		expect(warnings.join("\n")).to.match(/not found/i);

		// onEmptyGlob: "error" escalates an empty glob to a hard error.
		expect(() => CompileMcss('@import "empty/**/*.\u00b5.css";\n', {
			from: main,
			imports: { onEmptyGlob: "error" }
		})).to.throw(/matched no files/i);
	});
});

describe("MergeRules (opt-in)", () => {
	it("stage 1: collapses identical duplicate rules", () => {
		const doc = CssDocument.FromString(".x { display: flex; } .x { display: flex; }");
		const { merged } = MergeRules(doc);
		expect(merged).to.equal(1);
		expect((doc.ToCss().match(/\.x/g) ?? []).length).to.equal(1);
	});

	it("stage 2: partial-merges complementary properties", () => {
		const doc = CssDocument.FromString(".b { padding: 10px; background: blue; } .b { display: flex; gap: 5px; }");
		MergeRules(doc);
		const css = doc.ToCss();
		expect((css.match(/\.b/g) ?? []).length).to.equal(1);
		expect(css).to.include("padding: 10px");
		expect(css).to.include("display: flex");
		expect(css).to.include("gap: 5px");
	});

	it("stage 3: throws on a real conflict (default onConflict: error)", () => {
		const doc = CssDocument.FromString(".c { background: blue; } .c { background: red; }");
		expect(() => MergeRules(doc)).to.throw(/collision/i);
	});

	it("stage 3: onConflict 'warn' keeps the last value", () => {
		const doc = CssDocument.FromString(".c { background: blue; } .c { background: red; }");
		const warnings = [];
		MergeRules(doc, { onConflict: "warn", warn: (_m) => warnings.push(_m) });
		expect(doc.ToCss()).to.include("background: red");
		expect(warnings).to.have.length.greaterThan(0);
	});

	it("stage 3: onConflict 'keep' keeps the first value", () => {
		const doc = CssDocument.FromString(".c { background: blue; } .c { background: red; }");
		MergeRules(doc, { onConflict: "keep", warn: () => {} });
		expect(doc.ToCss()).to.include("background: blue");
	});

	it("@\u00b5-override wins over an earlier block without a conflict", () => {
		const css = ".btn { background: blue; }\n@\u00b5-override .btn { background: green; }\n";
		const out = CompileMcss(css, { merge: true }).ToCss();
		expect(out).to.include("background: green");
		expect(out).to.not.include("background: blue");
		expect(out).to.not.include("override");
	});

	it("leaves rules inside @media untouched", () => {
		const doc = CssDocument.FromString("@media screen { .m { color: red; } } @media print { .m { color: blue; } }");
		const { merged } = MergeRules(doc);
		expect(merged).to.equal(0);
	});
});

describe("@\u00b5-namespace", () => {
	it("prefixes every class token in the file's selectors", () => {
		const css = "@\u00b5-namespace MyButton;\n.card { color: red; }\n.card.big { color: blue; }\n";
		const out = CompileMcss(css).ToCss();
		expect(out).to.include(".MyButton-card { color: red; }");
		expect(out).to.include(".MyButton-card.MyButton-big");
		expect(out).to.not.include("namespace");
	});

	it("leaves ids and element selectors alone, only touches classes", () => {
		const css = "@\u00b5-namespace Side;\ndiv.panel > a#home { color: red; }\n";
		const out = CompileMcss(css).ToCss();
		expect(out).to.include("div.Side-panel > a#home");
	});

	it("keeps :global(...) classes unprefixed (e.g. Vue state classes)", () => {
		const css = "@\u00b5-namespace MyButton;\n.card:global(.is-active) { color: red; }\n";
		const out = CompileMcss(css).ToCss();
		expect(out).to.include(".MyButton-card.is-active");
		expect(out).to.not.include(":global");
	});

	it("scopes prefixes per source file across an import bundle", () => {
		_Write("a/widget.\u00b5.css", "@\u00b5-namespace Widget;\n.card { color: red; }\n");
		_Write("b/sidebar.\u00b5.css", "@\u00b5-namespace Sidebar;\n.card { color: blue; }\n");
		const main = _Write("main.\u00b5.css", "");
		const out = CompileMcss('@import "a/widget.\u00b5.css";\n@import "b/sidebar.\u00b5.css";\n', { from: main }).ToCss();
		expect(out).to.include(".Widget-card");
		expect(out).to.include(".Sidebar-card");
	});

	it("throws on conflicting prefixes in the same file", () => {
		const css = "@\u00b5-namespace A;\n@\u00b5-namespace B;\n.card { color: red; }\n";
		expect(() => CompileMcss(css)).to.throw(/conflicting prefixes/i);
	});

	it("is a no-op without a directive", () => {
		const doc = CssDocument.FromString(".card { color: red; }");
		expect(ApplyNamespaces(doc)).to.equal(0);
	});
});

describe("build filter (gulp-mu-build-filter)", () => {
	beforeEach(() => rmSync(tmp, { recursive: true, force: true }));
	after(() => rmSync(tmp, { recursive: true, force: true }));

	it("FilterSource keeps/removes blocks by release", () => {
		const prod = FilterSource(FILTERED_CSS, { release: "Production" });
		expect(prod).to.include(".debug");
		expect(prod).to.not.include(".devonly");

		const test = FilterSource(FILTERED_CSS, { release: "Test" });
		expect(test).to.not.include(".debug");
		expect(test).to.include(".devonly");
	});

	it("returns the text unchanged without a (meaningful) config", () => {
		expect(FilterSource(FILTERED_CSS, null)).to.equal(FILTERED_CSS);
		expect(FilterSource(FILTERED_CSS, {})).to.equal(FILTERED_CSS);
	});

	it("CompileMcss filters the source before parsing", () => {
		const prod = CompileMcss(FILTERED_CSS, { buildFilter: { release: "Production" } }).ToCss();
		expect(prod).to.include(".debug");
		expect(prod).to.not.include(".devonly");
	});

	it("filters imported files with the same build config", () => {
		_Write("parts/dev.\u00b5.css", FILTERED_CSS);
		const main = _Write("main.\u00b5.css", "");
		const out = CompileMcss('@import "parts/dev.\u00b5.css";\n', {
			from: main,
			buildFilter: { release: "Test" }
		}).ToCss();
		expect(out).to.include(".devonly");
		expect(out).to.not.include(".debug");
	});
});
