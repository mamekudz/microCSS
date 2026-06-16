// Tests for the CssDocument/CssRule wrapper (find, manipulate, JSON).

import { expect } from "chai";
import { CssDocument } from "../src/index.mjs";

const SAMPLE = `
/* header */
div.panel {
	color: red;
	border: 1px solid black;
}
div.panel > span.title {
	font-weight: bold;
}
@keyframes spin {
	0% { transform: rotate(0deg); }
	50% { transform: rotate(180deg); }
	100% { transform: rotate(360deg); }
}
@media (max-width: 600px) {
	div.panel {
		color: blue;
	}
}
`;

describe("CssDocument", () => {
	it("finds rules by normalized selector", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const rule = doc.FindRule("div.panel >  span.title");
		expect(rule).to.not.equal(null);
		expect(rule.GetProperty("font-weight")).to.equal("bold");
	});

	it("finds rules by regex", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const rules = doc.FindRules(/^div\.panel/);
		expect(rules.length).to.equal(3);
	});

	it("finds nested rules via selector paths", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const frame = doc.FindRule("@keyframes spin", "50%");
		expect(frame).to.not.equal(null);
		expect(frame.GetProperty("transform")).to.equal("rotate(180deg)");
		const inMedia = doc.FindRule("@media (max-width: 600px)", "div.panel");
		expect(inMedia.GetProperty("color")).to.equal("blue");
	});

	it("adds, changes and removes properties", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const rule = doc.FindRule("div.panel");
		rule.AddProperty("margin", "4px");
		rule.ChangeProperty("color", "green");
		rule.RemoveProperty("border");
		expect(rule.GetProperty("margin")).to.equal("4px");
		expect(rule.GetProperty("color")).to.equal("green");
		expect(rule.GetProperty("border")).to.equal(null);
		expect(doc.ToCss()).to.include("color: green");
		expect(doc.ToCss()).to.not.include("1px solid black");
	});

	it("appends new rules", () => {
		const doc = CssDocument.FromString(SAMPLE);
		doc.AddRule("div.added").AddProperty("display", "flex");
		expect(doc.FindRule("div.added").GetProperty("display")).to.equal("flex");
	});

	it("round-trips through JSON", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const json = doc.ToJson();
		expect(json.type).to.equal("root");
		const restored = CssDocument.FromJson(json);
		expect(restored.FindRule("@keyframes spin", "50%").GetProperty("transform")).to.equal("rotate(180deg)");
		expect(restored.FindRule("div.panel").GetProperty("color")).to.equal("red");
		// JSON is plain data and survives serialization.
		const reparsed = CssDocument.FromJson(JSON.parse(JSON.stringify(json)));
		expect(reparsed.ToJson()).to.deep.equal(json);
	});

	it("lists declarations of a rule", () => {
		const doc = CssDocument.FromString(SAMPLE);
		const props = doc.FindRule("div.panel").GetProperties();
		expect(props).to.deep.equal([
			{ prop: "color", value: "red", important: false },
			{ prop: "border", value: "1px solid black", important: false }
		]);
	});
});
