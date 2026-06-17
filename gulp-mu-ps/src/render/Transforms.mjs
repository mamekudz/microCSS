// Geometric raster transforms (crop, flip, rotate, scale).

import sharp from "sharp";
import { CloneRaster, CreateRaster, RasterToBytes } from "./Raster.mjs";

/** @typedef {"nearest" | "linear" | "cubic" | "lanczos2" | "lanczos3"} ScaleKernel */

const SHARP_KERNELS = new Set(["nearest", "linear", "cubic", "lanczos2", "lanczos3"]);

function _BytesToRaster(_data, _width, _height) {
	const raster = CreateRaster(_width, _height);
	for (let i = 0; i < _width * _height; i++) {
		const si = i * 4;
		raster.data[si] = _data[si] / 255;
		raster.data[si + 1] = _data[si + 1] / 255;
		raster.data[si + 2] = _data[si + 2] / 255;
		raster.data[si + 3] = _data[si + 3] / 255;
	}
	return raster;
}

function _ResolveScaleSize(_raster, _options) {
	if (_options.width != null || _options.height != null) {
		const fit = _options.fit ?? "fill";
		if (_options.width != null && _options.height != null) {
			return { width: Math.max(1, Math.round(_options.width)), height: Math.max(1, Math.round(_options.height)) };
		}
		if (_options.width != null) {
			const width = Math.max(1, Math.round(_options.width));
			const height = fit === "fill"
				? Math.max(1, Math.round(_raster.height * (width / _raster.width)))
				: Math.max(1, Math.round(_options.height ?? _raster.height));
			return { width, height };
		}
		const height = Math.max(1, Math.round(_options.height));
		const width = fit === "fill"
			? Math.max(1, Math.round(_raster.width * (height / _raster.height)))
			: Math.max(1, Math.round(_options.width ?? _raster.width));
		return { width, height };
	}
	if (_options.scale != null) {
		const scale = _options.scale;
		return {
			width: Math.max(1, Math.round(_raster.width * scale)),
			height: Math.max(1, Math.round(_raster.height * scale))
		};
	}
	throw new Error("ScaleRaster: provide scale, width, and/or height.");
}

/**
 * Resizes a raster (via sharp). Default kernel is lanczos3 (good for photos/UI).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{
 *   scale?: number,
 *   width?: number,
 *   height?: number,
 *   fit?: "fill",
 *   kernel?: ScaleKernel
 * }} _options
 */
export async function ScaleRaster(_raster, _options = {}) {
	const kernel = _options.kernel ?? "lanczos3";
	if (!SHARP_KERNELS.has(kernel)) {
		throw new Error(`ScaleRaster: unknown kernel "${kernel}".`);
	}
	const { width, height } = _ResolveScaleSize(_raster, _options);
	if (width === _raster.width && height === _raster.height) {
		return CloneRaster(_raster);
	}
	const { data, info } = await sharp(RasterToBytes(_raster), {
		raw: { width: _raster.width, height: _raster.height, channels: 4 }
	})
		.resize(width, height, { kernel })
		.raw()
		.toBuffer({ resolveWithObject: true });
	return _BytesToRaster(data, info.width, info.height);
}

/**
 * Crops to a rectangle (clamped to the source bounds).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ x?: number, y?: number, w: number, h: number }} _rect
 */
export function CropRaster(_raster, _rect) {
	const x0 = Math.max(0, Math.floor(_rect.x ?? 0));
	const y0 = Math.max(0, Math.floor(_rect.y ?? 0));
	const w = Math.max(1, Math.min(Math.floor(_rect.w), _raster.width - x0));
	const h = Math.max(1, Math.min(Math.floor(_rect.h), _raster.height - y0));
	const out = CreateRaster(w, h);
	for (let y = 0; y < h; y++) {
		for (let x = 0; x < w; x++) {
			const si = ((y0 + y) * _raster.width + (x0 + x)) * 4;
			const di = (y * w + x) * 4;
			out.data[di] = _raster.data[si];
			out.data[di + 1] = _raster.data[si + 1];
			out.data[di + 2] = _raster.data[si + 2];
			out.data[di + 3] = _raster.data[si + 3];
		}
	}
	return out;
}

/**
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {"horizontal" | "vertical"} _axis
 */
