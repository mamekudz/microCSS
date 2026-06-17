import { expect } from "chai";
import { CreateRaster } from "../src/render/Raster.mjs";
import {
	ApplyBrightnessContrast,
	ApplyGamma,
	ApplyHueSaturation,
	ApplyAdjustmentStack
} from "../src/render/Adjustments.mjs";
import { MaskFromRects } from "../src/render/Mask.mjs";

function _Fill(_raster, _r, _g, _b, _a = 1) {
	for (let i = 0; i < _raster.data.length; i += 4) {
		_raster.data[i] = _r;
		_raster.data[i + 1] = _g;
		_raster.data[i + 2] = _b;
		_raster.data[i + 3] = _a;
	}
}

function _Pixel(_raster, _x, _y) {
	const i = (_y * _raster.width + _x) * 4;
	return _raster.data.slice(i, i + 4);
}

describe("Adjustments", function () {
	it("ApplyGamma darkens midtones when PS gamma < 1", function () {
		const raster = CreateRaster(4, 4);
		_Fill(raster, 0.5, 0.5, 0.5);
		ApplyGamma(raster, 0.5);
		expect(_Pixel(raster, 1, 1)[0]).to.be.lessThan(0.5);
	});

	it("ApplyGamma respects a rectangle mask", function () {
		const raster = CreateRaster(8, 8);
		_Fill(raster, 0.4, 0.4, 0.4);
		ApplyGamma(raster, 0.5, { mask: [{ x: 0, y: 0, w: 4, h: 8 }] });
		expect(_Pixel(raster, 1, 1)[0]).to.be.lessThan(0.4);
		expect(_Pixel(raster, 6, 1)[0]).to.be.closeTo(0.4, 0.001);
	});

	it("ApplyGamma respects a weight map", function () {
		const raster = CreateRaster(4, 4);
		_Fill(raster, 0.4, 0.4, 0.4);
		const mask = new Float32Array(16);
		mask[0] = 1;
		mask[1] = 0.5;
		ApplyGamma(raster, 0.5, { mask });
		expect(_Pixel(raster, 0, 0)[0]).to.be.lessThan(_Pixel(raster, 1, 0)[0]);
		expect(_Pixel(raster, 1, 0)[0]).to.be.lessThan(0.4);
	});

	it("ApplyBrightnessContrast increases brightness", function () {
		const raster = CreateRaster(2, 2);
		_Fill(raster, 0.3, 0.3, 0.3);
		ApplyBrightnessContrast(raster, { brightness: 40, contrast: 0 });
		expect(_Pixel(raster, 0, 0)[0]).to.be.greaterThan(0.3);
	});

	it("ApplyHueSaturation desaturates toward gray", function () {
		const raster = CreateRaster(2, 2);
		_Fill(raster, 1, 0, 0);
		ApplyHueSaturation(raster, { saturation: -100 });
		const p = _Pixel(raster, 0, 0);
		expect(Math.abs(p[0] - p[1])).to.be.lessThan(0.05);
		expect(Math.abs(p[0] - p[2])).to.be.lessThan(0.05);
	});

	it("ApplyAdjustmentStack runs steps in order on a rect mask", function () {
		const raster = CreateRaster(8, 8);
		_Fill(raster, 0.35, 0.35, 0.35);
		const mask = MaskFromRects(8, 8, [{ x: 2, y: 2, w: 4, h: 4 }]);
		ApplyAdjustmentStack(raster, [
			{ type: "gamma", gamma: 0.8 },
			{ type: "brightnessContrast", brightness: 10, contrast: 5 }
		], { mask });
		expect(_Pixel(raster, 0, 0)[0]).to.be.closeTo(0.35, 0.001);
		expect(_Pixel(raster, 3, 3)[0]).to.not.equal(0.35);
	});
});
