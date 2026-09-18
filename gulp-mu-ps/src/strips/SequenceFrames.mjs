// Shared helpers for sequence frame trimming (SequenceStrip, CreateDsd).

/**
 * Uint32 view of packed RGBA. Copies into an aligned buffer when the source
 * is missing, empty, unaligned (sharp pooled slices) or a non-Buffer view —
 * `new Uint32Array(buf.buffer, byteOffset, …)` throws on unaligned offsets
 * and `undefined[0]` crashes callers that assume a pixel array.
 * @param {Buffer|Uint8Array|undefined} _data
 * @param {number} _width
 * @param {number} _height
 * @returns {Uint32Array}
 */
export function Rgba32Pixels(_data, _width, _height) {
	const count = Math.max(0, (_width | 0) * (_height | 0));
	if (!count || !_data) return new Uint32Array(0);
	const needed = count * 4;
	if (_data.byteOffset % 4 === 0 && _data.byteLength >= needed && _data.buffer) {
		try {
			return new Uint32Array(_data.buffer, _data.byteOffset, count);
		} catch {
			// Detached or otherwise unusable ArrayBuffer — pack a copy below.
		}
	}
	const packed = Buffer.allocUnsafe(needed);
	const take = Math.min(_data.byteLength ?? _data.length ?? 0, needed);
	if (take > 0) {
		if (typeof _data.copy === "function") _data.copy(packed, 0, 0, take);
		else packed.set(_data.subarray(0, take), 0);
	}
	if (take < needed) packed.fill(0, take);
	return new Uint32Array(packed.buffer, packed.byteOffset, count);
}

/**
 * Trims raw RGBA to the bounding box of pixels differing from pixel 0/0.
 * @param {Buffer} _data
 * @param {number} _width
 * @param {number} _height
 * @param {"center"|"topleft"} [_anchor]
 */
export function TrimFrameBox(_data, _width, _height, _anchor = "center") {
	const pixels = Rgba32Pixels(_data, _width, _height);
	if (!pixels.length) {
		return { xs: 0, ys: 0, w: 1, h: 1, xo: 0, yo: 0 };
	}
	const background = pixels[0];
	const backgroundTransparent = (_data[3] === 0);
	let xs = _width, ys = _height, xe = -1, ye = -1;
	for (let y = 0; y < _height; y++) {
		for (let x = 0; x < _width; x++) {
			const i = y * _width + x;
			if (pixels[i] === background) continue;
			if (backgroundTransparent && _data[i * 4 + 3] === 0) continue;
			if (x < xs) xs = x;
			if (x > xe) xe = x;
			if (y < ys) ys = y;
			if (y > ye) ye = y;
		}
	}
	if (xe < 0 || (xs === 0 && ys === 0 && xe === _width - 1 && ye === _height - 1)) {
		const box = {
			xs: Math.max(0, (_width >> 1) - 1),
			ys: Math.max(0, (_height >> 1) - 1),
			w: 1,
			h: 1
		};
		return { ...box, xo: 0, yo: 0 };
	}
	const box = { xs, ys, w: xe - xs + 1, h: ye - ys + 1 };
	if (_anchor === "topleft") {
		return { ...box, xo: 0, yo: 0 };
	}
	return {
		...box,
		xo: (_width >> 1) - xs - 1,
		yo: (_height >> 1) - ys - 1
	};
}