export function FlipRaster(_raster, _axis) {
	const out = CreateRaster(_raster.width, _raster.height);
	const { width, height, data } = _raster;
	if (_axis === "horizontal") {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * 4;
				const di = (y * width + (width - 1 - x)) * 4;
				out.data[di] = data[si];
				out.data[di + 1] = data[si + 1];
				out.data[di + 2] = data[si + 2];
				out.data[di + 3] = data[si + 3];
			}
		}
		return out;
	}
	if (_axis === "vertical") {
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * 4;
				const di = ((height - 1 - y) * width + x) * 4;
				out.data[di] = data[si];
				out.data[di + 1] = data[si + 1];
				out.data[di + 2] = data[si + 2];
				out.data[di + 3] = data[si + 3];
			}
		}
		return out;
	}
	throw new Error(`FlipRaster: axis must be "horizontal" or "vertical".`);
}

/**
 * Rotates by a multiple of 90° (clockwise). Pivot is the image origin (top-left).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {90 | 180 | 270} _degrees clockwise
 */
export function RotateRaster(_raster, _degrees) {
	const { width, height, data } = _raster;
	if (_degrees === 180) {
		const out = CreateRaster(width, height);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * 4;
				const di = ((height - 1 - y) * width + (width - 1 - x)) * 4;
				out.data[di] = data[si];
				out.data[di + 1] = data[si + 1];
				out.data[di + 2] = data[si + 2];
				out.data[di + 3] = data[si + 3];
			}
		}
		return out;
	}
	if (_degrees === 90) {
		const out = CreateRaster(height, width);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * 4;
				const ox = y;
				const oy = width - 1 - x;
				const di = (oy * height + ox) * 4;
				out.data[di] = data[si];
				out.data[di + 1] = data[si + 1];
				out.data[di + 2] = data[si + 2];
				out.data[di + 3] = data[si + 3];
			}
		}
		return out;
	}
	if (_degrees === 270) {
		const out = CreateRaster(height, width);
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const si = (y * width + x) * 4;
				const ox = height - 1 - y;
				const oy = x;
				const di = (oy * height + ox) * 4;
				out.data[di] = data[si];
				out.data[di + 1] = data[si + 1];
				out.data[di + 2] = data[si + 2];
				out.data[di + 3] = data[si + 3];
			}
		}
		return out;
	}
	throw new Error(`RotateRaster: degrees must be 90, 180, or 270.`);
}

/**
 * Places a (usually smaller) raster onto a canvas at an offset (pivot-friendly paste).
 *
 * @param {number} _canvasWidth
 * @param {number} _canvasHeight
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ x?: number, y?: number }} [_offset]
 */
export function PasteRaster(_canvasWidth, _canvasHeight, _raster, _offset = {}) {
	const out = CreateRaster(_canvasWidth, _canvasHeight);
	const ox = Math.floor(_offset.x ?? 0);
	const oy = Math.floor(_offset.y ?? 0);
	for (let y = 0; y < _raster.height; y++) {
		const dy = y + oy;
		if (dy < 0 || dy >= _canvasHeight) continue;
		for (let x = 0; x < _raster.width; x++) {
			const dx = x + ox;
			if (dx < 0 || dx >= _canvasWidth) continue;
			const si = (y * _raster.width + x) * 4;
			const di = (dy * _canvasWidth + dx) * 4;
			out.data[di] = _raster.data[si];
			out.data[di + 1] = _raster.data[si + 1];
			out.data[di + 2] = _raster.data[si + 2];
			out.data[di + 3] = _raster.data[si + 3];
		}
	}
	return out;
}

/** @typedef {"topLeft" | "topCenter" | "topRight" | "middleLeft" | "middleCenter" | "middleRight" | "bottomLeft" | "bottomCenter" | "bottomRight"} CanvasAnchor */

function _CanvasOffset(_oldW, _oldH, _newW, _newH, _anchor) {
	switch (_anchor) {
		case "topCenter": return { x: Math.floor((_newW - _oldW) / 2), y: 0 };
		case "topRight": return { x: _newW - _oldW, y: 0 };
		case "middleLeft": return { x: 0, y: Math.floor((_newH - _oldH) / 2) };
		case "middleCenter": return { x: Math.floor((_newW - _oldW) / 2), y: Math.floor((_newH - _oldH) / 2) };
		case "middleRight": return { x: _newW - _oldW, y: Math.floor((_newH - _oldH) / 2) };
		case "bottomLeft": return { x: 0, y: _newH - _oldH };
		case "bottomCenter": return { x: Math.floor((_newW - _oldW) / 2), y: _newH - _oldH };
		case "bottomRight": return { x: _newW - _oldW, y: _newH - _oldH };
		default: return { x: 0, y: 0 };
	}
}

