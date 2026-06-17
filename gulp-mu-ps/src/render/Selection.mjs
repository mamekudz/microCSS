// Raster selection helpers (rectangles, alpha, magic wand, color range).

function _ColorDistance(_r0, _g0, _b0, _r1, _g1, _b1) {
	const dr = _r0 - _r1;
	const dg = _g0 - _g1;
	const db = _b0 - _b1;
	return Math.sqrt(dr * dr + dg * dg + db * db);
}

/**
 * Mask from pixels with alpha >= min (0..1).
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ min?: number }} [_options]
 */
export function MaskFromAlpha(_raster, _options = {}) {
	const min = _options.min ?? 0.01;
	const mask = new Float32Array(_raster.width * _raster.height);
	const { width, height, data } = _raster;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			if (data[i + 3] >= min) mask[y * width + x] = 1;
		}
	}
	return mask;
}

/**
 * Connected flood-fill selection (magic wand). Tolerance is max RGB distance 0..1.
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {number} _x
 * @param {number} _y
 * @param {{ tolerance?: number }} [_options]
 */
export function MagicWand(_raster, _x, _y, _options = {}) {
	const tolerance = _options.tolerance ?? 0.08;
	const { width, height, data } = _raster;
	const mask = new Float32Array(width * height);
	if (_x < 0 || _y < 0 || _x >= width || _y >= height) return mask;

	const si = (_y * width + _x) * 4;
	const sr = data[si];
	const sg = data[si + 1];
	const sb = data[si + 2];
	if (data[si + 3] <= 0) return mask;

	const stack = [[_x, _y]];
	mask[_y * width + _x] = 1;
	while (stack.length) {
		const [x, y] = stack.pop();
		for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
			if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
			const mi = ny * width + nx;
			if (mask[mi]) continue;
			const i = mi * 4;
			if (data[i + 3] <= 0) continue;
			if (_ColorDistance(sr, sg, sb, data[i], data[i + 1], data[i + 2]) <= tolerance) {
				mask[mi] = 1;
				stack.push([nx, ny]);
			}
		}
	}
	return mask;
}

/**
 * Global color-range selection (all matching pixels).
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {{ rgb: [number, number, number], fuzziness?: number }} _options RGB 0..1
 */
export function ColorRange(_raster, _options) {
	const [tr, tg, tb] = _options.rgb;
	const fuzziness = _options.fuzziness ?? 0.08;
	const { width, height, data } = _raster;
	const mask = new Float32Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			if (data[i + 3] <= 0) continue;
			if (_ColorDistance(tr, tg, tb, data[i], data[i + 1], data[i + 2]) <= fuzziness) {
				mask[y * width + x] = 1;
			}
		}
	}
	return mask;
}

/**
 * Inverts a weight mask (0..1).
 */
export function InvertMask(_mask) {
	const out = new Float32Array(_mask.length);
	for (let i = 0; i < _mask.length; i++) out[i] = 1 - _mask[i];
	return out;
}

function _BoxBlurHorizontal(_src, _dst, _width, _height, _radius) {
	const r = Math.max(1, Math.round(_radius));
	const window = r * 2 + 1;
	for (let y = 0; y < _height; y++) {
		let sum = 0;
		for (let x = -r; x <= r; x++) {
			const cx = Math.min(_width - 1, Math.max(0, x));
			sum += _src[y * _width + cx];
		}
		for (let x = 0; x < _width; x++) {
			_dst[y * _width + x] = sum / window;
			const removeX = Math.max(0, x - r);
			const addX = Math.min(_width - 1, x + r + 1);
			sum += _src[y * _width + addX] - _src[y * _width + removeX];
		}
	}
}

function _BoxBlurVertical(_src, _dst, _width, _height, _radius) {
	const r = Math.max(1, Math.round(_radius));
	const window = r * 2 + 1;
	for (let x = 0; x < _width; x++) {
		let sum = 0;
		for (let y = -r; y <= r; y++) {
			const cy = Math.min(_height - 1, Math.max(0, y));
			sum += _src[cy * _width + x];
		}
		for (let y = 0; y < _height; y++) {
			_dst[y * _width + x] = sum / window;
			const removeY = Math.max(0, y - r);
			const addY = Math.min(_height - 1, y + r + 1);
			sum += _src[addY * _width + x] - _src[removeY * _width + x];
		}
	}
}

/**
 * Softens selection edges (approximate feather).
 */
export function FeatherMask(_mask, _width, _height, _radius) {
	if (_radius <= 0) return Float32Array.from(_mask);
	let src = Float32Array.from(_mask);
	let dst = new Float32Array(_mask.length);
	for (let pass = 0; pass < 3; pass++) {
		_BoxBlurHorizontal(src, dst, _width, _height, _radius);
		_BoxBlurVertical(dst, src, _width, _height, _radius);
	}
	for (let i = 0; i < src.length; i++) src[i] = Math.min(1, Math.max(0, src[i]));
	return src;
}

/**
 * Bounding box of mask pixels with weight > 0. Returns null when empty.
 */
export function SelectionBounds(_mask, _width, _height) {
	let minX = _width;
	let minY = _height;
	let maxX = -1;
	let maxY = -1;
	for (let y = 0; y < _height; y++) {
		for (let x = 0; x < _width; x++) {
			if (_mask[y * _width + x] <= 0) continue;
			minX = Math.min(minX, x);
			minY = Math.min(minY, y);
			maxX = Math.max(maxX, x);
			maxY = Math.max(maxY, y);
		}
	}
	if (maxX < 0) return null;
	return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/**
 * Copies selected pixels into a new raster (full bounds when no mask).
 */
export function CopySelection(_raster, _mask = null) {
	const { width, height, data } = _raster;
	if (!_mask) {
		return { width, height, data: new Float32Array(data) };
	}
	const bounds = SelectionBounds(_mask, width, height);
	if (!bounds) {
		return { width: 1, height: 1, data: new Float32Array(4) };
	}
	const out = new Float32Array(bounds.w * bounds.h * 4);
	for (let y = 0; y < bounds.h; y++) {
		for (let x = 0; x < bounds.w; x++) {
			const sx = bounds.x + x;
			const sy = bounds.y + y;
			const weight = _mask[sy * width + sx];
			const si = (sy * width + sx) * 4;
			const di = (y * bounds.w + x) * 4;
			out[di] = data[si] * weight;
			out[di + 1] = data[si + 1] * weight;
			out[di + 2] = data[si + 2] * weight;
			out[di + 3] = data[si + 3] * weight;
		}
	}
	return { width: bounds.w, height: bounds.h, data: out };
}
