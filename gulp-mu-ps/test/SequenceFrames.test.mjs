// Tests for RGBA frame trimming (aligned copies, empty / unaligned buffers).

import { expect } from "chai";
import { TrimFrameBox, Rgba32Pixels } from "../src/strips/SequenceFrames.mjs";

describe("SequenceFrames", function () {
	it("Rgba32Pixels returns an empty view for missing data instead of throwing", function () {
		expect(Rgba32Pixels(undefined, 8, 8)).to.have.length(0);
		expect(Rgba32Pixels(Buffer.alloc(0), 0, 0)).to.have.length(0);
	});

	it("Rgba32Pixels and TrimFrameBox accept unaligned buffer views", function () {
		const raw = Buffer.alloc(3 + 2 * 2 * 4);
		const view = raw.subarray(3, 3 + 16);
		view[0] = 10; view[1] = 20; view[2] = 30; view[3] = 255;
		expect(Rgba32Pixels(view, 2, 2)).to.have.length(4);
		const box = TrimFrameBox(view, 2, 2);
		expect(box.w).to.be.at.least(1);
		expect(box.h).to.be.at.least(1);
		expect(box.xs).to.be.at.least(0);
		expect(box.ys).to.be.at.least(0);
	});

	it("TrimFrameBox does not throw on empty input", function () {
		const box = TrimFrameBox(undefined, 0, 0);
		expect(box).to.include({ xs: 0, ys: 0, w: 1, h: 1 });
	});
});
