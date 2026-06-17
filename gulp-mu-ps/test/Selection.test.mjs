import { expect } from "chai";
import { CreateRaster } from "../src/render/Raster.mjs";
import {
	MaskFromAlpha,
	MagicWand,
	ColorRange,
	FeatherMask,
	InvertMask,
	SelectionBounds,
	CopySelection
} from "../src/render/Selection.mjs";

function _FillSolid(_raster, _r, _g, _b, _a = 1) {
	for (let i = 0; i < _raster.data.length; i += 4) {
		_raster.data[i] = _r;
		_raster.data[i + 1] = _g;
		_raster.data[i + 2] = _b;
		_raster.data[i + 3] = _a;
	}
}

describe("Selection", function () {
	it("MaskFromAlpha selects opaque pixels", function () {
		const raster = CreateRaster(4, 4);
		_FillSolid(raster, 1, 0, 0);
		raster.data[3] = 0;
		const mask = MaskFromAlpha(raster, { min: 0.5 });
		expect(mask[0]).to.equal(0);
		expect(mask[1]).to.equal(1);
	});

	it("MagicWand flood-fills connected similar pixels", function () {
		const raster = CreateRaster(4, 4);
		_FillSolid(raster, 1, 0, 0);
		raster.data[(0 * 4 + 3) * 4] = 0;
		raster.data[(0 * 4 + 3) * 4 + 1] = 1;
		raster.data[(0 * 4 + 3) * 4 + 2] = 0;
		const mask = MagicWand(raster, 0, 0, { tolerance: 0.01 });
		expect(mask[0]).to.equal(1);
		expect(mask[3]).to.equal(0);
	});

	it("ColorRange selects all matching pixels globally", function () {
		const raster = CreateRaster(4, 4);
		_FillSolid(raster, 0, 1, 0);
		raster.data[0] = 1;
		raster.data[1] = 0;
		const mask = ColorRange(raster, { rgb: [1, 0, 0], fuzziness: 0.01 });
		expect(mask[0]).to.equal(1);
		expect(mask[1]).to.equal(0);
	});

	it("InvertMask and SelectionBounds", function () {
		const mask = new Float32Array(16);
		mask[5] = 1;
		mask[6] = 1;
		const inverted = InvertMask(mask);
		expect(inverted[5]).to.equal(0);
		expect(inverted[0]).to.equal(1);
		const bounds = SelectionBounds(mask, 4, 4);
		expect(bounds).to.deep.equal({ x: 1, y: 1, w: 2, h: 1 });
	});

	it("FeatherMask softens edges", function () {
		const mask = new Float32Array(25);
		mask[12] = 1;
		const soft = FeatherMask(mask, 5, 5, 1);
		expect(soft[12]).to.be.greaterThan(soft[6]);
		expect(soft[6]).to.be.greaterThan(soft[0]);
	});

	it("CopySelection crops to bounds", function () {
		const raster = CreateRaster(4, 4);
		_FillSolid(raster, 0.2, 0.4, 0.6);
		const mask = new Float32Array(16);
		mask[5] = 1;
		mask[6] = 1;
		const copy = CopySelection(raster, mask);
		expect(copy.width).to.equal(2);
		expect(copy.height).to.equal(1);
		expect(copy.data[0]).to.be.closeTo(0.2, 0.001);
	});
});
