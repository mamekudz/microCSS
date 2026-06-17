import { expect } from "chai";
import { CreateRaster } from "../src/render/Raster.mjs";
import {
	CropRaster,
	FlipRaster,
	PasteRaster,
	RotateRaster,
	RotateRasterAround,
	ScaleRaster
} from "../src/render/Transforms.mjs";

function _FillRect(_raster, _x, _y, _w, _h, _r, _g, _b, _a = 1) {
	for (let y = _y; y < _y + _h; y++) {
		for (let x = _x; x < _x + _w; x++) {
			const i = (y * _raster.width + x) * 4;
			_raster.data[i] = _r;
			_raster.data[i + 1] = _g;
			_raster.data[i + 2] = _b;
			_raster.data[i + 3] = _a;
		}
	}
}

function _Pixel(_raster, _x, _y) {
	const i = (_y * _raster.width + _x) * 4;
	return _raster.data.slice(i, i + 4);
}

describe("Transforms", function () {
	it("CropRaster extracts a sub-rectangle", function () {
		const raster = CreateRaster(8, 8);
		_FillRect(raster, 2, 3, 2, 2, 1, 0, 0);
		const crop = CropRaster(raster, { x: 2, y: 3, w: 2, h: 2 });
		expect(crop.width).to.equal(2);
		expect(crop.height).to.equal(2);
		expect(_Pixel(crop, 0, 0)[0]).to.equal(1);
	});

	it("FlipRaster mirrors horizontally", function () {
		const raster = CreateRaster(4, 2);
		_FillRect(raster, 0, 0, 1, 2, 1, 0, 0);
		const flipped = FlipRaster(raster, "horizontal");
		expect(_Pixel(flipped, 3, 0)[0]).to.equal(1);
		expect(_Pixel(flipped, 0, 0)[0]).to.equal(0);
	});

	it("RotateRaster turns 90° clockwise", function () {
		const raster = CreateRaster(3, 2);
		_FillRect(raster, 2, 0, 1, 1, 0, 1, 0);
		const rotated = RotateRaster(raster, 90);
		expect(rotated.width).to.equal(2);
		expect(rotated.height).to.equal(3);
		expect(_Pixel(rotated, 0, 0)[1]).to.equal(1);
	});

	it("PasteRaster places content at an offset", function () {
		const tile = CreateRaster(2, 2);
		_FillRect(tile, 0, 0, 2, 2, 0, 0, 1);
		const canvas = PasteRaster(6, 6, tile, { x: 1, y: 2 });
		expect(_Pixel(canvas, 1, 2)[2]).to.equal(1);
		expect(_Pixel(canvas, 0, 0)[3]).to.equal(0);
	});

	it("ScaleRaster halves dimensions", async function () {
		const raster = CreateRaster(4, 4);
		_FillRect(raster, 0, 0, 4, 4, 0.5, 0.5, 0.5);
		const scaled = await ScaleRaster(raster, { scale: 0.5, kernel: "nearest" });
		expect(scaled.width).to.equal(2);
		expect(scaled.height).to.equal(2);
		expect(_Pixel(scaled, 0, 0)[0]).to.be.closeTo(0.5, 0.02);
	});

	it("RotateRasterAround rotates around pivot 0,0", function () {
		const raster = CreateRaster(4, 4);
		_FillRect(raster, 2, 0, 1, 1, 1, 0, 0);
		const rotated = RotateRasterAround(raster, 90, { x: 0, y: 0 });
		expect(rotated.width).to.be.greaterThan(0);
		expect(rotated.height).to.be.greaterThan(0);
	});
});
