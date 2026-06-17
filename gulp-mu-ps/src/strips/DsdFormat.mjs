// Scanner for the legacy DSD format ("Dongleware Sprite Definition"): a single
// source image containing multiple sprite frames, each surrounded by a 1px
// rectangular border in an arbitrary marker color (any color different from
// the background color taken from pixel 0/0). The border encodes extra data:
//
//   - The right border column only extends down to the frame's anchor y
//     position, the bottom border row only extends right to the anchor x
//     position (origin markers).
//   - Below each cell sits a label made of 3x5 pixel glyphs in the marker
//     color: a type sign (original, mask, shadow, light, original+mask)
//     followed by a three-digit frame number.
//
// Each digit and type sign may appear in several **optional bit-pattern variants**
// (historic authoring differences). `DSD_SIGN_PATTERNS[sign]` lists all accepted
// variants; `_ReadSign` matches any of them. Index `[0]` is the canonical form
// for new DSD images (`render-dsd-glyphs.mjs` draws variant 0 only).
//
// Ported from SpriteTools.js (_DoDSDFormatScan), reduced to the parts needed
// for sprite strip generation.

export const DSD_SIGN_ORIGINAL = 10;
export const DSD_SIGN_MASK = 11;
export const DSD_SIGN_SHADOW = 12;
export const DSD_SIGN_LIGHT = 13;
export const DSD_SIGN_ORIGINALANDMASK = 14;

// 3x5 pixel glyphs, encoded row-major as 15-bit patterns (MSB = top left).
// Several historic pattern variants exist per glyph; the first variant is
// the canonical form for authoring new DSD images.
export const DSD_SIGN_PATTERNS = [
	/* 0 */ [0b111101101101111, 0b010101101101010, 0b010101101101010],
	/* 1 */ [0b010010010010010, 0b001001001001001, 0b100100100100100, 0b110010010010111],
	/* 2 */ [0b111001111100111, 0b110001010100111],
	/* 3 */ [0b111001111001111, 0b110001110001110],
	/* 4 */ [0b101101111001001],
	/* 5 */ [0b111100111001111, 0b111100110001110],
	/* 6 */ [0b111100111101111, 0b010100110101010],
	/* 7 */ [0b111001001001001, 0b111001001001001],
	/* 8 */ [0b111101111101111, 0b010101010101010],
	/* 9 */ [0b111101111001111, 0b010101011001010],
	/* ORIGINAL */ [0b111101111000000, 0b111100111100100],
	/* MASK */ [0b111111111000000, 0b000000111000000],
	/* SHADOW */ [0b000000000000111, 0b111111111000111],
	/* LIGHT */ [0b101010101000111],
	/* ORIGINALANDMASK */ [0b011100010001110, 0b111101111000111]
];

function _ReadSign(_pixels, _width, _height, _x, _y, _signColor) {
	let bits = 0;
	for (let y = _y; y <= _y + 4; y++) {
		for (let x = _x; x <= _x + 2; x++) {
			const inside = (x >= 0 && y >= 0 && x < _width && y < _height);
			bits = (bits << 1) | ((inside && _pixels[y * _width + x] === _signColor) ? 1 : 0);
		}
	}
	for (let sign = 0; sign < DSD_SIGN_PATTERNS.length; sign++) {
		if (DSD_SIGN_PATTERNS[sign].includes(bits)) return sign;
	}
	return -1;
}

// Reads a fixed-width decimal number made of digit glyphs (4px advance).
function _ReadValue(_pixels, _width, _height, _digits, _x, _y, _signColor) {
	let value = 0;
	for (let i = 0; i < _digits; i++) {
		const digit = _ReadSign(_pixels, _width, _height, _x + 4 * i, _y, _signColor);
		if (digit < 0 || digit > 9) return -1;
		value = value * 10 + digit;
	}
	return value;
}

// Scans a raw RGBA image for DSD cells.
// _image: { data: Buffer, width, height } (RGBA, 4 channels)
// Returns [{ no, type, xs, ys, w, h, ox, oy }] - content rect, frame number,
// cell type and anchor offsets, all in source pixel coordinates.
export function ScanDsdImage(_image) {
	const { width, height } = _image;
	const pixels = new Uint32Array(_image.data.buffer, _image.data.byteOffset, width * height);
	const marked = new Uint8Array(width * height);
	const baseColor = pixels[0];
	const frames = [];

	for (let y = 0; y < height - 1; y++) {
		for (let x = 0; x < width - 1; x++) {
			const signColor = pixels[y * width + x];
			if (signColor === baseColor || marked[y * width + x]) continue;

			// (x,y) is the top-left corner of a cell border: measure the solid
			// border runs along the top row and the left column.
			let sy = y;
			while (sy < height && pixels[sy * width + x] === signColor) sy++;
			let sx = x;
			while (sx < width && pixels[y * width + sx] === signColor) sx++;

			// Content rect: 1px border plus 1px gap on each side.
			const xs = x + 2, ys = y + 2;
			const xe = sx - 3, ye = sy - 3;
			if (xe < xs || ye < ys) continue;

			// Origin markers: the right border column ends at the anchor y,
			// the bottom border row ends at the anchor x.
			let soy = y;
			while (soy < height && pixels[soy * width + (sx - 1)] === signColor) soy++;
			let sox = x;
			while (sox < width && pixels[(sy - 1) * width + sox] === signColor) sox++;
			const ox = -(sox - xs);
			const oy = -(soy - ys);

			// Label below the cell: type sign plus three-digit frame number.
			const type = _ReadSign(pixels, width, height, x, sy + 1, signColor);
			if (type < DSD_SIGN_ORIGINAL || type > DSD_SIGN_ORIGINALANDMASK) continue;
			const no = _ReadValue(pixels, width, height, 3, x + 4, sy + 1, signColor);
			if (no < 0) continue;

			// Mark the complete cell (border, content and label rows).
			for (let my = y; my <= Math.min(sy + 5, height - 1); my++) {
				for (let mx = x; mx <= Math.min(sx - 1, width - 1); mx++) {
					marked[my * width + mx] = 1;
				}
			}

			frames.push({
				no, type,
				xs, ys,
				w: xe - xs + 1,
				h: ye - ys + 1,
				ox, oy
			});
		}
	}
	return frames;
}
