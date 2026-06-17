// Mask helpers for raster adjustments (rect selections, alpha weights, layer masks).

/**
 * @typedef {{ x: number, y: number, w: number, h: number }} RectMask
 */

function _Clamp01(_value) {
	return Math.min(1, Math.max(0, _value));
}

function _RectList(_mask) {
	if (!_mask) return null;
	return Array.isArray(_mask) ? _mask : [_mask];
}

function _RectWeight(_x, _y, _rects) {
	for (const rect of _rects) {
		if (_x >= rect.x && _x < rect.x + rect.w && _y >= rect.y && _y < rect.y + rect.h) {
			return 1;
		}
	}
	return 0;
}

function _MapWeight(_x, _y, _width, _map) {
	return _map[_y * _width + _x] ?? 0;
}

/**
 * Returns the mask weight at a pixel (0..1).
 * @param {number} _x
 * @param {number} _y
 * @param {number} _width
 * @param {RectMask | RectMask[] | Float32Array | Uint8Array | null | undefined} _mask
 */
export function MaskWeightAt(_x, _y, _width, _mask) {
	if (_mask == null) return 1;
	if (_mask instanceof Float32Array || _mask instanceof Uint8Array) {
		const raw = _MapWeight(_x, _y, _width, _mask);
		return _mask instanceof Uint8Array ? (raw ? 1 : 0) : _Clamp01(raw);
	}
	return _RectWeight(_x, _y, _RectList(_mask));
}

/**
 * Builds a Float32Array mask (0..1) from rectangle selections.
 * @param {number} _width
 * @param {number} _height
 * @param {RectMask | RectMask[]} _rects
 */
export function MaskFromRects(_width, _height, _rects) {
	const mask = new Float32Array(_width * _height);
	for (const rect of _RectList(_rects)) {
		const x0 = Math.max(0, rect.x);
		const y0 = Math.max(0, rect.y);
		const x1 = Math.min(_width, rect.x + rect.w);
		const y1 = Math.min(_height, rect.y + rect.h);
		for (let y = y0; y < y1; y++) {
			for (let x = x0; x < x1; x++) {
				mask[y * _width + x] = 1;
			}
		}
	}
	return mask;
}

/**
 * Iterates document pixels where mask weight > 0 and layer alpha > 0.
 * @param {{ width: number, height: number, data: Float32Array }} _raster
 * @param {RectMask | RectMask[] | Float32Array | Uint8Array | null | undefined} _mask
 * @param {(index: number, weight: number) => void} _visit index = pixel index in data (multiple of 4)
 */
export function VisitMaskedPixels(_raster, _mask, _visit) {
	const { width, height, data } = _raster;
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const i = (y * width + x) * 4;
			if (data[i + 3] <= 0) continue;
			const weight = MaskWeightAt(x, y, width, _mask);
			if (weight <= 0) continue;
			_visit(i, weight);
		}
	}
}

/**
 * Blends adjusted RGB back using mask weight (full replace at weight 1).
 */
export function BlendMaskedRgb(_data, _index, _weight, _newR, _newG, _newB) {
	if (_weight >= 1) {
		_data[_index] = _newR;
		_data[_index + 1] = _newG;
		_data[_index + 2] = _newB;
		return;
	}
	_data[_index] = _data[_index] * (1 - _weight) + _newR * _weight;
	_data[_index + 1] = _data[_index + 1] * (1 - _weight) + _newG * _weight;
	_data[_index + 2] = _data[_index + 2] * (1 - _weight) + _newB * _weight;
}
