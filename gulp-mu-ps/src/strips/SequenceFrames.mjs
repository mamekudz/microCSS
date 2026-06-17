// Shared helpers for sequence frame trimming (SequenceStrip, CreateDsd).

/**
 * Trims raw RGBA to the bounding box of pixels differing from pixel 0/0.
 * @param {Buffer} _data
 * @param {number} _width
 * @param {number} _height
 * @param {"center"|"topleft"} [_anchor]
 */
export function TrimFrameBox(_data, _width, _height, _anchor = "center") {
	const pixels = new Uint32Array(_data.buffer, _data.byteOffset, _width * _height);
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
		const box = { xs: (_width >> 1) - 1, ys: (_height >> 1) - 1, w: 1, h: 1 };
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
