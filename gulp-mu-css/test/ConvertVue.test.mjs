// Tests for the Vue SFC -> co-located sidecar migration aid (tools/convert-vue.mjs).

import { expect } from "chai";
import { ConvertVue, ComponentNameFromFile, SIDECAR_SUFFIX } from "../tools/convert-vue.mjs";

describe("Vue converter (tools/convert-vue.mjs)", () => {
	it("derives PascalCase component names from file names", () => {
		expect(ComponentNameFromFile("my-button")).to.equal("MyButton");
		expect(ComponentNameFromFile("MyButton")).to.equal("MyButton");
		expect(ComponentNameFromFile("icon_btn")).to.equal("IconBtn");
	});

	it("extracts scoped CSS into a sidecar with @µ-namespace and strips data-v attrs", () => {
		const source = `<template><div class="card">x</div></template>
<style scoped>
.card[data-v-abc123] { color: red; }
.card[data-v-abc123]:hover { color: blue; }
</style>`;
		const { vue, css, sidecarName, namespace } = ConvertVue(source, { from: "MyCard.vue" });
		expect(sidecarName).to.equal(`MyCard${SIDECAR_SUFFIX}`);
		expect(namespace).to.equal("MyCard");
		expect(css).to.include("@µ-namespace MyCard;");
		expect(css).to.include(".card { color: red; }");
		expect(css).to.include(".card:hover { color: blue; }");
		expect(css).to.not.include("data-v-");
		expect(vue).to.not.include("<style");
		expect(vue).to.include(`styles co-located in MyCard${SIDECAR_SUFFIX}`);
	});

	it("unwraps :deep() selectors with a review note", () => {
		const { css, notes } = ConvertVue(
			`<style scoped>.wrap :deep(.title) { font-weight: bold; }</style>`,
			{ from: "Panel.vue" }
		);
		expect(css).to.include(".wrap .title { font-weight: bold; }");
		expect(notes.join("\n")).to.match(/:deep/);
	});

	it("pipes lang=\"less\" through the LESS converter", () => {
		const { css, vars } = ConvertVue(
			`<style scoped lang="less">@blue: #3366ff; .x { color: @blue; }</style>`,
			{ from: "Chip.vue" }
		);
		expect(vars).to.deep.equal([{ name: "blue", literal: '"#3366ff"' }]);
		expect(css).to.include("color: µ($.blue)");
		expect(css).to.include("@µ-namespace Chip;");
	});

	it("warns on unsupported lang=\"scss\" and leaves the vue file without a sidecar body", () => {
		const { css, warnings } = ConvertVue(
			`<style scoped lang="scss">.x { color: red; }</style>`,
			{ from: "Bad.vue" }
		);
		expect(css).to.equal("");
		expect(warnings.join("\n")).to.match(/scss.*not supported/);
	});

	it("warns when no style block is present", () => {
		const { css, warnings } = ConvertVue(`<template><span/></template>`, { from: "Plain.vue" });
		expect(css).to.equal("");
		expect(warnings.join("\n")).to.match(/no <style> block/);
	});

	it("merges multiple style blocks into one sidecar", () => {
		const { css } = ConvertVue(
			`<style scoped>.a { color: red; }</style><style>.b { margin: 0; }</style>`,
			{ from: "Split.vue" }
		);
		expect(css).to.include(".a { color: red; }");
		expect(css).to.include(".b { margin: 0; }");
		expect(css.match(/@µ-namespace/g)).to.have.length(1);
	});
});
