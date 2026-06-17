// Synthetic compositor tests (no Adobe reference required).

import { expect } from "chai";
import { RenderDocument } from "../src/render/Compositor.mjs";
import { StyleTransferFillOpacity } from "../src/render/StyleTransfer.mjs";

function _SolidLayer(_left, _top, _width, _height, _rgb, _options = {}) {
	const data = new Uint8ClampedArray(_width * _height * 4);
	for (let i = 0; i < _width * _height; i++) {
		data[i * 4] = _rgb[0];
		data[i * 4 + 1] = _rgb[1];
		data[i * 4 + 2] = _rgb[2];
		data[i * 4 + 3] = 255;
	}
	return {
		left: _left,
		top: _top,
		imageData: { width: _width, height: _height, data },
		opacity: _options.opacity ?? 1,
		fillOpacity: _options.fillOpacity,
		blendMode: _options.blendMode ?? "normal",
		effects: _options.effects,
		hidden: false
	};
}

function _Sample(_raster, _x, _y) {
	const i = (_y * _raster.width + _x) * 4;
	const d = _raster.data;
	return [d[i] * 255, d[i + 1] * 255, d[i + 2] * 255, d[i + 3] * 255];
}

function _Doc(_children, _size = 64) {
	return { width: _size, height: _size, children: _children };
}

describe("Compositor (opacity / fill opacity)", function () {
	it("composites opaque fill over white backdrop", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			_SolidLayer(16, 16, 32, 32, [200, 40, 40])
		]);
		const px = _Sample(RenderDocument(doc), 32, 32);
		expect(px[0]).to.be.closeTo(200, 2);
		expect(px[1]).to.be.closeTo(40, 2);
		expect(px[2]).to.be.closeTo(40, 2);
	});

	it("scales fill with layer opacity", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			_SolidLayer(16, 16, 32, 32, [0, 0, 200], { opacity: 0.5 })
		]);
		const px = _Sample(RenderDocument(doc), 32, 32);
		expect(px[2]).to.be.closeTo(227.5, 8);
	});

	it("hides fill at fillOpacity 0 but keeps interior bevel visible", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [128, 128, 128]),
			_SolidLayer(16, 16, 32, 32, [200, 40, 40], {
				fillOpacity: 0,
				effects: {
					bevel: {
						enabled: true,
						style: "inner bevel",
						size: { value: 4 },
						strength: 1,
						highlightOpacity: 0.75,
						shadowOpacity: 0.75
					}
				}
			})
		]);
		const raster = RenderDocument(doc);
		const center = _Sample(raster, 32, 32);
		expect(center[0]).to.be.closeTo(128, 6);
		let maxDelta = 0;
		for (let y = 16; y < 48; y++) {
			for (let x = 16; x < 48; x++) {
				const px = _Sample(raster, x, y);
				maxDelta = Math.max(maxDelta, Math.abs(px[0] - 128) + Math.abs(px[1] - 128) + Math.abs(px[2] - 128));
			}
		}
		expect(maxDelta).to.be.above(15);
	});

	it("scales fill via fillOpacity (alpha), not by darkening RGB", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			_SolidLayer(16, 16, 32, 32, [200, 0, 0], { fillOpacity: 0.5 })
		]);
		const px = _Sample(RenderDocument(doc), 32, 32);
		// 50 % red 200 over white 255 → 0.5*200 + 0.5*255
		expect(px[0]).to.be.closeTo(227.5, 8);
	});

	it("uses per-pixel alpha from imageData when compositing", function () {
		const data = new Uint8ClampedArray(32 * 32 * 4);
		for (let i = 0; i < 32 * 32; i++) {
			data[i * 4] = 200;
			data[i * 4 + 1] = 0;
			data[i * 4 + 2] = 0;
			data[i * 4 + 3] = 128;
		}
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			{
				left: 16, top: 16, hidden: false, opacity: 1, blendMode: "normal",
				imageData: { width: 32, height: 32, data }
			}
		]);
		const px = _Sample(RenderDocument(doc), 32, 32);
		expect(px[0]).to.be.closeTo(227.5, 8);
	});
	it("StyleTransferFillOpacity uses PSD values or defaults to full fill", function () {
		expect(StyleTransferFillOpacity({ name: "glyph_disc" }, {})).to.equal(1);
		expect(StyleTransferFillOpacity({ name: "glyph_disc", fillOpacity: 0 }, {})).to.equal(0);
		expect(StyleTransferFillOpacity({ name: "but_events_" }, { fillOpacity: 0.5 })).to.equal(0.5);
	});

	it("renders an outside stroke beyond the fill bounds", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			_SolidLayer(20, 20, 24, 24, [200, 40, 40], {
				effects: {
					stroke: {
						enabled: true,
						size: { value: 4 },
						position: "outside",
						color: { r: 0, g: 0, b: 0 },
						opacity: 1
					}
				}
			})
		]);
		const raster = RenderDocument(doc);
		expect(_Sample(raster, 18, 32)[3]).to.be.above(0.05);
		expect(_Sample(raster, 32, 32)[0]).to.be.closeTo(200, 8);
	});

	it("renders an inside stroke on the fill edge", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [255, 255, 255]),
			_SolidLayer(20, 20, 24, 24, [200, 40, 40], {
				effects: {
					stroke: {
						enabled: true,
						size: { value: 3 },
						position: "inside",
						color: { r: 0, g: 0, b: 0 },
						opacity: 1
					}
				}
			})
		]);
		const raster = RenderDocument(doc);
		const edge = _Sample(raster, 21, 32);
		const center = _Sample(raster, 32, 32);
		expect(edge[0]).to.be.below(center[0] - 20);
		expect(center[0]).to.be.closeTo(200, 8);
	});

	it("renders satin as a visible interior sheen", function () {
		const doc = _Doc([
			_SolidLayer(0, 0, 64, 64, [128, 128, 128]),
			_SolidLayer(16, 16, 32, 32, [80, 80, 160], {
				effects: {
					satin: {
						enabled: true,
						size: { value: 5 },
						distance: { value: 3 },
						color: { r: 255, g: 255, b: 255 },
						opacity: 0.8,
						blendMode: "screen"
					}
				}
			})
		]);
		const raster = RenderDocument(doc);
		const center = _Sample(raster, 32, 32);
		expect(center[2]).to.be.above(160);
	});
});
