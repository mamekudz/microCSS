// Verifies the color API against values that the legacy µCSS toolchain
// produced in a legacy compiled std.css (bit-exactness of the hsl model).

import { expect } from "chai";
import { Lighten, Alpha, AlphaValue, MixColors, ParseColor, FormatColor } from "../src/index.mjs";

describe("Colors", () => {
	describe("ParseColor / FormatColor", () => {
		it("parses hex colors", () => {
			expect(ParseColor("#007570")).to.equal(0xFF007570);
			expect(ParseColor("#abc")).to.equal(0xFFAABBCC);
			expect(ParseColor("#11223344")).to.equal(0x44112233);
		});

		it("parses color names", () => {
			expect(ParseColor("white")).to.equal(0xFFFFFFFF);
			expect(ParseColor("Black")).to.equal(0xFF000000);
			expect(ParseColor("transparent")).to.equal(0x00000000);
		});

		it("parses rgb()/rgba()", () => {
			expect(ParseColor("rgb(0, 117, 112)")).to.equal(0xFF007570);
			expect(ParseColor("rgba(10,20,30,0.5)")).to.equal(0x7F0A141E);
			expect(ParseColor("rgb(100%, 0%, 50%)")).to.equal(0xFFFF007F);
		});

		it("formats opaque colors as hex, others as rgba", () => {
			expect(FormatColor(0xFF007570)).to.equal("#007570");
			expect(FormatColor(0x4C007570)).to.equal("rgba(0,117,112,0.298)");
		});
	});

	describe("Lighten (hsl model, legacy bit-exact)", () => {
		// a:link in the old std.css: Lighten(selectBaseBrgdColor=#007570, 0.7)
		it("matches the legacy output for step 0.7", () => {
			expect(Lighten("#007570", 0.7)).to.equal("#00c7be");
		});

		// div.forumquotation in the old std.css: Lighten(#007570, 2)
		it("matches the legacy output for step 2", () => {
			expect(Lighten("#007570", 2)).to.equal("#60fff8");
		});

		it("darkens with a negative step", () => {
			expect(Lighten("white", -0.5)).to.equal("#808080");
		});

		it("clamps at white and black", () => {
			expect(Lighten("#808080", 100)).to.equal("#ffffff");
			expect(Lighten("#808080", -100)).to.equal("#000000");
		});

		it("keeps the alpha channel", () => {
			// 0.298 maps to byte 75 (legacy floor) and serializes back as 0.294.
			expect(Lighten("rgba(0,117,112,0.298)", 0.7)).to.equal("rgba(0,199,190,0.294)");
		});
	});

	describe("Lighten (oklch model)", () => {
		it("lightens and stays in gamut", () => {
			const result = Lighten("#007570", 0.3, "oklch");
			expect(result).to.match(/^#[0-9a-f]{6}$/);
			const c = ParseColor(result);
			// Perceived lightness must increase on every linear-ish channel sum.
			expect(((c >>> 8) & 0xFF)).to.be.greaterThan(0x75);
		});

		it("is identity for step 0", () => {
			expect(Lighten("#007570", 0, "oklch")).to.equal("#007570");
		});

		it("rejects unknown models", () => {
			expect(() => Lighten("#007570", 0.5, "lab")).to.throw(/unknown color model/);
		});
	});

	describe("Alpha / AlphaValue", () => {
		it("applies fractional alpha like the legacy code", () => {
			expect(Alpha("#007570", 0.3)).to.equal("rgba(0,117,112,0.298)");
			expect(Alpha("#007570", 0.5)).to.equal("rgba(0,117,112,0.498)");
		});

		it("supports keywords", () => {
			expect(Alpha("#ff0000", "transparent")).to.equal("rgba(255,0,0,0.000)");
			expect(Alpha("#ff0000", "opaque")).to.equal("#ff0000");
			expect(Alpha("#ff0000", "translucent")).to.equal("rgba(255,0,0,0.502)");
		});

		it("treats 1 as fully opaque (legacy bug fixed)", () => {
			expect(Alpha("#ff0000", 1)).to.equal("#ff0000");
		});

		it("accepts byte values and clamps", () => {
			expect(AlphaValue(128)).to.equal(128);
			expect(AlphaValue(999)).to.equal(255);
			expect(AlphaValue(-3)).to.equal(0);
			expect(AlphaValue("50%")).to.equal(127);
		});
	});

	describe("MixColors", () => {
		it("averages channel-wise", () => {
			expect(MixColors("#000000", "#ffffff")).to.equal("#7f7f7f");
			expect(MixColors("#007570", "#202020")).to.equal("#104a48");
		});

		it("averages the alpha channel too", () => {
			expect(MixColors("rgba(0,0,0,0)", "#ffffff")).to.equal("rgba(127,127,127,0.498)");
		});
	});
});