/**
 * Changes document bounds without scaling content (PS *Image → Canvas Size* approximation).
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{
 *   width: number,
 *   height: number,
 *   anchor?: CanvasAnchor,
 *   fill?: [number, number, number, number]
 * }} _options RGBA fill 0..1; default transparent.
 */
export function ResizeCanvas(_raster, _options) {
	const width = Math.max(1, Math.round(_options.width));
	const height = Math.max(1, Math.round(_options.height));
	const fill = _options.fill ?? [0, 0, 0, 0];
	const { x: ox, y: oy } = _CanvasOffset(
		_raster.width, _raster.height, width, height, _options.anchor ?? "topLeft"
	);
	const out = CreateRaster(width, height);
	for (let i = 0; i < out.data.length; i += 4) {
		out.data[i] = fill[0];
		out.data[i + 1] = fill[1];
		out.data[i + 2] = fill[2];
		out.data[i + 3] = fill[3];
	}
	for (let y = 0; y < _raster.height; y++) {
		const dy = y + oy;
		if (dy < 0 || dy >= height) continue;
		for (let x = 0; x < _raster.width; x++) {
			const dx = x + ox;
			if (dx < 0 || dx >= width) continue;
			const si = (y * _raster.width + x) * 4;
			const di = (dy * width + dx) * 4;
			out.data[di] = _raster.data[si];
			out.data[di + 1] = _raster.data[si + 1];
			out.data[di + 2] = _raster.data[si + 2];
			out.data[di + 3] = _raster.data[si + 3];
		}
	}
	return out;
}

function _Clamp01(_value) {
	return Math.min(1, Math.max(0, _value));
}

function _SampleBilinear(_raster, _x, _y) {
	const { width, height, data } = _raster;
	if (_x < 0 || _y < 0 || _x >= width || _y >= height) return [0, 0, 0, 0];
	const x0 = Math.floor(_x);
	const y0 = Math.floor(_y);
	const x1 = Math.min(width - 1, x0 + 1);
	const y1 = Math.min(height - 1, y0 + 1);
	const tx = _x - x0;
	const ty = _y - y0;
	const out = [0, 0, 0, 0];
	for (let c = 0; c < 4; c++) {
		const v00 = data[(y0 * width + x0) * 4 + c];
		const v10 = data[(y0 * width + x1) * 4 + c];
		const v01 = data[(y1 * width + x0) * 4 + c];
		const v11 = data[(y1 * width + x1) * 4 + c];
		out[c] = (1 - tx) * (1 - ty) * v00 + tx * (1 - ty) * v10 + (1 - tx) * ty * v01 + tx * ty * v11;
	}
	return out;
}

/**
 * Rotates around an arbitrary pivot (default top-left 0,0). Uses bilinear sampling.
 *
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {number} _degrees clockwise
 * @param {{ x?: number, y?: number }} [_pivot]
 */
export function RotateRasterAround(_raster, _degrees, _pivot = {}) {
	const px = _pivot.x ?? 0;
	const py = _pivot.y ?? 0;
	const rad = (_degrees * Math.PI) / 180;
	const cos = Math.cos(rad);
	const sin = Math.sin(rad);
	const { width, height } = _raster;

	const corners = [
		[0, 0], [width, 0], [0, height], [width, height]
	].map(([x, y]) => {
		const dx = x - px;
		const dy = y - py;
		return [cos * dx - sin * dy + px, sin * dx + cos * dy + py];
	});

	let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
	for (const [x, y] of corners) {
		minX = Math.min(minX, x);
		minY = Math.min(minY, y);
		maxX = Math.max(maxX, x);
		maxY = Math.max(maxY, y);
	}

	const outW = Math.max(1, Math.ceil(maxX - minX));
	const outH = Math.max(1, Math.ceil(maxY - minY));
	const out = CreateRaster(outW, outH);

	for (let y = 0; y < outH; y++) {
		for (let x = 0; x < outW; x++) {
			const wx = x + minX;
			const wy = y + minY;
			const dx = wx - px;
			const dy = wy - py;
			const sx = cos * dx + sin * dy + px;
			const sy = -sin * dx + cos * dy + py;
			const [r, g, b, a] = _SampleBilinear(_raster, sx, sy);
			const di = (y * outW + x) * 4;
			out.data[di] = _Clamp01(r);
			out.data[di + 1] = _Clamp01(g);
			out.data[di + 2] = _Clamp01(b);
			out.data[di + 3] = _Clamp01(a);
		}
	}
	return out;
}
